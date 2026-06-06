package handler

import (
	"net/http"
	"patrimonio/internal/domain"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DepartmentHandler struct {
	svc domain.DepartmentService
}

func NewDepartmentHandler(svc domain.DepartmentService) *DepartmentHandler {
	return &DepartmentHandler{svc: svc}
}

func (h *DepartmentHandler) List(c *gin.Context) {
	deps, err := h.svc.List()
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, deps)
}

func (h *DepartmentHandler) Get(c *gin.Context) {
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

func (h *DepartmentHandler) Create(c *gin.Context) {
	var input domain.CreateDepartmentInput
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

func (h *DepartmentHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "ID inválido")
		return
	}
	var input domain.CreateDepartmentInput
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

func (h *DepartmentHandler) Delete(c *gin.Context) {
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
