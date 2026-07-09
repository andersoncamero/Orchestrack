package repository

import (
	"context"

	"github.com/go/orchestrack/backend/proto/docker"
)

// Repository define las operaciones disponibles sobre contenedores Docker.
type Repository interface {
	ListContainers(ctx context.Context, all bool) ([]*docker.ContainerSummary, error)
	GetContainer(ctx context.Context, id string) (*docker.Container, error)
	CreateContainer(ctx context.Context, req *docker.CreateContainerRequest) (*docker.CreateContainerResponse, error)
	StartContainer(ctx context.Context, id string) error
	StopContainer(ctx context.Context, id string, timeout int32) error
	RestartContainer(ctx context.Context, id string, timeout int32) error
	RenameContainer(ctx context.Context, id, newName string) error
	RemoveContainer(ctx context.Context, id string, force, removeVolumes bool) error
	ListImages(ctx context.Context, all bool) ([]*docker.ImageSummary, error)
	PullImage(ctx context.Context, image string) error
	RemoveImage(ctx context.Context, id string, force, pruneChildren bool) ([]string, error)

	// System/package operations.
	ListPackages(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error)
	RefreshPackages(ctx context.Context, dryRun bool) (*docker.RefreshPackagesResponse, error)
	UpgradePackages(ctx context.Context, dryRun, autoConfirm bool, packages []string) (*docker.UpgradePackagesResponse, error)
	RemovePackages(ctx context.Context, packages []string, purge, autoConfirm, dryRun bool) (*docker.RemovePackagesResponse, error)
	GetSystemInfo() *docker.SystemInfo

	// Process operations.
	SearchProcesses(ctx context.Context, query string, searchByPID bool, limit int32) (*docker.SearchProcessesResponse, error)

	Close() error
}

var implementation Repository

// SetRepository inyecta la implementación concreta del repositorio.
func SetRepository(repo Repository) {
	implementation = repo
}

// ListContainers delega en la implementación inyectada.
func ListContainers(ctx context.Context, all bool) ([]*docker.ContainerSummary, error) {
	return implementation.ListContainers(ctx, all)
}

// GetContainer delega en la implementación inyectada.
func GetContainer(ctx context.Context, id string) (*docker.Container, error) {
	return implementation.GetContainer(ctx, id)
}

// CreateContainer delega en la implementación inyectada.
func CreateContainer(ctx context.Context, req *docker.CreateContainerRequest) (*docker.CreateContainerResponse, error) {
	return implementation.CreateContainer(ctx, req)
}

// StartContainer delega en la implementación inyectada.
func StartContainer(ctx context.Context, id string) error {
	return implementation.StartContainer(ctx, id)
}

// StopContainer delega en la implementación inyectada.
func StopContainer(ctx context.Context, id string, timeout int32) error {
	return implementation.StopContainer(ctx, id, timeout)
}

// RestartContainer delega en la implementación inyectada.
func RestartContainer(ctx context.Context, id string, timeout int32) error {
	return implementation.RestartContainer(ctx, id, timeout)
}

// RenameContainer delega en la implementación inyectada.
func RenameContainer(ctx context.Context, id, newName string) error {
	return implementation.RenameContainer(ctx, id, newName)
}

// RemoveContainer delega en la implementación inyectada.
func RemoveContainer(ctx context.Context, id string, force, removeVolumes bool) error {
	return implementation.RemoveContainer(ctx, id, force, removeVolumes)
}

// ListImages delega en la implementación inyectada.
func ListImages(ctx context.Context, all bool) ([]*docker.ImageSummary, error) {
	return implementation.ListImages(ctx, all)
}

// PullImage delega en la implementación inyectada.
func PullImage(ctx context.Context, image string) error {
	return implementation.PullImage(ctx, image)
}

// RemoveImage delega en la implementación inyectada.
func RemoveImage(ctx context.Context, id string, force, pruneChildren bool) ([]string, error) {
	return implementation.RemoveImage(ctx, id, force, pruneChildren)
}

// ListPackages delega en la implementación inyectada.
func ListPackages(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error) {
	return implementation.ListPackages(ctx, query, upgradableOnly)
}

// RefreshPackages delega en la implementación inyectada.
func RefreshPackages(ctx context.Context, dryRun bool) (*docker.RefreshPackagesResponse, error) {
	return implementation.RefreshPackages(ctx, dryRun)
}

// UpgradePackages delega en la implementación inyectada.
func UpgradePackages(ctx context.Context, dryRun, autoConfirm bool, packages []string) (*docker.UpgradePackagesResponse, error) {
	return implementation.UpgradePackages(ctx, dryRun, autoConfirm, packages)
}

// RemovePackages delega en la implementación inyectada.
func RemovePackages(ctx context.Context, packages []string, purge, autoConfirm, dryRun bool) (*docker.RemovePackagesResponse, error) {
	return implementation.RemovePackages(ctx, packages, purge, autoConfirm, dryRun)
}

// GetSystemInfo delega en la implementación inyectada.
func GetSystemInfo() *docker.SystemInfo {
	return implementation.GetSystemInfo()
}

// SearchProcesses delega en la implementación inyectada.
func SearchProcesses(ctx context.Context, query string, searchByPID bool, limit int32) (*docker.SearchProcessesResponse, error) {
	return implementation.SearchProcesses(ctx, query, searchByPID, limit)
}

// Close cierra la implementación inyectada.
func Close() error {
	return implementation.Close()
}
