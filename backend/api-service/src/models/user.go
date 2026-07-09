package models

import "gorm.io/gorm"

// User representa un usuario del sistema.
type User struct {
	gorm.Model
	ID       string `gorm:"primaryKey" json:"id"`
	Email    string `gorm:"uniqueIndex;not null" json:"email"`
	Password string `gorm:"not null" json:"-"`
}
