package repository

import (
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type categoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) domain.CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) FindAll(assetType domain.AssetType, search string) ([]*domain.Category, error) {
	var categories []*domain.Category
	q := r.db.Model(&domain.Category{})
	if assetType != "" {
		q = q.Where("asset_type = ?", assetType)
	}
	if search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	if err := q.Order("name ASC").Find(&categories).Error; err != nil {
		return nil, err
	}
	return categories, nil
}

func (r *categoryRepository) FindByID(id uuid.UUID) (*domain.Category, error) {
	var category domain.Category
	if err := r.db.First(&category, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *categoryRepository) Create(category *domain.Category) error {
	return r.db.Create(category).Error
}

func (r *categoryRepository) Update(category *domain.Category) error {
	return r.db.Save(category).Error
}

func (r *categoryRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&domain.Category{}, "id = ?", id).Error
}
