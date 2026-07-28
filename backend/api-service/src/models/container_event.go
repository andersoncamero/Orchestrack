package models

import (
	"gorm.io/gorm"
)

// ContainerEvent representa un evento del ciclo de vida o fallo de un contenedor
// persistido para auditoría histórica. CreatedAt (de gorm.Model) guarda el
// instante en que ocurrió el evento según el agente.
type ContainerEvent struct {
	gorm.Model

	DeviceID      string `gorm:"index;not null;column:device_id" json:"device_id"` // Clave foránea asociada a Device.ServiceID
	ContainerID   string `gorm:"index;not null;column:container_id" json:"container_id"`
	ContainerName string `gorm:"type:varchar(255);column:container_name" json:"container_name"`
	Image         string `gorm:"type:varchar(255);column:image" json:"image"`
	EventType     string `gorm:"type:varchar(50);not null;column:event_type" json:"event_type"`
	ExitCode      int32  `gorm:"column:exit_code" json:"exit_code"`
	Reason        string `gorm:"type:text;column:reason" json:"reason"`
}
