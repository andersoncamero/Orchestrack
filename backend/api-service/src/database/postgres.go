package database

import (
	"context"
	"fmt"
	"time"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"go.mongodb.org/mongo-driver/mongo"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// PostgresRepository implementa el repositorio usando GORM + PostgreSQL y MongoDB para métricas.
type PostgresRepository struct {
	db          *gorm.DB
	mongoClient *mongo.Client
	mongoColl   *mongo.Collection
}

// NewPostgresRepository crea una nueva conexión a PostgreSQL y MongoDB.
func NewPostgresRepository(databaseURL string, mongoURL string) (*PostgresRepository, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	// Remover models.DeviceNetworkMetric de AutoMigrate de Postgres
	if err := db.AutoMigrate(&models.User{}, &models.Device{}, &models.Event{}, &models.RegistrationToken{}, &models.ContainerEvent{}, &models.Alert{}, &models.SystemSetting{}, &models.Incident{}, &models.IncidentEvent{}, &models.IncidentPropagation{}, &models.ServerDependency{}, &models.IncidentPropagationPath{}, &models.AffectedTransaction{}, &models.ServerTransaction{}, &models.IncidentTransactionImpact{}, &models.ContainerDependency{}, &models.IncidentEvidence{}); err != nil {
		return nil, fmt.Errorf("failed to migrate models: %w", err)
	}

	// Conectar a MongoDB usando el inicializador de mongo.go
	mongoClient, mongoColl, err := ConnectMongoDB(mongoURL)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize mongodb client: %w", err)
	}

	return &PostgresRepository{
		db:          db,
		mongoClient: mongoClient,
		mongoColl:   mongoColl,
	}, nil
}

// InsertUser crea un nuevo usuario.
func (repo *PostgresRepository) InsertUser(ctx context.Context, user *models.User) error {
	return repo.db.WithContext(ctx).Create(user).Error
}

