package domain

import (
	"time"

	"github.com/google/uuid"
)

type DepreciationRecord struct {
	ID                 uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AssetID            uuid.UUID `gorm:"type:uuid;not null"`
	Asset              *Asset    `gorm:"foreignKey:AssetID"`
	Year               int       `gorm:"not null"`
	Month              int       `gorm:"not null"`
	OpeningValue       float64   `gorm:"type:numeric(15,2)"`
	DepreciationAmount float64   `gorm:"type:numeric(15,2)"`
	ClosingValue       float64   `gorm:"type:numeric(15,2)"`
	Rate               float64   `gorm:"type:numeric(5,4)"`
	Method             DepreciationMethod `gorm:"type:varchar(30)"`
	CreatedAt          time.Time
}

type DepreciationRepository interface {
	FindByAsset(assetID uuid.UUID) ([]*DepreciationRecord, error)
	FindByPeriod(year, month int) ([]*DepreciationRecord, error)
	FindLastRecord(assetID uuid.UUID) (*DepreciationRecord, error)
	Create(record *DepreciationRecord) error
	BulkCreate(records []*DepreciationRecord) error
}

type DepreciationService interface {
	GetByPeriod(year, month int) ([]*DepreciationRecord, error)
	GetAssetHistory(assetID uuid.UUID) ([]*DepreciationRecord, error)
	CalculateMonthly(year, month int) error
	CalculateForAsset(assetID uuid.UUID, year, month int) (*DepreciationRecord, error)
}
