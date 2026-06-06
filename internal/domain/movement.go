package domain

import (
	"time"

	"github.com/google/uuid"
)

type MovementType string

const (
	MovementTransfer   MovementType = "TRANSFER"
	MovementLoan       MovementType = "LOAN"
	MovementReturn     MovementType = "RETURN"
	MovementRelocation MovementType = "RELOCATION"
	MovementWriteOff   MovementType = "WRITE_OFF"
	MovementMaintStart MovementType = "MAINT_START"
	MovementMaintDone  MovementType = "MAINT_DONE"
	MovementInvDiff    MovementType = "INVENTORY_DIFF"
)

type Movement struct {
	ID             uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AssetID        uuid.UUID    `gorm:"type:uuid;not null"`
	Asset          *Asset       `gorm:"foreignKey:AssetID"`
	Type           MovementType `gorm:"type:varchar(20);not null"`
	FromUserID     *uuid.UUID   `gorm:"type:uuid"`
	FromUser       *User        `gorm:"foreignKey:FromUserID"`
	ToUserID       *uuid.UUID   `gorm:"type:uuid"`
	ToUser         *User        `gorm:"foreignKey:ToUserID"`
	FromLocationID *uuid.UUID   `gorm:"type:uuid"`
	FromLocation   *Location    `gorm:"foreignKey:FromLocationID"`
	ToLocationID   *uuid.UUID   `gorm:"type:uuid"`
	ToLocation     *Location    `gorm:"foreignKey:ToLocationID"`
	Date           time.Time    `gorm:"not null"`
	Reason         string
	PerformedByID  uuid.UUID `gorm:"type:uuid"`
	PerformedBy    *User     `gorm:"foreignKey:PerformedByID"`
	Notes          string
	CreatedAt      time.Time
}

type MovementRepository interface {
	FindAll(page, limit int, assetID *uuid.UUID) ([]*Movement, int64, error)
	FindByID(id uuid.UUID) (*Movement, error)
	FindByAsset(assetID uuid.UUID) ([]*Movement, error)
	Create(movement *Movement) error
	CreateWithEffects(movement *Movement, toLocationID *uuid.UUID, toUserID *uuid.UUID) error
}

type MovementService interface {
	List(page, limit int, assetID *uuid.UUID) ([]*Movement, int64, error)
	GetByID(id uuid.UUID) (*Movement, error)
	GetAssetHistory(assetID uuid.UUID) ([]*Movement, error)
	Register(dto RegisterMovementInput, performedBy uuid.UUID) (*Movement, error)
}

type RegisterMovementInput struct {
	AssetID        uuid.UUID    `json:"asset_id" binding:"required"`
	Type           MovementType `json:"type" binding:"required"`
	FromUserID     *uuid.UUID   `json:"from_user_id"`
	ToUserID       *uuid.UUID   `json:"to_user_id"`
	FromLocationID *uuid.UUID   `json:"from_location_id"`
	ToLocationID   *uuid.UUID   `json:"to_location_id"`
	Date           time.Time    `json:"date" binding:"required"`
	Reason         string       `json:"reason"`
	Notes          string       `json:"notes"`
}
