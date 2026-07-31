package handlers

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/go/orchestrack/backend/api-service/src/cache"
	"github.com/go/orchestrack/backend/api-service/src/commander"
	"github.com/go/orchestrack/backend/api-service/src/engine"
	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/go/orchestrack/backend/api-service/src/websocket"
	"github.com/go/orchestrack/backend/events"
	"github.com/go/orchestrack/backend/proto/docker"
	"google.golang.org/protobuf/proto"
)

var (
	sincronizadosInicio     sync.Map
	lastNetworkMetricSaveMap sync.Map
)

// SubscribeContainerEvents se suscribe a eventos de contenedores y heartbeats.
// Si se proporciona un Hub, los eventos se reenvían a los clientes WebSocket.
func SubscribeContainerEvents(registry *cache.Registry, history *cache.ConnectionHistory, hub *websocket.Hub, logger *slog.Logger) error {
	if hub != nil {
		engine.GetCorrelationEngine().SetHub(hub)
	}

	if err := subscribeHeartbeats(registry, history, hub, logger); err != nil {
		return err
	}

	if err := subscribeContainerCreated(registry, hub, logger); err != nil {
		return err
	}
	if err := subscribeContainerStarted(registry, hub, logger); err != nil {
		return err
	}
	if err := subscribeContainerStopped(registry, hub, logger); err != nil {
		return err
	}
	if err := subscribeContainerRestarted(registry, hub, logger); err != nil {
		return err
	}
	if err := subscribeContainerRenamed(registry, hub, logger); err != nil {
		return err
	}
	if err := subscribeContainerRemoved(registry, hub, logger); err != nil {
		return err
	}
	if err := subscribeContainerEvent(hub, logger); err != nil {
		return err
	}
	if err := subscribeContainerEvidence(hub, logger); err != nil {
		return err
	}

	return nil
}

func broadcastEvent(hub *websocket.Hub, room string, eventType string, payload interface{}) {
	if hub == nil {
		return
	}
	hub.Broadcast(room, map[string]interface{}{
		"type":    eventType,
		"payload": payload,
	})

	if room == "containers" {
		if m, ok := payload.(map[string]interface{}); ok {
			if serviceId, has := m["service_id"]; has {
				if serviceIdStr, isStr := serviceId.(string); isStr && serviceIdStr != "" {
					hub.Broadcast("containers:"+serviceIdStr, map[string]interface{}{
						"type":    eventType,
						"payload": payload,
					})
				}
			}
		}
	}
}

// SincronizarContenedoresDevice consulta los contenedores actuales de un dispositivo vía NATS
// y actualiza los contadores (total, running, stopped) directamente en la base de datos PostgreSQL.
func SincronizarContenedoresDevice(ctx context.Context, serviceID string, registry *cache.Registry, logger *slog.Logger) error {
	// Construir mapa de resolución de hostnames a partir del registro
	regMap := make(map[string]string)
	for _, svc := range registry.List() {
		regMap[svc.Hostname] = svc.ServiceID
	}

	// Consultar de forma síncrona al agente vía NATS
	ctxTimeout, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	resp, err := commander.ListContainers(ctxTimeout, serviceID, regMap, &docker.ListContainersRequest{All: true})
	if err != nil {
		return fmt.Errorf("failed to fetch containers from NATS for service_id %s: %w", serviceID, err)
	}

	total := len(resp.Containers)
	var running, stopped int
	for _, cs := range resp.Containers {
		if cs.State == "running" {
			running++
		} else {
			stopped++
		}
	}

	// Obtener el dispositivo de la base de datos
	dev, err := repository.GetDeviceByServiceID(ctx, serviceID)
	if err != nil {
		return fmt.Errorf("failed to get device from db: %w", err)
	}
	if dev == nil {
		return fmt.Errorf("device not found in db: %s", serviceID)
	}

	// Actualizar contadores
	dev.TotalContainers = total
	dev.RunningContainers = running
	dev.StoppedContainers = stopped

	// Guardar el dispositivo actualizado en la base de datos
	if err := repository.SaveDevice(ctx, dev); err != nil {
		return fmt.Errorf("failed to save device containers count to db: %w", err)
	}

	logger.Debug("synchronized device containers to database", "service_id", serviceID, "total", total, "running", running, "stopped", stopped)
	return nil
}

