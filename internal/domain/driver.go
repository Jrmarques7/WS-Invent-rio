package domain

import (
	"time"

	"github.com/google/uuid"
)

type CNHCategory string
type DriverStatus string

const (
	CNHA  CNHCategory = "A"
	CNHB  CNHCategory = "B"
	CNHAB CNHCategory = "AB"
	CNHC  CNHCategory = "C"
	CNHAC CNHCategory = "AC"
	CNHAD CNHCategory = "AD"
	CNHAE CNHCategory = "AE"
	CNHD  CNHCategory = "D"
	CNHE  CNHCategory = "E"
)

const (
	DriverStatusActive   DriverStatus = "ACTIVE"
	DriverStatusInactive DriverStatus = "INACTIVE"
)

type Driver struct {
	ID          uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string       `gorm:"not null" json:"name"`
	CPF         string       `gorm:"uniqueIndex" json:"cpf"`
	CNH         string       `gorm:"uniqueIndex" json:"cnh"`
	CNHCategory CNHCategory  `gorm:"type:varchar(5)" json:"cnh_category"`
	CNHExpiry   *time.Time   `json:"cnh_expiry"`
	Phone       string       `json:"phone"`
	Email       string       `json:"email"`
	Status      DriverStatus `gorm:"type:varchar(20);default:'ACTIVE'" json:"status"`
	Notes       string       `json:"notes"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
	DeletedAt   *time.Time   `gorm:"index" json:"-"`
}

type DriverFilters struct {
	Search string
	Status DriverStatus
}

type DriverRepository interface {
	FindAll(filters DriverFilters) ([]*Driver, error)
	FindByID(id uuid.UUID) (*Driver, error)
	Create(d *Driver) error
	Update(d *Driver) error
	SoftDelete(id uuid.UUID) error
}

type DriverService interface {
	List(filters DriverFilters) ([]*Driver, error)
	GetByID(id uuid.UUID) (*Driver, error)
	Create(dto CreateDriverInput) (*Driver, error)
	Update(id uuid.UUID, dto UpdateDriverInput) (*Driver, error)
	Delete(id uuid.UUID) error
}

type CreateDriverInput struct {
	Name        string      `json:"name" binding:"required"`
	CPF         string      `json:"cpf"`
	CNH         string      `json:"cnh"`
	CNHCategory CNHCategory `json:"cnh_category"`
	CNHExpiry   *time.Time  `json:"cnh_expiry"`
	Phone       string      `json:"phone"`
	Email       string      `json:"email"`
	Notes       string      `json:"notes"`
}

type UpdateDriverInput struct {
	Name        string       `json:"name"`
	CPF         string       `json:"cpf"`
	CNH         string       `json:"cnh"`
	CNHCategory CNHCategory  `json:"cnh_category"`
	CNHExpiry   *time.Time   `json:"cnh_expiry"`
	Phone       string       `json:"phone"`
	Email       string       `json:"email"`
	Status      DriverStatus `json:"status"`
	Notes       string       `json:"notes"`
}
