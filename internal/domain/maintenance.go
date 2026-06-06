package domain

import (
	"time"

	"github.com/google/uuid"
)

type MaintenanceType string
type MaintenanceStatus string

const (
	MaintenancePreventive MaintenanceType = "PREVENTIVE"
	MaintenanceCorrective MaintenanceType = "CORRECTIVE"
)

const (
	MaintenanceScheduled  MaintenanceStatus = "SCHEDULED"
	MaintenanceInProgress MaintenanceStatus = "IN_PROGRESS"
	MaintenanceCompleted  MaintenanceStatus = "COMPLETED"
	MaintenanceCancelled  MaintenanceStatus = "CANCELLED"
)

type Maintenance struct {
	ID             uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AssetID        uuid.UUID       `gorm:"type:uuid;not null"`
	Asset          *Asset          `gorm:"foreignKey:AssetID"`
	Type           MaintenanceType `gorm:"type:varchar(20);not null"`
	Description    string          `gorm:"not null"`
	Provider       string          // fornecedor/prestador
	Cost           float64         `gorm:"type:numeric(15,2)"`
	ScheduledDate  *time.Time
	StartDate      *time.Time
	CompletionDate *time.Time
	Status         MaintenanceStatus `gorm:"type:varchar(20);default:'SCHEDULED'"`
	Notes          string
	RegisteredByID uuid.UUID `gorm:"type:uuid"`
	RegisteredBy   *User     `gorm:"foreignKey:RegisteredByID"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type MaintenanceRepository interface {
	FindAll(page, limit int, assetID *uuid.UUID, status MaintenanceStatus) ([]*Maintenance, int64, error)
	FindByID(id uuid.UUID) (*Maintenance, error)
	FindByAsset(assetID uuid.UUID) ([]*Maintenance, error)
	Create(maintenance *Maintenance) error
	CreateWithAssetStatus(maintenance *Maintenance, assetStatus AssetStatus, movement *Movement) error
	Update(maintenance *Maintenance) error
	UpdateWithAssetStatus(maintenance *Maintenance, assetStatus *AssetStatus, movement *Movement) error
}

type MaintenanceService interface {
	List(page, limit int, assetID *uuid.UUID, status MaintenanceStatus) ([]*Maintenance, int64, error)
	GetByID(id uuid.UUID) (*Maintenance, error)
	Create(dto CreateMaintenanceInput, registeredBy uuid.UUID) (*Maintenance, error)
	CreateOwn(dto CreateMaintenanceInput, registeredBy uuid.UUID) (*Maintenance, error)
	UpdateStatus(id uuid.UUID, dto UpdateMaintenanceStatusInput, performedBy uuid.UUID) (*Maintenance, error)
	Complete(id uuid.UUID, dto CompleteMaintenanceInput, performedBy uuid.UUID) (*Maintenance, error)
}

type CreateMaintenanceInput struct {
	AssetID       uuid.UUID       `json:"asset_id" binding:"required"`
	Type          MaintenanceType `json:"type" binding:"required"`
	Description   string          `json:"description" binding:"required"`
	Provider      string          `json:"provider"`
	Cost          float64         `json:"cost"`
	ScheduledDate *time.Time      `json:"scheduled_date"`
	Notes         string          `json:"notes"`
}

type UpdateMaintenanceStatusInput struct {
	Status    MaintenanceStatus `json:"status" binding:"required"`
	StartDate *time.Time        `json:"start_date"`
	Notes     string            `json:"notes"`
}

type CompleteMaintenanceInput struct {
	CompletionDate time.Time `json:"completion_date" binding:"required"`
	Cost           float64   `json:"cost"`
	Notes          string    `json:"notes"`
}
