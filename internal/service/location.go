package service

import (
	"errors"
	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type locationService struct {
	repo domain.LocationRepository
}

func NewLocationService(repo domain.LocationRepository) domain.LocationService {
	return &locationService{repo: repo}
}

func (s *locationService) List(search string) ([]*domain.Location, error) {
	return s.repo.FindAll(search)
}

func (s *locationService) GetByID(id uuid.UUID) (*domain.Location, error) {
	return s.repo.FindByID(id)
}

func (s *locationService) Create(input domain.CreateLocationInput) (*domain.Location, error) {
	loc := &domain.Location{
		Name:     input.Name,
		Code:     input.Code,
		Type:     input.Type,
		Address:  input.Address,
		ParentID: input.ParentID,
		IsActive: true,
	}
	if err := s.repo.Create(loc); err != nil {
		return nil, err
	}
	return loc, nil
}

func (s *locationService) Update(id uuid.UUID, input domain.UpdateLocationInput) (*domain.Location, error) {
	loc, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("localização não encontrada")
	}
	if input.Name != "" {
		loc.Name = input.Name
	}
	if input.Code != "" {
		loc.Code = input.Code
	}
	if input.Type != "" {
		loc.Type = input.Type
	}
	if input.Address != "" {
		loc.Address = input.Address
	}
	if input.ParentID != nil {
		loc.ParentID = input.ParentID
	}
	if input.IsActive != nil {
		loc.IsActive = *input.IsActive
	}
	if err := s.repo.Update(loc); err != nil {
		return nil, err
	}
	return loc, nil
}

func (s *locationService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}
