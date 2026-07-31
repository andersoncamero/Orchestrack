package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// IncidentPropagation representa la propagación de un incidente desde un servidor origen hacia otro servidor.
type IncidentPropagation struct {
	ID              string    `gorm:"type:uuid;primaryKey" json:"id"`
	IncidentID      string    `gorm:"type:uuid;not null;index" json:"incident_id"`
	FromDeviceID    string    `gorm:"type:varchar(255);not null;index" json:"from_device_id"`
	ToDeviceID      string    `gorm:"type:varchar(255);not null;index" json:"to_device_id"`
	FromHostname    string    `gorm:"type:varchar(255);not null" json:"from_hostname"`
	ToHostname      string    `gorm:"type:varchar(255);not null" json:"to_hostname"`
	PropagationType string    `gorm:"type:varchar(100);not null" json:"propagation_type"` // 'cascade', 'dependency', 'network'
	TimeDeltaSec    int       `gorm:"not null" json:"time_delta_sec"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// BeforeCreate genera un UUID para el registro si no está especificado.
func (ip *IncidentPropagation) BeforeCreate(tx *gorm.DB) error {
	if ip.ID == "" {
		ip.ID = uuid.New().String()
	}
	return nil
}

// BlastRadius resume el impacto cuantificado de un incidente en el clúster.
type BlastRadius struct {
	IncidentID           string `json:"incident_id"`
	AffectedDevices      int    `json:"affected_devices"`
	AffectedContainers   int    `json:"affected_containers"`
	TotalDevices         int    `json:"total_devices"`
	TotalContainers      int    `json:"total_containers"`
	PropagationDepth     int    `json:"propagation_depth"`
	MaxPropagationDepth  int    `json:"max_propagation_depth"`
}

// PropagationPath representa una ruta de propagación entre servidores para un incidente.
type PropagationPath struct {
	IncidentID string                `json:"incident_id"`
	Origin     string                `json:"origin_device_id"`
	Paths      []PropagationHop      `json:"paths"`
	BlastRadius BlastRadius          `json:"blast_radius"`
}

// PropagationHop representa un salto en la cadena de propagación.
type PropagationHop struct {
	FromDeviceID string `json:"from_device_id"`
	ToDeviceID   string `json:"to_device_id"`
	FromHostname string `json:"from_hostname"`
	ToHostname   string `json:"to_hostname"`
	HopDepth     int    `json:"hop_depth"`
}

// ServerDependency representa una dependencia persistente entre dos servidores del clúster (DoD T-015).
type ServerDependency struct {
	ID             string    `gorm:"type:uuid;primaryKey" json:"id"`
	SourceDeviceID string    `gorm:"type:varchar(255);not null;index" json:"source_device_id"`
	TargetDeviceID string    `gorm:"type:varchar(255);not null;index" json:"target_device_id"`
	DependencyType string    `gorm:"type:varchar(100);not null" json:"dependency_type"` // 'network', 'service', 'datastore', 'cascade'
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// BeforeCreate genera un UUID para el registro si no está especificado.
func (sd *ServerDependency) BeforeCreate(tx *gorm.DB) error {
	if sd.ID == "" {
		sd.ID = uuid.New().String()
	}
	return nil
}

// IncidentPropagationPath representa un paso del flujo paso a paso de la propagación de un incidente (DoD T-015).
type IncidentPropagationPath struct {
	ID                 string `gorm:"type:uuid;primaryKey" json:"id"`
	IncidentID         string `gorm:"type:uuid;not null;index" json:"incident_id"`
	StepOrder          int    `gorm:"not null" json:"step_order"`
	AffectedDeviceID   string `gorm:"type:varchar(255);not null;index" json:"affected_device_id"`
	AffectedContainerID string `gorm:"type:varchar(255)" json:"affected_container_id,omitempty"`
}

// BeforeCreate genera un UUID para el registro si no está especificado.
func (ipp *IncidentPropagationPath) BeforeCreate(tx *gorm.DB) error {
	if ipp.ID == "" {
		ipp.ID = uuid.New().String()
	}
	return nil
}

// AffectedTransaction representa una transacción u operación afectada por un incidente (DoD T-018).
type AffectedTransaction struct {
	ID              string    `gorm:"type:uuid;primaryKey" json:"id"`
	IncidentID      string    `gorm:"type:uuid;not null;index" json:"incident_id"`
	DeviceID        string    `gorm:"type:varchar(255);not null;index" json:"device_id"`
	ServiceCategory string    `gorm:"type:varchar(100);not null" json:"service_category"` // 'api_backend', 'containers', 'package_management', 'connectivity', 'database'
	TransactionType string    `gorm:"type:varchar(100);not null" json:"transaction_type"`   // e.g. 'http_requests', 'container_deploy', 'package_upgrade'
	FailedCount     int       `gorm:"not null;default:1" json:"failed_count"`
	WindowStart     time.Time `gorm:"not null" json:"window_start"`
	WindowEnd       time.Time `gorm:"not null" json:"window_end"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// BeforeCreate genera un UUID para el registro si no está especificado.
func (at *AffectedTransaction) BeforeCreate(tx *gorm.DB) error {
	if at.ID == "" {
		at.ID = uuid.New().String()
	}
	return nil
}

// TransactionImpact agrupa el impacto por categoría de servicio para un incidente (DoD T-018).
type TransactionImpact struct {
	ServiceCategory      string `json:"service_category"`
	CategoryLabel        string `json:"category_label"`
	FailedTransactions   int    `json:"failed_transactions"`
	AffectedDevices      int    `json:"affected_devices"`
	TransactionTypes     []string `json:"transaction_types"`
}

// ServerTransaction representa un servicio/endpoint registrado en un servidor (DoD T-019).
type ServerTransaction struct {
	ID          string    `gorm:"type:uuid;primaryKey" json:"id"`
	DeviceID    string    `gorm:"type:varchar(255);not null;index" json:"device_id"`
	ServiceName string    `gorm:"type:varchar(255);not null" json:"service_name"`
	Endpoint    string    `gorm:"type:varchar(255)" json:"endpoint,omitempty"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// BeforeCreate genera un UUID para el registro si no está especificado.
func (st *ServerTransaction) BeforeCreate(tx *gorm.DB) error {
	if st.ID == "" {
		st.ID = uuid.New().String()
	}
	return nil
}

// ContainerDependency representa una relación de red o comunicación entre dos contenedores dentro de un mismo host.
type ContainerDependency struct {
	ID                 string    `gorm:"type:uuid;primaryKey" json:"id"`
	DeviceID           string    `gorm:"type:varchar(255);not null;index" json:"device_id"`
	SourceContainerID  string    `gorm:"type:varchar(255);not null;index" json:"source_container_id"`
	SourceContainerName string   `gorm:"type:varchar(255);not null" json:"source_container_name"`
	TargetContainerID  string    `gorm:"type:varchar(255);not null;index" json:"target_container_id"`
	TargetContainerName string   `gorm:"type:varchar(255);not null" json:"target_container_name"`
	Network            string    `gorm:"type:varchar(255);not null" json:"network"`
	DependencyType     string    `gorm:"type:varchar(100);not null" json:"dependency_type"` // 'network_shared', 'port_exposed', 'compose_link'
	Port               int       `gorm:"column:port" json:"port,omitempty"`
	CreatedAt          time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt          time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// BeforeCreate genera un UUID para el registro si no está especificado.
func (cd *ContainerDependency) BeforeCreate(tx *gorm.DB) error {
	if cd.ID == "" {
		cd.ID = uuid.New().String()
	}
	return nil
}

// IncidentTransactionImpact vincula un incidente con transacciones de servidor afectadas (DoD T-019).
type IncidentTransactionImpact struct {
	ID                 string    `gorm:"type:uuid;primaryKey" json:"id"`
	IncidentID         string    `gorm:"type:uuid;not null;index" json:"incident_id"`
	ServerTransactionID string   `gorm:"type:uuid;not null;index" json:"server_transaction_id"`
	FailedRequestsCount int      `gorm:"not null;default:1" json:"failed_requests_count"`
	ErrorCode          string    `gorm:"type:varchar(50)" json:"error_code,omitempty"`
	CreatedAt          time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// BeforeCreate genera un UUID para el registro si no está especificado.
func (iti *IncidentTransactionImpact) BeforeCreate(tx *gorm.DB) error {
	if iti.ID == "" {
		iti.ID = uuid.New().String()
	}
	return nil
}
