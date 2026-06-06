package service

import (
	"errors"
	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type movementService struct {
	repo         domain.MovementRepository
	assetRepo    domain.AssetRepository
	custodyRepo  domain.CustodyRepository
	userRepo     domain.UserRepository
	locationRepo domain.LocationRepository
}

func NewMovementService(
	repo domain.MovementRepository,
	assetRepo domain.AssetRepository,
	custodyRepo domain.CustodyRepository,
	userRepo domain.UserRepository,
	locationRepo domain.LocationRepository,
) domain.MovementService {
	return &movementService{
		repo: repo, assetRepo: assetRepo, custodyRepo: custodyRepo, userRepo: userRepo, locationRepo: locationRepo,
	}
}

func (s *movementService) List(page, limit int, assetID *uuid.UUID) ([]*domain.Movement, int64, error) {
	return s.repo.FindAll(page, limit, assetID)
}

func (s *movementService) GetByID(id uuid.UUID) (*domain.Movement, error) {
	return s.repo.FindByID(id)
}

func (s *movementService) GetAssetHistory(assetID uuid.UUID) ([]*domain.Movement, error) {
	return s.repo.FindByAsset(assetID)
}

func (s *movementService) Register(input domain.RegisterMovementInput, performedBy uuid.UUID) (*domain.Movement, error) {
	asset, err := s.assetRepo.FindByID(input.AssetID)
	if err != nil {
		return nil, errors.New("bem não encontrado")
	}
	if input.Date.IsZero() {
		return nil, errors.New("data é obrigatória")
	}

	var effectLocationID *uuid.UUID
	var effectUserID *uuid.UUID

	switch input.Type {
	case domain.MovementRelocation:
		if input.ToLocationID == nil {
			return nil, errors.New("local de destino é obrigatório para realocação")
		}
		if _, err := s.locationRepo.FindByID(*input.ToLocationID); err != nil {
			return nil, errors.New("local de destino não encontrado")
		}
		if input.FromLocationID == nil {
			input.FromLocationID = asset.LocationID
		}
		effectLocationID = input.ToLocationID
	case domain.MovementTransfer:
		if input.ToUserID == nil {
			return nil, errors.New("usuário de destino é obrigatório para transferência")
		}
		if _, err := s.userRepo.FindByID(*input.ToUserID); err != nil {
			return nil, errors.New("usuário de destino não encontrado")
		}
		if input.FromUserID == nil {
			if custody, err := s.custodyRepo.FindActiveCustody(input.AssetID); err == nil {
				input.FromUserID = &custody.UserID
			}
		}
		if input.FromUserID != nil && *input.FromUserID == *input.ToUserID {
			return nil, errors.New("usuário de destino deve ser diferente da origem")
		}
		effectUserID = input.ToUserID
	case domain.MovementLoan, domain.MovementReturn:
		if input.FromUserID == nil && input.ToUserID == nil && input.FromLocationID == nil && input.ToLocationID == nil {
			return nil, errors.New("informe origem ou destino para a movimentação")
		}
	default:
		return nil, errors.New("tipo de movimentação inválido")
	}

	movement := &domain.Movement{
		AssetID:        input.AssetID,
		Type:           input.Type,
		FromUserID:     input.FromUserID,
		ToUserID:       input.ToUserID,
		FromLocationID: input.FromLocationID,
		ToLocationID:   input.ToLocationID,
		Date:           input.Date,
		Reason:         input.Reason,
		PerformedByID:  performedBy,
		Notes:          input.Notes,
	}

	if err := s.repo.CreateWithEffects(movement, effectLocationID, effectUserID); err != nil {
		return nil, err
	}
	return movement, nil
}
