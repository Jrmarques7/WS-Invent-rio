package service

import (
	"errors"
	"patrimonio/internal/domain"
	"patrimonio/pkg/jwt"

	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo domain.UserRepository
	jwt      *jwt.Manager
}

func NewAuthService(userRepo domain.UserRepository, jwtManager *jwt.Manager) domain.AuthService {
	return &AuthService{userRepo: userRepo, jwt: jwtManager}
}

func (s *AuthService) Login(email, password string) (*domain.TokenPair, *domain.User, error) {
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return nil, nil, errors.New("credenciais inválidas")
	}

	if !user.IsActive {
		return nil, nil, errors.New("usuário inativo")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return nil, nil, errors.New("credenciais inválidas")
	}

	pair, err := s.generatePair(user)
	if err != nil {
		return nil, nil, err
	}
	return pair, user, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (*domain.TokenPair, error) {
	claims, err := s.jwt.Validate(refreshToken)
	if err != nil {
		return nil, errors.New("token inválido")
	}
	if claims.TokenType != "refresh" {
		return nil, errors.New("token inválido")
	}

	user, err := s.userRepo.FindByID(claims.UserID)
	if err != nil || !user.IsActive {
		return nil, errors.New("usuário não encontrado ou inativo")
	}

	return s.generatePair(user)
}

func (s *AuthService) generatePair(user *domain.User) (*domain.TokenPair, error) {
	role := string(user.Role)
	access, err := s.jwt.GenerateAccess(user.ID, user.Email, role)
	if err != nil {
		return nil, err
	}
	refresh, err := s.jwt.GenerateRefresh(user.ID, user.Email, role)
	if err != nil {
		return nil, err
	}
	return &domain.TokenPair{Access: access, Refresh: refresh}, nil
}
