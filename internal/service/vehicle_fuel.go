package service

import (
	"errors"
	"time"

	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type vehicleFuelService struct {
	vehicleRepo domain.VehicleRepository
	fuelRepo    domain.VehicleFuelRepository
}

func NewVehicleFuelService(
	vehicleRepo domain.VehicleRepository,
	fuelRepo domain.VehicleFuelRepository,
) domain.VehicleFuelService {
	return &vehicleFuelService{vehicleRepo: vehicleRepo, fuelRepo: fuelRepo}
}

func (s *vehicleFuelService) GetFuelRecords(vehicleID uuid.UUID) ([]*domain.FuelRecord, error) {
	return s.fuelRepo.FindFuelRecords(vehicleID)
}

func (s *vehicleFuelService) AddFuelRecord(vehicleID uuid.UUID, input domain.CreateFuelRecordInput, userID uuid.UUID) error {
	v, err := s.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		return errors.New("veículo não encontrado")
	}

	fuelType := input.FuelType
	if fuelType == "" {
		fuelType = v.FuelType
	}

	rec := &domain.FuelRecord{
		VehicleID:    vehicleID,
		KM:           input.KM,
		Liters:       input.Liters,
		PricePerL:    input.PricePerL,
		TotalCost:    input.Liters * input.PricePerL,
		Station:      input.Station,
		FuelType:     fuelType,
		FullTank:     input.FullTank,
		RecordedAt:   time.Now(),
		RecordedByID: userID,
	}
	return s.fuelRepo.CreateFuelRecord(rec)
}
