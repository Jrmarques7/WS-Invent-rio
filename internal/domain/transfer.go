package domain

import (
	"time"

	"github.com/google/uuid"
)

type TransferRequestStatus string

const (
	TransferStatusPending                    TransferRequestStatus = "PENDING"
	TransferStatusApproved                   TransferRequestStatus = "APPROVED"
	TransferStatusPendingManagerApproval     TransferRequestStatus = "PENDING_MANAGER_APPROVAL"
	TransferStatusPendingRecipientAcceptance TransferRequestStatus = "PENDING_RECIPIENT_ACCEPTANCE"
	TransferStatusRejected                   TransferRequestStatus = "REJECTED"
	TransferStatusExecuted                   TransferRequestStatus = "EXECUTED"
)

type TransferRequest struct {
	ID             uuid.UUID             `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AssetID        uuid.UUID             `gorm:"type:uuid;not null" json:"asset_id"`
	Asset          *Asset                `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
	FromUserID     uuid.UUID             `gorm:"type:uuid;not null" json:"from_user_id"`
	FromUser       *User                 `gorm:"foreignKey:FromUserID" json:"from_user,omitempty"`
	ToUserID       uuid.UUID             `gorm:"type:uuid;not null" json:"to_user_id"`
	ToUser         *User                 `gorm:"foreignKey:ToUserID" json:"to_user,omitempty"`
	Policy         TransferPolicy        `gorm:"type:varchar(30);not null" json:"policy"`
	Status         TransferRequestStatus `gorm:"type:varchar(40);not null" json:"status"`
	Reason         string                `json:"reason"`
	RequestedAt    time.Time             `json:"requested_at"`
	ReviewedByID   *uuid.UUID            `gorm:"type:uuid" json:"reviewed_by_id"`
	ReviewedBy     *User                 `gorm:"foreignKey:ReviewedByID" json:"reviewed_by,omitempty"`
	ReviewedAt     *time.Time            `json:"reviewed_at"`
	ReviewNotes    string                `json:"review_notes"`
	RecipientAt    *time.Time            `json:"recipient_at"`
	RecipientNotes string                `json:"recipient_notes"`
	GestorNotified bool                  `gorm:"default:false" json:"gestor_notified"`
	CreatedAt      time.Time             `json:"created_at"`
	UpdatedAt      time.Time             `json:"updated_at"`
}

type TransferRequestRepository interface {
	FindAll(page, limit int, status TransferRequestStatus, userID *uuid.UUID) ([]*TransferRequest, int64, error)
	FindByID(id uuid.UUID) (*TransferRequest, error)
	Create(request *TransferRequest) error
	Update(request *TransferRequest) error
	ExecuteAcceptedTransfer(request *TransferRequest, performedBy uuid.UUID) error
}

type TransferRequestService interface {
	List(page, limit int, status TransferRequestStatus) ([]*TransferRequest, int64, error)
	ListMine(page, limit int, userID uuid.UUID) ([]*TransferRequest, int64, error)
	Request(input CreateTransferRequestInput, requestedBy uuid.UUID) (*TransferRequest, error)
	Approve(id, reviewedBy uuid.UUID, notes string) (*TransferRequest, error)
	Reject(id, reviewedBy uuid.UUID, notes string) (*TransferRequest, error)
	Accept(id, userID uuid.UUID, notes string) (*TransferRequest, error)
	Decline(id, userID uuid.UUID, notes string) (*TransferRequest, error)
}

type CreateTransferRequestInput struct {
	AssetID  uuid.UUID `json:"asset_id" binding:"required"`
	ToUserID uuid.UUID `json:"to_user_id" binding:"required"`
	Reason   string    `json:"reason"`
}

type ReviewTransferRequestInput struct {
	Notes string `json:"notes"`
}

type RecipientTransferRequestInput struct {
	Notes string `json:"notes"`
}
