package service

import (
	"errors"
	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type departmentService struct {
	repo domain.DepartmentRepository
}

func NewDepartmentService(repo domain.DepartmentRepository) domain.DepartmentService {
	return &departmentService{repo: repo}
}

func (s *departmentService) List() ([]*domain.Department, error) {
	return s.repo.FindAll()
}

func (s *departmentService) GetByID(id uuid.UUID) (*domain.Department, error) {
	d, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("unidade não encontrada")
	}
	return d, nil
}

func (s *departmentService) Create(input domain.CreateDepartmentInput) (*domain.Department, error) {
	d := &domain.Department{
		Name:        input.Name,
		Type:        input.Type,
		ParentID:    input.ParentID,
		Description: input.Description,
	}
	if err := s.repo.Create(d); err != nil {
		return nil, err
	}
	return d, nil
}

func (s *departmentService) Update(id uuid.UUID, input domain.CreateDepartmentInput) (*domain.Department, error) {
	d, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("unidade não encontrada")
	}
	if input.Name != "" {
		d.Name = input.Name
	}
	d.Type = input.Type
	d.ParentID = input.ParentID
	d.Description = input.Description
	if err := s.repo.Update(d); err != nil {
		return nil, err
	}
	return d, nil
}

func (s *departmentService) Delete(id uuid.UUID) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("unidade não encontrada")
	}
	return s.repo.Delete(id)
}