func broadcastInstanceContainersUpdated(hub *websocket.Hub, serviceID string) {
	if hub == nil {
		return
	}

	// Leer el dispositivo de la base de datos local para tener los números actualizados
	dev, err := repository.GetDeviceByServiceID(context.Background(), serviceID)
	if err != nil || dev == nil {
		return
	}

	broadcastEvent(hub, "dashboard", "instance.containers_updated", map[string]interface{}{
		"service_id": serviceID,
		"total":      dev.TotalContainers,
		"running":    dev.RunningContainers,
		"stopped":    dev.StoppedContainers,
	})
}

func subscribeHeartbeats(registry *cache.Registry, history *cache.ConnectionHistory, hub *websocket.Hub, logger *slog.Logger) error {
	_, err := events.SubscribeAsync(events.SubjectDockerServiceHeartbeat, func(data []byte) {
		var heartbeat docker.DockerServiceHeartbeat
		if err := proto.Unmarshal(data, &heartbeat); err != nil {
			logger.Warn("failed to unmarshal heartbeat", "error", err)
			return
		}

		currentStatus := "offline"
		if dev, err := repository.GetDeviceByServiceID(context.Background(), heartbeat.ServiceId); err == nil && dev != nil {
			currentStatus = dev.Status
		}

		statusToPersist := heartbeat.Status
		if currentStatus == "pending" {
			statusToPersist = "pending"
		}

		// Registrar estado en el Registry en memoria
		if statusToPersist == "online" {
			registry.Register(&cache.DockerServiceInfo{
				ServiceID:   heartbeat.ServiceId,
				Hostname:    heartbeat.Hostname,
				LastSeen:    heartbeat.Timestamp,
				HostMetrics: heartbeat.HostMetrics,
			})
		} else {
			registry.Deregister(heartbeat.ServiceId)
		}

		// Actualizar el historial de conexiones
		if currentStatus != statusToPersist && history != nil {
			if onlineCount, offlineCount, totalCount, err := GetConnectionStats(context.Background(), registry); err == nil {
				history.Record(heartbeat.Timestamp, onlineCount, offlineCount, totalCount)
			}
		}

		// Guardar estado en base de datos si ha cambiado
		if currentStatus != statusToPersist {
			dev, err := repository.GetDeviceByServiceID(context.Background(), heartbeat.ServiceId)
			if err == nil && dev != nil {
				dev.Status = statusToPersist
				dev.LastSeen = heartbeat.Timestamp
				if heartbeat.HostMetrics != nil {
					dev.CpuPercent = heartbeat.HostMetrics.CpuPercent
					dev.MemoryPercent = heartbeat.HostMetrics.MemoryPercent
					dev.DiskPercent = heartbeat.HostMetrics.DiskPercent
					dev.LoadAverage = heartbeat.HostMetrics.LoadAverage
					dev.UptimeSeconds = heartbeat.HostMetrics.UptimeSeconds
					dev.CpuCores = heartbeat.HostMetrics.CpuCores
					dev.MemoryTotal = heartbeat.HostMetrics.MemoryTotal
					dev.MemoryUsed = heartbeat.HostMetrics.MemoryUsed
					dev.DiskTotal = heartbeat.HostMetrics.DiskTotal
				dev.DiskUsed = heartbeat.HostMetrics.DiskUsed
				dev.Platform = heartbeat.HostMetrics.Platform
				dev.ProcessCount = heartbeat.HostMetrics.ProcessCount
			}
			if err := repository.SaveDevice(context.Background(), dev); err != nil {
				logger.Warn("failed to update device status in db", "error", err)
			}

			// Registrar evento de cambio de estado para reconstrucción del historial.
			if statusToPersist == "online" {
				if err := insertInstanceEvent(context.Background(), heartbeat.ServiceId, "instance.online", heartbeat.Timestamp); err != nil {
					logger.Warn("failed to insert instance.online event", "service_id", heartbeat.ServiceId, "error", err)
				}
			} else if statusToPersist == "offline" {
				if err := insertInstanceEvent(context.Background(), heartbeat.ServiceId, "instance.offline", heartbeat.Timestamp); err != nil {
					logger.Warn("failed to insert instance.offline event", "service_id", heartbeat.ServiceId, "error", err)
				}
			}
			}
		} else if statusToPersist == "online" {
			// Si sigue online, actualizar LastSeen y métricas en BD periódicamente
			dev, err := repository.GetDeviceByServiceID(context.Background(), heartbeat.ServiceId)
			if err == nil && dev != nil {
				dev.LastSeen = heartbeat.Timestamp
				if heartbeat.HostMetrics != nil {
					dev.CpuPercent = heartbeat.HostMetrics.CpuPercent
					dev.MemoryPercent = heartbeat.HostMetrics.MemoryPercent
					dev.DiskPercent = heartbeat.HostMetrics.DiskPercent
					dev.LoadAverage = heartbeat.HostMetrics.LoadAverage
					dev.UptimeSeconds = heartbeat.HostMetrics.UptimeSeconds
					dev.CpuCores = heartbeat.HostMetrics.CpuCores
					dev.MemoryTotal = heartbeat.HostMetrics.MemoryTotal
					dev.MemoryUsed = heartbeat.HostMetrics.MemoryUsed
					dev.DiskTotal = heartbeat.HostMetrics.DiskTotal
					dev.DiskUsed = heartbeat.HostMetrics.DiskUsed
					dev.Platform = heartbeat.HostMetrics.Platform
					dev.ProcessCount = heartbeat.HostMetrics.ProcessCount
				}
				_ = repository.SaveDevice(context.Background(), dev)
			}
		}

		// Persistir métricas de red únicamente cada 2 minutos por servidor para optimizar espacio en BD (DoD T-007 y T-008)
		if heartbeat.HostMetrics != nil {
			now := time.Now()
			shouldSave := false
			if val, ok := lastNetworkMetricSaveMap.Load(heartbeat.ServiceId); ok {
				if lastTime, ok := val.(time.Time); ok {
					if now.Sub(lastTime) >= 2*time.Minute {
						shouldSave = true
					}
				} else {
					shouldSave = true
				}
			} else {
				shouldSave = true
			}

			if shouldSave {
				lastNetworkMetricSaveMap.Store(heartbeat.ServiceId, now)
				netMetric := &models.DeviceNetworkMetric{
					DeviceID:          heartbeat.ServiceId,
					RxBytesPerSec:     heartbeat.HostMetrics.RxBytesPerSec,
					TxBytesPerSec:     heartbeat.HostMetrics.TxBytesPerSec,
					PacketsRecvPerSec: heartbeat.HostMetrics.PacketsRecvPerSec,
					PacketsSentPerSec: heartbeat.HostMetrics.PacketsSentPerSec,
					RttMs:             heartbeat.HostMetrics.RttMs,
					RecordedAt:        time.Unix(heartbeat.Timestamp, 0),
				}
				if err := repository.InsertDeviceNetworkMetric(context.Background(), netMetric); err != nil {
					logger.Warn("failed to insert device network metric", "service_id", heartbeat.ServiceId, "error", err)
				}
			}

			// Disparar alerta automática si la latencia RTT supera los 500ms (DoD T-007.4)
			if heartbeat.HostMetrics.RttMs > 500.0 {
				alertMsg := fmt.Sprintf("High network latency RTT on server %s: %.2f ms (threshold: 500ms)", heartbeat.Hostname, heartbeat.HostMetrics.RttMs)
				alert := &models.Alert{
					DeviceID: heartbeat.ServiceId,
					Type:     "high_latency",
					Message:  alertMsg,
					IsRead:   false,
				}
				if err := repository.InsertAlert(context.Background(), alert); err == nil {
					broadcastEvent(hub, "dashboard", "alert.created", alert)
					broadcastEvent(hub, "device:"+heartbeat.ServiceId, "alert.created", alert)
					_ = engine.GetCorrelationEngine().ProcessHostAlert(context.Background(), heartbeat.ServiceId, "high_latency", alertMsg, fmt.Sprintf("%d", alert.ID))
				}
			}
		}

		payload := map[string]interface{}{
			"service_id": heartbeat.ServiceId,
			"hostname":   heartbeat.Hostname,
			"status":     statusToPersist,
			"timestamp":  heartbeat.Timestamp,
		}
		if heartbeat.HostMetrics != nil {
			payload["host_metrics"] = heartbeat.HostMetrics
			payload["network_metrics"] = map[string]interface{}{
				"rx_bytes_per_sec":     heartbeat.HostMetrics.RxBytesPerSec,
				"tx_bytes_per_sec":     heartbeat.HostMetrics.TxBytesPerSec,
				"packets_recv_per_sec": heartbeat.HostMetrics.PacketsRecvPerSec,
				"packets_sent_per_sec": heartbeat.HostMetrics.PacketsSentPerSec,
				"rtt_ms":               heartbeat.HostMetrics.RttMs,
			}
		}
		broadcastEvent(hub, "dashboard", "heartbeat", payload)
		broadcastEvent(hub, "device:"+heartbeat.ServiceId, "heartbeat", payload)
		broadcastEvent(hub, "device:"+heartbeat.ServiceId, "network_metrics", payload)
		
		if currentStatus != "online" && currentStatus != "pending" && heartbeat.Status == "online" {
			broadcastEvent(hub, "dashboard", "instance.online", payload)
			broadcastEvent(hub, "device:"+heartbeat.ServiceId, "instance.online", payload)
		}

		// Sincronizar contenedores de forma asíncrona la primera vez que se ve online en esta sesión
		if statusToPersist == "online" {
			if _, yaSincronizado := sincronizadosInicio.Load(heartbeat.ServiceId); !yaSincronizado {
				sincronizadosInicio.Store(heartbeat.ServiceId, true)
				go func(serviceID string) {
					if err := SincronizarContenedoresDevice(context.Background(), serviceID, registry, logger); err != nil {
						logger.Warn("failed to sync containers on initial heartbeat online", "service_id", serviceID, "error", err)
						sincronizadosInicio.Delete(serviceID)
					} else {
						broadcastInstanceContainersUpdated(hub, serviceID)
					}
				}(heartbeat.ServiceId)
			}
		}
		logger.Debug("docker-service heartbeat processed", "service_id", heartbeat.ServiceId, "status", statusToPersist)
	})
	return err
}

