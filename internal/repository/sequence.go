package repository

import (
	"patrimonio/internal/domain"

	"gorm.io/gorm"
)

type sequenceRepository struct {
	db *gorm.DB
}

func NewSequenceRepository(db *gorm.DB) domain.SequenceRepository {
	return &sequenceRepository{db: db}
}

// Next uses a PostgreSQL UPSERT to atomically increment the counter.
// Two concurrent requests will never get the same value.
func (r *sequenceRepository) Next(prefix string, year int) (int64, error) {
	var val int64
	err := r.db.Raw(`
		INSERT INTO patrimony_sequences (prefix, year, next_val)
		VALUES (?, ?, 1)
		ON CONFLICT (prefix, year) DO UPDATE
		  SET next_val = patrimony_sequences.next_val + 1
		RETURNING next_val
	`, prefix, year).Scan(&val).Error
	return val, err
}

// Peek reads the current counter without incrementing (used for preview only).
func (r *sequenceRepository) Peek(prefix string, year int) (int64, error) {
	var s domain.PatrimonySequence
	r.db.Where("prefix = ? AND year = ?", prefix, year).First(&s)
	return s.NextVal + 1, nil
}
