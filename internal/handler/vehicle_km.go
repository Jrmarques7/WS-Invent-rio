package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type VehicleKMHandler struct {
	service domain.VehicleKMService
}

func NewVehicleKMHandler(service domain.VehicleKMService) *VehicleKMHandler {
	return &VehicleKMHandler{service: service}
}

func (h *VehicleKMHandler) Record(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.RecordKMInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID := middleware.GetClaims(c).UserID
	if err := h.service.RecordKM(id, input.KM, input.Notes, userID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "KM registrado"})
}

func (h *VehicleKMHandler) History(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	records, err := h.service.GetKmHistory(id)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, records)
}
