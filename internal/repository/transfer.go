package repository

import (
	"patrimonio/internal/domain"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type transferRequestRepository struct {
	db *gorm.DB
}

func NewTransferRequestRepository(db *gorm.DB) domain.TransferRequestRepository {
	return &transferRequestRepository{db: db}
}

func (r *transferRequestRepository) FindAll(
	page, limit int,
	status domain.TransferRequestStatus,
	userID *uuid.UUID,
) ([]*domain.TransferRequest, int64, error) {
	var requests []*domain.TransferRequest
	var total int64

	q := r.db.Model(&domain.TransferRequest{}).
		Preload("Asset").Preload("FromUser").Preload("ToUser").Preload("ReviewedBy")

	if status != "" {
		q = q.Where("status = ?", status)
	}
	if userID != nil {
		q = q.Where("from_user_id = ? OR to_user_id = ?", *userID, *userID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := q.Offset(offset).Limit(limit).Order("requested_at DESC").Find(&requests).Error
	return requests, total, err
}

func (r *transferRequestRepository) FindByID(id uuid.UUID) (*domain.TransferRequest, error) {
	var request domain.TransferRequest
	err := r.db.Preload("Asset").Preload("FromUser").Preload("ToUser").Preload("ReviewedBy").
		First(&request, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &request, nil
}

func (r *transferRequestRepository) Create(request *domain.TransferRequest) error {
	if err := r.db.Create(request).Error; err != nil {
		return err
	}
	return r.db.Preload("Asset").Preload("FromUser").Preload("ToUser").Preload("ReviewedBy").
		First(request, "id = ?", request.ID).Error
}

func (r *transferRequestRepository) Update(request *domain.TransferRequest) error {
	if err := r.db.Save(request).Error; err != nil {
		return err
	}
	return r.db.Preload("Asset").Preload("FromUser").Preload("ToUser").Preload("ReviewedBy").
		First(request, "id = ?", request.ID).Error
}

func (r *transferRequestRepository) ExecuteAcceptedTransfer(request *domain.TransferRequest, performedBy uuid.UUID) error {
	if err := r.db.Transaction(func(tx *gorm.DB) error {
		var existing domain.Custody
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("asset_id = ? AND is_active = true", request.AssetID).
			First(&existing).Error
		if err != nil {
			return err
		}
		if existing.UserID != request.FromUserID {
			return gorm.ErrRecordNotFound
		}

		now := time.Now()
		existing.IsActive = false
		existing.EndDate = &now
		if err := tx.Save(&existing).Error; err != nil {
			return err
		}

		custody := &domain.Custody{
			AssetID:    request.AssetID,
			UserID:     request.ToUserID,
			AssignedBy: performedBy,
			StartDate:  now,
			IsActive:   true,
			Notes:      "Transferência de carga patrimonial",
		}
		if err := tx.Create(custody).Error; err != nil {
			return err
		}

		movement := &domain.Movement{
			AssetID:       request.AssetID,
			Type:          domain.MovementTransfer,
			FromUserID:    &request.FromUserID,
			ToUserID:      &request.ToUserID,
			Date:          now,
			Reason:        request.Reason,
			PerformedByID: performedBy,
			Notes:         "Transferência de carga patrimonial",
		}
		if err := tx.Create(movement).Error; err != nil {
			return err
		}

		return tx.Save(request).Error
	}); err != nil {
		return err
	}
	return r.db.Preload("Asset").Preload("FromUser").Preload("ToUser").Preload("ReviewedBy").
		First(request, "id = ?", request.ID).Error
}
