package domain

import (
	"time"

	"github.com/google/uuid"
)

type LocationType string

const (
	LocationTypeBuilding LocationType = "BUILDING"
	LocationTypeFloor    LocationType = "FLOOR"
	LocationTypeRoom     LocationType = "ROOM"
	LocationTypeSector   LocationType = "SECTOR"
)

type Location struct {
	ID           uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name         string       `gorm:"not null"`
	Code         string       `gorm:"uniqueIndex"`
	Type         LocationType `gorm:"type:varchar(20);not null"`
	Address      string
	ParentID     *uuid.UUID   `gorm:"type:uuid"`
	Parent       *Location    `gorm:"foreignKey:ParentID"`
	Children     []*Location  `gorm:"foreignKey:ParentID"`
	IsActive     bool         `gorm:"default:true"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type LocationRepository interface {
	FindAll(search string) ([]*Location, error)
	FindByID(id uuid.UUID) (*Location, error)
	Create(location *Location) error
	Update(location *Location) error
	Delete(id uuid.UUID) error
}

type LocationService interface {
	List(search string) ([]*Location, error)
	GetByID(id uuid.UUID) (*Location, error)
	Create(dto CreateLocationInput) (*Location, error)
	Update(id uuid.UUID, dto UpdateLocationInput) (*Location, error)
	Delete(id uuid.UUID) error
}

type CreateLocationInput struct {
	Name     string       `json:"name" binding:"required"`
	Code     string       `json:"code"`
	Type     LocationType `json:"type" binding:"required"`
	Address  string       `json:"address"`
	ParentID *uuid.UUID   `json:"parent_id"`
}

type UpdateLocationInput struct {
	Name     string       `json:"name"`
	Code     string       `json:"code"`
	Type     LocationType `json:"type"`
	Address  string       `json:"address"`
	ParentID *uuid.UUID   `json:"parent_id"`
	IsActive *bool        `json:"is_active"`
}
