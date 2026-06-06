package domain

import (
	"time"

	"github.com/google/uuid"
)

type DepreciationMethod string

const (
	MethodLinear      DepreciationMethod = "LINEAR"
	MethodDeclining   DepreciationMethod = "DECLINING_BALANCE"
)

type Category struct {
	ID                 uuid.UUID          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name               string             `gorm:"uniqueIndex;not null"`
	Description        string
	AssetType          AssetType          `gorm:"type:varchar(20);not null"`
	UsefulLifeYears    int
	DepreciationRate   float64            `gorm:"type:numeric(5,2)"` // % per year
	DepreciationMethod DepreciationMethod `gorm:"type:varchar(30);default:'LINEAR'"`
	IsActive           bool               `gorm:"default:true"`
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type CategoryRepository interface {
	FindAll(assetType AssetType, search string) ([]*Category, error)
	FindByID(id uuid.UUID) (*Category, error)
	Create(category *Category) error
	Update(category *Category) error
	Delete(id uuid.UUID) error
}

type CategoryService interface {
	List(assetType AssetType, search string) ([]*Category, error)
	GetByID(id uuid.UUID) (*Category, error)
	Create(dto CreateCategoryInput) (*Category, error)
	Update(id uuid.UUID, dto UpdateCategoryInput) (*Category, error)
	Delete(id uuid.UUID) error
}

type CreateCategoryInput struct {
	Name               string             `json:"name" binding:"required"`
	Description        string             `json:"description"`
	AssetType          AssetType          `json:"asset_type" binding:"required"`
	UsefulLifeYears    int                `json:"useful_life_years"`
	DepreciationRate   float64            `json:"depreciation_rate"`
	DepreciationMethod DepreciationMethod `json:"depreciation_method"`
}

type UpdateCategoryInput struct {
	Name               string             `json:"name"`
	Description        string             `json:"description"`
	UsefulLifeYears    int                `json:"useful_life_years"`
	DepreciationRate   float64            `json:"depreciation_rate"`
	DepreciationMethod DepreciationMethod `json:"depreciation_method"`
	IsActive           *bool              `json:"is_active"`
}
