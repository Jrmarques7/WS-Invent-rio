package repository

import (
	"patrimonio/internal/domain"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type custodyRepository struct {
	db *gorm.DB
}

func NewCustodyRepository(db *gorm.DB) domain.CustodyRepository {
	return &custodyRepository{db: db}
}

func (r *custodyRepository) FindAll(page, limit int, userID *uuid.UUID, assetID *uuid.UUID) ([]*domain.Custody, int64, error) {
	var custodies []*domain.Custody
	var total int64

	q := r.db.Model(&domain.Custody{}).
		Preload("Asset").Preload("User").Preload("AssignedByUser")

	if userID != nil {
		q = q.Where("user_id = ?", *userID)
	}
	if assetID != nil {
		q = q.Where("asset_id = ?", *assetID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := q.Offset(offset).Limit(limit).Order("start_date DESC").Find(&custodies).Error; err != nil {
		return nil, 0, err
	}
	return custodies, total, nil
}

func (r *custodyRepository) FindByID(id uuid.UUID) (*domain.Custody, error) {
	var custody domain.Custody
	if err := r.db.Preload("Asset").Preload("User").Preload("AssignedByUser").
		First(&custody, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &custody, nil
}

func (r *custodyRepository) FindActiveCustody(assetID uuid.UUID) (*domain.Custody, error) {
	var custody domain.Custody
	if err := r.db.Preload("User").
		Where("asset_id = ? AND is_active = true", assetID).
		First(&custody).Error; err != nil {
		return nil, err
	}
	return &custody, nil
}

func (r *custodyRepository) FindActiveCustodyForUser(assetID, userID uuid.UUID) (*domain.Custody, error) {
	var custody domain.Custody
	if err := r.db.Preload("Asset").Preload("Asset.Category").Preload("Asset.Location").Preload("User").
		Where("asset_id = ? AND user_id = ? AND is_active = true", assetID, userID).
		First(&custody).Error; err != nil {
		return nil, err
	}
	return &custody, nil
}

func (r *custodyRepository) FindByUser(userID uuid.UUID) ([]*domain.Custody, error) {
	var custodies []*domain.Custody
	if err := r.db.Preload("Asset").Preload("Asset.Category").Preload("Asset.Location").
		Where("user_id = ? AND is_active = true", userID).
		Find(&custodies).Error; err != nil {
		return nil, err
	}
	return custodies, nil
}

func (r *custodyRepository) Create(custody *domain.Custody) error {
	return r.db.Create(custody).Error
}

func (r *custodyRepository) Update(custody *domain.Custody) error {
	return r.db.Save(custody).Error
}

func (r *custodyRepository) ReplaceActive(custody *domain.Custody, movement *domain.Movement) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var existing domain.Custody
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("asset_id = ? AND is_active = true", custody.AssetID).
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
			if movement != nil && movement.FromUserID == nil {
				movement.FromUserID = &existing.UserID
			}
		}
		if err := tx.Create(custody).Error; err != nil {
			return err
		}
		if movement != nil {
			return tx.Create(movement).Error
		}
		return nil
	})
}

func (r *custodyRepository) ReleaseActive(assetID uuid.UUID, notes string, performedBy uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var custody domain.Custody
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("asset_id = ? AND is_active = true", assetID).
			First(&custody).Error; err != nil {
			return err
		}

		now := time.Now()
		custody.IsActive = false
		custody.EndDate = &now
		if notes != "" {
			custody.Notes = notes
		}
		if err := tx.Save(&custody).Error; err != nil {
			return err
		}

		movement := &domain.Movement{
			AssetID:       assetID,
			Type:          domain.MovementReturn,
			FromUserID:    &custody.UserID,
			Date:          now,
			Reason:        "Liberação de custódia",
			PerformedByID: performedBy,
			Notes:         notes,
		}
		return tx.Create(movement).Error
	})
}
