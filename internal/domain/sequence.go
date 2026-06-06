package domain

// PatrimonySequence tracks the last issued sequence number per prefix+year.
// The UPSERT in the repository guarantees atomic generation with no race conditions.
type PatrimonySequence struct {
	Prefix  string `gorm:"primaryKey;type:varchar(20)"`
	Year    int    `gorm:"primaryKey"`
	NextVal int64  `gorm:"not null;default:0"`
}

type SequenceRepository interface {
	// Next atomically increments and returns the new sequence value.
	Next(prefix string, year int) (int64, error)
	// Peek returns what the next value will be without consuming it (preview only).
	Peek(prefix string, year int) (int64, error)
}