func subscribeContainerCreated(registry *cache.Registry, hub *websocket.Hub, logger *slog.Logger) error {
	_, err := events.SubscribeAsync(events.EventSubject(events.SubjectContainerCreated, "*"), func(data []byte) {
		var event docker.ContainerCreatedEvent
		if err := proto.Unmarshal(data, &event); err != nil {
			logger.Warn("failed to unmarshal container created event", "error", err)
			return
		}

		// Persistir evento en base de datos
		payloadMap := map[string]interface{}{
			"id":         event.Id,
			"name":       event.Name,
			"image":      event.Image,
			"created_at": event.CreatedAt,
		}
		payloadBytes, _ := json.Marshal(payloadMap)
		evt := &models.Event{
			DeviceID:  event.ServiceId,
			Type:      "container.created",
			Payload:   string(payloadBytes),
			Timestamp: time.Unix(event.CreatedAt, 0),
		}
		if err := repository.InsertEvent(context.Background(), evt); err != nil {
			logger.Warn("failed to insert container created event", "error", err)
		}

		broadcastEvent(hub, "containers", "container.created", map[string]interface{}{
			"service_id": event.ServiceId,
			"id":         event.Id,
			"name":       event.Name,
			"image":      event.Image,
			"created_at": event.CreatedAt,
		})

		// Sincronizar contadores en base de datos y hacer broadcast
		go func(serviceID string) {
			if err := SincronizarContenedoresDevice(context.Background(), serviceID, registry, logger); err != nil {
				logger.Warn("failed to sync containers on created event", "service_id", serviceID, "error", err)
			} else {
				broadcastInstanceContainersUpdated(hub, serviceID)
			}
		}(event.ServiceId)

		logger.Debug("container created event received", "service_id", event.ServiceId, "id", event.Id)
	})
	return err
}

