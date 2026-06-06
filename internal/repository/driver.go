package repository

import (
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type driverRepository struct {
	db *gorm.DB
}

func NewDriverRepository(db *gorm.DB) domain.DriverRepository {
	return &driverRepository{db: db}
}

func (r *driverRepository) FindAll(filters domain.DriverFilters) ([]*domain.Driver, error) {
	var drivers []*domain.Driver
	q := r.db.Where("deleted_at IS NULL")

	if filters.Search != "" {
		s := "%" + filters.Search + "%"
		q = q.Where("name ILIKE ? OR cpf ILIKE ? OR cnh ILIKE ?", s, s, s)
	}
	if filters.Status != "" {
		q = q.Where("status = ?", filters.Status)
	}

	err := q.Order("name ASC").Find(&drivers).Error
	return drivers, err
}

func (r *driverRepository) FindByID(id uuid.UUID) (*domain.Driver, error) {
	var d domain.Driver
	if err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&d).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *driverRepository) Create(d *domain.Driver) error {
	return r.db.Create(d).Error
}

func (r *driverRepository) Update(d *domain.Driver) error {
	return r.db.Save(d).Error
}

func (r *driverRepository) SoftDelete(id uuid.UUID) error {
	return r.db.Exec("UPDATE drivers SET deleted_at = NOW() WHERE id = ?", id).Error
}
