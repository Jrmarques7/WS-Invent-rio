package service

import (
	"errors"
	"time"

	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type vehicleMaintenanceService struct {
	repo domain.VehicleMaintenanceRepository
}

func NewVehicleMaintenanceService(repo domain.VehicleMaintenanceRepository) domain.VehicleMaintenanceService {
	return &vehicleMaintenanceService{repo: repo}
}

func (s *vehicleMaintenanceService) GetMaintenances(vehicleID uuid.UUID) ([]*domain.VehicleMaintenance, error) {
	return s.repo.FindMaintenances(vehicleID)
}

func (s *vehicleMaintenanceService) CreateMaintenance(vehicleID uuid.UUID, input domain.CreateVehicleMaintenanceInput) error {
	m := &domain.VehicleMaintenance{
		VehicleID:   vehicleID,
		Description: input.Description,
		IntervalKM:  input.IntervalKM,
		LastDoneKM:  input.LastDoneKM,
		NextDueKM:   input.LastDoneKM + input.IntervalKM,
		Notes:       input.Notes,
	}
	return s.repo.CreateMaintenance(m)
}

func (s *vehicleMaintenanceService) MarkMaintenanceDone(maintenanceID uuid.UUID, doneKM int) error {
	m, err := s.repo.FindMaintenanceByID(maintenanceID)
	if err != nil {
		return errors.New("manutenção não encontrada")
	}
	now := time.Now()
	m.LastDoneKM = doneKM
	m.LastDoneAt = &now
	m.NextDueKM = doneKM + m.IntervalKM
	return s.repo.UpdateMaintenance(m)
}

func (s *vehicleMaintenanceService) DeleteMaintenance(id uuid.UUID) error {
	return s.repo.DeleteMaintenance(id)
}
