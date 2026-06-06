package service

import (
	"errors"
	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type driverService struct {
	repo domain.DriverRepository
}

func NewDriverService(repo domain.DriverRepository) domain.DriverService {
	return &driverService{repo: repo}
}

func (s *driverService) List(filters domain.DriverFilters) ([]*domain.Driver, error) {
	return s.repo.FindAll(filters)
}

func (s *driverService) GetByID(id uuid.UUID) (*domain.Driver, error) {
	d, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("condutor não encontrado")
	}
	return d, nil
}

func (s *driverService) Create(input domain.CreateDriverInput) (*domain.Driver, error) {
	d := &domain.Driver{
		Name:        input.Name,
		CPF:         input.CPF,
		CNH:         input.CNH,
		CNHCategory: input.CNHCategory,
		CNHExpiry:   input.CNHExpiry,
		Phone:       input.Phone,
		Email:       input.Email,
		Notes:       input.Notes,
		Status:      domain.DriverStatusActive,
	}
	if err := s.repo.Create(d); err != nil {
		return nil, err
	}
	return d, nil
}

func (s *driverService) Update(id uuid.UUID, input domain.UpdateDriverInput) (*domain.Driver, error) {
	d, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("condutor não encontrado")
	}

	if input.Name != "" {
		d.Name = input.Name
	}
	d.CPF = input.CPF
	d.CNH = input.CNH
	if input.CNHCategory != "" {
		d.CNHCategory = input.CNHCategory
	}
	d.CNHExpiry = input.CNHExpiry
	d.Phone = input.Phone
	d.Email = input.Email
	d.Notes = input.Notes
	if input.Status != "" {
		d.Status = input.Status
	}

	if err := s.repo.Update(d); err != nil {
		return nil, err
	}
	return d, nil
}

func (s *driverService) Delete(id uuid.UUID) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("condutor não encontrado")
	}
	return s.repo.SoftDelete(id)
}
