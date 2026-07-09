package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/go/orchestrack/backend/orchestrack-agent/src/repository"
	"github.com/go/orchestrack/backend/events"
	"github.com/go/orchestrack/backend/proto/docker"
	"google.golang.org/protobuf/proto"
)

// NATSCommandHandler escucha comandos NATS y los ejecuta contra Docker.
type NATSCommandHandler struct {
	serviceID string
	hostname  string
	logger    *slog.Logger
	subs      []*events.Subscription
}

// NewNATSCommandHandler crea un nuevo manejador de comandos.
func NewNATSCommandHandler(serviceID, hostname string, logger *slog.Logger) (*NATSCommandHandler, error) {
	return &NATSCommandHandler{
		serviceID: serviceID,
		hostname:  hostname,
		logger:    logger,
		subs:      make([]*events.Subscription, 0),
	}, nil
}

// Subscribe se suscribe a los comandos dirigidos por ID y hostname.
func (h *NATSCommandHandler) Subscribe() error {
	identifiers := []string{h.serviceID, h.hostname}

	commands := []struct {
		template string
		handler  func(context.Context, []byte) ([]byte, error)
	}{
		{events.SubjectCommandListContainers, h.handleListContainers},
		{events.SubjectCommandGetContainer, h.handleGetContainer},
		{events.SubjectCommandCreateContainer, h.handleCreateContainer},
		{events.SubjectCommandStartContainer, h.handleStartContainer},
		{events.SubjectCommandStopContainer, h.handleStopContainer},
		{events.SubjectCommandRestartContainer, h.handleRestartContainer},
		{events.SubjectCommandRenameContainer, h.handleRenameContainer},
		{events.SubjectCommandRemoveContainer, h.handleRemoveContainer},
		{events.SubjectCommandListImages, h.handleListImages},
		{events.SubjectCommandPullImage, h.handlePullImage},
		{events.SubjectCommandRemoveImage, h.handleRemoveImage},
		{events.SubjectCommandListPackages, h.handleListPackages},
		{events.SubjectCommandRefreshPackages, h.handleRefreshPackages},
		{events.SubjectCommandUpgradePackages, h.handleUpgradePackages},
		{events.SubjectCommandRemovePackages, h.handleRemovePackages},
		{events.SubjectCommandGetSystemInfo, h.handleGetSystemInfo},
		{events.SubjectCommandSearchProcesses, h.handleSearchProcesses},
	}

	for _, id := range identifiers {
		for _, cmd := range commands {
			subject := events.CommandSubject(cmd.template, id)
			cmdHandler := cmd.handler
			sub, err := events.SubscribeRequest(subject, func(data []byte) []byte {
				resp, err := cmdHandler(context.Background(), data)
				return h.buildResponse(resp, err)
			})
			if err != nil {
				return fmt.Errorf("failed to subscribe to %s: %w", subject, err)
			}
			h.subs = append(h.subs, sub)
			h.logger.Debug("subscribed to command", "subject", subject)
		}
	}

	return nil
}

// Close cancela las suscripciones.
func (h *NATSCommandHandler) Close() {
	for _, sub := range h.subs {
		_ = sub.Unsubscribe()
	}
}

func (h *NATSCommandHandler) handleListContainers(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.ListContainersRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	resp, err := repository.ListContainers(ctx, req.All)
	if err != nil {
		return nil, err
	}
	return proto.Marshal(&docker.ListContainersResponse{Containers: resp})
}

func (h *NATSCommandHandler) handleGetContainer(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.GetContainerRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	resp, err := repository.GetContainer(ctx, req.Id)
	if err != nil {
		return nil, err
	}
	return proto.Marshal(&docker.GetContainerResponse{Container: resp})
}

func (h *NATSCommandHandler) handleCreateContainer(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.CreateContainerRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	resp, err := repository.CreateContainer(ctx, &req)
	if err != nil {
		return nil, err
	}

	h.publishEvent(events.SubjectContainerCreated, &docker.ContainerCreatedEvent{
		ServiceId: h.serviceID,
		Id:        resp.Id,
		Name:      req.Name,
		Image:     req.Image,
		CreatedAt: time.Now().Unix(),
	})

	return proto.Marshal(resp)
}

func (h *NATSCommandHandler) handleStartContainer(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.StartContainerRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	if err := repository.StartContainer(ctx, req.Id); err != nil {
		return nil, err
	}

	h.publishEvent(events.SubjectContainerStarted, &docker.ContainerStartedEvent{
		ServiceId: h.serviceID,
		Id:        req.Id,
		Timestamp: time.Now().Unix(),
	})

	return proto.Marshal(&docker.StartContainerResponse{Id: req.Id})
}

func (h *NATSCommandHandler) handleStopContainer(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.StopContainerRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	if err := repository.StopContainer(ctx, req.Id, req.TimeoutSeconds); err != nil {
		return nil, err
	}

	h.publishEvent(events.SubjectContainerStopped, &docker.ContainerStoppedEvent{
		ServiceId: h.serviceID,
		Id:        req.Id,
		Timestamp: time.Now().Unix(),
	})

	return proto.Marshal(&docker.StopContainerResponse{Id: req.Id})
}

func (h *NATSCommandHandler) handleRestartContainer(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.RestartContainerRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	if err := repository.RestartContainer(ctx, req.Id, req.TimeoutSeconds); err != nil {
		return nil, err
	}

	h.publishEvent(events.SubjectContainerRestarted, &docker.ContainerRestartedEvent{
		ServiceId: h.serviceID,
		Id:        req.Id,
		Timestamp: time.Now().Unix(),
	})

	return proto.Marshal(&docker.RestartContainerResponse{Id: req.Id})
}

