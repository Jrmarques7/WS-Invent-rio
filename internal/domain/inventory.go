package domain

import (
	"time"

	"github.com/google/uuid"
)

type InventoryStatus string

const (
	InventoryDraft      InventoryStatus = "DRAFT"
	InventoryInProgress InventoryStatus = "IN_PROGRESS"
	InventoryCompleted  InventoryStatus = "COMPLETED"
	InventoryCancelled  InventoryStatus = "CANCELLED"
)

type InventoryProcess struct {
	ID            uuid.UUID        `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name          string           `gorm:"not null"                                       json:"name"`
	Year          int              `gorm:"not null"                                       json:"year"`
	Status        InventoryStatus  `gorm:"type:varchar(20);default:'DRAFT'"               json:"status"`
	StartDate     *time.Time       `                                                      json:"start_date"`
	EndDate       *time.Time       `                                                      json:"end_date"`
	ResponsibleID uuid.UUID        `gorm:"type:uuid"                                      json:"responsible_id"`
	Responsible   *User            `gorm:"foreignKey:ResponsibleID"                       json:"responsible,omitempty"`
	Notes         string           `                                                      json:"notes"`
	Items         []*InventoryItem `gorm:"foreignKey:InventoryID"                         json:"items,omitempty"`
	CreatedAt     time.Time        `                                                      json:"created_at"`
	UpdatedAt     time.Time        `                                                      json:"updated_at"`
}

type InventoryItem struct {
	ID                 uuid.UUID         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	InventoryID        uuid.UUID         `gorm:"type:uuid;not null;uniqueIndex:idx_inv_asset"   json:"inventory_id"`
	Inventory          *InventoryProcess `gorm:"foreignKey:InventoryID"                         json:"inventory,omitempty"`
	AssetID            uuid.UUID         `gorm:"type:uuid;not null;uniqueIndex:idx_inv_asset"   json:"asset_id"`
	Asset              *Asset            `gorm:"foreignKey:AssetID"                             json:"asset,omitempty"`
	ExpectedUserID     *uuid.UUID        `gorm:"type:uuid"                                      json:"expected_user_id"`
	ExpectedUser       *User             `gorm:"foreignKey:ExpectedUserID"                      json:"expected_user,omitempty"`
	ExpectedLocationID *uuid.UUID        `gorm:"type:uuid"                                      json:"expected_location_id"`
	ExpectedLocation   *Location         `gorm:"foreignKey:ExpectedLocationID"                  json:"expected_location,omitempty"`
	Found              *bool             `                                                      json:"found"`
	ActualCondition    AssetCondition    `gorm:"type:varchar(20)"                               json:"actual_condition"`
	ActualLocationID   *uuid.UUID        `gorm:"type:uuid"                                      json:"actual_location_id"`
	ActualLocation     *Location         `gorm:"foreignKey:ActualLocationID"                    json:"actual_location,omitempty"`
	Notes              string            `                                                      json:"notes"`
	VerifiedByID       *uuid.UUID        `gorm:"type:uuid"                                      json:"verified_by_id"`
	VerifiedBy         *User             `gorm:"foreignKey:VerifiedByID"                        json:"verified_by,omitempty"`
	VerifiedAt         *time.Time        `                                                      json:"verified_at"`
	CreatedAt          time.Time         `                                                      json:"created_at"`
	UpdatedAt          time.Time         `                                                      json:"updated_at"`
}

type InventoryRepository interface {
	FindAll(page, limit int) ([]*InventoryProcess, int64, error)
	FindByID(id uuid.UUID) (*InventoryProcess, error)
	Create(inventory *InventoryProcess) error
	Update(inventory *InventoryProcess) error
	CompleteWithMovements(inventory *InventoryProcess, movements []*Movement) error
	FindItems(inventoryID uuid.UUID) ([]*InventoryItem, error)
	FindItem(inventoryID, assetID uuid.UUID) (*InventoryItem, error)
	CountItems(inventoryID uuid.UUID) (int64, error)
	CountPendingItems(inventoryID uuid.UUID) (int64, error)
	AddItem(item *InventoryItem) error
	RemoveItem(inventoryID, assetID uuid.UUID) error
	UpsertItem(item *InventoryItem) error
	FindItemsByUser(userID uuid.UUID) ([]*InventoryItem, error)
}

type InventoryService interface {
	List(page, limit int) ([]*InventoryProcess, int64, error)
	GetByID(id uuid.UUID) (*InventoryProcess, error)
	Create(dto CreateInventoryInput, responsibleID uuid.UUID) (*InventoryProcess, error)
	Start(id uuid.UUID) error
	Complete(id uuid.UUID, performedBy uuid.UUID) error
	Cancel(id uuid.UUID) error
	AddItems(inventoryID uuid.UUID, assetIDs []uuid.UUID) error
	RemoveItem(inventoryID, assetID uuid.UUID) error
	VerifyItem(inventoryID uuid.UUID, dto VerifyItemInput, verifiedBy uuid.UUID) error
	VerifyOwnItem(inventoryID uuid.UUID, dto VerifyItemInput, verifiedBy uuid.UUID) error
	GetItems(inventoryID uuid.UUID) ([]*InventoryItem, error)
	GetUserItems(userID uuid.UUID) ([]*InventoryItem, error)
}

type AddInventoryItemsInput struct {
	AssetIDs []uuid.UUID `json:"asset_ids" binding:"required"`
}

type CreateInventoryInput struct {
	Name  string `json:"name" binding:"required"`
	Year  int    `json:"year" binding:"required"`
	Notes string `json:"notes"`
}

type VerifyItemInput struct {
	AssetID          uuid.UUID      `json:"asset_id" binding:"required"`
	Found            bool           `json:"found"`
	ActualCondition  AssetCondition `json:"actual_condition"`
	ActualLocationID *uuid.UUID     `json:"actual_location_id"`
	Notes            string         `json:"notes"`
}
