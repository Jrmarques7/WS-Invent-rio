package service

import (
	"errors"
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type userService struct {
	repo           domain.UserRepository
	departmentRepo domain.DepartmentRepository
}

func NewUserService(repo domain.UserRepository, departmentRepo domain.DepartmentRepository) domain.UserService {
	return &userService{repo: repo, departmentRepo: departmentRepo}
}

func (s *userService) List(page, limit int, search string) ([]*domain.User, int64, error) {
	return s.repo.FindAll(page, limit, search)
}

func (s *userService) GetByID(id uuid.UUID) (*domain.User, error) {
	return s.repo.FindByID(id)
}

func (s *userService) Create(input domain.CreateUserInput) (*domain.User, error) {
	existing, _ := s.repo.FindByEmail(input.Email)
	if existing != nil {
		return nil, errors.New("e-mail já cadastrado")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	role := input.Role
	if role == "" {
		role = domain.RoleResponsavel
	}
	departmentName := input.Department
	if input.DepartmentID != nil {
		dept, err := s.departmentRepo.FindByID(*input.DepartmentID)
		if err != nil {
			return nil, errors.New("unidade não encontrada")
		}
		departmentName = dept.Name
	}

	user := &domain.User{
		Name:         input.Name,
		Email:        input.Email,
		Password:     string(hash),
		Registration: input.Registration,
		Department:   departmentName,
		DepartmentID: input.DepartmentID,
		Role:         role,
		IsActive:     true,
	}

	if err := s.repo.Create(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *userService) Update(id uuid.UUID, input domain.UpdateUserInput) (*domain.User, error) {
	user, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("usuário não encontrado")
	}

	if input.Name != "" {
		user.Name = input.Name
	}
	if input.Registration != "" {
		user.Registration = input.Registration
	}
	if input.DepartmentID != nil {
		dept, err := s.departmentRepo.FindByID(*input.DepartmentID)
		if err != nil {
			return nil, errors.New("unidade não encontrada")
		}
		user.DepartmentID = input.DepartmentID
		user.Department = dept.Name
	} else if input.Department != "" {
		user.Department = input.Department
	}
	if input.Role != "" {
		user.Role = input.Role
	}
	if input.IsActive != nil {
		user.IsActive = *input.IsActive
	}

	if err := s.repo.Update(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *userService) Delete(id uuid.UUID) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("usuário não encontrado")
	}
	return s.repo.SoftDelete(id)
}

func (s *userService) ChangePassword(id uuid.UUID, current, newPass string) error {
	user, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("usuário não encontrado")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(current)); err != nil {
		return errors.New("senha atual incorreta")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPass), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.Password = string(hash)
	return s.repo.Update(user)
}
