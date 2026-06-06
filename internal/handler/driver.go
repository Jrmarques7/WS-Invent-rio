package handler

import (
	"net/http"
	"patrimonio/internal/domain"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DriverHandler struct {
	svc domain.DriverService
}

func NewDriverHandler(svc domain.DriverService) *DriverHandler {
	return &DriverHandler{svc: svc}
}

func (h *DriverHandler) List(c *gin.Context) {
	filters := domain.DriverFilters{
		Search: c.Query("search"),
		Status: domain.DriverStatus(c.Query("status")),
	}
	drivers, err := h.svc.List(filters)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, drivers)
}

func (h *DriverHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "ID inválido")
		return
	}
	d, err := h.svc.GetByID(id)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.OK(c, d)
}

func (h *DriverHandler) Create(c *gin.Context) {
	var input domain.CreateDriverInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	d, err := h.svc.Create(input)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.Created(c, d)
}

func (h *DriverHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "ID inválido")
		return
	}
	var input domain.UpdateDriverInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	d, err := h.svc.Update(id, input)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, d)
}

func (h *DriverHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "ID inválido")
		return
	}
	if err := h.svc.Delete(id); err != nil {
		response.InternalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
