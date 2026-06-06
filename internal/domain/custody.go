package domain

import (
	"time"

	"github.com/google/uuid"
)

type Custody struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AssetID        uuid.UUID `gorm:"type:uuid;not null"`
	Asset          *Asset    `gorm:"foreignKey:AssetID"`
	UserID         uuid.UUID `gorm:"type:uuid;not null"`
	User           *User     `gorm:"foreignKey:UserID"`
	AssignedBy     uuid.UUID `gorm:"type:uuid"`
	AssignedByUser *User     `gorm:"foreignKey:AssignedBy"`
	StartDate      time.Time `gorm:"not null"`
	EndDate        *time.Time
	IsActive       bool `gorm:"default:true"`
	Notes          string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type CustodyRepository interface {
	FindAll(page, limit int, userID *uuid.UUID, assetID *uuid.UUID) ([]*Custody, int64, error)
	FindByID(id uuid.UUID) (*Custody, error)
	FindActiveCustody(assetID uuid.UUID) (*Custody, error)
	FindActiveCustodyForUser(assetID, userID uuid.UUID) (*Custody, error)
	FindByUser(userID uuid.UUID) ([]*Custody, error)
	Create(custody *Custody) error
	Update(custody *Custody) error
	ReplaceActive(custody *Custody, movement *Movement) error
	ReleaseActive(assetID uuid.UUID, notes string, performedBy uuid.UUID) error
}

type CustodyService interface {
	List(page, limit int, userID *uuid.UUID, assetID *uuid.UUID) ([]*Custody, int64, error)
	GetByID(id uuid.UUID) (*Custody, error)
	GetActiveCustody(assetID uuid.UUID) (*Custody, error)
	Assign(dto AssignCustodyInput, assignedBy uuid.UUID) (*Custody, error)
	Release(assetID uuid.UUID, notes string, performedBy uuid.UUID) error
	GetUserCarga(userID uuid.UUID) ([]*Custody, error)
	UserHasActiveCustody(assetID, userID uuid.UUID) bool
}

type AssignCustodyInput struct {
	AssetID   uuid.UUID `json:"asset_id" binding:"required"`
	UserID    uuid.UUID `json:"user_id" binding:"required"`
	StartDate time.Time `json:"start_date" binding:"required"`
	Notes     string    `json:"notes"`
}

type ReleaseCustodyInput struct {
	Notes string `json:"notes"`
}
