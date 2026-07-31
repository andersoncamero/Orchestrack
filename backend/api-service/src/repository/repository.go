package repository

import (
	"context"
	"time"

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
	ListRecentAlertsByDevice(ctx context.Context, deviceID string, types []string, since time.Time, limit int) ([]*models.Alert, error)

	// Métricas de Red
	InsertDeviceNetworkMetric(ctx context.Context, metric *models.DeviceNetworkMetric) error
	ListDeviceNetworkMetrics(ctx context.Context, deviceID string, limit int) ([]*models.DeviceNetworkMetric, error)

	// Configuración del Sistema y Purga
	GetSystemSetting(ctx context.Context, key string) (string, error)
	SetSystemSetting(ctx context.Context, key, value string) error
	CleanupOldDeviceNetworkMetrics(ctx context.Context, retentionDays int) (int64, error)

	// Tokens de Registro
	CreateRegistrationToken(ctx context.Context, token *models.RegistrationToken) error
	GetRegistrationToken(ctx context.Context, tokenStr string) (*models.RegistrationToken, error)
	UpdateRegistrationToken(ctx context.Context, token *models.RegistrationToken) error
	DeleteExpiredRegistrationTokens(ctx context.Context) error

	// Incidentes y Análisis de Causa Raíz
	InsertIncident(ctx context.Context, incident *models.Incident) error
	UpdateIncident(ctx context.Context, incident *models.Incident) error
	GetIncidentByID(ctx context.Context, id string) (*models.Incident, error)
	GetOpenIncidentByDevice(ctx context.Context, deviceID string) (*models.Incident, error)
	ListIncidents(ctx context.Context, deviceID, status string, limit int) ([]*models.Incident, error)
	InsertIncidentEvent(ctx context.Context, event *models.IncidentEvent) error
	ListIncidentEvents(ctx context.Context, incidentID string) ([]*models.IncidentEvent, error)

	// Propagación de Fallas en Cascada (DoD T-014)
	InsertIncidentPropagation(ctx context.Context, propagation *models.IncidentPropagation) error
	ListIncidentPropagations(ctx context.Context, incidentID string) ([]*models.IncidentPropagation, error)
	ListRecentIncidentsByType(ctx context.Context, excludeDeviceID string, eventTypes []string, since time.Time, limit int) ([]*models.Incident, error)
	CountOpenIncidents(ctx context.Context) (int64, error)
	CountOpenContainerEvents(ctx context.Context, deviceIDs []string, since time.Time) (int64, error)

	// Dependencias multi-host y rutas de propagación (DoD T-015)
	UpsertServerDependency(ctx context.Context, dep *models.ServerDependency) error
	ListServerDependencies(ctx context.Context) ([]*models.ServerDependency, error)
	GetServerDependenciesForDevice(ctx context.Context, deviceID string) ([]*models.ServerDependency, error)
	InsertIncidentPropagationPath(ctx context.Context, path *models.IncidentPropagationPath) error
	ListIncidentPropagationPaths(ctx context.Context, incidentID string) ([]*models.IncidentPropagationPath, error)

	// Análisis de transacciones afectadas (DoD T-018)
	InsertAffectedTransaction(ctx context.Context, tx *models.AffectedTransaction) error
	ListAffectedTransactions(ctx context.Context, incidentID string) ([]*models.AffectedTransaction, error)
	CountAffectedTransactionsByCategory(ctx context.Context, incidentID string) (map[string]int64, error)

	// Historial de transacciones por servidor e incidente (DoD T-019)
	InsertServerTransaction(ctx context.Context, st *models.ServerTransaction) error
	GetOrCreateServerTransaction(ctx context.Context, deviceID, serviceName, endpoint string) (*models.ServerTransaction, error)
	GetServerTransactionByID(ctx context.Context, id string) (*models.ServerTransaction, error)
	ListServerTransactionsByDevice(ctx context.Context, deviceID string) ([]*models.ServerTransaction, error)
	InsertIncidentTransactionImpact(ctx context.Context, iti *models.IncidentTransactionImpact) error
	ListIncidentTransactionImpacts(ctx context.Context, incidentID string) ([]*models.IncidentTransactionImpact, error)

	// Topología de contenedores por host (DoD T-026)
	InsertContainerDependency(ctx context.Context, dep *models.ContainerDependency) error
	DeleteContainerDependenciesByDevice(ctx context.Context, deviceID string) error
	ListContainerDependenciesByDevice(ctx context.Context, deviceID string) ([]*models.ContainerDependency, error)

	// Evidencia e historial forense de incidentes (T-023)
	InsertIncidentEvidence(ctx context.Context, evidence *models.IncidentEvidence) error
	GetIncidentEvidenceByIncidentID(ctx context.Context, incidentID string) ([]*models.IncidentEvidence, error)

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

// ListRecentAlertsByDevice delega en la implementación inyectada.
func ListRecentAlertsByDevice(ctx context.Context, deviceID string, types []string, since time.Time, limit int) ([]*models.Alert, error) {
	return implementation.ListRecentAlertsByDevice(ctx, deviceID, types, since, limit)
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

// GetSystemSetting delega en la implementación inyectada.
func GetSystemSetting(ctx context.Context, key string) (string, error) {
	return implementation.GetSystemSetting(ctx, key)
}

// SetSystemSetting delega en la implementación inyectada.
func SetSystemSetting(ctx context.Context, key, value string) error {
	return implementation.SetSystemSetting(ctx, key, value)
}

// CleanupOldDeviceNetworkMetrics delega en la implementación inyectada.
func CleanupOldDeviceNetworkMetrics(ctx context.Context, retentionDays int) (int64, error) {
	return implementation.CleanupOldDeviceNetworkMetrics(ctx, retentionDays)
}

// InsertIncident delega en la implementación inyectada.
func InsertIncident(ctx context.Context, incident *models.Incident) error {
	return implementation.InsertIncident(ctx, incident)
}

// UpdateIncident delega en la implementación inyectada.
func UpdateIncident(ctx context.Context, incident *models.Incident) error {
	return implementation.UpdateIncident(ctx, incident)
}

// GetIncidentByID delega en la implementación inyectada.
func GetIncidentByID(ctx context.Context, id string) (*models.Incident, error) {
	return implementation.GetIncidentByID(ctx, id)
}

// GetOpenIncidentByDevice delega en la implementación inyectada.
func GetOpenIncidentByDevice(ctx context.Context, deviceID string) (*models.Incident, error) {
	return implementation.GetOpenIncidentByDevice(ctx, deviceID)
}

// ListIncidents delega en la implementación inyectada.
func ListIncidents(ctx context.Context, deviceID, status string, limit int) ([]*models.Incident, error) {
	return implementation.ListIncidents(ctx, deviceID, status, limit)
}

// InsertIncidentEvent delega en la implementación inyectada.
func InsertIncidentEvent(ctx context.Context, event *models.IncidentEvent) error {
	return implementation.InsertIncidentEvent(ctx, event)
}

// ListIncidentEvents delega en la implementación inyectada.
func ListIncidentEvents(ctx context.Context, incidentID string) ([]*models.IncidentEvent, error) {
	return implementation.ListIncidentEvents(ctx, incidentID)
}

// InsertIncidentPropagation delega en la implementación inyectada.
func InsertIncidentPropagation(ctx context.Context, propagation *models.IncidentPropagation) error {
	return implementation.InsertIncidentPropagation(ctx, propagation)
}

// ListIncidentPropagations delega en la implementación inyectada.
func ListIncidentPropagations(ctx context.Context, incidentID string) ([]*models.IncidentPropagation, error) {
	return implementation.ListIncidentPropagations(ctx, incidentID)
}

// ListRecentIncidentsByType delega en la implementación inyectada.
func ListRecentIncidentsByType(ctx context.Context, excludeDeviceID string, eventTypes []string, since time.Time, limit int) ([]*models.Incident, error) {
	return implementation.ListRecentIncidentsByType(ctx, excludeDeviceID, eventTypes, since, limit)
}

// CountOpenIncidents delega en la implementación inyectada.
func CountOpenIncidents(ctx context.Context) (int64, error) {
	return implementation.CountOpenIncidents(ctx)
}

// CountOpenContainerEvents delega en la implementación inyectada.
func CountOpenContainerEvents(ctx context.Context, deviceIDs []string, since time.Time) (int64, error) {
	return implementation.CountOpenContainerEvents(ctx, deviceIDs, since)
}

// UpsertServerDependency delega en la implementación inyectada.
func UpsertServerDependency(ctx context.Context, dep *models.ServerDependency) error {
	return implementation.UpsertServerDependency(ctx, dep)
}

// ListServerDependencies delega en la implementación inyectada.
func ListServerDependencies(ctx context.Context) ([]*models.ServerDependency, error) {
	return implementation.ListServerDependencies(ctx)
}

// GetServerDependenciesForDevice delega en la implementación inyectada.
func GetServerDependenciesForDevice(ctx context.Context, deviceID string) ([]*models.ServerDependency, error) {
	return implementation.GetServerDependenciesForDevice(ctx, deviceID)
}

// InsertIncidentPropagationPath delega en la implementación inyectada.
func InsertIncidentPropagationPath(ctx context.Context, path *models.IncidentPropagationPath) error {
	return implementation.InsertIncidentPropagationPath(ctx, path)
}

// ListIncidentPropagationPaths delega en la implementación inyectada.
func ListIncidentPropagationPaths(ctx context.Context, incidentID string) ([]*models.IncidentPropagationPath, error) {
	return implementation.ListIncidentPropagationPaths(ctx, incidentID)
}

// InsertAffectedTransaction delega en la implementación inyectada.
func InsertAffectedTransaction(ctx context.Context, tx *models.AffectedTransaction) error {
	return implementation.InsertAffectedTransaction(ctx, tx)
}

// ListAffectedTransactions delega en la implementación inyectada.
func ListAffectedTransactions(ctx context.Context, incidentID string) ([]*models.AffectedTransaction, error) {
	return implementation.ListAffectedTransactions(ctx, incidentID)
}

// CountAffectedTransactionsByCategory delega en la implementación inyectada.
func CountAffectedTransactionsByCategory(ctx context.Context, incidentID string) (map[string]int64, error) {
	return implementation.CountAffectedTransactionsByCategory(ctx, incidentID)
}

// InsertServerTransaction delega en la implementación inyectada.
func InsertServerTransaction(ctx context.Context, st *models.ServerTransaction) error {
	return implementation.InsertServerTransaction(ctx, st)
}

// GetOrCreateServerTransaction delega en la implementación inyectada.
func GetOrCreateServerTransaction(ctx context.Context, deviceID, serviceName, endpoint string) (*models.ServerTransaction, error) {
	return implementation.GetOrCreateServerTransaction(ctx, deviceID, serviceName, endpoint)
}

// GetServerTransactionByID delega en la implementación inyectada.
func GetServerTransactionByID(ctx context.Context, id string) (*models.ServerTransaction, error) {
	return implementation.GetServerTransactionByID(ctx, id)
}

// ListServerTransactionsByDevice delega en la implementación inyectada.
func ListServerTransactionsByDevice(ctx context.Context, deviceID string) ([]*models.ServerTransaction, error) {
	return implementation.ListServerTransactionsByDevice(ctx, deviceID)
}

// InsertIncidentTransactionImpact delega en la implementación inyectada.
func InsertIncidentTransactionImpact(ctx context.Context, iti *models.IncidentTransactionImpact) error {
	return implementation.InsertIncidentTransactionImpact(ctx, iti)
}

// ListIncidentTransactionImpacts delega en la implementación inyectada.
func ListIncidentTransactionImpacts(ctx context.Context, incidentID string) ([]*models.IncidentTransactionImpact, error) {
	return implementation.ListIncidentTransactionImpacts(ctx, incidentID)
}

// InsertContainerDependency delega en la implementación inyectada.
func InsertContainerDependency(ctx context.Context, dep *models.ContainerDependency) error {
	return implementation.InsertContainerDependency(ctx, dep)
}

// DeleteContainerDependenciesByDevice delega en la implementación inyectada.
func DeleteContainerDependenciesByDevice(ctx context.Context, deviceID string) error {
	return implementation.DeleteContainerDependenciesByDevice(ctx, deviceID)
}

// ListContainerDependenciesByDevice delega en la implementación inyectada.
func ListContainerDependenciesByDevice(ctx context.Context, deviceID string) ([]*models.ContainerDependency, error) {
	return implementation.ListContainerDependenciesByDevice(ctx, deviceID)
}

// InsertIncidentEvidence delega en la implementación inyectada.
func InsertIncidentEvidence(ctx context.Context, evidence *models.IncidentEvidence) error {
	return implementation.InsertIncidentEvidence(ctx, evidence)
}

// GetIncidentEvidenceByIncidentID delega en la implementación inyectada.
func GetIncidentEvidenceByIncidentID(ctx context.Context, incidentID string) ([]*models.IncidentEvidence, error) {
	return implementation.GetIncidentEvidenceByIncidentID(ctx, incidentID)
}

// Close cierra la implementación inyectada.
func Close() error {
	return implementation.Close()
}
