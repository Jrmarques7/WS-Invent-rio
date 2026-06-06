package repository

import (
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type maintenanceRepository struct {
	db *gorm.DB
}

func NewMaintenanceRepository(db *gorm.DB) domain.MaintenanceRepository {
	return &maintenanceRepository{db: db}
}

func (r *maintenanceRepository) FindAll(page, limit int, assetID *uuid.UUID, status domain.MaintenanceStatus) ([]*domain.Maintenance, int64, error) {
	var records []*domain.Maintenance
	var total int64

	q := r.db.Model(&domain.Maintenance{}).Preload("Asset").Preload("RegisteredBy")
	if assetID != nil {
		q = q.Where("asset_id = ?", *assetID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := q.Offset(offset).Limit(limit).Order("created_at DESC").Find(&records).Error; err != nil {
		return nil, 0, err
	}
	return records, total, nil
}

func (r *maintenanceRepository) FindByID(id uuid.UUID) (*domain.Maintenance, error) {
	var record domain.Maintenance
	if err := r.db.Preload("Asset").Preload("RegisteredBy").
		First(&record, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &record, nil
}

func (r *maintenanceRepository) FindByAsset(assetID uuid.UUID) ([]*domain.Maintenance, error) {
	var records []*domain.Maintenance
	if err := r.db.Where("asset_id = ?", assetID).Order("created_at DESC").Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func (r *maintenanceRepository) Create(maintenance *domain.Maintenance) error {
	return r.db.Create(maintenance).Error
}

func (r *maintenanceRepository) CreateWithAssetStatus(maintenance *domain.Maintenance, assetStatus domain.AssetStatus, movement *domain.Movement) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var asset domain.Asset
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND deleted_at IS NULL", maintenance.AssetID).
			First(&asset).Error; err != nil {
			return err
		}
		if err := tx.Create(maintenance).Error; err != nil {
			return err
		}
		if err := tx.Model(&asset).Update("status", assetStatus).Error; err != nil {
			return err
		}
		if movement != nil {
			movement.AssetID = maintenance.AssetID
			movement.FromLocationID = asset.LocationID
			if err := tx.Create(movement).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *maintenanceRepository) Update(maintenance *domain.Maintenance) error {
	return r.db.Save(maintenance).Error
}

func (r *maintenanceRepository) UpdateWithAssetStatus(maintenance *domain.Maintenance, assetStatus *domain.AssetStatus, movement *domain.Movement) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var asset domain.Asset
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND deleted_at IS NULL", maintenance.AssetID).
			First(&asset).Error; err != nil {
			return err
		}
		if err := tx.Save(maintenance).Error; err != nil {
			return err
		}
		if assetStatus != nil {
			if err := tx.Model(&asset).Update("status", *assetStatus).Error; err != nil {
				return err
			}
		}
		if movement != nil {
			movement.AssetID = maintenance.AssetID
			movement.FromLocationID = asset.LocationID
			if err := tx.Create(movement).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