func subscribeContainerStarted(registry *cache.Registry, hub *websocket.Hub, logger *slog.Logger) error {
	_, err := events.SubscribeAsync(events.EventSubject(events.SubjectContainerStarted, "*"), func(data []byte) {
		var event docker.ContainerStartedEvent
		if err := proto.Unmarshal(data, &event); err != nil {
			logger.Warn("failed to unmarshal container started event", "error", err)
			return
		}

		// Persistir evento en base de datos
		payloadMap := map[string]interface{}{
			"id":        event.Id,
			"timestamp": event.Timestamp,
		}
		payloadBytes, _ := json.Marshal(payloadMap)
		evt := &models.Event{
			DeviceID:  event.ServiceId,
			Type:      "container.started",
			Payload:   string(payloadBytes),
			Timestamp: time.Unix(event.Timestamp, 0),
		}
		if err := repository.InsertEvent(context.Background(), evt); err != nil {
			logger.Warn("failed to insert container started event", "error", err)
		}

		broadcastEvent(hub, "containers", "container.started", map[string]interface{}{
			"service_id": event.ServiceId,
			"id":         event.Id,
			"timestamp":  event.Timestamp,
		})

		// Sincronizar contadores en base de datos y hacer broadcast
		go func(serviceID string) {
			if err := SincronizarContenedoresDevice(context.Background(), serviceID, registry, logger); err != nil {
				logger.Warn("failed to sync containers on started event", "service_id", serviceID, "error", err)
			} else {
				broadcastInstanceContainersUpdated(hub, serviceID)
			}
		}(event.ServiceId)

		logger.Debug("container started event received", "service_id", event.ServiceId, "id", event.Id)
	})
	return err
}