func (h *NATSCommandHandler) handleRenameContainer(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.RenameContainerRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}

	oldContainer, err := repository.GetContainer(ctx, req.Id)
	oldName := ""
	if err == nil && oldContainer != nil {
		oldName = oldContainer.Name
	}

	if err := repository.RenameContainer(ctx, req.Id, req.NewName); err != nil {
		return nil, err
	}

	h.publishEvent(events.SubjectContainerRenamed, &docker.ContainerRenamedEvent{
		ServiceId: h.serviceID,
		Id:        req.Id,
		OldName:   oldName,
		NewName:   req.NewName,
		Timestamp: time.Now().Unix(),
	})

	return proto.Marshal(&docker.RenameContainerResponse{Id: req.Id, Name: req.NewName})
}

func (h *NATSCommandHandler) handleListImages(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.ListImagesRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	resp, err := repository.ListImages(ctx, req.All)
	if err != nil {
		return nil, err
	}
	return proto.Marshal(&docker.ListImagesResponse{Images: resp})
}

func (h *NATSCommandHandler) handlePullImage(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.PullImageRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	if err := repository.PullImage(ctx, req.Image); err != nil {
		return nil, err
	}
	h.publishEvent(events.SubjectImagePulled, &docker.ImagePulledEvent{
		ServiceId: h.serviceID,
		Image:     req.Image,
		Timestamp: time.Now().Unix(),
	})
	return proto.Marshal(&docker.PullImageResponse{Image: req.Image})
}

func (h *NATSCommandHandler) handleRemoveImage(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.RemoveImageRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	deleted, err := repository.RemoveImage(ctx, req.Id, req.Force, req.PruneChildren)
	if err != nil {
		return nil, err
	}
	h.publishEvent(events.SubjectImageRemoved, &docker.ImageRemovedEvent{
		ServiceId: h.serviceID,
		Id:        req.Id,
		Timestamp: time.Now().Unix(),
	})
	return proto.Marshal(&docker.RemoveImageResponse{Id: req.Id, Deleted: deleted})
}

func (h *NATSCommandHandler) handleRemoveContainer(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.RemoveContainerRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}

	container, err := repository.GetContainer(ctx, req.Id)
	name := ""
	if err == nil && container != nil {
		name = container.Name
	}

	if err := repository.RemoveContainer(ctx, req.Id, req.Force, req.RemoveVolumes); err != nil {
		return nil, err
	}

	h.publishEvent(events.SubjectContainerRemoved, &docker.ContainerRemovedEvent{
		ServiceId: h.serviceID,
		Id:        req.Id,
		Name:      name,
		Timestamp: time.Now().Unix(),
	})

	return proto.Marshal(&docker.RemoveContainerResponse{Id: req.Id})
}

func (h *NATSCommandHandler) handleListPackages(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.ListPackagesRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	resp, err := repository.ListPackages(ctx, req.Query, req.UpgradableOnly)
	if err != nil {
		return nil, err
	}
	return proto.Marshal(&docker.ListPackagesResponse{Packages: resp, Total: int32(len(resp))})
}

func (h *NATSCommandHandler) handleRefreshPackages(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.RefreshPackagesRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	resp, err := repository.RefreshPackages(ctx, req.DryRun)
	if err != nil {
		return nil, err
	}
	return proto.Marshal(resp)
}

func (h *NATSCommandHandler) handleUpgradePackages(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.UpgradePackagesRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	resp, err := repository.UpgradePackages(ctx, req.DryRun, req.AutoConfirm, req.Packages)
	if err != nil {
		return nil, err
	}
	return proto.Marshal(resp)
}

func (h *NATSCommandHandler) handleRemovePackages(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.RemovePackagesRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	resp, err := repository.RemovePackages(ctx, req.Packages, req.Purge, req.AutoConfirm, req.DryRun)
	if err != nil {
		return nil, err
	}
	return proto.Marshal(resp)
}

func (h *NATSCommandHandler) handleGetSystemInfo(ctx context.Context, data []byte) ([]byte, error) {
	return proto.Marshal(&docker.GetSystemInfoResponse{Info: repository.GetSystemInfo()})
}

func (h *NATSCommandHandler) handleSearchProcesses(ctx context.Context, data []byte) ([]byte, error) {
	var req docker.SearchProcessesRequest
	if err := proto.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	resp, err := repository.SearchProcesses(ctx, req.Query, req.SearchByPid, req.Limit)
	if err != nil {
		return nil, err
	}
	return proto.Marshal(resp)
}

func (h *NATSCommandHandler) publishEvent(template string, event proto.Message) {
	subject := events.EventSubject(template, h.serviceID)
	if err := events.Publish(subject, event); err != nil {
		h.logger.Warn("failed to publish event", "subject", subject, "error", err)
	}
}

// buildResponse envuelve la respuesta o el error en un CommandResponse.
func (h *NATSCommandHandler) buildResponse(payload []byte, err error) []byte {
	resp := &docker.CommandResponse{
		Success: err == nil,
	}
	if err != nil {
		resp.ErrorMessage = err.Error()
	} else {
		resp.Payload = payload
	}

	data, marshalErr := proto.Marshal(resp)
	if marshalErr != nil {
		h.logger.Error("failed to marshal command response", "error", marshalErr)
		return nil
	}
	return data
}
