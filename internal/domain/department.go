package domain

import (
	"time"

	"github.com/google/uuid"
)

type Department struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string     `gorm:"not null" json:"name"`
	Type        string     `gorm:"type:varchar(100)" json:"type"`
	ParentID    *uuid.UUID `gorm:"type:uuid" json:"parent_id"`
	Parent      *Department `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Description string     `json:"description"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type DepartmentRepository interface {
	FindAll() ([]*Department, error)
	FindByID(id uuid.UUID) (*Department, error)
	Create(d *Department) error
	Update(d *Department) error
	Delete(id uuid.UUID) error
}

type DepartmentService interface {
	List() ([]*Department, error)
	GetByID(id uuid.UUID) (*Department, error)
	Create(dto CreateDepartmentInput) (*Department, error)
	Update(id uuid.UUID, dto CreateDepartmentInput) (*Department, error)
	Delete(id uuid.UUID) error
}

type CreateDepartmentInput struct {
	Name        string     `json:"name" binding:"required"`
	Type        string     `json:"type"`
	ParentID    *uuid.UUID `json:"parent_id"`
	Description string     `json:"description"`
}