func subscribeContainerStopped(registry *cache.Registry, hub *websocket.Hub, logger *slog.Logger) error {
	_, err := events.SubscribeAsync(events.EventSubject(events.SubjectContainerStopped, "*"), func(data []byte) {
		var event docker.ContainerStoppedEvent
		if err := proto.Unmarshal(data, &event); err != nil {
			logger.Warn("failed to unmarshal container stopped event", "error", err)
			return
		}

		// Persistir evento en base de datos
		payloadMap := map[string]interface{}{
			"id":        event.Id,
			"timestamp": event.Timestamp,
		}
		payloadBytes, _ := json.Marshal(payloadMap)
		evt := &models.Event{
			DeviceID:  event.ServiceId,
			Type:      "container.stopped",
			Payload:   string(payloadBytes),
			Timestamp: time.Unix(event.Timestamp, 0),
		}
		if err := repository.InsertEvent(context.Background(), evt); err != nil {
			logger.Warn("failed to insert container stopped event", "error", err)
		}

		broadcastEvent(hub, "containers", "container.stopped", map[string]interface{}{
			"service_id": event.ServiceId,
			"id":         event.Id,
			"timestamp":  event.Timestamp,
		})

		// Sincronizar contadores en base de datos y hacer broadcast
		go func(serviceID string) {
			if err := SincronizarContenedoresDevice(context.Background(), serviceID, registry, logger); err != nil {
				logger.Warn("failed to sync containers on stopped event", "service_id", serviceID, "error", err)
			} else {
				broadcastInstanceContainersUpdated(hub, serviceID)
			}
		}(event.ServiceId)

		logger.Debug("container stopped event received", "service_id", event.ServiceId, "id", event.Id)
	})
	return err
}

