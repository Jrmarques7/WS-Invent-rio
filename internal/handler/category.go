package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CategoryHandler struct{ service domain.CategoryService }

func NewCategoryHandler(s domain.CategoryService) *CategoryHandler { return &CategoryHandler{s} }

func (h *CategoryHandler) List(c *gin.Context) {
	assetType := domain.AssetType(c.Query("asset_type"))
	search := c.Query("search")

	categories, err := h.service.List(assetType, search)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, categories)
}

func (h *CategoryHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	cat, err := h.service.GetByID(id)
	if err != nil {
		response.NotFound(c, "categoria não encontrada")
		return
	}
	response.OK(c, cat)
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var input domain.CreateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	cat, err := h.service.Create(input)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Created(c, cat)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.UpdateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	cat, err := h.service.Update(id, input)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.OK(c, cat)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
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
