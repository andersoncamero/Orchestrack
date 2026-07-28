package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DeviceNetworkMetric representa una muestra histórica del rendimiento de red y latencia de un servidor.
type DeviceNetworkMetric struct {
	ID                 string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	DeviceID           string    `gorm:"index;type:varchar(255);not null" json:"device_id"`
	RxBytesPerSec      float64   `gorm:"type:double precision;default:0" json:"rx_bytes_per_sec"`
	TxBytesPerSec      float64   `gorm:"type:double precision;default:0" json:"tx_bytes_per_sec"`
	PacketsRecvPerSec  float64   `gorm:"type:double precision;default:0" json:"packets_recv_per_sec"`
	PacketsSentPerSec  float64   `gorm:"type:double precision;default:0" json:"packets_sent_per_sec"`
	RttMs              float64   `gorm:"type:double precision;default:0" json:"rtt_ms"`
	RecordedAt         time.Time `gorm:"index;not null" json:"recorded_at"`
}

func (m *DeviceNetworkMetric) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	if m.RecordedAt.IsZero() {
		m.RecordedAt = time.Now()
	}
	return nil
}
