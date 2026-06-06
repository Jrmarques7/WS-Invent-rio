package repository

import (
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type departmentRepository struct {
	db *gorm.DB
}

func NewDepartmentRepository(db *gorm.DB) domain.DepartmentRepository {
	return &departmentRepository{db: db}
}

func (r *departmentRepository) FindAll() ([]*domain.Department, error) {
	var deps []*domain.Department
	// Preload one level of Parent so the frontend can build the tree
	err := r.db.Preload("Parent").Order("name ASC").Find(&deps).Error
	return deps, err
}

func (r *departmentRepository) FindByID(id uuid.UUID) (*domain.Department, error) {
	var d domain.Department
	if err := r.db.Preload("Parent").Where("id = ?", id).First(&d).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *departmentRepository) Create(d *domain.Department) error {
	return r.db.Create(d).Error
}

func (r *departmentRepository) Update(d *domain.Department) error {
	return r.db.Save(d).Error
}

func (r *departmentRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&domain.Department{}, "id = ?", id).Error
}
