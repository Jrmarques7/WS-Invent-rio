package domain

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleAdmin       UserRole = "ADMIN"
	RoleGestor      UserRole = "GESTOR"
	RoleResponsavel UserRole = "RESPONSAVEL"
	RoleConsulta    UserRole = "CONSULTA"
)

type User struct {
	ID            uuid.UUID   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name          string      `gorm:"not null"                                       json:"name"`
	Email         string      `gorm:"uniqueIndex;not null"                           json:"email"`
	Password      string      `gorm:"not null"                                       json:"-"`
	Registration  string      `gorm:"uniqueIndex"                                    json:"registration"`
	Department    string      `json:"department"`
	DepartmentID  *uuid.UUID  `gorm:"type:uuid"                                      json:"department_id"`
	DepartmentRef *Department `gorm:"foreignKey:DepartmentID"                       json:"department_ref,omitempty"`
	Role          UserRole    `gorm:"type:varchar(20);default:'RESPONSAVEL'"         json:"role"`
	IsActive      bool        `gorm:"default:true"                                   json:"is_active"`
	Avatar        string      `json:"avatar"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
	DeletedAt     *time.Time  `gorm:"index"                                          json:"-"`
}

type UserRepository interface {
	FindAll(page, limit int, search string) ([]*User, int64, error)
	FindByID(id uuid.UUID) (*User, error)
	FindByEmail(email string) (*User, error)
	Create(user *User) error
	Update(user *User) error
	SoftDelete(id uuid.UUID) error
}

type TokenPair struct {
	Access  string `json:"access"`
	Refresh string `json:"refresh"`
}

type AuthService interface {
	Login(email, password string) (*TokenPair, *User, error)
	RefreshToken(refreshToken string) (*TokenPair, error)
}

type UserService interface {
	List(page, limit int, search string) ([]*User, int64, error)
	GetByID(id uuid.UUID) (*User, error)
	Create(dto CreateUserInput) (*User, error)
	Update(id uuid.UUID, dto UpdateUserInput) (*User, error)
	Delete(id uuid.UUID) error
	ChangePassword(id uuid.UUID, current, newPass string) error
}

type CreateUserInput struct {
	Name         string     `json:"name" binding:"required"`
	Email        string     `json:"email" binding:"required,email"`
	Password     string     `json:"password" binding:"required,min=6"`
	Registration string     `json:"registration"`
	Department   string     `json:"department"`
	DepartmentID *uuid.UUID `json:"department_id"`
	Role         UserRole   `json:"role"`
}

type UpdateUserInput struct {
	Name         string     `json:"name"`
	Registration string     `json:"registration"`
	Department   string     `json:"department"`
	DepartmentID *uuid.UUID `json:"department_id"`
	Role         UserRole   `json:"role"`
	IsActive     *bool      `json:"is_active"`
}
