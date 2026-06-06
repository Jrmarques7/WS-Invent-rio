package repository

import (
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) FindAll(page, limit int, search string) ([]*domain.User, int64, error) {
	var users []*domain.User
	var total int64

	q := r.db.Model(&domain.User{}).Preload("DepartmentRef").Where("deleted_at IS NULL")
	if search != "" {
		q = q.Where("name ILIKE ? OR email ILIKE ? OR registration ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := q.Offset(offset).Limit(limit).Order("name ASC").Find(&users).Error; err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

func (r *userRepository) FindByID(id uuid.UUID) (*domain.User, error) {
	var user domain.User
	if err := r.db.Preload("DepartmentRef").Where("id = ? AND deleted_at IS NULL", id).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) FindByEmail(email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Preload("DepartmentRef").Where("email = ? AND deleted_at IS NULL", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Create(user *domain.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) Update(user *domain.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) SoftDelete(id uuid.UUID) error {
	return r.db.Exec("UPDATE users SET deleted_at = NOW() WHERE id = ?", id).Error
}
