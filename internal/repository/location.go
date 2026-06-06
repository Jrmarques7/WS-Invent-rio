package repository

import (
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type locationRepository struct {
	db *gorm.DB
}

func NewLocationRepository(db *gorm.DB) domain.LocationRepository {
	return &locationRepository{db: db}
}

func (r *locationRepository) FindAll(search string) ([]*domain.Location, error) {
	var locations []*domain.Location
	q := r.db.Model(&domain.Location{}).Preload("Children")
	if search != "" {
		q = q.Where("name ILIKE ? OR code ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if err := q.Order("name ASC").Find(&locations).Error; err != nil {
		return nil, err
	}
	return locations, nil
}

func (r *locationRepository) FindByID(id uuid.UUID) (*domain.Location, error) {
	var location domain.Location
	if err := r.db.Preload("Parent").Preload("Children").First(&location, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &location, nil
}

func (r *locationRepository) Create(location *domain.Location) error {
	return r.db.Create(location).Error
}

func (r *locationRepository) Update(location *domain.Location) error {
	return r.db.Save(location).Error
}

func (r *locationRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&domain.Location{}, "id = ?", id).Error
}
