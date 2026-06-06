package repository

import (
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type depreciationRepository struct {
	db *gorm.DB
}

func NewDepreciationRepository(db *gorm.DB) domain.DepreciationRepository {
	return &depreciationRepository{db: db}
}

func (r *depreciationRepository) FindByAsset(assetID uuid.UUID) ([]*domain.DepreciationRecord, error) {
	var records []*domain.DepreciationRecord
	if err := r.db.Where("asset_id = ?", assetID).
		Order("year DESC, month DESC").Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func (r *depreciationRepository) FindByPeriod(year, month int) ([]*domain.DepreciationRecord, error) {
	var records []*domain.DepreciationRecord
	if err := r.db.Preload("Asset").
		Where("year = ? AND month = ?", year, month).Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func (r *depreciationRepository) FindLastRecord(assetID uuid.UUID) (*domain.DepreciationRecord, error) {
	var record domain.DepreciationRecord
	if err := r.db.Where("asset_id = ?", assetID).
		Order("year DESC, month DESC").First(&record).Error; err != nil {
		return nil, err
	}
	return &record, nil
}

func (r *depreciationRepository) Create(record *domain.DepreciationRecord) error {
	return r.db.Create(record).Error
}

func (r *depreciationRepository) BulkCreate(records []*domain.DepreciationRecord) error {
	return r.db.CreateInBatches(records, 100).Error
}
