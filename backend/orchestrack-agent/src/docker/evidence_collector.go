package docker

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/go/orchestrack/backend/events"
	"github.com/go/orchestrack/backend/orchestrack-agent/src/metrics"
	"github.com/go/orchestrack/backend/orchestrack-agent/src/repository"
	"github.com/go/orchestrack/backend/proto/docker"
	systemPb "github.com/go/orchestrack/backend/proto/system"
)

// EvidenceBundle representa el paquete completo de evidencias del incidente.
type EvidenceBundle struct {
	DeviceID      string                 `json:"device_id"`
	ContainerID   string                 `json:"container_id"`
	ContainerName string                 `json:"container_name"`
	Timestamp     int64                  `json:"timestamp"`
	ContainerLogs string                 `json:"container_logs"`
	HostMetrics   *systemPb.HostMetrics   `json:"host_metrics"`
	DockerLogs    string                 `json:"docker_logs"`
}

// CollectEvidence extrae las logs del contenedor, las métricas del host y los logs de Docker daemon.
func CollectEvidence(ctx context.Context, serviceID, containerID, containerName string) (*EvidenceBundle, error) {
	bundle := &EvidenceBundle{
		DeviceID:      serviceID,
		ContainerID:   containerID,
		ContainerName: containerName,
		Timestamp:     time.Now().Unix(),
	}

	// 1. Obtener logs del contenedor afectado (últimas 200 líneas)
	if containerID != "" {
		logsResp, err := repository.GetContainerLogs(ctx, containerID, 200, true, true, true)
		if err != nil {
			bundle.ContainerLogs = "Error al extraer logs del contenedor: " + err.Error()
		} else if logsResp != nil {
			bundle.ContainerLogs = strings.Join(logsResp.Lines, "\n")
		}
	}

	// 2. Obtener métricas del host
	hostMetrics, err := metrics.CollectHostMetrics(ctx)
	if err != nil {
		// Loguear o reportar error en la métrica
		bundle.HostMetrics = &systemPb.HostMetrics{}
	} else {
		bundle.HostMetrics = hostMetrics
	}

	// 3. Obtener logs del daemon Docker
	bundle.DockerLogs = collectDockerDaemonLogs()

	return bundle, nil
}

// CompressAndPublishEvidence comprime el bundle en JSON gzip y lo envía por NATS.
func CompressAndPublishEvidence(ctx context.Context, serviceID string, bundle *EvidenceBundle) error {
	jsonBytes, err := json.Marshal(bundle)
	if err != nil {
		return err
	}

	var buf bytes.Buffer
	gw := gzip.NewWriter(&buf)
	if _, err := gw.Write(jsonBytes); err != nil {
		return err
	}
	if err := gw.Close(); err != nil {
		return err
	}
	compressedBytes := buf.Bytes()

	event := &docker.ContainerEvidenceEvent{
		ServiceId:     bundle.DeviceID,
		ContainerId:   bundle.ContainerID,
		ContainerName: bundle.ContainerName,
		Timestamp:     bundle.Timestamp,
		Payload:       compressedBytes,
	}

	subject := events.EventSubject(events.SubjectContainerEvidence, serviceID)
	return events.Publish(subject, event)
}

// collectDockerDaemonLogs obtiene las últimas 200 líneas de logs de Docker usando journalctl u otras alternativas.
func collectDockerDaemonLogs() string {
	// 1. Intentar journalctl con servicio docker estándar
	cmd := exec.Command("journalctl", "-u", "docker", "-n", "200", "--no-pager")
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err == nil && out.Len() > 0 {
		return out.String()
	}

	// 2. Intentar journalctl con snap docker daemon
	out.Reset()
	cmdSnap := exec.Command("journalctl", "-u", "snap.docker.dockerd", "-n", "200", "--no-pager")
	cmdSnap.Stdout = &out
	if err := cmdSnap.Run(); err == nil && out.Len() > 0 {
		return out.String()
	}

	// 3. Intentar leer /var/log/docker.log directamente
	if data, err := os.ReadFile("/var/log/docker.log"); err == nil {
		lines := strings.Split(string(data), "\n")
		if len(lines) > 200 {
			lines = lines[len(lines)-200:]
		}
		return strings.Join(lines, "\n")
	}

	// 4. Intentar leer /var/log/upstart/docker.log directamente
	if data, err := os.ReadFile("/var/log/upstart/docker.log"); err == nil {
		lines := strings.Split(string(data), "\n")
		if len(lines) > 200 {
			lines = lines[len(lines)-200:]
		}
		return strings.Join(lines, "\n")
	}

	return "No se pudo acceder a los logs del daemon Docker (journalctl y archivos de log no disponibles/sin permisos)"
}
