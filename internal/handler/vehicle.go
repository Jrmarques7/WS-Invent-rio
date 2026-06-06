package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type VehicleHandler struct {
	service domain.VehicleService
}

func NewVehicleHandler(service domain.VehicleService) *VehicleHandler {
	return &VehicleHandler{service: service}
}

func (h *VehicleHandler) List(c *gin.Context) {
	page, limit := response.PaginationParams(c, 20)

	filters := domain.VehicleFilters{
		Search:   c.Query("search"),
		Status:   domain.AssetStatus(c.Query("status")),
		FuelType: domain.FuelType(c.Query("fuel_type")),
	}
	if locStr := c.Query("location_id"); locStr != "" {
		if id, err := uuid.Parse(locStr); err == nil {
			filters.LocationID = &id
		}
	}

	vehicles, total, err := h.service.List(page, limit, filters)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.Paginated(c, vehicles, response.BuildMeta(page, limit, total))
}

func (h *VehicleHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	v, err := h.service.GetByID(id)
	if err != nil {
		response.NotFound(c, "veículo não encontrado")
		return
	}
	response.OK(c, v)
}

func (h *VehicleHandler) Create(c *gin.Context) {
	var input domain.CreateVehicleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID := middleware.GetClaims(c).UserID
	v, err := h.service.Create(input, userID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Created(c, v)
}

func (h *VehicleHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.UpdateVehicleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	v, err := h.service.Update(id, input)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.OK(c, v)
}

func (h *VehicleHandler) WriteOff(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.WriteOffVehicleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.service.WriteOff(id, input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "baixa registrada com sucesso"})
}

func (h *VehicleHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	if err := h.service.Delete(id); err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.NoContent(c)
}

func (h *VehicleHandler) NextNumber(c *gin.Context) {
	number, err := h.service.PreviewPatrimonyNumber()
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, gin.H{"number": number})
}
