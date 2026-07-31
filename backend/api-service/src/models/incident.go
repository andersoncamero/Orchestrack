package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Incident representa un incidente consolidado con su evento de causa raíz y eventos correlacionados.
type Incident struct {
	ID               string          `gorm:"type:uuid;primaryKey" json:"id"`
	Title            string          `gorm:"type:varchar(255);not null" json:"title"`
	DeviceID         string          `gorm:"type:varchar(255);not null;index" json:"device_id"`
	RootCauseEventID string          `gorm:"type:varchar(255);not null;index" json:"root_cause_event_id"`
	RootCauseType    string          `gorm:"type:varchar(100);not null" json:"root_cause_type"`
	Status           string          `gorm:"type:varchar(50);not null;default:'open';index" json:"status"` // 'open' | 'resolved'
	Severity         string          `gorm:"type:varchar(50);not null;default:'critical'" json:"severity"` // 'critical' | 'warning' | 'info'
	StartedAt        time.Time       `gorm:"not null;index" json:"started_at"`
	ResolvedAt       *time.Time      `json:"resolved_at,omitempty"`
	CreatedAt        time.Time       `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time       `gorm:"autoUpdateTime" json:"updated_at"`
	Events           []IncidentEvent `gorm:"foreignKey:IncidentID;constraint:OnDelete:CASCADE" json:"events,omitempty"`
}

// BeforeCreate genera un UUID para el incidente si no está especificado.
func (i *Incident) BeforeCreate(tx *gorm.DB) error {
	if i.ID == "" {
		i.ID = uuid.New().String()
	}
	return nil
}

// IncidentEvent representa la secuencia de eventos derivados agrupados en un incidente.
type IncidentEvent struct {
	ID            string    `gorm:"type:uuid;primaryKey" json:"id"`
	IncidentID    string    `gorm:"type:uuid;not null;index" json:"incident_id"`
	EventID       string    `gorm:"type:varchar(255);not null" json:"event_id"`
	EventType     string    `gorm:"type:varchar(100);not null" json:"event_type"`
	ContainerID   string    `gorm:"type:varchar(255)" json:"container_id,omitempty"`
	ContainerName string    `gorm:"type:varchar(255)" json:"container_name,omitempty"`
	SequenceOrder int       `gorm:"not null" json:"sequence_order"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// BeforeCreate genera un UUID para el evento de incidente.
func (ie *IncidentEvent) BeforeCreate(tx *gorm.DB) error {
	if ie.ID == "" {
		ie.ID = uuid.New().String()
	}
	return nil
}

// IncidentEvidence representa las evidencias forenses recolectadas asociadas a un incidente (T-023).
type IncidentEvidence struct {
	ID           string    `gorm:"type:uuid;primaryKey" json:"id"`
	IncidentID   string    `gorm:"type:uuid;not null;index" json:"incident_id"`
	DeviceID     string    `gorm:"type:varchar(255);not null;index" json:"device_id"`
	EvidenceType string    `gorm:"type:varchar(100);not null" json:"evidence_type"`
	PayloadJSON  string    `gorm:"type:text;not null" json:"payload_json"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// BeforeCreate genera un UUID para la evidencia de incidente.
func (ie *IncidentEvidence) BeforeCreate(tx *gorm.DB) error {
	if ie.ID == "" {
		ie.ID = uuid.New().String()
	}
	return nil
}