func subscribeContainerRestarted(registry *cache.Registry, hub *websocket.Hub, logger *slog.Logger) error {
	_, err := events.SubscribeAsync(events.EventSubject(events.SubjectContainerRestarted, "*"), func(data []byte) {
		var event docker.ContainerRestartedEvent
		if err := proto.Unmarshal(data, &event); err != nil {
			logger.Warn("failed to unmarshal container restarted event", "error", err)
			return
		}

		// Persistir evento en base de datos
		payloadMap := map[string]interface{}{
			"id":        event.Id,
			"timestamp": event.Timestamp,
		}
		payloadBytes, _ := json.Marshal(payloadMap)
		evt := &models.Event{
			DeviceID:  event.ServiceId,
			Type:      "container.restarted",
			Payload:   string(payloadBytes),
			Timestamp: time.Unix(event.Timestamp, 0),
		}
		if err := repository.InsertEvent(context.Background(), evt); err != nil {
			logger.Warn("failed to insert container restarted event", "error", err)
		}

		broadcastEvent(hub, "containers", "container.restarted", map[string]interface{}{
			"service_id": event.ServiceId,
			"id":         event.Id,
			"timestamp":  event.Timestamp,
		})

		// Sincronizar contadores en base de datos y hacer broadcast
		go func(serviceID string) {
			if err := SincronizarContenedoresDevice(context.Background(), serviceID, registry, logger); err != nil {
				logger.Warn("failed to sync containers on restarted event", "service_id", serviceID, "error", err)
			} else {
				broadcastInstanceContainersUpdated(hub, serviceID)
			}
		}(event.ServiceId)

		logger.Debug("container restarted event received", "service_id", event.ServiceId, "id", event.Id)
	})
	return err
}

func subscribeContainerRenamed(registry *cache.Registry, hub *websocket.Hub, logger *slog.Logger) error {
	_, err := events.SubscribeAsync(events.EventSubject(events.SubjectContainerRenamed, "*"), func(data []byte) {
		var event docker.ContainerRenamedEvent
		if err := proto.Unmarshal(data, &event); err != nil {
			logger.Warn("failed to unmarshal container renamed event", "error", err)
			return
		}

		// Persistir evento en base de datos
		payloadMap := map[string]interface{}{
			"id":        event.Id,
			"old_name":  event.OldName,
			"new_name":  event.NewName,
			"timestamp": event.Timestamp,
		}
		payloadBytes, _ := json.Marshal(payloadMap)
		evt := &models.Event{
			DeviceID:  event.ServiceId,
			Type:      "container.renamed",
			Payload:   string(payloadBytes),
			Timestamp: time.Unix(event.Timestamp, 0),
		}
		if err := repository.InsertEvent(context.Background(), evt); err != nil {
			logger.Warn("failed to insert container renamed event", "error", err)
		}

		broadcastEvent(hub, "containers", "container.renamed", map[string]interface{}{
			"service_id": event.ServiceId,
			"id":         event.Id,
			"old_name":   event.OldName,
			"new_name":   event.NewName,
			"timestamp":  event.Timestamp,
		})

		logger.Debug("container renamed event received", "service_id", event.ServiceId, "id", event.Id)
	})
	return err
}

func subscribeContainerRemoved(registry *cache.Registry, hub *websocket.Hub, logger *slog.Logger) error {
	_, err := events.SubscribeAsync(events.EventSubject(events.SubjectContainerRemoved, "*"), func(data []byte) {
		var event docker.ContainerRemovedEvent
		if err := proto.Unmarshal(data, &event); err != nil {
			logger.Warn("failed to unmarshal container removed event", "error", err)
			return
		}

		// Persistir evento en base de datos
		payloadMap := map[string]interface{}{
			"id":        event.Id,
			"name":      event.Name,
			"timestamp": event.Timestamp,
		}
		payloadBytes, _ := json.Marshal(payloadMap)
		evt := &models.Event{
			DeviceID:  event.ServiceId,
			Type:      "container.removed",
			Payload:   string(payloadBytes),
			Timestamp: time.Unix(event.Timestamp, 0),
		}
		if err := repository.InsertEvent(context.Background(), evt); err != nil {
			logger.Warn("failed to insert container removed event", "error", err)
		}

		broadcastEvent(hub, "containers", "container.removed", map[string]interface{}{
			"service_id": event.ServiceId,
			"id":         event.Id,
			"name":       event.Name,
			"timestamp":  event.Timestamp,
		})

		// Sincronizar contadores en base de datos y hacer broadcast
		go func(serviceID string) {
			if err := SincronizarContenedoresDevice(context.Background(), serviceID, registry, logger); err != nil {
				logger.Warn("failed to sync containers on removed event", "service_id", serviceID, "error", err)
			} else {
				broadcastInstanceContainersUpdated(hub, serviceID)
			}
		}(event.ServiceId)

		logger.Debug("container removed event received", "service_id", event.ServiceId, "id", event.Id)
	})
	return err
}

