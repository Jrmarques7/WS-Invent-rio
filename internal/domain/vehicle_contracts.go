package domain

import "github.com/google/uuid"

type VehicleRepository interface {
	FindAll(page, limit int, filters VehicleFilters) ([]*Vehicle, int64, error)
	FindByID(id uuid.UUID) (*Vehicle, error)
	CountByYear(year int) (int64, error)
	Create(v *Vehicle) error
	Update(v *Vehicle) error
	SoftDelete(id uuid.UUID) error
}

type VehicleKMRepository interface {
	CreateKmRecord(r *KmRecord) error
	FindKmRecords(vehicleID uuid.UUID) ([]*KmRecord, error)
}

type VehicleMaintenanceRepository interface {
	FindMaintenances(vehicleID uuid.UUID) ([]*VehicleMaintenance, error)
	FindMaintenanceByID(id uuid.UUID) (*VehicleMaintenance, error)
	CreateMaintenance(m *VehicleMaintenance) error
	UpdateMaintenance(m *VehicleMaintenance) error
	DeleteMaintenance(id uuid.UUID) error
}

type VehicleFuelRepository interface {
	CreateFuelRecord(r *FuelRecord) error
	FindFuelRecords(vehicleID uuid.UUID) ([]*FuelRecord, error)
}

type VehicleService interface {
	List(page, limit int, filters VehicleFilters) ([]*Vehicle, int64, error)
	GetByID(id uuid.UUID) (*Vehicle, error)
	Create(dto CreateVehicleInput, userID uuid.UUID) (*Vehicle, error)
	Update(id uuid.UUID, dto UpdateVehicleInput) (*Vehicle, error)
	WriteOff(id uuid.UUID, dto WriteOffVehicleInput) error
	Delete(id uuid.UUID) error
	PreviewPatrimonyNumber() (string, error)
}

type VehicleKMService interface {
	RecordKM(vehicleID uuid.UUID, km int, notes string, userID uuid.UUID) error
	GetKmHistory(vehicleID uuid.UUID) ([]*KmRecord, error)
}

type VehicleMaintenanceService interface {
	GetMaintenances(vehicleID uuid.UUID) ([]*VehicleMaintenance, error)
	CreateMaintenance(vehicleID uuid.UUID, dto CreateVehicleMaintenanceInput) error
	MarkMaintenanceDone(maintenanceID uuid.UUID, doneKM int) error
	DeleteMaintenance(id uuid.UUID) error
}

type VehicleFuelService interface {
	GetFuelRecords(vehicleID uuid.UUID) ([]*FuelRecord, error)
	AddFuelRecord(vehicleID uuid.UUID, dto CreateFuelRecordInput, userID uuid.UUID) error
}
