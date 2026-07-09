package docker

import (
	"context"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	"github.com/go/orchestrack/backend/orchestrack-agent/src/metrics"
	"github.com/go/orchestrack/backend/orchestrack-agent/src/system"
	"github.com/go/orchestrack/backend/proto/docker"
)

// ContainerRepository implementa repository.Repository usando el Docker SDK.
type ContainerRepository struct {
	client *client.Client
}

// NewContainerRepository crea una nueva instancia del repositorio.
func NewContainerRepository(client *client.Client) *ContainerRepository {
	return &ContainerRepository{client: client}
}

// ListContainers devuelve la lista de contenedores.
func (r *ContainerRepository) ListContainers(ctx context.Context, all bool) ([]*docker.ContainerSummary, error) {
	containers, err := r.client.ContainerList(ctx, container.ListOptions{All: all})
	if err != nil {
		return nil, err
	}

	summaries := make([]*docker.ContainerSummary, 0, len(containers))
	for _, c := range containers {
		summaries = append(summaries, mapContainerToSummary(c))
	}

	return summaries, nil
}

// GetContainer devuelve el detalle de un contenedor por ID o nombre.
func (r *ContainerRepository) GetContainer(ctx context.Context, id string) (*docker.Container, error) {
	inspect, err := r.client.ContainerInspect(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapContainerToProto(inspect), nil
}

// CreateContainer crea un contenedor sin iniciarlo.
func (r *ContainerRepository) CreateContainer(ctx context.Context, req *docker.CreateContainerRequest) (*docker.CreateContainerResponse, error) {
	config := &container.Config{
		Image:        req.Image,
		Cmd:          append([]string{req.Command}, req.Args...),
		Env:          mapEnvVars(req.Env),
		Labels:       mapLabels(req.Labels),
		Tty:          req.Tty,
		OpenStdin:    req.Interactive,
		ExposedPorts: mapExposedPorts(req.ExposedPorts),
	}

	hostConfig := &container.HostConfig{
		AutoRemove:      req.AutoRemove,
		PortBindings:    mapPortBindings(req.ExposedPorts),
		Binds:           mapBinds(req.Volumes),
		PublishAllPorts: req.PublishAllPorts,
	}

	resp, err := r.client.ContainerCreate(ctx, config, hostConfig, &network.NetworkingConfig{}, nil, req.Name)
	if err != nil {
		return nil, err
	}

	return &docker.CreateContainerResponse{
		Id:       resp.ID,
		Name:     req.Name,
		Warnings: resp.Warnings,
	}, nil
}

// StartContainer inicia un contenedor detenido.
func (r *ContainerRepository) StartContainer(ctx context.Context, id string) error {
	return r.client.ContainerStart(ctx, id, container.StartOptions{})
}

// StopContainer detiene un contenedor en ejecución.
func (r *ContainerRepository) StopContainer(ctx context.Context, id string, timeout int32) error {
	t := int(timeout)
	return r.client.ContainerStop(ctx, id, container.StopOptions{Timeout: &t})
}

// RestartContainer reinicia un contenedor.
func (r *ContainerRepository) RestartContainer(ctx context.Context, id string, timeout int32) error {
	t := int(timeout)
	return r.client.ContainerRestart(ctx, id, container.StopOptions{Timeout: &t})
}

// RenameContainer renombra un contenedor existente.
func (r *ContainerRepository) RenameContainer(ctx context.Context, id, newName string) error {
	return r.client.ContainerRename(ctx, id, newName)
}

// RemoveContainer elimina un contenedor.
func (r *ContainerRepository) RemoveContainer(ctx context.Context, id string, force, removeVolumes bool) error {
	return r.client.ContainerRemove(ctx, id, container.RemoveOptions{
		Force:         force,
		RemoveVolumes: removeVolumes,
	})
}

// Close cierra el cliente Docker.
func (r *ContainerRepository) Close() error {
	return r.client.Close()
}

// ---------- Operaciones del sistema ----------

// ListPackages lista los paquetes instalados en el host.
func (r *ContainerRepository) ListPackages(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error) {
	return system.ListPackages(ctx, query, upgradableOnly)
}

// RefreshPackages actualiza la lista de paquetes disponibles.
func (r *ContainerRepository) RefreshPackages(ctx context.Context, dryRun bool) (*docker.RefreshPackagesResponse, error) {
	return system.RefreshPackages(ctx, dryRun)
}

// UpgradePackages instala las actualizaciones disponibles.
func (r *ContainerRepository) UpgradePackages(ctx context.Context, dryRun, autoConfirm bool, packages []string) (*docker.UpgradePackagesResponse, error) {
	return system.UpgradePackages(ctx, dryRun, autoConfirm, packages)
}

// RemovePackages elimina los paquetes indicados del sistema.
func (r *ContainerRepository) RemovePackages(ctx context.Context, packages []string, purge, autoConfirm, dryRun bool) (*docker.RemovePackagesResponse, error) {
	return system.RemovePackages(ctx, packages, purge, autoConfirm, dryRun)
}

// GetSystemInfo devuelve información básica del sistema operativo.
func (r *ContainerRepository) GetSystemInfo() *docker.SystemInfo {
	return system.GetSystemInfo()
}

// SearchProcesses busca procesos en el host por nombre o PID.
func (r *ContainerRepository) SearchProcesses(ctx context.Context, query string, searchByPID bool, limit int32) (*docker.SearchProcessesResponse, error) {
	processes, total, err := metrics.SearchProcesses(ctx, query, searchByPID, int(limit))
	if err != nil {
		return nil, err
	}
	return &docker.SearchProcessesResponse{
		Processes: processes,
		Total:     total,
	}, nil
}

// ListImages devuelve la lista de imágenes Docker disponibles en el host.
func (r *ContainerRepository) ListImages(ctx context.Context, all bool) ([]*docker.ImageSummary, error) {
	images, err := r.client.ImageList(ctx, image.ListOptions{All: all})
	if err != nil {
		return nil, err
	}

	summaries := make([]*docker.ImageSummary, 0, len(images))
	for _, img := range images {
		summaries = append(summaries, mapImageToSummary(img))
	}

	return summaries, nil
}

// PullImage descarga una imagen del registry.
func (r *ContainerRepository) PullImage(ctx context.Context, imageRef string) error {
	reader, err := r.client.ImagePull(ctx, imageRef, image.PullOptions{})
	if err != nil {
		return err
	}
	defer reader.Close()
	_, _ = io.Copy(io.Discard, reader)
	return nil
}

// RemoveImage elimina una imagen del host.
func (r *ContainerRepository) RemoveImage(ctx context.Context, id string, force, pruneChildren bool) ([]string, error) {
	resp, err := r.client.ImageRemove(ctx, id, image.RemoveOptions{
		Force:         force,
		PruneChildren: pruneChildren,
	})
	if err != nil {
		return nil, err
	}
	deleted := make([]string, 0, len(resp))
	for _, d := range resp {
		if d.Deleted != "" {
			deleted = append(deleted, d.Deleted)
		}
	}
	return deleted, nil
}

// ---------- Helpers de mapeo ----------

func mapContainerToSummary(c types.Container) *docker.ContainerSummary {
	ports := make([]*docker.Port, 0, len(c.Ports))
	for _, p := range c.Ports {
		ports = append(ports, &docker.Port{
			Ip:          p.IP,
			PrivatePort: int32(p.PrivatePort),
			PublicPort:  int32(p.PublicPort),
			Type:        p.Type,
		})
	}

	name := ""
	if len(c.Names) > 0 {
		name = c.Names[0]
		if name[0] == '/' {
			name = name[1:]
		}
	}

	return &docker.ContainerSummary{
		Id:      c.ID,
		Name:    name,
		Image:   c.Image,
		Status:  mapContainerStatus(c.State),
		State:   c.State,
		Ports:   ports,
		Created: c.Created,
	}
}

func mapContainerToProto(c container.InspectResponse) *docker.Container {
	ports := make([]*docker.Port, 0)
	for portAndProtocol, bindings := range c.NetworkSettings.Ports {
		for _, b := range bindings {
			ports = append(ports, &docker.Port{
				Ip:          b.HostIP,
				PrivatePort: int32(portAndProtocol.Int()),
				PublicPort:  parsePort(b.HostPort),
				Type:        portAndProtocol.Proto(),
			})
		}
	}

	envs := make([]*docker.EnvVar, 0)
	for _, e := range c.Config.Env {
		key, value, _ := strings.Cut(e, "=")
		envs = append(envs, &docker.EnvVar{Key: key, Value: value})
	}

	volumes := make([]*docker.VolumeMount, 0)
	for _, mount := range c.Mounts {
		volumes = append(volumes, &docker.VolumeMount{
			Source:   mount.Source,
			Target:   mount.Destination,
			Type:     string(mount.Type),
			ReadOnly: !mount.RW,
		})
	}

	labels := make([]*docker.Label, 0, len(c.Config.Labels))
	for k, v := range c.Config.Labels {
		labels = append(labels, &docker.Label{Key: k, Value: v})
	}

	name := c.Name
	if len(name) > 0 && name[0] == '/' {
		name = name[1:]
	}

	return &docker.Container{
		Id:          c.ID,
		Name:        name,
		Image:       c.Config.Image,
		Status:      mapContainerStatus(c.State.Status),
		State:       c.State.Status,
		Command:     c.Path,
		Args:        c.Args,
		Env:         envs,
		Ports:       ports,
		Volumes:     volumes,
		Labels:      labels,
		Tty:         c.Config.Tty,
		Interactive: c.Config.OpenStdin,
		AutoRemove:  c.HostConfig.AutoRemove,
		Created:     parseCreated(c.Created),
		Platform:    c.Platform,
	}
}

func mapImageToSummary(img image.Summary) *docker.ImageSummary {
	labels := make([]string, 0, len(img.Labels))
	for k, v := range img.Labels {
		labels = append(labels, fmt.Sprintf("%s=%s", k, v))
	}

	return &docker.ImageSummary{
		Id:          img.ID,
		RepoTags:    img.RepoTags,
		Created:     img.Created,
		Size:        img.Size,
		SharedSize:  img.SharedSize,
		VirtualSize: img.VirtualSize,
		Labels:      labels,
	}
}

func mapContainerStatus(state string) docker.ContainerStatus {
	switch state {
	case "created":
		return docker.ContainerStatus_CONTAINER_STATUS_CREATED
	case "running":
		return docker.ContainerStatus_CONTAINER_STATUS_RUNNING
	case "paused":
		return docker.ContainerStatus_CONTAINER_STATUS_PAUSED
	case "restarting":
		return docker.ContainerStatus_CONTAINER_STATUS_RESTARTING
	case "removing":
		return docker.ContainerStatus_CONTAINER_STATUS_REMOVING
	case "exited", "dead":
		return docker.ContainerStatus_CONTAINER_STATUS_EXITED
	default:
		return docker.ContainerStatus_CONTAINER_STATUS_UNSPECIFIED
	}
}

func parsePort(s string) int32 {
	if s == "" {
		return 0
	}
	var p int
	_, err := fmt.Sscanf(s, "%d", &p)
	if err != nil {
		return 0
	}
	return int32(p)
}

func parseCreated(s string) int64 {
	if s == "" {
		return 0
	}
	// Docker devuelve la fecha en formato RFC3339Nano (ej: 2026-06-26T20:36:25.466377217Z).
	if t, err := time.Parse(time.RFC3339Nano, s); err == nil {
		return t.Unix()
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.Unix()
	}
	// Fallback por si alguna vez llega como timestamp numérico.
	if ts, err := strconv.ParseInt(s, 10, 64); err == nil {
		return ts
	}
	return 0
}

func mapEnvVars(vars []*docker.EnvVar) []string {
	result := make([]string, 0, len(vars))
	for _, v := range vars {
		result = append(result, fmt.Sprintf("%s=%s", v.Key, v.Value))
	}
	return result
}

func mapLabels(labels []*docker.Label) map[string]string {
	result := make(map[string]string, len(labels))
	for _, l := range labels {
		result[l.Key] = l.Value
	}
	return result
}

func mapExposedPorts(ports []*docker.Port) nat.PortSet {
	result := make(nat.PortSet, len(ports))
	for _, p := range ports {
		port, err := nat.NewPort(defaultPortType(p.Type), fmt.Sprintf("%d", p.PrivatePort))
		if err != nil {
			continue
		}
		result[port] = struct{}{}
	}
	return result
}

func mapPortBindings(ports []*docker.Port) nat.PortMap {
	result := make(nat.PortMap, len(ports))
	for _, p := range ports {
		port, err := nat.NewPort(defaultPortType(p.Type), fmt.Sprintf("%d", p.PrivatePort))
		if err != nil {
			continue
		}
		result[port] = append(result[port], nat.PortBinding{
			HostIP:   p.Ip,
			HostPort: fmt.Sprintf("%d", p.PublicPort),
		})
	}
	return result
}

func defaultPortType(t string) string {
	if t == "" {
		return "tcp"
	}
	return t
}

func mapBinds(volumes []*docker.VolumeMount) []string {
	result := make([]string, 0, len(volumes))
	for _, v := range volumes {
		bind := fmt.Sprintf("%s:%s", v.Source, v.Target)
		if v.ReadOnly {
			bind += ":ro"
		}
		result = append(result, bind)
	}
	return result
}