// subscribeContainerEvent se suscribe a los eventos de ciclo de vida/fallo de contenedores
// publicados por los agentes, los persiste en base de datos, genera alertas para eventos
// críticos y los retransmite por WebSocket.
func subscribeContainerEvent(hub *websocket.Hub, logger *slog.Logger) error {
	_, err := events.SubscribeAsync(events.EventSubject(events.SubjectContainerEvent, "*"), func(data []byte) {
		var event docker.ContainerEvent
		if err := proto.Unmarshal(data, &event); err != nil {
			logger.Warn("failed to unmarshal container event", "error", err)
			return
		}

		// Persistir evento en base de datos
		evt := &models.ContainerEvent{
			DeviceID:      event.ServiceId,
			ContainerID:   event.ContainerId,
			ContainerName: event.ContainerName,
			Image:         event.Image,
			EventType:     event.EventType,
			ExitCode:      event.ExitCode,
			Reason:        event.Reason,
		}
		evt.CreatedAt = time.Unix(event.Timestamp, 0)
		if err := repository.InsertContainerEvent(context.Background(), evt); err != nil {
			logger.Warn("failed to insert container event", "error", err)
		}

		// Evaluar evento en el motor de correlación de causa raíz (T-010)
		_ = engine.GetCorrelationEngine().ProcessContainerEvent(context.Background(), event.ServiceId, evt)

		// Generar alerta no leída si el evento es crítico
		if isCriticalContainerEvent(event.EventType, event.ExitCode) {
			if err := repository.InsertAlert(context.Background(), buildContainerEventAlert(&event)); err != nil {
				logger.Warn("failed to insert container event alert", "error", err)
			}
		}

		// Retransmitir en tiempo real a la sala del dispositivo y al canal global de monitoreo
		payload := map[string]interface{}{
			"service_id":     event.ServiceId,
			"container_id":   event.ContainerId,
			"container_name": event.ContainerName,
			"image":          event.Image,
			"event_type":     event.EventType,
			"exit_code":      event.ExitCode,
			"reason":         event.Reason,
			"timestamp":      event.Timestamp,
		}
		broadcastEvent(hub, "device:"+event.ServiceId, "container.event", payload)
		broadcastEvent(hub, "dashboard", "container.event", payload)

		logger.Debug("container event received", "service_id", event.ServiceId, "container_id", event.ContainerId, "event_type", event.EventType)
	})
	return err
}

// isCriticalContainerEvent determina si un evento de contenedor debe generar una alerta.
func isCriticalContainerEvent(eventType string, exitCode int32) bool {
	return eventType == "oom" || exitCode != 0
}

// buildContainerEventAlert construye la alerta no leída asociada a un evento crítico.
func buildContainerEventAlert(event *docker.ContainerEvent) *models.Alert {
	message := fmt.Sprintf("container %s (%s) reported event %q with exit_code=%d", event.ContainerName, event.ContainerId, event.EventType, event.ExitCode)
	if event.Reason != "" {
		message += ": " + event.Reason
	}

	return &models.Alert{
		DeviceID:    event.ServiceId,
		ContainerID: event.ContainerId,
		Type:        "container." + event.EventType,
		Message:     message,
		IsRead:      false,
	}
}

// insertInstanceEvent persiste un evento de cambio de estado de instancia en la base de datos.
func insertInstanceEvent(ctx context.Context, serviceID, eventType string, timestamp int64) error {
	evt := &models.Event{
		DeviceID:  serviceID,
		Type:      eventType,
		Payload:   fmt.Sprintf(`{"status": %q}`, eventType),
		Timestamp: time.Unix(timestamp, 0).UTC(),
	}
	return repository.InsertEvent(ctx, evt)
}

