package domain

import (
	"time"

	"github.com/google/uuid"
)

type CreateVehicleInput struct {
	Name             string         `json:"name" binding:"required"`
	Brand            string         `json:"brand"`
	Model            string         `json:"model"`
	ManufactureYear  int            `json:"manufacture_year"`
	Plate            string         `json:"plate"`
	RENAVAM          string         `json:"renavam"`
	Chassis          string         `json:"chassis"`
	EngineNumber     string         `json:"engine_number"`
	FuelType         FuelType       `json:"fuel_type"`
	Color            string         `json:"color"`
	AcquisitionDate  *time.Time     `json:"acquisition_date"`
	AcquisitionValue float64        `json:"acquisition_value"`
	Condition        AssetCondition `json:"condition"`
	LocationID       *uuid.UUID     `json:"location_id"`
	DepartmentID     *uuid.UUID     `json:"department_id"`
	PrimaryDriverID  *uuid.UUID     `json:"primary_driver_id"`
	CurrentKM        int            `json:"current_km"`
	Notes            string         `json:"notes"`
	IPVADueDate      *time.Time     `json:"ipva_due_date"`
	LicensingDueDate *time.Time     `json:"licensing_due_date"`
	InsuranceDueDate *time.Time     `json:"insurance_due_date"`
	InsuranceCompany string         `json:"insurance_company"`
}

type UpdateVehicleInput struct {
	Name             string         `json:"name"`
	Brand            string         `json:"brand"`
	Model            string         `json:"model"`
	ManufactureYear  int            `json:"manufacture_year"`
	Plate            string         `json:"plate"`
	RENAVAM          string         `json:"renavam"`
	Chassis          string         `json:"chassis"`
	EngineNumber     string         `json:"engine_number"`
	FuelType         FuelType       `json:"fuel_type"`
	Color            string         `json:"color"`
	Condition        AssetCondition `json:"condition"`
	Status           AssetStatus    `json:"status"`
	LocationID       *uuid.UUID     `json:"location_id"`
	DepartmentID     *uuid.UUID     `json:"department_id"`
	PrimaryDriverID  *uuid.UUID     `json:"primary_driver_id"`
	Notes            string         `json:"notes"`
	IPVADueDate      *time.Time     `json:"ipva_due_date"`
	LicensingDueDate *time.Time     `json:"licensing_due_date"`
	InsuranceDueDate *time.Time     `json:"insurance_due_date"`
	InsuranceCompany string         `json:"insurance_company"`
}

type WriteOffVehicleInput struct {
	Date   time.Time `json:"date" binding:"required"`
	Reason string    `json:"reason" binding:"required"`
}

type RecordKMInput struct {
	KM    int    `json:"km" binding:"required"`
	Notes string `json:"notes"`
}

type CreateVehicleMaintenanceInput struct {
	Description string `json:"description" binding:"required"`
	IntervalKM  int    `json:"interval_km"`
	LastDoneKM  int    `json:"last_done_km"`
	Notes       string `json:"notes"`
}

type MarkMaintenanceDoneInput struct {
	DoneKM int `json:"done_km" binding:"required"`
}

type CreateFuelRecordInput struct {
	KM        int      `json:"km"`
	Liters    float64  `json:"liters" binding:"required"`
	PricePerL float64  `json:"price_per_l" binding:"required"`
	Station   string   `json:"station"`
	FuelType  FuelType `json:"fuel_type"`
	FullTank  bool     `json:"full_tank"`
}
