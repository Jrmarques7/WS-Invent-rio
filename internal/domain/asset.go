package domain

import (
	"time"

	"github.com/google/uuid"
)

type AssetType string
type AssetStatus string
type AssetCondition string
type TransferPolicy string

const (
	AssetTypeMovel      AssetType = "MOVEL"
	AssetTypeImovel     AssetType = "IMOVEL"
	AssetTypeVeiculo    AssetType = "VEICULO"
	AssetTypeConsumivel AssetType = "CONSUMIVEL"
)

const (
	AssetStatusActive      AssetStatus = "ACTIVE"
	AssetStatusInactive    AssetStatus = "INACTIVE"
	AssetStatusMaintenance AssetStatus = "UNDER_MAINTENANCE"
	AssetStatusWrittenOff  AssetStatus = "WRITTEN_OFF"
)

const (
	ConditionExcellent AssetCondition = "EXCELLENT"
	ConditionGood      AssetCondition = "GOOD"
	ConditionFair      AssetCondition = "FAIR"
	ConditionPoor      AssetCondition = "POOR"
)

const (
	TransferDirect           TransferPolicy = "DIRECT"
	TransferDirectNotify     TransferPolicy = "DIRECT_NOTIFY"
	TransferRequiresApproval TransferPolicy = "REQUIRES_APPROVAL"
)

type Asset struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	PatrimonyNumber  string         `gorm:"uniqueIndex;not null" json:"patrimony_number"`
	Name             string         `gorm:"not null" json:"name"`
	Description      string         `json:"description"`
	CategoryID       *uuid.UUID     `gorm:"type:uuid" json:"category_id"`
	Category         *Category      `gorm:"foreignKey:CategoryID" json:"category"`
	DepartmentID     *uuid.UUID     `gorm:"type:uuid" json:"department_id"`
	Department       *Department    `gorm:"foreignKey:DepartmentID" json:"department"`
	AssetType        AssetType      `gorm:"type:varchar(20);not null" json:"asset_type"`
	Brand            string         `json:"brand"`
	Model            string         `json:"model"`
	SerialNumber     string         `json:"serial_number"`
	AcquisitionDate  *time.Time     `json:"acquisition_date"`
	AcquisitionValue float64        `gorm:"type:numeric(15,2)" json:"acquisition_value"`
	CurrentValue     float64        `gorm:"type:numeric(15,2)" json:"current_value"`
	UsefulLifeYears  int            `json:"useful_life_years"`
	Condition        AssetCondition `gorm:"type:varchar(20);default:'GOOD'" json:"condition"`
	LocationID       *uuid.UUID     `gorm:"type:uuid" json:"location_id"`
	Location         *Location      `gorm:"foreignKey:LocationID" json:"location"`
	Status           AssetStatus    `gorm:"type:varchar(30);default:'ACTIVE'" json:"status"`
	TransferPolicy   TransferPolicy `gorm:"type:varchar(30);default:'REQUIRES_APPROVAL'" json:"transfer_policy"`
	Photo            string         `json:"photo"`
	Notes            string         `json:"notes"`
	WriteOffDate     *time.Time     `json:"write_off_date"`
	WriteOffReason   string         `json:"write_off_reason"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        *time.Time     `gorm:"index" json:"-"`
}

type AssetRepository interface {
	FindAll(page, limit int, filters AssetFilters) ([]*Asset, int64, error)
	FindByID(id uuid.UUID) (*Asset, error)
	FindByPatrimonyNumber(number string) (*Asset, error)
	CountByTypeAndYear(assetType AssetType, year int) (int64, error)
	Create(asset *Asset) error
	Update(asset *Asset) error
	WriteOffWithAudit(id uuid.UUID, input WriteOffInput, performedBy uuid.UUID) error
	SoftDelete(id uuid.UUID) error
}

type AssetService interface {
	List(page, limit int, filters AssetFilters) ([]*Asset, int64, error)
	GetByID(id uuid.UUID) (*Asset, error)
	Create(dto CreateAssetInput) (*Asset, error)
	Update(id uuid.UUID, dto UpdateAssetInput) (*Asset, error)
	WriteOff(id uuid.UUID, dto WriteOffInput, performedBy uuid.UUID) error
	Delete(id uuid.UUID) error
	GeneratePatrimonyNumber(assetType AssetType) (string, error)
	PreviewPatrimonyNumber(assetType AssetType) (string, error)
}

type AssetFilters struct {
	Search       string
	AssetType    AssetType
	Status       AssetStatus
	CategoryID   *uuid.UUID
	LocationID   *uuid.UUID
	DepartmentID *uuid.UUID
}

type CreateAssetInput struct {
	Name             string         `json:"name" binding:"required"`
	Description      string         `json:"description"`
	CategoryID       *uuid.UUID     `json:"category_id"`
	DepartmentID     *uuid.UUID     `json:"department_id"`
	AssetType        AssetType      `json:"asset_type" binding:"required"`
	Brand            string         `json:"brand"`
	Model            string         `json:"model"`
	SerialNumber     string         `json:"serial_number"`
	AcquisitionDate  *time.Time     `json:"acquisition_date"`
	AcquisitionValue float64        `json:"acquisition_value"`
	UsefulLifeYears  int            `json:"useful_life_years"`
	Condition        AssetCondition `json:"condition"`
	LocationID       *uuid.UUID     `json:"location_id"`
	TransferPolicy   TransferPolicy `json:"transfer_policy"`
	Notes            string         `json:"notes"`
}

type UpdateAssetInput struct {
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	CategoryID      *uuid.UUID     `json:"category_id"`
	DepartmentID    *uuid.UUID     `json:"department_id"`
	Brand           string         `json:"brand"`
	Model           string         `json:"model"`
	SerialNumber    string         `json:"serial_number"`
	UsefulLifeYears int            `json:"useful_life_years"`
	Condition       AssetCondition `json:"condition"`
	LocationID      *uuid.UUID     `json:"location_id"`
	Status          AssetStatus    `json:"status"`
	TransferPolicy  TransferPolicy `json:"transfer_policy"`
	Notes           string         `json:"notes"`
}

type WriteOffInput struct {
	Date   time.Time `json:"date" binding:"required"`
	Reason string    `json:"reason" binding:"required"`
}
