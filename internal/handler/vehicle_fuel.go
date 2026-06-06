package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type VehicleFuelHandler struct {
	service domain.VehicleFuelService
}

func NewVehicleFuelHandler(service domain.VehicleFuelService) *VehicleFuelHandler {
	return &VehicleFuelHandler{service: service}
}

func (h *VehicleFuelHandler) List(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	records, err := h.service.GetFuelRecords(id)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, records)
}

func (h *VehicleFuelHandler) Add(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.CreateFuelRecordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID := middleware.GetClaims(c).UserID
	if err := h.service.AddFuelRecord(id, input, userID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "abastecimento registrado"})
}
