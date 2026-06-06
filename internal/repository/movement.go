package repository

import (
	"patrimonio/internal/domain"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type movementRepository struct {
	db *gorm.DB
}

func NewMovementRepository(db *gorm.DB) domain.MovementRepository {
	return &movementRepository{db: db}
}

func (r *movementRepository) FindAll(page, limit int, assetID *uuid.UUID) ([]*domain.Movement, int64, error) {
	var movements []*domain.Movement
	var total int64

	q := r.db.Model(&domain.Movement{}).
		Preload("Asset").Preload("FromUser").Preload("ToUser").
		Preload("FromLocation").Preload("ToLocation").Preload("PerformedBy")

	if assetID != nil {
		q = q.Where("asset_id = ?", *assetID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := q.Offset(offset).Limit(limit).Order("date DESC").Find(&movements).Error; err != nil {
		return nil, 0, err
	}
	return movements, total, nil
}

func (r *movementRepository) FindByID(id uuid.UUID) (*domain.Movement, error) {
	var movement domain.Movement
	if err := r.db.Preload("Asset").Preload("FromUser").Preload("ToUser").
		Preload("FromLocation").Preload("ToLocation").Preload("PerformedBy").
		First(&movement, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &movement, nil
}

func (r *movementRepository) FindByAsset(assetID uuid.UUID) ([]*domain.Movement, error) {
	var movements []*domain.Movement
	if err := r.db.Preload("FromUser").Preload("ToUser").
		Preload("FromLocation").Preload("ToLocation").Preload("PerformedBy").
		Where("asset_id = ?", assetID).Order("date DESC").Find(&movements).Error; err != nil {
		return nil, err
	}
	return movements, nil
}

func (r *movementRepository) Create(movement *domain.Movement) error {
	return r.db.Create(movement).Error
}

func (r *movementRepository) CreateWithEffects(movement *domain.Movement, toLocationID *uuid.UUID, toUserID *uuid.UUID) error {
	if err := r.db.Transaction(func(tx *gorm.DB) error {
		if toLocationID != nil {
			if err := tx.Model(&domain.Asset{}).
				Where("id = ? AND deleted_at IS NULL", movement.AssetID).
				Update("location_id", *toLocationID).Error; err != nil {
				return err
			}
		}

		if toUserID != nil {
			var existing domain.Custody
			err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("asset_id = ? AND is_active = true", movement.AssetID).
				First(&existing).Error
			if err != nil && err != gorm.ErrRecordNotFound {
				return err
			}
			if err == nil {
				now := time.Now()
				existing.IsActive = false
				existing.EndDate = &now
				if err := tx.Save(&existing).Error; err != nil {
					return err
				}
			}
			custody := &domain.Custody{
				AssetID:    movement.AssetID,
				UserID:     *toUserID,
				AssignedBy: movement.PerformedByID,
				StartDate:  movement.Date,
				IsActive:   true,
				Notes:      movement.Notes,
			}
			if err := tx.Create(custody).Error; err != nil {
				return err
			}
		}

		return tx.Create(movement).Error
	}); err != nil {
		return err
	}
	return r.db.Preload("Asset").Preload("FromUser").Preload("ToUser").
		Preload("FromLocation").Preload("ToLocation").Preload("PerformedBy").
		First(movement, "id = ?", movement.ID).Error
}
