package commander

import (
	"github.com/go/orchestrack/backend/proto/system"
	"context"
	"fmt"

	"github.com/go/orchestrack/backend/events"
	"github.com/go/orchestrack/backend/proto/docker"
	"google.golang.org/protobuf/proto"
)

// execute envía un comando por NATS y deserializa la respuesta.
func execute(ctx context.Context, subject string, req proto.Message, resp proto.Message) error {
	cmdResp, err := request(ctx, subject, req)
	if err != nil {
		return err
	}
	if !cmdResp.Success {
		return fmt.Errorf("%s", cmdResp.ErrorMessage)
	}
	if err := proto.Unmarshal(cmdResp.Payload, resp); err != nil {
		return fmt.Errorf("failed to unmarshal response: %w", err)
	}
	return nil
}

// request envía un request y espera un CommandResponse.
func request(ctx context.Context, subject string, req proto.Message) (*docker.CommandResponse, error) {
	resp := &docker.CommandResponse{}
	if err := events.Request(ctx, subject, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

// resolveIdentifier devuelve el serviceID si es un hostname.
func resolveIdentifier(registry map[string]string, identifier string) string {
	if id, ok := registry[identifier]; ok {
		return id
	}
	return identifier
}

// ListContainers envía el comando list a una instancia de docker-service.
func ListContainers(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.ListContainersRequest) (*docker.ListContainersResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandListContainers, target)
	resp := &docker.ListContainersResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}
	return resp, nil
}

// GetContainer envía el comando get a una instancia de docker-service.
func GetContainer(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.GetContainerRequest) (*docker.GetContainerResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandGetContainer, target)
	resp := &docker.GetContainerResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to get container: %w", err)
	}
	return resp, nil
}

// GetContainerLogs envía el comando get container logs a una instancia de docker-service.
func GetContainerLogs(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.GetContainerLogsRequest) (*docker.GetContainerLogsResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandGetContainerLogs, target)
	resp := &docker.GetContainerLogsResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to get container logs: %w", err)
	}
	return resp, nil
}

// CreateContainer envía el comando create a una instancia de docker-service.
func CreateContainer(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.CreateContainerRequest) (*docker.CreateContainerResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandCreateContainer, target)
	resp := &docker.CreateContainerResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to create container: %w", err)
	}
	return resp, nil
}

// StartContainer envía el comando start a una instancia de docker-service.
func StartContainer(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.StartContainerRequest) (*docker.StartContainerResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandStartContainer, target)
	resp := &docker.StartContainerResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to start container: %w", err)
	}
	return resp, nil
}

// StopContainer envía el comando stop a una instancia de docker-service.
func StopContainer(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.StopContainerRequest) (*docker.StopContainerResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandStopContainer, target)
	resp := &docker.StopContainerResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to stop container: %w", err)
	}
	return resp, nil
}

// RestartContainer envía el comando restart a una instancia de docker-service.
func RestartContainer(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.RestartContainerRequest) (*docker.RestartContainerResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandRestartContainer, target)
	resp := &docker.RestartContainerResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to restart container: %w", err)
	}
	return resp, nil
}

// RenameContainer envía el comando rename a una instancia de docker-service.
func RenameContainer(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.RenameContainerRequest) (*docker.RenameContainerResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandRenameContainer, target)
	resp := &docker.RenameContainerResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to rename container: %w", err)
	}
	return resp, nil
}

// RemoveContainer envía el comando remove a una instancia de docker-service.
func RemoveContainer(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.RemoveContainerRequest) (*docker.RemoveContainerResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandRemoveContainer, target)
	resp := &docker.RemoveContainerResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to remove container: %w", err)
	}
	return resp, nil
}

// ListImages envía el comando list images a una instancia de docker-service.
func ListImages(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.ListImagesRequest) (*docker.ListImagesResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandListImages, target)
	resp := &docker.ListImagesResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}
	return resp, nil
}

// PullImage envía el comando pull image a una instancia de docker-service.
func PullImage(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.PullImageRequest) (*docker.PullImageResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandPullImage, target)
	resp := &docker.PullImageResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to pull image: %w", err)
	}
	return resp, nil
}

// RemoveImage envía el comando remove image a una instancia de docker-service.
func RemoveImage(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *docker.RemoveImageRequest) (*docker.RemoveImageResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandRemoveImage, target)
	resp := &docker.RemoveImageResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to remove image: %w", err)
	}
	return resp, nil
}

// ListPackages envía el comando list packages a una instancia de docker-service.
func ListPackages(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *system.ListPackagesRequest) (*system.ListPackagesResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandListPackages, target)
	resp := &system.ListPackagesResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to list packages: %w", err)
	}
	return resp, nil
}

// RefreshPackages envía el comando refresh packages a una instancia de docker-service.
func RefreshPackages(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *system.RefreshPackagesRequest) (*system.RefreshPackagesResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandRefreshPackages, target)
	resp := &system.RefreshPackagesResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to refresh packages: %w", err)
	}
	return resp, nil
}

// UpgradePackages envía el comando upgrade packages a una instancia de docker-service.
func UpgradePackages(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *system.UpgradePackagesRequest) (*system.UpgradePackagesResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandUpgradePackages, target)
	resp := &system.UpgradePackagesResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to upgrade packages: %w", err)
	}
	return resp, nil
}

// RemovePackages envía el comando remove packages a una instancia de docker-service.
func RemovePackages(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *system.RemovePackagesRequest) (*system.RemovePackagesResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandRemovePackages, target)
	resp := &system.RemovePackagesResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to remove packages: %w", err)
	}
	return resp, nil
}

// GetSystemInfo envía el comando get system info a una instancia de docker-service.
func GetSystemInfo(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *system.GetSystemInfoRequest) (*system.GetSystemInfoResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandGetSystemInfo, target)
	resp := &system.GetSystemInfoResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to get system info: %w", err)
	}
	return resp, nil
}

// SearchProcesses envía el comando search processes a una instancia de docker-service.
func SearchProcesses(ctx context.Context, identifier string, hostnameRegistry map[string]string, req *system.SearchProcessesRequest) (*system.SearchProcessesResponse, error) {
	target := resolveIdentifier(hostnameRegistry, identifier)
	subject := events.CommandSubject(events.SubjectCommandSearchProcesses, target)
	resp := &system.SearchProcessesResponse{}
	if err := execute(ctx, subject, req, resp); err != nil {
		return nil, fmt.Errorf("failed to search processes: %w", err)
	}
	return resp, nil
}
