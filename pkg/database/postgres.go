package database

import (
	"fmt"
	"log"
	"strings"

	"patrimonio/internal/config"
	"patrimonio/internal/domain"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg config.DatabaseConfig) (*gorm.DB, error) {
	var dsn string

	if strings.HasPrefix(cfg.Host, "/") {
		// Unix socket: postgres://user@/dbname?host=/var/run/postgresql
		dsn = fmt.Sprintf(
			"postgres://%s@/%s?host=%s&sslmode=%s&TimeZone=America%%2FSao_Paulo",
			cfg.User, cfg.Name, cfg.Host, cfg.SSLMode,
		)
	} else {
		dsn = fmt.Sprintf(
			"postgres://%s:%s@%s:%s/%s?sslmode=%s&TimeZone=America%%2FSao_Paulo",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name, cfg.SSLMode,
		)
	}

	log.Printf("Connecting to database: host=%s db=%s user=%s", cfg.Host, cfg.Name, cfg.User)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connected successfully")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&domain.User{},
		&domain.Category{},
		&domain.Location{},
		&domain.Asset{},
		&domain.Custody{},
		&domain.Movement{},
		&domain.TransferRequest{},
		&domain.Maintenance{},
		&domain.InventoryProcess{},
		&domain.InventoryItem{},
		&domain.DepreciationRecord{},
		&domain.Department{},
		&domain.Driver{},
		&domain.Vehicle{},
		&domain.KmRecord{},
		&domain.VehicleMaintenance{},
		&domain.FuelRecord{},
		&domain.PatrimonySequence{},
	); err != nil {
		return err
	}
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_custodies_one_active_per_asset
		ON custodies (asset_id)
		WHERE is_active = true
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_movements_asset_date
		ON movements (asset_id, date DESC)
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_movements_performed_by_date
		ON movements (performed_by_id, date DESC)
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_movements_type_date
		ON movements (type, date DESC)
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_custodies_asset_active
		ON custodies (asset_id, is_active)
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_custodies_user_active
		ON custodies (user_id, is_active)
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		UPDATE users
		SET department_id = departments.id
		FROM departments
		WHERE users.department_id IS NULL
		  AND users.department <> ''
		  AND LOWER(users.department) = LOWER(departments.name)
	`).Error; err != nil {
		return err
	}
	// Seed sequences from existing assets so the counter never goes backwards.
	db.Exec(`
		INSERT INTO patrimony_sequences (prefix, year, next_val)
		SELECT
			split_part(patrimony_number, '-', 2)           AS prefix,
			split_part(patrimony_number, '-', 3)::int      AS year,
			MAX(split_part(patrimony_number, '-', 4)::int) AS next_val
		FROM assets
		WHERE deleted_at IS NULL
		  AND patrimony_number ~ '^PAT-[A-Z]+-[0-9]{4}-[0-9]+$'
		GROUP BY prefix, year
		ON CONFLICT (prefix, year) DO UPDATE
		  SET next_val = GREATEST(patrimony_sequences.next_val, EXCLUDED.next_val)
	`)
	db.Exec(`
		INSERT INTO patrimony_sequences (prefix, year, next_val)
		SELECT
			split_part(patrimony_number, '-', 2)           AS prefix,
			split_part(patrimony_number, '-', 3)::int      AS year,
			MAX(split_part(patrimony_number, '-', 4)::int) AS next_val
		FROM vehicles
		WHERE deleted_at IS NULL
		  AND patrimony_number ~ '^PAT-[A-Z]+-[0-9]{4}-[0-9]+$'
		GROUP BY prefix, year
		ON CONFLICT (prefix, year) DO UPDATE
		  SET next_val = GREATEST(patrimony_sequences.next_val, EXCLUDED.next_val)
	`)
	return nil
}
