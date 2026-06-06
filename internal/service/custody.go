package service

import (
	"errors"
	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type custodyService struct {
	repo      domain.CustodyRepository
	assetRepo domain.AssetRepository
}

func NewCustodyService(repo domain.CustodyRepository, assetRepo domain.AssetRepository) domain.CustodyService {
	return &custodyService{repo: repo, assetRepo: assetRepo}
}

func (s *custodyService) List(page, limit int, userID *uuid.UUID, assetID *uuid.UUID) ([]*domain.Custody, int64, error) {
	return s.repo.FindAll(page, limit, userID, assetID)
}

func (s *custodyService) GetByID(id uuid.UUID) (*domain.Custody, error) {
	return s.repo.FindByID(id)
}

func (s *custodyService) GetActiveCustody(assetID uuid.UUID) (*domain.Custody, error) {
	return s.repo.FindActiveCustody(assetID)
}

func (s *custodyService) Assign(input domain.AssignCustodyInput, assignedBy uuid.UUID) (*domain.Custody, error) {
	if _, err := s.assetRepo.FindByID(input.AssetID); err != nil {
		return nil, errors.New("bem não encontrado")
	}

	custody := &domain.Custody{
		AssetID:    input.AssetID,
		UserID:     input.UserID,
		AssignedBy: assignedBy,
		StartDate:  input.StartDate,
		IsActive:   true,
		Notes:      input.Notes,
	}
	movement := &domain.Movement{
		AssetID:       input.AssetID,
		Type:          domain.MovementTransfer,
		ToUserID:      &input.UserID,
		Date:          input.StartDate,
		Reason:        "Atribuição de custódia",
		PerformedByID: assignedBy,
		Notes:         input.Notes,
	}

	if err := s.repo.ReplaceActive(custody, movement); err != nil {
		return nil, err
	}
	return custody, nil
}

func (s *custodyService) Release(assetID uuid.UUID, notes string, performedBy uuid.UUID) error {
	if err := s.repo.ReleaseActive(assetID, notes, performedBy); err != nil {
		return errors.New("nenhuma custódia ativa encontrada para este bem")
	}
	return nil
}

func (s *custodyService) GetUserCarga(userID uuid.UUID) ([]*domain.Custody, error) {
	return s.repo.FindByUser(userID)
}

func (s *custodyService) UserHasActiveCustody(assetID, userID uuid.UUID) bool {
	_, err := s.repo.FindActiveCustodyForUser(assetID, userID)
	return err == nil
}
