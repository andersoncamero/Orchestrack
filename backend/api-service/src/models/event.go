package models

import (
	"time"

	"gorm.io/gorm"
)

// Event representa un suceso o cambio de estado notificado por un dispositivo.
type Event struct {
	gorm.Model

	DeviceID  string    `gorm:"index;not null;column:device_id" json:"device_id"` // Clave foránea asociada a Device.ServiceID
	Type      string    `gorm:"type:varchar(50);not null;column:type" json:"type"`
	Payload   string    `gorm:"type:text;column:payload" json:"payload"`
	Timestamp time.Time `gorm:"index;not null;column:timestamp" json:"timestamp"`
}
