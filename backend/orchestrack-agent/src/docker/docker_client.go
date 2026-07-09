package docker

import (
	"github.com/docker/docker/client"
)

// NewDockerClient crea un cliente del Docker SDK usando la configuración por defecto.
func NewDockerClient() (*client.Client, error) {
	return client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
}
