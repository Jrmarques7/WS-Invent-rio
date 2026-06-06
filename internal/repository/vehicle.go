package repository

import (
	"patrimonio/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type vehicleRepository struct {
	db *gorm.DB
}

func NewVehicleRepository(db *gorm.DB) domain.VehicleRepository {
	return &vehicleRepository{db: db}
}

func NewVehicleKMRepository(db *gorm.DB) domain.VehicleKMRepository {
	return &vehicleRepository{db: db}
}

func NewVehicleMaintenanceRepository(db *gorm.DB) domain.VehicleMaintenanceRepository {
	return &vehicleRepository{db: db}
}

func NewVehicleFuelRepository(db *gorm.DB) domain.VehicleFuelRepository {
	return &vehicleRepository{db: db}
}

func (r *vehicleRepository) FindAll(page, limit int, filters domain.VehicleFilters) ([]*domain.Vehicle, int64, error) {
	var vehicles []*domain.Vehicle
	var total int64

	q := r.db.Model(&domain.Vehicle{}).
		Preload("Location").
		Preload("Department").
		Preload("PrimaryDriver").
		Where("vehicles.deleted_at IS NULL")

	if filters.Search != "" {
		s := "%" + filters.Search + "%"
		q = q.Where("vehicles.name ILIKE ? OR vehicles.plate ILIKE ? OR vehicles.renavam ILIKE ? OR vehicles.brand ILIKE ? OR vehicles.model ILIKE ?",
			s, s, s, s, s)
	}
	if filters.Status != "" {
		q = q.Where("vehicles.status = ?", filters.Status)
	}
	if filters.FuelType != "" {
		q = q.Where("vehicles.fuel_type = ?", filters.FuelType)
	}
	if filters.LocationID != nil {
		q = q.Where("vehicles.location_id = ?", *filters.LocationID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := q.Offset(offset).Limit(limit).Order("vehicles.patrimony_number ASC").Find(&vehicles).Error; err != nil {
		return nil, 0, err
	}
	return vehicles, total, nil
}

func (r *vehicleRepository) FindByID(id uuid.UUID) (*domain.Vehicle, error) {
	var v domain.Vehicle
	if err := r.db.Preload("Location").Preload("Department").Preload("PrimaryDriver").
		Where("id = ? AND deleted_at IS NULL", id).First(&v).Error; err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *vehicleRepository) CountByYear(year int) (int64, error) {
	var count int64
	err := r.db.Model(&domain.Vehicle{}).
		Where("EXTRACT(YEAR FROM created_at) = ?", year).
		Count(&count).Error
	return count, err
}

func (r *vehicleRepository) Create(v *domain.Vehicle) error {
	if err := r.db.Create(v).Error; err != nil {
		return err
	}
	return r.db.Preload("Location").Preload("Department").Preload("PrimaryDriver").
		First(v, "id = ?", v.ID).Error
}

func (r *vehicleRepository) Update(v *domain.Vehicle) error {
	if err := r.db.Save(v).Error; err != nil {
		return err
	}
	return r.db.Preload("Location").Preload("Department").Preload("PrimaryDriver").
		First(v, "id = ?", v.ID).Error
}

func (r *vehicleRepository) SoftDelete(id uuid.UUID) error {
	return r.db.Exec("UPDATE vehicles SET deleted_at = NOW() WHERE id = ?", id).Error
}

// KM Records

func (r *vehicleRepository) CreateKmRecord(rec *domain.KmRecord) error {
	return r.db.Create(rec).Error
}

func (r *vehicleRepository) FindKmRecords(vehicleID uuid.UUID) ([]*domain.KmRecord, error) {
	var records []*domain.KmRecord
	err := r.db.Preload("RecordedBy").
		Where("vehicle_id = ?", vehicleID).
		Order("recorded_at DESC").
		Find(&records).Error
	return records, err
}

// Maintenances

func (r *vehicleRepository) FindMaintenances(vehicleID uuid.UUID) ([]*domain.VehicleMaintenance, error) {
	var m []*domain.VehicleMaintenance
	err := r.db.Where("vehicle_id = ?", vehicleID).Order("next_due_km ASC").Find(&m).Error
	return m, err
}

func (r *vehicleRepository) FindMaintenanceByID(id uuid.UUID) (*domain.VehicleMaintenance, error) {
	var m domain.VehicleMaintenance
	if err := r.db.Where("id = ?", id).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *vehicleRepository) CreateMaintenance(m *domain.VehicleMaintenance) error {
	return r.db.Create(m).Error
}

func (r *vehicleRepository) UpdateMaintenance(m *domain.VehicleMaintenance) error {
	return r.db.Save(m).Error
}

func (r *vehicleRepository) DeleteMaintenance(id uuid.UUID) error {
	return r.db.Delete(&domain.VehicleMaintenance{}, "id = ?", id).Error
}

// Fuel Records

func (r *vehicleRepository) CreateFuelRecord(rec *domain.FuelRecord) error {
	return r.db.Create(rec).Error
}

func (r *vehicleRepository) FindFuelRecords(vehicleID uuid.UUID) ([]*domain.FuelRecord, error) {
	var records []*domain.FuelRecord
	err := r.db.Preload("RecordedBy").
		Where("vehicle_id = ?", vehicleID).
		Order("recorded_at DESC").
		Find(&records).Error
	return records, err
}
