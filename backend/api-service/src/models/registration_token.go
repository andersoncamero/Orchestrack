package models

import (
	"time"

	"gorm.io/gorm"
)

// RegistrationToken representa un token de activación seguro para nuevos dispositivos.
type RegistrationToken struct {
	gorm.Model

	Token     string    `gorm:"uniqueIndex;not null;column:token" json:"token"`
	Used      bool      `gorm:"default:false;column:used" json:"used"`
	ExpiresAt time.Time `gorm:"column:expires_at" json:"expires_at"`
}
