package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LocationHandler struct{ service domain.LocationService }

func NewLocationHandler(s domain.LocationService) *LocationHandler { return &LocationHandler{s} }

func (h *LocationHandler) List(c *gin.Context) {
	locations, err := h.service.List(c.Query("search"))
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, locations)
}

func (h *LocationHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	loc, err := h.service.GetByID(id)
	if err != nil {
		response.NotFound(c, "localização não encontrada")
		return
	}
	response.OK(c, loc)
}

func (h *LocationHandler) Create(c *gin.Context) {
	var input domain.CreateLocationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	loc, err := h.service.Create(input)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Created(c, loc)
}

func (h *LocationHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.UpdateLocationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	loc, err := h.service.Update(id, input)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.OK(c, loc)
}

func (h *LocationHandler) Delete(c *gin.Context) {
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
