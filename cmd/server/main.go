package main

import (
	"log"
	"patrimonio/internal/config"
	"patrimonio/internal/handler"
	"patrimonio/internal/repository"
	"patrimonio/internal/service"
	"patrimonio/pkg/database"
	"patrimonio/pkg/jwt"

	"go.uber.org/zap"
)

func main() {
	cfg := config.Load()
	log.Printf("DB config: host=%s port=%s name=%s user=%s ssl=%s",
		cfg.Database.Host, cfg.Database.Port, cfg.Database.Name, cfg.Database.User, cfg.Database.SSLMode)

	logger, _ := zap.NewProduction()
	defer logger.Sync()

	db, err := database.Connect(cfg.Database)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	jwtManager := jwt.NewManager(cfg.JWT.Secret, cfg.JWT.AccessExpiry, cfg.JWT.RefreshExpiry)

	// Repositories
	userRepo := repository.NewUserRepository(db)
	assetRepo := repository.NewAssetRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	locationRepo := repository.NewLocationRepository(db)
	custodyRepo := repository.NewCustodyRepository(db)
	movementRepo := repository.NewMovementRepository(db)
	maintenanceRepo := repository.NewMaintenanceRepository(db)
	inventoryRepo := repository.NewInventoryRepository(db)
	depreciationRepo := repository.NewDepreciationRepository(db)
	transferRepo := repository.NewTransferRequestRepository(db)
	vehicleRepo := repository.NewVehicleRepository(db)
	vehicleKMRepo := repository.NewVehicleKMRepository(db)
	vehicleMaintRepo := repository.NewVehicleMaintenanceRepository(db)
	vehicleFuelRepo := repository.NewVehicleFuelRepository(db)
	departmentRepo := repository.NewDepartmentRepository(db)
	driverRepo := repository.NewDriverRepository(db)
	seqRepo := repository.NewSequenceRepository(db)

	// Services
	authSvc := service.NewAuthService(userRepo, jwtManager)
	userSvc := service.NewUserService(userRepo, departmentRepo)
	assetSvc := service.NewAssetService(assetRepo, seqRepo)
	categorySvc := service.NewCategoryService(categoryRepo)
	locationSvc := service.NewLocationService(locationRepo)
	custodySvc := service.NewCustodyService(custodyRepo, assetRepo)
	movementSvc := service.NewMovementService(movementRepo, assetRepo, custodyRepo, userRepo, locationRepo)
	maintenanceSvc := service.NewMaintenanceService(maintenanceRepo, assetRepo, custodyRepo)
	inventorySvc := service.NewInventoryService(inventoryRepo, assetRepo, custodyRepo)
	depreciationSvc := service.NewDepreciationService(depreciationRepo, assetRepo, categoryRepo)
	transferSvc := service.NewTransferRequestService(transferRepo, assetRepo, custodySvc, movementSvc, userRepo)
	vehicleSvc := service.NewVehicleService(vehicleRepo, seqRepo)
	vehicleKMSvc := service.NewVehicleKMService(vehicleRepo, vehicleKMRepo)
	vehicleMaintSvc := service.NewVehicleMaintenanceService(vehicleMaintRepo)
	vehicleFuelSvc := service.NewVehicleFuelService(vehicleRepo, vehicleFuelRepo)
	departmentSvc := service.NewDepartmentService(departmentRepo)
	driverSvc := service.NewDriverService(driverRepo)

	// Handlers
	h := &handler.Handlers{
		Auth:         handler.NewAuthHandler(authSvc),
		Me:           handler.NewMeHandler(custodySvc, inventorySvc, maintenanceSvc, transferSvc, userSvc),
		User:         handler.NewUserHandler(userSvc),
		Asset:        handler.NewAssetHandler(assetSvc),
		Category:     handler.NewCategoryHandler(categorySvc),
		Location:     handler.NewLocationHandler(locationSvc),
		Custody:      handler.NewCustodyHandler(custodySvc),
		Movement:     handler.NewMovementHandler(movementSvc),
		Maintenance:  handler.NewMaintenanceHandler(maintenanceSvc),
		Inventory:    handler.NewInventoryHandler(inventorySvc),
		Transfer:     handler.NewTransferRequestHandler(transferSvc),
		Depreciation: handler.NewDepreciationHandler(depreciationSvc),
		Vehicle:      handler.NewVehicleHandler(vehicleSvc),
		VehicleKM:    handler.NewVehicleKMHandler(vehicleKMSvc),
		VehicleMaint: handler.NewVehicleMaintenanceHandler(vehicleMaintSvc),
		VehicleFuel:  handler.NewVehicleFuelHandler(vehicleFuelSvc),
		Department:   handler.NewDepartmentHandler(departmentSvc),
		Driver:       handler.NewDriverHandler(driverSvc),
	}

	router := handler.NewRouter(h, jwtManager, userRepo, logger, cfg.CORS.Origins)

	log.Printf("Server running on :%s", cfg.App.Port)
	if err := router.Run(":" + cfg.App.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
