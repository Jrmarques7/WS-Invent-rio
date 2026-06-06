package service

import (
	"errors"
	"fmt"
	"patrimonio/internal/domain"
	"time"

	"github.com/google/uuid"
)

type maintenanceService struct {
	repo        domain.MaintenanceRepository
	assetRepo   domain.AssetRepository
	custodyRepo domain.CustodyRepository
}

func NewMaintenanceService(
	repo domain.MaintenanceRepository,
	assetRepo domain.AssetRepository,
	custodyRepo domain.CustodyRepository,
) domain.MaintenanceService {
	return &maintenanceService{repo: repo, assetRepo: assetRepo, custodyRepo: custodyRepo}
}

func (s *maintenanceService) List(page, limit int, assetID *uuid.UUID, status domain.MaintenanceStatus) ([]*domain.Maintenance, int64, error) {
	return s.repo.FindAll(page, limit, assetID, status)
}

func (s *maintenanceService) GetByID(id uuid.UUID) (*domain.Maintenance, error) {
	return s.repo.FindByID(id)
}

func (s *maintenanceService) Create(input domain.CreateMaintenanceInput, registeredBy uuid.UUID) (*domain.Maintenance, error) {
	if _, err := s.assetRepo.FindByID(input.AssetID); err != nil {
		return nil, errors.New("bem não encontrado")
	}

	maintenance := &domain.Maintenance{
		AssetID:        input.AssetID,
		Type:           input.Type,
		Description:    input.Description,
		Provider:       input.Provider,
		Cost:           input.Cost,
		ScheduledDate:  input.ScheduledDate,
		Status:         domain.MaintenanceScheduled,
		Notes:          input.Notes,
		RegisteredByID: registeredBy,
	}

	now := time.Now()
	movement := &domain.Movement{
		AssetID:       input.AssetID,
		Type:          domain.MovementMaintStart,
		Date:          now,
		Reason:        fmt.Sprintf("Manutenção registrada: %s", input.Description),
		PerformedByID: registeredBy,
		Notes:         input.Notes,
	}
	if err := s.repo.CreateWithAssetStatus(maintenance, domain.AssetStatusMaintenance, movement); err != nil {
		return nil, err
	}

	return maintenance, nil
}

func (s *maintenanceService) CreateOwn(input domain.CreateMaintenanceInput, registeredBy uuid.UUID) (*domain.Maintenance, error) {
	if _, err := s.custodyRepo.FindActiveCustodyForUser(input.AssetID, registeredBy); err != nil {
		return nil, errors.New("bem não pertence à carga ativa do usuário")
	}
	return s.Create(input, registeredBy)
}

func (s *maintenanceService) UpdateStatus(id uuid.UUID, input domain.UpdateMaintenanceStatusInput, performedBy uuid.UUID) (*domain.Maintenance, error) {
	maintenance, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("manutenção não encontrada")
	}

	maintenance.Status = input.Status
	if input.StartDate != nil {
		maintenance.StartDate = input.StartDate
	}
	if input.Notes != "" {
		maintenance.Notes = input.Notes
	}

	var assetStatus *domain.AssetStatus
	var movement *domain.Movement
	if input.Status == domain.MaintenanceInProgress {
		status := domain.AssetStatusMaintenance
		assetStatus = &status
		date := time.Now()
		if input.StartDate != nil {
			date = *input.StartDate
		}
		movement = &domain.Movement{
			Type:          domain.MovementMaintStart,
			Date:          date,
			Reason:        fmt.Sprintf("Manutenção em andamento: %s", maintenance.Description),
			PerformedByID: performedBy,
			Notes:         input.Notes,
		}
	}
	if input.Status == domain.MaintenanceCancelled {
		status := domain.AssetStatusActive
		assetStatus = &status
		movement = &domain.Movement{
			Type:          domain.MovementMaintDone,
			Date:          time.Now(),
			Reason:        fmt.Sprintf("Manutenção cancelada: %s", maintenance.Description),
			PerformedByID: performedBy,
			Notes:         input.Notes,
		}
	}

	if err := s.repo.UpdateWithAssetStatus(maintenance, assetStatus, movement); err != nil {
		return nil, err
	}
	return maintenance, nil
}

func (s *maintenanceService) Complete(id uuid.UUID, input domain.CompleteMaintenanceInput, performedBy uuid.UUID) (*domain.Maintenance, error) {
	maintenance, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("manutenção não encontrada")
	}

	completionDate := input.CompletionDate
	maintenance.Status = domain.MaintenanceCompleted
	maintenance.CompletionDate = &completionDate
	if input.Cost > 0 {
		maintenance.Cost = input.Cost
	}
	if input.Notes != "" {
		maintenance.Notes = input.Notes
	}

	status := domain.AssetStatusActive
	movement := &domain.Movement{
		Type:          domain.MovementMaintDone,
		Date:          completionDate,
		Reason:        fmt.Sprintf("Manutenção concluída: %s", maintenance.Description),
		PerformedByID: performedBy,
		Notes:         input.Notes,
	}
	if err := s.repo.UpdateWithAssetStatus(maintenance, &status, movement); err != nil {
		return nil, err
	}

	return maintenance, nil
}
