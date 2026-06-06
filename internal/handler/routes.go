package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"

	"github.com/gin-gonic/gin"
)

func registerUserRoutes(r *gin.RouterGroup, h *Handlers) {
	users := r.Group("/users")
	users.GET("", middleware.RequireRole(domain.RoleAdmin), h.User.List)
	users.GET("/me", h.User.Me)
	users.GET("/:id", middleware.RequireRole(domain.RoleAdmin), h.User.Get)
	users.POST("", middleware.RequireRole(domain.RoleAdmin), h.User.Create)
	users.PUT("/:id", middleware.RequireRole(domain.RoleAdmin), h.User.Update)
	users.DELETE("/:id", middleware.RequireRole(domain.RoleAdmin), h.User.Delete)
	users.POST("/change-password", h.User.ChangePassword)
	users.GET("/:id/carga", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Custody.UserCarga)
}

func registerMeRoutes(r *gin.RouterGroup, h *Handlers) {
	me := r.Group("/me")
	me.GET("/custody", middleware.RequireRole(domain.RoleResponsavel), h.Me.Custody)
	me.GET("/inventory", middleware.RequireRole(domain.RoleResponsavel), h.Me.Inventory)
	me.POST("/inventory/:inventory_id/verify", middleware.RequireRole(domain.RoleResponsavel), h.Me.VerifyInventory)
	me.POST("/assets/:asset_id/maintenance", middleware.RequireRole(domain.RoleResponsavel), h.Me.CreateMaintenance)
	me.GET("/transfer-targets", middleware.RequireRole(domain.RoleResponsavel), h.Me.TransferTargets)
	me.GET("/transfers", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleResponsavel), h.Me.Transfers)
	me.POST("/transfers", middleware.RequireRole(domain.RoleResponsavel), h.Me.RequestTransfer)
	me.POST("/transfers/:id/accept", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleResponsavel), h.Me.AcceptTransfer)
	me.POST("/transfers/:id/decline", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleResponsavel), h.Me.DeclineTransfer)
}

