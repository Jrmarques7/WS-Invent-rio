package service

import (
	"errors"
	"fmt"
	"time"

	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type vehicleService struct {
	repo    domain.VehicleRepository
	seqRepo domain.SequenceRepository
}

func NewVehicleService(repo domain.VehicleRepository, seqRepo domain.SequenceRepository) domain.VehicleService {
	return &vehicleService{repo: repo, seqRepo: seqRepo}
}

func (s *vehicleService) List(page, limit int, filters domain.VehicleFilters) ([]*domain.Vehicle, int64, error) {
	return s.repo.FindAll(page, limit, filters)
}

func (s *vehicleService) GetByID(id uuid.UUID) (*domain.Vehicle, error) {
	return s.repo.FindByID(id)
}

func (s *vehicleService) Create(input domain.CreateVehicleInput, userID uuid.UUID) (*domain.Vehicle, error) {
	year := time.Now().Year()
	seq, err := s.seqRepo.Next("VEI", year)
	if err != nil {
		return nil, err
	}
	patrimonyNumber := fmt.Sprintf("PAT-VEI-%d-%06d", year, seq)

	condition := input.Condition
	if condition == "" {
		condition = domain.ConditionGood
	}

	v := &domain.Vehicle{
		PatrimonyNumber:  patrimonyNumber,
		Name:             input.Name,
		Brand:            input.Brand,
		Model:            input.Model,
		ManufactureYear:  input.ManufactureYear,
		Plate:            input.Plate,
		RENAVAM:          input.RENAVAM,
		Chassis:          input.Chassis,
		EngineNumber:     input.EngineNumber,
		FuelType:         input.FuelType,
		Color:            input.Color,
		AcquisitionDate:  input.AcquisitionDate,
		AcquisitionValue: input.AcquisitionValue,
		CurrentValue:     input.AcquisitionValue,
		Condition:        condition,
		Status:           domain.AssetStatusActive,
		LocationID:       input.LocationID,
		DepartmentID:     input.DepartmentID,
		PrimaryDriverID:  input.PrimaryDriverID,
		CurrentKM:        input.CurrentKM,
		Notes:            input.Notes,
		IPVADueDate:      input.IPVADueDate,
		LicensingDueDate: input.LicensingDueDate,
		InsuranceDueDate: input.InsuranceDueDate,
		InsuranceCompany: input.InsuranceCompany,
	}

	if err := s.repo.Create(v); err != nil {
		return nil, err
	}
	return v, nil
}

func (s *vehicleService) Update(id uuid.UUID, input domain.UpdateVehicleInput) (*domain.Vehicle, error) {
	v, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("veículo não encontrado")
	}

	if input.Name != "" {
		v.Name = input.Name
	}
	if input.Brand != "" {
		v.Brand = input.Brand
	}
	if input.Model != "" {
		v.Model = input.Model
	}
	if input.ManufactureYear > 0 {
		v.ManufactureYear = input.ManufactureYear
	}
	if input.Plate != "" {
		v.Plate = input.Plate
	}
	if input.RENAVAM != "" {
		v.RENAVAM = input.RENAVAM
	}
	if input.Chassis != "" {
		v.Chassis = input.Chassis
	}
	if input.EngineNumber != "" {
		v.EngineNumber = input.EngineNumber
	}
	if input.FuelType != "" {
		v.FuelType = input.FuelType
	}
	if input.Color != "" {
		v.Color = input.Color
	}
	if input.Condition != "" {
		v.Condition = input.Condition
	}
	if input.Status != "" {
		v.Status = input.Status
	}
	if input.LocationID != nil {
		v.LocationID = input.LocationID
	}
	if input.DepartmentID != nil {
		v.DepartmentID = input.DepartmentID
	}
	if input.PrimaryDriverID != nil {
		v.PrimaryDriverID = input.PrimaryDriverID
	}
	if input.Notes != "" {
		v.Notes = input.Notes
	}
	if input.InsuranceCompany != "" {
		v.InsuranceCompany = input.InsuranceCompany
	}
	// Always update nullable date fields (allow clearing with null)
	if input.IPVADueDate != nil {
		v.IPVADueDate = input.IPVADueDate
	}
	if input.LicensingDueDate != nil {
		v.LicensingDueDate = input.LicensingDueDate
	}
	if input.InsuranceDueDate != nil {
		v.InsuranceDueDate = input.InsuranceDueDate
	}

	if err := s.repo.Update(v); err != nil {
		return nil, err
	}
	return v, nil
}

func (s *vehicleService) WriteOff(id uuid.UUID, input domain.WriteOffVehicleInput) error {
	v, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("veículo não encontrado")
	}
	v.Status = domain.AssetStatusWrittenOff
	v.WriteOffDate = &input.Date
	v.WriteOffReason = input.Reason
	return s.repo.Update(v)
}

func (s *vehicleService) Delete(id uuid.UUID) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("veículo não encontrado")
	}
	return s.repo.SoftDelete(id)
}

func (s *vehicleService) PreviewPatrimonyNumber() (string, error) {
	year := time.Now().Year()
	seq, err := s.seqRepo.Peek("VEI", year)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("PAT-VEI-%d-%06d", year, seq), nil
}
