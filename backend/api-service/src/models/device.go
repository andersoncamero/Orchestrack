package models

import (
	"gorm.io/gorm"
)

// Device representa un agente o máquina registrada en el sistema.
type Device struct {
	gorm.Model

	ServiceID     string  `gorm:"uniqueIndex;not null;column:service_id" json:"service_id"`
	Hostname      string  `gorm:"uniqueIndex;not null;column:hostname" json:"hostname"`
	Status        string  `gorm:"type:varchar(20);default:'offline';column:status" json:"status"`
	LastSeen      int64   `gorm:"column:last_seen" json:"last_seen"`
	CpuPercent    float64 `gorm:"column:cpu_percent" json:"cpu_percent"`
	MemoryPercent float64 `gorm:"column:memory_percent" json:"memory_percent"`
	DiskPercent   float64 `gorm:"column:disk_percent" json:"disk_percent"`
	LoadAverage   float64 `gorm:"column:load_average" json:"load_average"`
	UptimeSeconds int64   `gorm:"column:uptime_seconds" json:"uptime_seconds"`
	CpuCores      int32   `gorm:"column:cpu_cores" json:"cpu_cores"`
	MemoryTotal   int64   `gorm:"column:memory_total" json:"memory_total"`
	MemoryUsed    int64   `gorm:"column:memory_used" json:"memory_used"`
	DiskTotal     int64   `gorm:"column:disk_total" json:"disk_total"`
	DiskUsed      int64   `gorm:"column:disk_used" json:"disk_used"`
	Platform          string  `gorm:"type:varchar(50);column:platform" json:"platform"`
	TotalContainers   int     `gorm:"column:total_containers;default:0" json:"total_containers"`
	RunningContainers int     `gorm:"column:running_containers;default:0" json:"running_containers"`
	StoppedContainers int     `gorm:"column:stopped_containers;default:0" json:"stopped_containers"`
	ProcessCount      int32   `gorm:"column:process_count;default:0" json:"process_count"`

	// Relación de Uno a Muchos: Cada dispositivo puede tener múltiples eventos asociados
	Events        []Event `gorm:"foreignKey:DeviceID;references:ServiceID;constraint:OnDelete:CASCADE" json:"events,omitempty"`
}
