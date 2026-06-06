package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type VehicleMaintenanceHandler struct {
	service domain.VehicleMaintenanceService
}

func NewVehicleMaintenanceHandler(service domain.VehicleMaintenanceService) *VehicleMaintenanceHandler {
	return &VehicleMaintenanceHandler{service: service}
}

func (h *VehicleMaintenanceHandler) List(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	items, err := h.service.GetMaintenances(id)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, items)
}

func (h *VehicleMaintenanceHandler) Create(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.CreateVehicleMaintenanceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.service.CreateMaintenance(id, input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "manutenção criada"})
}

func (h *VehicleMaintenanceHandler) MarkDone(c *gin.Context) {
	mid, err := uuid.Parse(c.Param("mid"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.MarkMaintenanceDoneInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.service.MarkMaintenanceDone(mid, input.DoneKM); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "manutenção concluída"})
}

func (h *VehicleMaintenanceHandler) Delete(c *gin.Context) {
	mid, err := uuid.Parse(c.Param("mid"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	if err := h.service.DeleteMaintenance(mid); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.NoContent(c)
}
