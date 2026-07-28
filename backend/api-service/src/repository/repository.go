package repository

import (
	"context"

	"github.com/go/orchestrack/backend/api-service/src/models"
)

// Repository define las operaciones de persistencia de usuarios, dispositivos y eventos.
type Repository interface {
	// Usuarios
	InsertUser(ctx context.Context, user *models.User) error
	GetUserById(ctx context.Context, id string) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)

	// Dispositivos
	SaveDevice(ctx context.Context, device *models.Device) error
	GetDeviceByServiceID(ctx context.Context, serviceID string) (*models.Device, error)
	ListDevices(ctx context.Context) ([]*models.Device, error)

	// Eventos
	InsertEvent(ctx context.Context, event *models.Event) error
	ListEventsByDevice(ctx context.Context, deviceID string, limit int) ([]*models.Event, error)

	// Eventos de Contenedores
	InsertContainerEvent(ctx context.Context, event *models.ContainerEvent) error
	ListContainerEventsByContainer(ctx context.Context, deviceID, containerID string, limit, offset int) ([]*models.ContainerEvent, error)

	// Alertas
	InsertAlert(ctx context.Context, alert *models.Alert) error

	// Métricas de Red
	InsertDeviceNetworkMetric(ctx context.Context, metric *models.DeviceNetworkMetric) error
	ListDeviceNetworkMetrics(ctx context.Context, deviceID string, limit int) ([]*models.DeviceNetworkMetric, error)

	// Tokens de Registro
	CreateRegistrationToken(ctx context.Context, token *models.RegistrationToken) error
	GetRegistrationToken(ctx context.Context, tokenStr string) (*models.RegistrationToken, error)
	UpdateRegistrationToken(ctx context.Context, token *models.RegistrationToken) error
	DeleteExpiredRegistrationTokens(ctx context.Context) error

	Close() error
}

var implementation Repository

// SetRepository inyecta la implementación concreta del repositorio.
func SetRepository(repo Repository) {
	implementation = repo
}

// InsertUser delega en la implementación inyectada.
func InsertUser(ctx context.Context, user *models.User) error {
	return implementation.InsertUser(ctx, user)
}

// GetUserById delega en la implementación inyectada.
func GetUserById(ctx context.Context, id string) (*models.User, error) {
	return implementation.GetUserById(ctx, id)
}

// GetUserByEmail delega en la implementación inyectada.
func GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return implementation.GetUserByEmail(ctx, email)
}

// SaveDevice delega en la implementación inyectada.
func SaveDevice(ctx context.Context, device *models.Device) error {
	return implementation.SaveDevice(ctx, device)
}

// GetDeviceByServiceID delega en la implementación inyectada.
func GetDeviceByServiceID(ctx context.Context, serviceID string) (*models.Device, error) {
	return implementation.GetDeviceByServiceID(ctx, serviceID)
}

// ListDevices delega en la implementación inyectada.
func ListDevices(ctx context.Context) ([]*models.Device, error) {
	return implementation.ListDevices(ctx)
}

// InsertEvent delega en la implementación inyectada.
func InsertEvent(ctx context.Context, event *models.Event) error {
	return implementation.InsertEvent(ctx, event)
}

// ListEventsByDevice delega en la implementación inyectada.
func ListEventsByDevice(ctx context.Context, deviceID string, limit int) ([]*models.Event, error) {
	return implementation.ListEventsByDevice(ctx, deviceID, limit)
}

// InsertContainerEvent delega en la implementación inyectada.
func InsertContainerEvent(ctx context.Context, event *models.ContainerEvent) error {
	return implementation.InsertContainerEvent(ctx, event)
}

// ListContainerEventsByContainer delega en la implementación inyectada.
func ListContainerEventsByContainer(ctx context.Context, deviceID, containerID string, limit, offset int) ([]*models.ContainerEvent, error) {
	return implementation.ListContainerEventsByContainer(ctx, deviceID, containerID, limit, offset)
}

// InsertAlert delega en la implementación inyectada.
func InsertAlert(ctx context.Context, alert *models.Alert) error {
	return implementation.InsertAlert(ctx, alert)
}

// CreateRegistrationToken delega en la implementación inyectada.
func CreateRegistrationToken(ctx context.Context, token *models.RegistrationToken) error {
	return implementation.CreateRegistrationToken(ctx, token)
}

// GetRegistrationToken delega en la implementación inyectada.
func GetRegistrationToken(ctx context.Context, tokenStr string) (*models.RegistrationToken, error) {
	return implementation.GetRegistrationToken(ctx, tokenStr)
}

// UpdateRegistrationToken delega en la implementación inyectada.
func UpdateRegistrationToken(ctx context.Context, token *models.RegistrationToken) error {
	return implementation.UpdateRegistrationToken(ctx, token)
}

// DeleteExpiredRegistrationTokens delega en la implementación inyectada.
func DeleteExpiredRegistrationTokens(ctx context.Context) error {
	return implementation.DeleteExpiredRegistrationTokens(ctx)
}

// InsertDeviceNetworkMetric delega en la implementación inyectada.
func InsertDeviceNetworkMetric(ctx context.Context, metric *models.DeviceNetworkMetric) error {
	return implementation.InsertDeviceNetworkMetric(ctx, metric)
}

// ListDeviceNetworkMetrics delega en la implementación inyectada.
func ListDeviceNetworkMetrics(ctx context.Context, deviceID string, limit int) ([]*models.DeviceNetworkMetric, error) {
	return implementation.ListDeviceNetworkMetrics(ctx, deviceID, limit)
}

// Close cierra la implementación inyectada.
func Close() error {
	return implementation.Close()
}
