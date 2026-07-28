package models

import (
	"gorm.io/gorm"
)

// Alert representa una alerta generada automáticamente por el sistema
// (ej. fallo crítico de un contenedor). Nace siempre no leída.
type Alert struct {
	gorm.Model

	DeviceID    string `gorm:"index;not null;column:device_id" json:"device_id"` // Clave foránea asociada a Device.ServiceID
	ContainerID string `gorm:"index;column:container_id" json:"container_id"`
	Type        string `gorm:"type:varchar(100);not null;column:type" json:"type"`
	Message     string `gorm:"type:text;not null;column:message" json:"message"`
	IsRead      bool   `gorm:"not null;default:false;column:is_read" json:"is_read"`
}
