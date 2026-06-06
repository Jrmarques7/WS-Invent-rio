package handler

import (
	"net/http"
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/jwt"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Handlers struct {
	Auth         *AuthHandler
	Me           *MeHandler
	User         *UserHandler
	Asset        *AssetHandler
	Category     *CategoryHandler
	Location     *LocationHandler
	Custody      *CustodyHandler
	Movement     *MovementHandler
	Maintenance  *MaintenanceHandler
	Inventory    *InventoryHandler
	Transfer     *TransferRequestHandler
	Depreciation *DepreciationHandler
	Vehicle      *VehicleHandler
	VehicleKM    *VehicleKMHandler
	VehicleMaint *VehicleMaintenanceHandler
	VehicleFuel  *VehicleFuelHandler
	Department   *DepartmentHandler
	Driver       *DriverHandler
}

func NewRouter(
	h *Handlers,
	jwtManager *jwt.Manager,
	userRepo domain.UserRepository,
	log *zap.Logger,
	corsOrigins string,
) *gin.Engine {
	r := gin.New()

	r.Use(middleware.Logger(log))
	r.Use(gin.Recovery())

	origins := strings.Split(corsOrigins, ",")
	r.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")

	// Auth (público)
	auth := api.Group("/auth")
	{
		auth.POST("/login", h.Auth.Login)
		auth.POST("/token/refresh", h.Auth.Refresh)
	}

	// Rotas protegidas
	protected := api.Group("/")
	protected.Use(middleware.Auth(jwtManager, userRepo))
	registerMeRoutes(protected, h)
	registerUserRoutes(protected, h)
	registerAssetRoutes(protected, h)
	registerCategoryRoutes(protected, h)
	registerLocationRoutes(protected, h)
	registerCustodyRoutes(protected, h)
	registerMovementRoutes(protected, h)
	registerTransferRoutes(protected, h)
	registerMaintenanceRoutes(protected, h)
	registerInventoryRoutes(protected, h)
	registerDepreciationRoutes(protected, h)
	registerDepartmentRoutes(protected, h)
	registerDriverRoutes(protected, h)
	registerVehicleRoutes(protected, h)

	return r
}