// GetUserById busca un usuario por ID.
func (repo *PostgresRepository) GetUserById(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	if err := repo.db.WithContext(ctx).First(&user, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// GetUserByEmail busca un usuario por email.
func (repo *PostgresRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	if err := repo.db.WithContext(ctx).First(&user, "email = ?", email).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// SaveDevice crea o actualiza un dispositivo.
func (repo *PostgresRepository) SaveDevice(ctx context.Context, device *models.Device) error {
	var existing models.Device
	err := repo.db.WithContext(ctx).Where("service_id = ?", device.ServiceID).First(&existing).Error
	if err == nil {
		device.ID = existing.ID
		device.CreatedAt = existing.CreatedAt
	}
	return repo.db.WithContext(ctx).Save(device).Error
}

// GetDeviceByServiceID busca un dispositivo por su ServiceID.
func (repo *PostgresRepository) GetDeviceByServiceID(ctx context.Context, serviceID string) (*models.Device, error) {
	var device models.Device
	if err := repo.db.WithContext(ctx).Where("service_id = ?", serviceID).First(&device).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &device, nil
}

// ListDevices obtiene todos los dispositivos registrados.
func (repo *PostgresRepository) ListDevices(ctx context.Context) ([]*models.Device, error) {
	var devices []*models.Device
	if err := repo.db.WithContext(ctx).Order("service_id ASC").Find(&devices).Error; err != nil {
		return nil, err
	}
	return devices, nil
}

// InsertEvent crea un nuevo evento.
func (repo *PostgresRepository) InsertEvent(ctx context.Context, event *models.Event) error {
	return repo.db.WithContext(ctx).Create(event).Error
}

// ListEventsByDevice lista los eventos más recientes de un dispositivo.
func (repo *PostgresRepository) ListEventsByDevice(ctx context.Context, deviceID string, limit int) ([]*models.Event, error) {
	var events []*models.Event
	query := repo.db.WithContext(ctx).Where("device_id = ?", deviceID).Order("timestamp DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

// InsertContainerEvent crea un nuevo evento de contenedor.
func (repo *PostgresRepository) InsertContainerEvent(ctx context.Context, event *models.ContainerEvent) error {
	return repo.db.WithContext(ctx).Create(event).Error
}

// ListContainerEventsByContainer lista el historial de eventos de un contenedor con paginación.
func (repo *PostgresRepository) ListContainerEventsByContainer(ctx context.Context, deviceID, containerID string, limit, offset int) ([]*models.ContainerEvent, error) {
	var events []*models.ContainerEvent
	query := repo.db.WithContext(ctx).
		Where("device_id = ? AND container_id = ?", deviceID, containerID).
		Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	if err := query.Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

// InsertAlert crea una nueva alerta.
func (repo *PostgresRepository) InsertAlert(ctx context.Context, alert *models.Alert) error {
	return repo.db.WithContext(ctx).Create(alert).Error
}

// ListRecentAlertsByDevice busca alertas recientes de un dispositivo dentro de una ventana temporal.
func (repo *PostgresRepository) ListRecentAlertsByDevice(ctx context.Context, deviceID string, types []string, since time.Time, limit int) ([]*models.Alert, error) {
	if limit <= 0 {
		limit = 50
	}
	query := repo.db.WithContext(ctx).
		Where("device_id = ?", deviceID).
		Where("created_at >= ?", since)
	if len(types) > 0 {
		query = query.Where("type IN ?", types)
	}
	var alerts []*models.Alert
	err := query.Order("created_at ASC").Limit(limit).Find(&alerts).Error
	return alerts, err
}

// Close cierra la conexión a la base de datos PostgreSQL y MongoDB.
func (repo *PostgresRepository) Close() error {
	if repo.mongoClient != nil {
		_ = repo.mongoClient.Disconnect(context.Background())
	}
	sqlDB, err := repo.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// CreateRegistrationToken crea un token de registro en la base de datos.
func (repo *PostgresRepository) CreateRegistrationToken(ctx context.Context, token *models.RegistrationToken) error {
	return repo.db.WithContext(ctx).Create(token).Error
}

// GetRegistrationToken busca un token por su cadena.
func (repo *PostgresRepository) GetRegistrationToken(ctx context.Context, tokenStr string) (*models.RegistrationToken, error) {
	var token models.RegistrationToken
	if err := repo.db.WithContext(ctx).Where("token = ?", tokenStr).First(&token).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &token, nil
}

// UpdateRegistrationToken actualiza un token existente en la base de datos.
func (repo *PostgresRepository) UpdateRegistrationToken(ctx context.Context, token *models.RegistrationToken) error {
	return repo.db.WithContext(ctx).Save(token).Error
}

// DeleteExpiredRegistrationTokens elimina los tokens que han expirado o ya han sido usados.
func (repo *PostgresRepository) DeleteExpiredRegistrationTokens(ctx context.Context) error {
	return repo.db.WithContext(ctx).Where("expires_at < ? OR used = ?", time.Now(), true).Delete(&models.RegistrationToken{}).Error
}

// GetSystemSetting busca una configuración del sistema por clave.
func (repo *PostgresRepository) GetSystemSetting(ctx context.Context, key string) (string, error) {
	var setting models.SystemSetting
	if err := repo.db.WithContext(ctx).First(&setting, "key = ?", key).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", nil
		}
		return "", err
	}
	return setting.Value, nil
}

// SetSystemSetting guarda o actualiza una configuración del sistema por clave.
func (repo *PostgresRepository) SetSystemSetting(ctx context.Context, key, value string) error {
	setting := models.SystemSetting{
		Key:       key,
		Value:     value,
		UpdatedAt: time.Now(),
	}
	return repo.db.WithContext(ctx).Save(&setting).Error
}

// CleanupOldDeviceNetworkMetrics elimina métricas de red antiguas según los días de retención especificados en MongoDB.
// (La lógica real se delega a mongo.go para cohesión en base de datos)

// InsertIncident crea un nuevo registro de incidente en PostgreSQL.
func (repo *PostgresRepository) InsertIncident(ctx context.Context, incident *models.Incident) error {
	return repo.db.WithContext(ctx).Create(incident).Error
}

// UpdateIncident actualiza un incidente existente en la base de datos.
func (repo *PostgresRepository) UpdateIncident(ctx context.Context, incident *models.Incident) error {
	return repo.db.WithContext(ctx).Save(incident).Error
}

// GetIncidentByID obtiene el detalle de un incidente por su ID incluyendo sus eventos asociados.
func (repo *PostgresRepository) GetIncidentByID(ctx context.Context, id string) (*models.Incident, error) {
	var incident models.Incident
	err := repo.db.WithContext(ctx).Preload("Events", func(db *gorm.DB) *gorm.DB {
		return db.Order("sequence_order ASC")
	}).First(&incident, "id = ?", id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &incident, nil
}

// GetOpenIncidentByDevice obtiene el incidente abierto actualmente para un dispositivo específico si existe.
func (repo *PostgresRepository) GetOpenIncidentByDevice(ctx context.Context, deviceID string) (*models.Incident, error) {
	var incident models.Incident
	err := repo.db.WithContext(ctx).
		Preload("Events", func(db *gorm.DB) *gorm.DB {
			return db.Order("sequence_order ASC")
		}).
		Where("device_id = ? AND status = ?", deviceID, "open").
		Order("started_at DESC").
		First(&incident).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &incident, nil
}

// ListIncidents consulta el historial de incidentes con soporte para filtros de dispositivo, estado y límite.
func (repo *PostgresRepository) ListIncidents(ctx context.Context, deviceID, status string, limit int) ([]*models.Incident, error) {
	if limit <= 0 {
		limit = 50
	}
	query := repo.db.WithContext(ctx).Preload("Events", func(db *gorm.DB) *gorm.DB {
		return db.Order("sequence_order ASC")
	})
	if deviceID != "" {
		query = query.Where("device_id = ?", deviceID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	var incidents []*models.Incident
	err := query.Order("started_at DESC").Limit(limit).Find(&incidents).Error
	return incidents, err
}

// InsertIncidentEvent anexa un nuevo evento derivado a un incidente existente.
func (repo *PostgresRepository) InsertIncidentEvent(ctx context.Context, event *models.IncidentEvent) error {
	return repo.db.WithContext(ctx).Create(event).Error
}

// ListIncidentEvents consulta el historial de eventos ordenados cronológicamente de un incidente.
func (repo *PostgresRepository) ListIncidentEvents(ctx context.Context, incidentID string) ([]*models.IncidentEvent, error) {
	var events []*models.IncidentEvent
	err := repo.db.WithContext(ctx).
		Where("incident_id = ?", incidentID).
		Order("sequence_order ASC").
		Find(&events).Error
	return events, err
}

// InsertIncidentPropagation guarda un registro de propagación entre servidores.
func (repo *PostgresRepository) InsertIncidentPropagation(ctx context.Context, propagation *models.IncidentPropagation) error {
	return repo.db.WithContext(ctx).Create(propagation).Error
}

// ListIncidentPropagations devuelve los saltos de propagación de un incidente ordenados por tiempo.
func (repo *PostgresRepository) ListIncidentPropagations(ctx context.Context, incidentID string) ([]*models.IncidentPropagation, error) {
	var propagations []*models.IncidentPropagation
	err := repo.db.WithContext(ctx).
		Where("incident_id = ?", incidentID).
		Order("created_at ASC").
		Find(&propagations).Error
	return propagations, err
}

// ListRecentIncidentsByType busca incidentes abiertos recientes de ciertos tipos, excluyendo un dispositivo.
func (repo *PostgresRepository) ListRecentIncidentsByType(ctx context.Context, excludeDeviceID string, eventTypes []string, since time.Time, limit int) ([]*models.Incident, error) {
	if limit <= 0 {
		limit = 50
	}
	var incidents []*models.Incident
	query := repo.db.WithContext(ctx).
		Preload("Events", func(db *gorm.DB) *gorm.DB {
			return db.Order("sequence_order ASC")
		}).
		Where("device_id != ?", excludeDeviceID).
		Where("status = ?", "open").
		Where("started_at >= ?", since)
	if len(eventTypes) > 0 {
		query = query.Where("root_cause_type IN ?", eventTypes)
	}
	err := query.Order("started_at DESC").Limit(limit).Find(&incidents).Error
	return incidents, err
}

// CountOpenIncidents cuenta incidentes abiertos actualmente.
func (repo *PostgresRepository) CountOpenIncidents(ctx context.Context) (int64, error) {
	var count int64
	err := repo.db.WithContext(ctx).Model(&models.Incident{}).Where("status = ?", "open").Count(&count).Error
	return count, err
}

// CountOpenContainerEvents cuenta eventos críticos de contenedor en dispositivos dados desde una fecha.
func (repo *PostgresRepository) CountOpenContainerEvents(ctx context.Context, deviceIDs []string, since time.Time) (int64, error) {
	if len(deviceIDs) == 0 {
		return 0, nil
	}
	var count int64
	err := repo.db.WithContext(ctx).Model(&models.ContainerEvent{}).
		Where("device_id IN ?", deviceIDs).
		Where("created_at >= ?", since).
		Where("event_type IN ?", []string{"die", "oom", "kill"}).
		Count(&count).Error
	return count, err
}

// UpsertServerDependency inserta o actualiza una dependencia entre servidores (DoD T-015).
func (repo *PostgresRepository) UpsertServerDependency(ctx context.Context, dep *models.ServerDependency) error {
	var existing models.ServerDependency
	err := repo.db.WithContext(ctx).
		Where("source_device_id = ? AND target_device_id = ?", dep.SourceDeviceID, dep.TargetDeviceID).
		First(&existing).Error
	if err == nil {
		existing.DependencyType = dep.DependencyType
		return repo.db.WithContext(ctx).Save(&existing).Error
	}
	return repo.db.WithContext(ctx).Create(dep).Error
}

// ListServerDependencies devuelve todas las dependencias entre servidores.
func (repo *PostgresRepository) ListServerDependencies(ctx context.Context) ([]*models.ServerDependency, error) {
	var deps []*models.ServerDependency
	err := repo.db.WithContext(ctx).Find(&deps).Error
	return deps, err
}

// GetServerDependenciesForDevice devuelve las dependencias donde un dispositivo es fuente o destino.
func (repo *PostgresRepository) GetServerDependenciesForDevice(ctx context.Context, deviceID string) ([]*models.ServerDependency, error) {
	var deps []*models.ServerDependency
	err := repo.db.WithContext(ctx).
		Where("source_device_id = ? OR target_device_id = ?", deviceID, deviceID).
		Find(&deps).Error
	return deps, err
}

// InsertIncidentPropagationPath guarda un paso del flujo de propagación (DoD T-015).
func (repo *PostgresRepository) InsertIncidentPropagationPath(ctx context.Context, path *models.IncidentPropagationPath) error {
	return repo.db.WithContext(ctx).Create(path).Error
}

// ListIncidentPropagationPaths devuelve los pasos ordenados de la propagación de un incidente.
func (repo *PostgresRepository) ListIncidentPropagationPaths(ctx context.Context, incidentID string) ([]*models.IncidentPropagationPath, error) {
	var paths []*models.IncidentPropagationPath
	err := repo.db.WithContext(ctx).
		Where("incident_id = ?", incidentID).
		Order("step_order ASC").
		Find(&paths).Error
	return paths, err
}

// InsertAffectedTransaction guarda una transacción afectada por un incidente (DoD T-018).
func (repo *PostgresRepository) InsertAffectedTransaction(ctx context.Context, tx *models.AffectedTransaction) error {
	return repo.db.WithContext(ctx).Create(tx).Error
}

// ListAffectedTransactions devuelve todas las transacciones afectadas de un incidente.
func (repo *PostgresRepository) ListAffectedTransactions(ctx context.Context, incidentID string) ([]*models.AffectedTransaction, error) {
	var txs []*models.AffectedTransaction
	err := repo.db.WithContext(ctx).
		Where("incident_id = ?", incidentID).
		Order("service_category ASC, created_at ASC").
		Find(&txs).Error
	return txs, err
}

// CountAffectedTransactionsByCategory agrupa el conteo de transacciones fallidas por categoría de servicio.
func (repo *PostgresRepository) CountAffectedTransactionsByCategory(ctx context.Context, incidentID string) (map[string]int64, error) {
	var results []struct {
		ServiceCategory string `gorm:"column:service_category"`
		TotalFailed     int64  `gorm:"column:total_failed"`
	}
	err := repo.db.WithContext(ctx).
		Model(&models.AffectedTransaction{}).
		Select("service_category, SUM(failed_count) as total_failed").
		Where("incident_id = ?", incidentID).
		Group("service_category").
		Scan(&results).Error
	if err != nil {
		return nil, err
	}
	m := make(map[string]int64)
	for _, r := range results {
		m[r.ServiceCategory] = r.TotalFailed
	}
	return m, nil
}

// InsertServerTransaction guarda un registro de servicio/endpoint de un servidor (DoD T-019).
func (repo *PostgresRepository) InsertServerTransaction(ctx context.Context, st *models.ServerTransaction) error {
	return repo.db.WithContext(ctx).Create(st).Error
}

// GetOrCreateServerTransaction busca un server transaction existente o lo crea si no existe.
func (repo *PostgresRepository) GetOrCreateServerTransaction(ctx context.Context, deviceID, serviceName, endpoint string) (*models.ServerTransaction, error) {
	var existing models.ServerTransaction
	err := repo.db.WithContext(ctx).
		Where("device_id = ? AND service_name = ? AND endpoint = ?", deviceID, serviceName, endpoint).
		First(&existing).Error
	if err == nil {
		return &existing, nil
	}
	st := &models.ServerTransaction{
		DeviceID:    deviceID,
		ServiceName:   serviceName,
		Endpoint:      endpoint,
	}
	if err := repo.db.WithContext(ctx).Create(st).Error; err != nil {
		return nil, err
	}
	return st, nil
}

// GetServerTransactionByID busca un ServerTransaction por su UUID.
func (repo *PostgresRepository) GetServerTransactionByID(ctx context.Context, id string) (*models.ServerTransaction, error) {
	var st models.ServerTransaction
	err := repo.db.WithContext(ctx).Where("id = ?", id).First(&st).Error
	if err != nil {
		return nil, err
	}
	return &st, nil
}

// ListServerTransactionsByDevice devuelve los servicios registrados de un servidor.
func (repo *PostgresRepository) ListServerTransactionsByDevice(ctx context.Context, deviceID string) ([]*models.ServerTransaction, error) {
	var txs []*models.ServerTransaction
	err := repo.db.WithContext(ctx).
		Where("device_id = ?", deviceID).
		Order("service_name ASC").
		Find(&txs).Error
	return txs, err
}

// InsertIncidentTransactionImpact registra el impacto de un incidente sobre una transacción de servidor.
func (repo *PostgresRepository) InsertIncidentTransactionImpact(ctx context.Context, iti *models.IncidentTransactionImpact) error {
	return repo.db.WithContext(ctx).Create(iti).Error
}

// ListIncidentTransactionImpacts devuelve los impactos de transacciones de un incidente.
func (repo *PostgresRepository) ListIncidentTransactionImpacts(ctx context.Context, incidentID string) ([]*models.IncidentTransactionImpact, error) {
	var impacts []*models.IncidentTransactionImpact
	err := repo.db.WithContext(ctx).
		Where("incident_id = ?", incidentID).
		Order("created_at ASC").
		Find(&impacts).Error
	return impacts, err
}

// InsertContainerDependency guarda una relación entre contenedores.
func (repo *PostgresRepository) InsertContainerDependency(ctx context.Context, dep *models.ContainerDependency) error {
	return repo.db.WithContext(ctx).Create(dep).Error
}

// DeleteContainerDependenciesByDevice elimina todas las dependencias de contenedores de un dispositivo.
func (repo *PostgresRepository) DeleteContainerDependenciesByDevice(ctx context.Context, deviceID string) error {
	return repo.db.WithContext(ctx).Where("device_id = ?", deviceID).Delete(&models.ContainerDependency{}).Error
}

// ListContainerDependenciesByDevice devuelve el grafo de dependencias de contenedores de un dispositivo.
func (repo *PostgresRepository) ListContainerDependenciesByDevice(ctx context.Context, deviceID string) ([]*models.ContainerDependency, error) {
	var deps []*models.ContainerDependency
	err := repo.db.WithContext(ctx).
		Where("device_id = ?", deviceID).
		Order("network ASC, source_container_name ASC").
		Find(&deps).Error
	return deps, err
}

// InsertIncidentEvidence guarda una evidencia en la base de datos.
func (repo *PostgresRepository) InsertIncidentEvidence(ctx context.Context, evidence *models.IncidentEvidence) error {
	return repo.db.WithContext(ctx).Create(evidence).Error
}

// GetIncidentEvidenceByIncidentID busca las evidencias recolectadas para un incidente específico.
func (repo *PostgresRepository) GetIncidentEvidenceByIncidentID(ctx context.Context, incidentID string) ([]*models.IncidentEvidence, error) {
	var evidences []*models.IncidentEvidence
	err := repo.db.WithContext(ctx).
		Where("incident_id = ?", incidentID).
		Find(&evidences).Error
	return evidences, err
}
