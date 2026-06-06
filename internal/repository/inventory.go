package repository

import (
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type inventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) domain.InventoryRepository {
	return &inventoryRepository{db: db}
}

func (r *inventoryRepository) FindAll(page, limit int) ([]*domain.InventoryProcess, int64, error) {
	var inventories []*domain.InventoryProcess
	var total int64

	q := r.db.Model(&domain.InventoryProcess{}).Preload("Responsible")
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := q.Offset(offset).Limit(limit).Order("year DESC, created_at DESC").Find(&inventories).Error; err != nil {
		return nil, 0, err
	}
	return inventories, total, nil
}

func (r *inventoryRepository) FindByID(id uuid.UUID) (*domain.InventoryProcess, error) {
	var inventory domain.InventoryProcess
	if err := r.db.Preload("Responsible").Preload("Items").
		First(&inventory, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &inventory, nil
}

func (r *inventoryRepository) Create(inventory *domain.InventoryProcess) error {
	return r.db.Create(inventory).Error
}

func (r *inventoryRepository) Update(inventory *domain.InventoryProcess) error {
	return r.db.Save(inventory).Error
}

func (r *inventoryRepository) CompleteWithMovements(inventory *domain.InventoryProcess, movements []*domain.Movement) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(inventory).Error; err != nil {
			return err
		}
		for _, movement := range movements {
			if err := tx.Create(movement).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *inventoryRepository) FindItems(inventoryID uuid.UUID) ([]*domain.InventoryItem, error) {
	var items []*domain.InventoryItem
	if err := r.db.Preload("Asset").Preload("Asset.Location").Preload("ExpectedUser").
		Preload("ExpectedLocation").Preload("ActualLocation").Preload("VerifiedBy").
		Where("inventory_id = ?", inventoryID).Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (r *inventoryRepository) FindItemsByUser(userID uuid.UUID) ([]*domain.InventoryItem, error) {
	var items []*domain.InventoryItem
	err := r.db.
		Preload("Inventory").
		Preload("Asset").
		Preload("Asset.Category").
		Preload("Asset.Location").
		Preload("ExpectedUser").
		Preload("ExpectedLocation").
		Preload("ActualLocation").
		Preload("VerifiedBy").
		Joins("JOIN inventory_processes ON inventory_processes.id = inventory_items.inventory_id").
		Where("inventory_items.expected_user_id = ?", userID).
		Where("inventory_processes.status = ?", domain.InventoryInProgress).
		Order("inventory_processes.year DESC, inventory_items.created_at DESC").
		Find(&items).Error
	return items, err
}

func (r *inventoryRepository) AddItem(item *domain.InventoryItem) error {
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "inventory_id"}, {Name: "asset_id"}},
		DoNothing: true,
	}).Create(item).Error
}

func (r *inventoryRepository) RemoveItem(inventoryID, assetID uuid.UUID) error {
	return r.db.Where("inventory_id = ? AND asset_id = ?", inventoryID, assetID).
		Delete(&domain.InventoryItem{}).Error
}

func (r *inventoryRepository) FindItem(inventoryID, assetID uuid.UUID) (*domain.InventoryItem, error) {
	var item domain.InventoryItem
	if err := r.db.Where("inventory_id = ? AND asset_id = ?", inventoryID, assetID).
		First(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *inventoryRepository) CountItems(inventoryID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&domain.InventoryItem{}).Where("inventory_id = ?", inventoryID).Count(&count).Error
	return count, err
}

func (r *inventoryRepository) CountPendingItems(inventoryID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&domain.InventoryItem{}).
		Where("inventory_id = ? AND verified_at IS NULL", inventoryID).
		Count(&count).Error
	return count, err
}

func (r *inventoryRepository) UpsertItem(item *domain.InventoryItem) error {
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "inventory_id"}, {Name: "asset_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"found", "actual_condition", "actual_location_id", "notes", "verified_by_id", "verified_at", "updated_at"}),
	}).Create(item).Error
}