func registerAssetRoutes(r *gin.RouterGroup, h *Handlers) {
	assets := r.Group("/assets")
	assets.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Asset.List)
	assets.GET("/next-number", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Asset.NextNumber)
	assets.GET("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Asset.Get)
	assets.POST("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Asset.Create)
	assets.PUT("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Asset.Update)
	assets.POST("/:id/write-off", middleware.RequireRole(domain.RoleAdmin), h.Asset.WriteOff)
	assets.DELETE("/:id", middleware.RequireRole(domain.RoleAdmin), h.Asset.Delete)
	assets.GET("/:id/history", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Movement.AssetHistory)
	assets.GET("/:id/custody", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Custody.GetActiveCustody)
	assets.GET("/:id/depreciation", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Depreciation.GetAssetHistory)
}

func registerCategoryRoutes(r *gin.RouterGroup, h *Handlers) {
	categories := r.Group("/categories")
	categories.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Category.List)
	categories.GET("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Category.Get)
	categories.POST("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Category.Create)
	categories.PUT("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Category.Update)
	categories.DELETE("/:id", middleware.RequireRole(domain.RoleAdmin), h.Category.Delete)
}

func registerLocationRoutes(r *gin.RouterGroup, h *Handlers) {
	locations := r.Group("/locations")
	locations.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Location.List)
	locations.GET("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Location.Get)
	locations.POST("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Location.Create)
	locations.PUT("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Location.Update)
	locations.DELETE("/:id", middleware.RequireRole(domain.RoleAdmin), h.Location.Delete)
}

func registerCustodyRoutes(r *gin.RouterGroup, h *Handlers) {
	custody := r.Group("/custody")
	custody.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Custody.List)
	custody.POST("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Custody.Assign)
	custody.DELETE("/assets/:asset_id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Custody.Release)
}

func registerMovementRoutes(r *gin.RouterGroup, h *Handlers) {
	movements := r.Group("/movements")
	movements.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Movement.List)
	movements.POST("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Movement.Register)
}

func registerTransferRoutes(r *gin.RouterGroup, h *Handlers) {
	transfers := r.Group("/transfer-requests")
	transfers.Use(middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor))
	transfers.GET("", h.Transfer.List)
	transfers.POST("/:id/approve", h.Transfer.Approve)
	transfers.POST("/:id/reject", h.Transfer.Reject)
}

func registerMaintenanceRoutes(r *gin.RouterGroup, h *Handlers) {
	maintenances := r.Group("/maintenance")
	maintenances.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Maintenance.List)
	maintenances.GET("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Maintenance.Get)
	maintenances.POST("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Maintenance.Create)
	maintenances.PATCH("/:id/status", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Maintenance.UpdateStatus)
	maintenances.POST("/:id/complete", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Maintenance.Complete)
}

func registerInventoryRoutes(r *gin.RouterGroup, h *Handlers) {
	inventory := r.Group("/inventory")
	inventory.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Inventory.List)
	inventory.GET("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Inventory.Get)
	inventory.POST("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Inventory.Create)
	inventory.POST("/:id/start", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Inventory.Start)
	inventory.POST("/:id/complete", middleware.RequireRole(domain.RoleAdmin), h.Inventory.Complete)
	inventory.POST("/:id/cancel", middleware.RequireRole(domain.RoleAdmin), h.Inventory.Cancel)
	inventory.GET("/:id/items", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Inventory.Items)
	inventory.POST("/:id/items", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Inventory.AddItems)
	inventory.DELETE("/:id/items/:asset_id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Inventory.RemoveItem)
	inventory.POST("/:id/verify", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Inventory.VerifyItem)
}

func registerDepreciationRoutes(r *gin.RouterGroup, h *Handlers) {
	depreciation := r.Group("/depreciation")
	depreciation.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Depreciation.GetPeriod)
	depreciation.POST("/calculate", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Depreciation.Calculate)
}

func registerDepartmentRoutes(r *gin.RouterGroup, h *Handlers) {
	departments := r.Group("/departments")
	departments.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Department.List)
	departments.GET("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Department.Get)
	departments.POST("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Department.Create)
	departments.PUT("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Department.Update)
	departments.DELETE("/:id", middleware.RequireRole(domain.RoleAdmin), h.Department.Delete)
}

func registerDriverRoutes(r *gin.RouterGroup, h *Handlers) {
	drivers := r.Group("/drivers")
	drivers.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Driver.List)
	drivers.GET("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Driver.Get)
	drivers.POST("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Driver.Create)
	drivers.PUT("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Driver.Update)
	drivers.DELETE("/:id", middleware.RequireRole(domain.RoleAdmin), h.Driver.Delete)
}

func registerVehicleRoutes(r *gin.RouterGroup, h *Handlers) {
	vehicles := r.Group("/vehicles")
	vehicles.GET("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Vehicle.List)
	vehicles.GET("/next-number", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Vehicle.NextNumber)
	vehicles.GET("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.Vehicle.Get)
	vehicles.POST("", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Vehicle.Create)
	vehicles.PUT("/:id", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.Vehicle.Update)
	vehicles.POST("/:id/write-off", middleware.RequireRole(domain.RoleAdmin), h.Vehicle.WriteOff)
	vehicles.DELETE("/:id", middleware.RequireRole(domain.RoleAdmin), h.Vehicle.Delete)
	vehicles.GET("/:id/km", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.VehicleKM.History)
	vehicles.POST("/:id/km", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.VehicleKM.Record)
	vehicles.GET("/:id/maintenances", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.VehicleMaint.List)
	vehicles.POST("/:id/maintenances", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.VehicleMaint.Create)
	vehicles.PUT("/:id/maintenances/:mid", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.VehicleMaint.MarkDone)
	vehicles.DELETE("/:id/maintenances/:mid", middleware.RequireRole(domain.RoleAdmin), h.VehicleMaint.Delete)
	vehicles.GET("/:id/fuel", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor, domain.RoleConsulta), h.VehicleFuel.List)
	vehicles.POST("/:id/fuel", middleware.RequireRole(domain.RoleAdmin, domain.RoleGestor), h.VehicleFuel.Add)
}
