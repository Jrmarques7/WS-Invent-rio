package domain

import (
	"time"

	"github.com/google/uuid"
)

type FuelType string

const (
	FuelGasolina FuelType = "GASOLINA"
	FuelDiesel   FuelType = "DIESEL"
	FuelEtanol   FuelType = "ETANOL"
	FuelHibrido  FuelType = "HIBRIDO"
	FuelEletrico FuelType = "ELETRICO"
	FuelGNV      FuelType = "GNV"
)

type Vehicle struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	PatrimonyNumber  string         `gorm:"uniqueIndex;not null" json:"patrimony_number"`
	Name             string         `gorm:"not null" json:"name"`
	Brand            string         `json:"brand"`
	Model            string         `json:"model"`
	ManufactureYear  int            `json:"manufacture_year"`
	Plate            string         `gorm:"uniqueIndex" json:"plate"`
	RENAVAM          string         `gorm:"uniqueIndex;column:renavam" json:"renavam"`
	Chassis          string         `gorm:"uniqueIndex" json:"chassis"`
	EngineNumber     string         `json:"engine_number"`
	FuelType         FuelType       `gorm:"type:varchar(20)" json:"fuel_type"`
	Color            string         `json:"color"`
	AcquisitionDate  *time.Time     `json:"acquisition_date"`
	AcquisitionValue float64        `gorm:"type:numeric(15,2)" json:"acquisition_value"`
	CurrentValue     float64        `gorm:"type:numeric(15,2)" json:"current_value"`
	Condition        AssetCondition `gorm:"type:varchar(20);default:'GOOD'" json:"condition"`
	Status           AssetStatus    `gorm:"type:varchar(30);default:'ACTIVE'" json:"status"`
	LocationID       *uuid.UUID     `gorm:"type:uuid" json:"location_id"`
	Location         *Location      `gorm:"foreignKey:LocationID" json:"location"`
	DepartmentID     *uuid.UUID     `gorm:"type:uuid" json:"department_id"`
	Department       *Department    `gorm:"foreignKey:DepartmentID" json:"department"`
	PrimaryDriverID  *uuid.UUID     `gorm:"type:uuid" json:"primary_driver_id"`
	PrimaryDriver    *Driver        `gorm:"foreignKey:PrimaryDriverID" json:"primary_driver"`
	CurrentKM        int            `json:"current_km"`
	Notes            string         `json:"notes"`
	IPVADueDate      *time.Time     `json:"ipva_due_date"`
	LicensingDueDate *time.Time     `json:"licensing_due_date"`
	InsuranceDueDate *time.Time     `json:"insurance_due_date"`
	InsuranceCompany string         `json:"insurance_company"`
	WriteOffDate     *time.Time     `json:"write_off_date"`
	WriteOffReason   string         `json:"write_off_reason"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        *time.Time     `gorm:"index" json:"-"`
}

type KmRecord struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	VehicleID    uuid.UUID `gorm:"type:uuid;not null;index" json:"vehicle_id"`
	KM           int       `gorm:"not null" json:"km"`
	RecordedAt   time.Time `json:"recorded_at"`
	Notes        string    `json:"notes"`
	RecordedByID uuid.UUID `gorm:"type:uuid" json:"recorded_by_id"`
	RecordedBy   *User     `gorm:"foreignKey:RecordedByID" json:"recorded_by"`
}

type VehicleMaintenance struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	VehicleID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"vehicle_id"`
	Description string     `gorm:"not null" json:"description"`
	IntervalKM  int        `json:"interval_km"`
	LastDoneKM  int        `json:"last_done_km"`
	NextDueKM   int        `json:"next_due_km"`
	LastDoneAt  *time.Time `json:"last_done_at"`
	Notes       string     `json:"notes"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type FuelRecord struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	VehicleID    uuid.UUID `gorm:"type:uuid;not null;index" json:"vehicle_id"`
	KM           int       `json:"km"`
	Liters       float64   `gorm:"type:numeric(10,3)" json:"liters"`
	PricePerL    float64   `gorm:"type:numeric(10,3)" json:"price_per_l"`
	TotalCost    float64   `gorm:"type:numeric(15,2)" json:"total_cost"`
	Station      string    `json:"station"`
	FuelType     FuelType  `gorm:"type:varchar(20)" json:"fuel_type"`
	FullTank     bool      `json:"full_tank"`
	RecordedAt   time.Time `json:"recorded_at"`
	RecordedByID uuid.UUID `gorm:"type:uuid" json:"recorded_by_id"`
	RecordedBy   *User     `gorm:"foreignKey:RecordedByID" json:"recorded_by"`
}

type VehicleFilters struct {
	Search     string
	Status     AssetStatus
	FuelType   FuelType
	LocationID *uuid.UUID
}
