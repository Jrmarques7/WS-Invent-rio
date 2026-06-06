package service

import (
	"errors"
	"time"

	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type vehicleKMService struct {
	vehicleRepo domain.VehicleRepository
	kmRepo      domain.VehicleKMRepository
}

func NewVehicleKMService(
	vehicleRepo domain.VehicleRepository,
	kmRepo domain.VehicleKMRepository,
) domain.VehicleKMService {
	return &vehicleKMService{vehicleRepo: vehicleRepo, kmRepo: kmRepo}
}

func (s *vehicleKMService) RecordKM(vehicleID uuid.UUID, km int, notes string, userID uuid.UUID) error {
	v, err := s.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		return errors.New("veículo não encontrado")
	}

	rec := &domain.KmRecord{
		VehicleID:    vehicleID,
		KM:           km,
		RecordedAt:   time.Now(),
		Notes:        notes,
		RecordedByID: userID,
	}
	if err := s.kmRepo.CreateKmRecord(rec); err != nil {
		return err
	}

	if km > v.CurrentKM {
		v.CurrentKM = km
		return s.vehicleRepo.Update(v)
	}
	return nil
}

func (s *vehicleKMService) GetKmHistory(vehicleID uuid.UUID) ([]*domain.KmRecord, error) {
	return s.kmRepo.FindKmRecords(vehicleID)
}
