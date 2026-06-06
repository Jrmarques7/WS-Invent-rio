package service

import (
	"errors"
	"math"
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type depreciationService struct {
	repo      domain.DepreciationRepository
	assetRepo domain.AssetRepository
	catRepo   domain.CategoryRepository
}

func NewDepreciationService(
	repo domain.DepreciationRepository,
	assetRepo domain.AssetRepository,
	catRepo domain.CategoryRepository,
) domain.DepreciationService {
	return &depreciationService{repo: repo, assetRepo: assetRepo, catRepo: catRepo}
}

func (s *depreciationService) GetByPeriod(year, month int) ([]*domain.DepreciationRecord, error) {
	return s.repo.FindByPeriod(year, month)
}

func (s *depreciationService) GetAssetHistory(assetID uuid.UUID) ([]*domain.DepreciationRecord, error) {
	return s.repo.FindByAsset(assetID)
}

func (s *depreciationService) CalculateMonthly(year, month int) error {
	// Busca todos os bens ativos depreciáveis (não consumíveis)
	filters := domain.AssetFilters{Status: domain.AssetStatusActive}
	assets, _, err := s.assetRepo.FindAll(1, 10000, filters)
	if err != nil {
		return err
	}

	var records []*domain.DepreciationRecord
	for _, asset := range assets {
		if asset.AssetType == domain.AssetTypeConsumivel {
			continue
		}
		record, err := s.CalculateForAsset(asset.ID, year, month)
		if err != nil {
			continue
		}
		records = append(records, record)
	}

	return s.repo.BulkCreate(records)
}

func (s *depreciationService) CalculateForAsset(assetID uuid.UUID, year, month int) (*domain.DepreciationRecord, error) {
	asset, err := s.assetRepo.FindByID(assetID)
	if err != nil {
		return nil, errors.New("bem não encontrado")
	}

	if asset.CategoryID == nil {
		return nil, errors.New("bem sem categoria — não é possível depreciar")
	}

	category, err := s.catRepo.FindByID(*asset.CategoryID)
	if err != nil {
		return nil, errors.New("categoria não encontrada")
	}

	if category.DepreciationRate <= 0 || category.UsefulLifeYears <= 0 {
		return nil, errors.New("categoria sem taxa de depreciação configurada")
	}

	lastRecord, err := s.repo.FindLastRecord(assetID)
	var openingValue float64
	if errors.Is(err, gorm.ErrRecordNotFound) {
		openingValue = asset.AcquisitionValue
	} else if err != nil {
		return nil, err
	} else {
		openingValue = lastRecord.ClosingValue
	}

	var depreciation float64
	method := category.DepreciationMethod

	switch method {
	case domain.MethodDeclining:
		monthlyRate := category.DepreciationRate / 12 / 100
		depreciation = openingValue * monthlyRate
	default: // LINEAR
		monthlyRate := category.DepreciationRate / 12 / 100
		depreciation = asset.AcquisitionValue * monthlyRate
	}

	closingValue := math.Max(0, openingValue-depreciation)

	record := &domain.DepreciationRecord{
		AssetID:            assetID,
		Year:               year,
		Month:              month,
		OpeningValue:       openingValue,
		DepreciationAmount: depreciation,
		ClosingValue:       closingValue,
		Rate:               category.DepreciationRate / 12 / 100,
		Method:             method,
	}

	// Atualiza valor corrente do bem
	asset.CurrentValue = closingValue
	_ = s.assetRepo.Update(asset)

	return record, nil
}
