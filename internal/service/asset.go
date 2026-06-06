package service

import (
	"errors"
	"fmt"
	"time"

	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

var assetPrefixes = map[domain.AssetType]string{
	domain.AssetTypeMovel:      "MOV",
	domain.AssetTypeImovel:     "IMO",
	domain.AssetTypeVeiculo:    "VEI",
	domain.AssetTypeConsumivel: "CON",
}

type assetService struct {
	repo    domain.AssetRepository
	seqRepo domain.SequenceRepository
}

func NewAssetService(repo domain.AssetRepository, seqRepo domain.SequenceRepository) domain.AssetService {
	return &assetService{repo: repo, seqRepo: seqRepo}
}

func (s *assetService) List(page, limit int, filters domain.AssetFilters) ([]*domain.Asset, int64, error) {
	return s.repo.FindAll(page, limit, filters)
}

func (s *assetService) GetByID(id uuid.UUID) (*domain.Asset, error) {
	return s.repo.FindByID(id)
}

func (s *assetService) Create(input domain.CreateAssetInput) (*domain.Asset, error) {
	number, err := s.GeneratePatrimonyNumber(input.AssetType)
	if err != nil {
		return nil, err
	}

	condition := input.Condition
	if condition == "" {
		condition = domain.ConditionGood
	}
	transferPolicy := input.TransferPolicy
	if transferPolicy == "" {
		transferPolicy = domain.TransferRequiresApproval
	}

	asset := &domain.Asset{
		PatrimonyNumber:  number,
		Name:             input.Name,
		Description:      input.Description,
		CategoryID:       input.CategoryID,
		DepartmentID:     input.DepartmentID,
		AssetType:        input.AssetType,
		Brand:            input.Brand,
		Model:            input.Model,
		SerialNumber:     input.SerialNumber,
		AcquisitionDate:  input.AcquisitionDate,
		AcquisitionValue: input.AcquisitionValue,
		CurrentValue:     input.AcquisitionValue,
		UsefulLifeYears:  input.UsefulLifeYears,
		Condition:        condition,
		LocationID:       input.LocationID,
		Status:           domain.AssetStatusActive,
		TransferPolicy:   transferPolicy,
		Notes:            input.Notes,
	}

	if err := s.repo.Create(asset); err != nil {
		return nil, err
	}
	return asset, nil
}

func (s *assetService) Update(id uuid.UUID, input domain.UpdateAssetInput) (*domain.Asset, error) {
	asset, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("bem não encontrado")
	}

	if input.Name != "" {
		asset.Name = input.Name
	}
	if input.Description != "" {
		asset.Description = input.Description
	}
	if input.CategoryID != nil {
		asset.CategoryID = input.CategoryID
	}
	if input.DepartmentID != nil {
		asset.DepartmentID = input.DepartmentID
	}
	if input.Brand != "" {
		asset.Brand = input.Brand
	}
	if input.Model != "" {
		asset.Model = input.Model
	}
	if input.SerialNumber != "" {
		asset.SerialNumber = input.SerialNumber
	}
	if input.UsefulLifeYears > 0 {
		asset.UsefulLifeYears = input.UsefulLifeYears
	}
	if input.Condition != "" {
		asset.Condition = input.Condition
	}
	if input.LocationID != nil {
		asset.LocationID = input.LocationID
	}
	if input.Status != "" {
		asset.Status = input.Status
	}
	if input.TransferPolicy != "" {
		asset.TransferPolicy = input.TransferPolicy
	}
	if input.Notes != "" {
		asset.Notes = input.Notes
	}

	if err := s.repo.Update(asset); err != nil {
		return nil, err
	}
	return asset, nil
}

func (s *assetService) WriteOff(id uuid.UUID, input domain.WriteOffInput, performedBy uuid.UUID) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("bem não encontrado")
	}
	return s.repo.WriteOffWithAudit(id, input, performedBy)
}

func (s *assetService) Delete(id uuid.UUID) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("bem não encontrado")
	}
	return s.repo.SoftDelete(id)
}

func (s *assetService) GeneratePatrimonyNumber(assetType domain.AssetType) (string, error) {
	prefix, ok := assetPrefixes[assetType]
	if !ok {
		return "", errors.New("tipo de bem inválido")
	}
	year := time.Now().Year()
	seq, err := s.seqRepo.Next(prefix, year)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("PAT-%s-%d-%06d", prefix, year, seq), nil
}

func (s *assetService) PreviewPatrimonyNumber(assetType domain.AssetType) (string, error) {
	prefix, ok := assetPrefixes[assetType]
	if !ok {
		return "", errors.New("tipo de bem inválido")
	}
	year := time.Now().Year()
	seq, err := s.seqRepo.Peek(prefix, year)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("PAT-%s-%d-%06d", prefix, year, seq), nil
}
