package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MaintenanceHandler struct {
	service domain.MaintenanceService
}

func NewMaintenanceHandler(service domain.MaintenanceService) *MaintenanceHandler {
	return &MaintenanceHandler{service: service}
}

func (h *MaintenanceHandler) List(c *gin.Context) {
	page, limit := response.PaginationParams(c, 20)

	var assetID *uuid.UUID
	if s := c.Query("asset_id"); s != "" {
		if id, err := uuid.Parse(s); err == nil {
			assetID = &id
		}
	}
	status := domain.MaintenanceStatus(c.Query("status"))

	records, total, err := h.service.List(page, limit, assetID, status)
	if err != nil {
		response.InternalError(c, err)
		return
	}

	response.Paginated(c, records, response.BuildMeta(page, limit, total))
}

func (h *MaintenanceHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	record, err := h.service.GetByID(id)
	if err != nil {
		response.NotFound(c, "manutenção não encontrada")
		return
	}

	response.OK(c, record)
}

func (h *MaintenanceHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var input domain.CreateMaintenanceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	record, err := h.service.Create(input, claims.UserID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Created(c, record)
}

func (h *MaintenanceHandler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	var input domain.UpdateMaintenanceStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	claims := middleware.GetClaims(c)
	record, err := h.service.UpdateStatus(id, input, claims.UserID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, record)
}

func (h *MaintenanceHandler) Complete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	var input domain.CompleteMaintenanceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	claims := middleware.GetClaims(c)
	record, err := h.service.Complete(id, input, claims.UserID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, record)
}
