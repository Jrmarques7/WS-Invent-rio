package service

import (
	"errors"
	"fmt"
	"patrimonio/internal/domain"
	"strings"
	"time"

	"github.com/google/uuid"
)

type inventoryService struct {
	repo        domain.InventoryRepository
	assetRepo   domain.AssetRepository
	custodyRepo domain.CustodyRepository
}

func NewInventoryService(
	repo domain.InventoryRepository,
	assetRepo domain.AssetRepository,
	custodyRepo domain.CustodyRepository,
) domain.InventoryService {
	return &inventoryService{repo: repo, assetRepo: assetRepo, custodyRepo: custodyRepo}
}

func (s *inventoryService) List(page, limit int) ([]*domain.InventoryProcess, int64, error) {
	return s.repo.FindAll(page, limit)
}

func (s *inventoryService) GetByID(id uuid.UUID) (*domain.InventoryProcess, error) {
	return s.repo.FindByID(id)
}

func (s *inventoryService) Create(input domain.CreateInventoryInput, responsibleID uuid.UUID) (*domain.InventoryProcess, error) {
	inv := &domain.InventoryProcess{
		Name:          input.Name,
		Year:          input.Year,
		Status:        domain.InventoryDraft,
		ResponsibleID: responsibleID,
		Notes:         input.Notes,
	}
	if err := s.repo.Create(inv); err != nil {
		return nil, err
	}
	return inv, nil
}

func (s *inventoryService) Start(id uuid.UUID) error {
	inv, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("inventário não encontrado")
	}
	if inv.Status != domain.InventoryDraft {
		return errors.New("somente inventários em rascunho podem ser iniciados")
	}
	total, err := s.repo.CountItems(id)
	if err != nil {
		return err
	}
	if total == 0 {
		return errors.New("não é possível iniciar inventário sem bens")
	}
	now := time.Now()
	inv.Status = domain.InventoryInProgress
	inv.StartDate = &now
	return s.repo.Update(inv)
}

func (s *inventoryService) Complete(id uuid.UUID, performedBy uuid.UUID) error {
	inv, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("inventário não encontrado")
	}
	if inv.Status != domain.InventoryInProgress {
		return errors.New("somente inventários em andamento podem ser concluídos")
	}
	pending, err := s.repo.CountPendingItems(id)
	if err != nil {
		return err
	}
	if pending > 0 {
		return errors.New("não é possível concluir inventário com itens pendentes")
	}
	items, err := s.repo.FindItems(id)
	if err != nil {
		return err
	}
	now := time.Now()
	inv.Status = domain.InventoryCompleted
	inv.EndDate = &now

	movements := make([]*domain.Movement, 0)
	for _, item := range items {
		reasons := inventoryDivergenceReasons(item)
		if len(reasons) == 0 {
			continue
		}
		movements = append(movements, &domain.Movement{
			AssetID:        item.AssetID,
			Type:           domain.MovementInvDiff,
			FromLocationID: item.ExpectedLocationID,
			ToLocationID:   item.ActualLocationID,
			Date:           now,
			Reason:         strings.Join(reasons, "; "),
			PerformedByID:  performedBy,
			Notes:          fmt.Sprintf("Inventário %s (%s). %s", inv.Name, inv.ID, item.Notes),
		})
	}
	return s.repo.CompleteWithMovements(inv, movements)
}

func (s *inventoryService) Cancel(id uuid.UUID) error {
	inv, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("inventário não encontrado")
	}
	if inv.Status == domain.InventoryCompleted {
		return errors.New("não é possível cancelar um inventário concluído")
	}
	inv.Status = domain.InventoryCancelled
	return s.repo.Update(inv)
}

func (s *inventoryService) AddItems(inventoryID uuid.UUID, assetIDs []uuid.UUID) error {
	inv, err := s.repo.FindByID(inventoryID)
	if err != nil {
		return errors.New("inventário não encontrado")
	}
	if inv.Status != domain.InventoryDraft {
		return errors.New("só é possível adicionar bens a inventários em rascunho")
	}
	for _, assetID := range assetIDs {
		item := &domain.InventoryItem{
			InventoryID: inventoryID,
			AssetID:     assetID,
		}
		asset, err := s.assetRepo.FindByID(assetID)
		if err != nil {
			return errors.New("bem não encontrado")
		}
		if asset.LocationID != nil {
			item.ExpectedLocationID = asset.LocationID
		}
		if custody, err := s.custodyRepo.FindActiveCustody(assetID); err == nil {
			item.ExpectedUserID = &custody.UserID
		}
		if err := s.repo.AddItem(item); err != nil {
			return err
		}
	}
	return nil
}

func (s *inventoryService) RemoveItem(inventoryID, assetID uuid.UUID) error {
	inv, err := s.repo.FindByID(inventoryID)
	if err != nil {
		return errors.New("inventário não encontrado")
	}
	if inv.Status != domain.InventoryDraft {
		return errors.New("só é possível remover bens de inventários em rascunho")
	}
	return s.repo.RemoveItem(inventoryID, assetID)
}

func (s *inventoryService) VerifyItem(inventoryID uuid.UUID, input domain.VerifyItemInput, verifiedBy uuid.UUID) error {
	inv, err := s.repo.FindByID(inventoryID)
	if err != nil {
		return errors.New("inventário não encontrado")
	}
	if inv.Status != domain.InventoryInProgress {
		return errors.New("inventário não está em andamento")
	}
	if _, err := s.repo.FindItem(inventoryID, input.AssetID); err != nil {
		return errors.New("bem não está previsto neste inventário")
	}

	now := time.Now()
	found := input.Found
	item := &domain.InventoryItem{
		InventoryID:      inventoryID,
		AssetID:          input.AssetID,
		Found:            &found,
		ActualCondition:  input.ActualCondition,
		ActualLocationID: input.ActualLocationID,
		Notes:            input.Notes,
		VerifiedByID:     &verifiedBy,
		VerifiedAt:       &now,
	}

	return s.repo.UpsertItem(item)
}

func (s *inventoryService) VerifyOwnItem(inventoryID uuid.UUID, input domain.VerifyItemInput, verifiedBy uuid.UUID) error {
	item, err := s.repo.FindItem(inventoryID, input.AssetID)
	if err != nil {
		return errors.New("bem não está previsto neste inventário")
	}
	if item.ExpectedUserID == nil || *item.ExpectedUserID != verifiedBy {
		return errors.New("bem não pertence à sua responsabilidade esperada neste inventário")
	}
	return s.VerifyItem(inventoryID, input, verifiedBy)
}

func (s *inventoryService) GetItems(inventoryID uuid.UUID) ([]*domain.InventoryItem, error) {
	return s.repo.FindItems(inventoryID)
}

func (s *inventoryService) GetUserItems(userID uuid.UUID) ([]*domain.InventoryItem, error) {
	return s.repo.FindItemsByUser(userID)
}

func inventoryDivergenceReasons(item *domain.InventoryItem) []string {
	reasons := make([]string, 0, 3)
	if item.Found != nil && !*item.Found {
		reasons = append(reasons, "Bem não encontrado no inventário")
	}
	if !sameUUID(item.ExpectedLocationID, item.ActualLocationID) {
		reasons = append(reasons, "Localização divergente")
	}
	if item.Asset != nil && item.ActualCondition != "" && item.ActualCondition != item.Asset.Condition {
		reasons = append(reasons, "Condição divergente")
	}
	return reasons
}

func sameUUID(a, b *uuid.UUID) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}
