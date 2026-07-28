package database

import (
	"context"
	"fmt"
	"time"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// PostgresRepository implementa el repositorio de usuarios usando GORM + PostgreSQL.
type PostgresRepository struct {
	db *gorm.DB
}

// NewPostgresRepository crea una nueva conexión a PostgreSQL y ejecuta migraciones.
func NewPostgresRepository(databaseURL string) (*PostgresRepository, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	if err := db.AutoMigrate(&models.User{}, &models.Device{}, &models.Event{}, &models.RegistrationToken{}, &models.ContainerEvent{}, &models.Alert{}, &models.DeviceNetworkMetric{}, &models.SystemSetting{}); err != nil {
		return nil, fmt.Errorf("failed to migrate models: %w", err)
	}

	return &PostgresRepository{db: db}, nil
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

// Close cierra la conexión a la base de datos.
func (repo *PostgresRepository) Close() error {
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

// InsertDeviceNetworkMetric guarda una muestra de métricas de red y latencia en PostgreSQL.
func (repo *PostgresRepository) InsertDeviceNetworkMetric(ctx context.Context, metric *models.DeviceNetworkMetric) error {
	return repo.db.WithContext(ctx).Create(metric).Error
}

// ListDeviceNetworkMetrics consulta el historial de métricas de red y latencia por servidor.
func (repo *PostgresRepository) ListDeviceNetworkMetrics(ctx context.Context, deviceID string, limit int) ([]*models.DeviceNetworkMetric, error) {
	if limit <= 0 {
		limit = 50
	}
	var metrics []*models.DeviceNetworkMetric
	err := repo.db.WithContext(ctx).
		Where("device_id = ?", deviceID).
		Order("recorded_at DESC").
		Limit(limit).
		Find(&metrics).Error
	return metrics, err
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

// CleanupOldDeviceNetworkMetrics elimina métricas de red antiguas según los días de retención especificados.
func (repo *PostgresRepository) CleanupOldDeviceNetworkMetrics(ctx context.Context, retentionDays int) (int64, error) {
	if retentionDays <= 0 {
		retentionDays = 7 // Valor por defecto seguro
	}
	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	res := repo.db.WithContext(ctx).Where("recorded_at < ?", cutoff).Delete(&models.DeviceNetworkMetric{})
	return res.RowsAffected, res.Error
}
