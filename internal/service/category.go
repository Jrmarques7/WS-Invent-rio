package service

import (
	"errors"
	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type categoryService struct {
	repo domain.CategoryRepository
}

func NewCategoryService(repo domain.CategoryRepository) domain.CategoryService {
	return &categoryService{repo: repo}
}

func (s *categoryService) List(assetType domain.AssetType, search string) ([]*domain.Category, error) {
	return s.repo.FindAll(assetType, search)
}

func (s *categoryService) GetByID(id uuid.UUID) (*domain.Category, error) {
	return s.repo.FindByID(id)
}

func (s *categoryService) Create(input domain.CreateCategoryInput) (*domain.Category, error) {
	method := input.DepreciationMethod
	if method == "" {
		method = domain.MethodLinear
	}
	cat := &domain.Category{
		Name:               input.Name,
		Description:        input.Description,
		AssetType:          input.AssetType,
		UsefulLifeYears:    input.UsefulLifeYears,
		DepreciationRate:   input.DepreciationRate,
		DepreciationMethod: method,
		IsActive:           true,
	}
	if err := s.repo.Create(cat); err != nil {
		return nil, err
	}
	return cat, nil
}

func (s *categoryService) Update(id uuid.UUID, input domain.UpdateCategoryInput) (*domain.Category, error) {
	cat, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("categoria não encontrada")
	}
	if input.Name != "" {
		cat.Name = input.Name
	}
	if input.Description != "" {
		cat.Description = input.Description
	}
	if input.UsefulLifeYears > 0 {
		cat.UsefulLifeYears = input.UsefulLifeYears
	}
	if input.DepreciationRate > 0 {
		cat.DepreciationRate = input.DepreciationRate
	}
	if input.DepreciationMethod != "" {
		cat.DepreciationMethod = input.DepreciationMethod
	}
	if input.IsActive != nil {
		cat.IsActive = *input.IsActive
	}
	if err := s.repo.Update(cat); err != nil {
		return nil, err
	}
	return cat, nil
}

func (s *categoryService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}