// GetConnectionStats calcula los contadores de conexión usando la base de datos como fuente de verdad.
func GetConnectionStats(ctx context.Context, registry *cache.Registry) (onlineCount, offlineCount, totalCount int, err error) {
	devices, err := repository.ListDevices(ctx)
	if err != nil {
		return 0, 0, 0, err
	}

	for _, d := range devices {
		if d.Status != "pending" {
			totalCount++
		}
	}

	onlineCount, _, _ = registry.ConnectionCounts()
	if onlineCount > totalCount {
		onlineCount = totalCount
	}
	offlineCount = totalCount - onlineCount

	return onlineCount, offlineCount, totalCount, nil
}

// subscribeContainerEvidence se suscribe a los paquetes de evidencia enviados por los agentes.
// Descomprime el payload gzip, lo persiste en base de datos y notifica mediante WebSocket (T-024).
func subscribeContainerEvidence(hub *websocket.Hub, logger *slog.Logger) error {
	_, err := events.SubscribeAsync(events.EventSubject(events.SubjectContainerEvidence, "*"), func(data []byte) {
		var event docker.ContainerEvidenceEvent
		if err := proto.Unmarshal(data, &event); err != nil {
			logger.Warn("failed to unmarshal container evidence event", "error", err)
			return
		}

		logger.Info("recibido paquete de evidencia de contenedor", "service_id", event.ServiceId, "container_id", event.ContainerId)

		// 1. Encontrar el incidente abierto actualmente para este dispositivo
		openInc, err := repository.GetOpenIncidentByDevice(context.Background(), event.ServiceId)
		if err != nil {
			logger.Warn("error al buscar incidente para evidencia", "error", err)
			return
		}

		var incidentID string
		if openInc != nil {
			incidentID = openInc.ID
		} else {
			// Si no hay incidente abierto, buscamos el incidente más reciente
			incidents, err := repository.ListIncidents(context.Background(), event.ServiceId, "", 1)
			if err != nil || len(incidents) == 0 {
				logger.Warn("no se encontró ningún incidente asociado a la evidencia del dispositivo", "service_id", event.ServiceId)
				return
			}
			incidentID = incidents[0].ID
		}

		// 2. Descomprimir el payload gzip
		var uncompressed bytes.Buffer
		gr, err := gzip.NewReader(bytes.NewReader(event.Payload))
		if err != nil {
			logger.Warn("failed to create gzip reader for evidence payload", "error", err)
			return
		}
		if _, err := io.Copy(&uncompressed, gr); err != nil {
			logger.Warn("failed to decompress evidence payload", "error", err)
			gr.Close()
			return
		}
		gr.Close()

		// 3. Guardar en base de datos (T-023)
		evidence := &models.IncidentEvidence{
			IncidentID:   incidentID,
			DeviceID:     event.ServiceId,
			EvidenceType: "container_incident",
			PayloadJSON:  uncompressed.String(),
		}

		if err := repository.InsertIncidentEvidence(context.Background(), evidence); err != nil {
			logger.Warn("failed to insert incident evidence in DB", "error", err)
			return
		}

		// Contar artefactos recolectados
		var bundle struct {
			ContainerLogs string      `json:"container_logs"`
			DockerLogs    string      `json:"docker_logs"`
			HostMetrics   interface{} `json:"host_metrics"`
		}
		_ = json.Unmarshal(uncompressed.Bytes(), &bundle)

		artifactCount := 0
		if bundle.ContainerLogs != "" && !strings.Contains(bundle.ContainerLogs, "Error al extraer logs") {
			artifactCount++
		}
		if bundle.DockerLogs != "" && !strings.Contains(bundle.DockerLogs, "No se pudo acceder") {
			artifactCount++
		}
		if bundle.HostMetrics != nil {
			artifactCount++
		}

		// 4. Emitir evento WebSocket "evidence_ready" (T-024)
		websocketPayload := map[string]interface{}{
			"incident_id":    incidentID,
			"device_id":      event.ServiceId,
			"artifact_count": artifactCount,
			"timestamp":      time.Now().Unix(),
		}
		broadcastEvent(hub, "device:"+event.ServiceId, "evidence_ready", websocketPayload)
		broadcastEvent(hub, "dashboard", "evidence_ready", websocketPayload)

		logger.Info("paquete de evidencia procesado, guardado y notificado vía WebSocket", "incident_id", incidentID, "artifacts", artifactCount)
	})
	return err
}
