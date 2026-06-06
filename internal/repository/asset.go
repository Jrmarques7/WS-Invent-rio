package repository

import (
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type assetRepository struct {
	db *gorm.DB
}

func NewAssetRepository(db *gorm.DB) domain.AssetRepository {
	return &assetRepository{db: db}
}

func (r *assetRepository) FindAll(page, limit int, filters domain.AssetFilters) ([]*domain.Asset, int64, error) {
	var assets []*domain.Asset
	var total int64

	q := r.db.Model(&domain.Asset{}).
		Preload("Category").
		Preload("Location").
		Preload("Department").
		Where("assets.deleted_at IS NULL").
		Where("assets.asset_type != ?", domain.AssetTypeVeiculo)

	if filters.Search != "" {
		q = q.Where("assets.name ILIKE ? OR assets.patrimony_number ILIKE ? OR assets.serial_number ILIKE ?",
			"%"+filters.Search+"%", "%"+filters.Search+"%", "%"+filters.Search+"%")
	}
	if filters.AssetType != "" {
		q = q.Where("assets.asset_type = ?", filters.AssetType)
	}
	if filters.Status != "" {
		q = q.Where("assets.status = ?", filters.Status)
	}
	if filters.CategoryID != nil {
		q = q.Where("assets.category_id = ?", *filters.CategoryID)
	}
	if filters.LocationID != nil {
		q = q.Where("assets.location_id = ?", *filters.LocationID)
	}
	if filters.DepartmentID != nil {
		q = q.Where("assets.department_id = ?", *filters.DepartmentID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := q.Offset(offset).Limit(limit).Order("assets.patrimony_number ASC").Find(&assets).Error; err != nil {
		return nil, 0, err
	}
	return assets, total, nil
}

func (r *assetRepository) FindByID(id uuid.UUID) (*domain.Asset, error) {
	var asset domain.Asset
	if err := r.db.Preload("Category").Preload("Location").Preload("Department").
		Where("id = ? AND deleted_at IS NULL", id).First(&asset).Error; err != nil {
		return nil, err
	}
	return &asset, nil
}

func (r *assetRepository) FindByPatrimonyNumber(number string) (*domain.Asset, error) {
	var asset domain.Asset
	if err := r.db.Where("patrimony_number = ? AND deleted_at IS NULL", number).First(&asset).Error; err != nil {
		return nil, err
	}
	return &asset, nil
}

func (r *assetRepository) CountByTypeAndYear(assetType domain.AssetType, year int) (int64, error) {
	var count int64
	err := r.db.Model(&domain.Asset{}).
		Where("asset_type = ? AND EXTRACT(YEAR FROM created_at) = ?", assetType, year).
		Count(&count).Error
	return count, err
}

func (r *assetRepository) Create(asset *domain.Asset) error {
	if err := r.db.Create(asset).Error; err != nil {
		return err
	}
	return r.db.Preload("Category").Preload("Location").Preload("Department").
		First(asset, "id = ?", asset.ID).Error
}

func (r *assetRepository) Update(asset *domain.Asset) error {
	if err := r.db.Save(asset).Error; err != nil {
		return err
	}
	return r.db.Preload("Category").Preload("Location").Preload("Department").
		First(asset, "id = ?", asset.ID).Error
}

func (r *assetRepository) WriteOffWithAudit(id uuid.UUID, input domain.WriteOffInput, performedBy uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var asset domain.Asset
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND deleted_at IS NULL", id).
			First(&asset).Error; err != nil {
			return err
		}

		var fromUserID *uuid.UUID
		var custody domain.Custody
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("asset_id = ? AND is_active = true", id).
			First(&custody).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return err
		}
		if err == nil {
			fromUserID = &custody.UserID
			custody.IsActive = false
			custody.EndDate = &input.Date
			if custody.Notes == "" {
				custody.Notes = "Custódia encerrada por baixa do bem"
			}
			if err := tx.Save(&custody).Error; err != nil {
				return err
			}
		}

		asset.Status = domain.AssetStatusWrittenOff
		asset.WriteOffDate = &input.Date
		asset.WriteOffReason = input.Reason
		if err := tx.Save(&asset).Error; err != nil {
			return err
		}

		movement := &domain.Movement{
			AssetID:        id,
			Type:           domain.MovementWriteOff,
			FromUserID:     fromUserID,
			FromLocationID: asset.LocationID,
			Date:           input.Date,
			Reason:         input.Reason,
			PerformedByID:  performedBy,
			Notes:          "Baixa patrimonial",
		}
		return tx.Create(movement).Error
	})
}

func (r *assetRepository) SoftDelete(id uuid.UUID) error {
	return r.db.Exec("UPDATE assets SET deleted_at = NOW() WHERE id = ?", id).Error
}
