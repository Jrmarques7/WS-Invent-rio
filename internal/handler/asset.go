package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AssetHandler struct {
	service domain.AssetService
}

func NewAssetHandler(service domain.AssetService) *AssetHandler {
	return &AssetHandler{service: service}
}

func (h *AssetHandler) List(c *gin.Context) {
	page, limit := response.PaginationParams(c, 20)

	filters := domain.AssetFilters{
		Search:    c.Query("search"),
		AssetType: domain.AssetType(c.Query("asset_type")),
		Status:    domain.AssetStatus(c.Query("status")),
	}

	if catStr := c.Query("category_id"); catStr != "" {
		if id, err := uuid.Parse(catStr); err == nil {
			filters.CategoryID = &id
		}
	}
	if locStr := c.Query("location_id"); locStr != "" {
		if id, err := uuid.Parse(locStr); err == nil {
			filters.LocationID = &id
		}
	}
	if deptStr := c.Query("department_id"); deptStr != "" {
		if id, err := uuid.Parse(deptStr); err == nil {
			filters.DepartmentID = &id
		}
	}

	assets, total, err := h.service.List(page, limit, filters)
	if err != nil {
		response.InternalError(c, err)
		return
	}

	response.Paginated(c, assets, response.BuildMeta(page, limit, total))
}

func (h *AssetHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	asset, err := h.service.GetByID(id)
	if err != nil {
		response.NotFound(c, "bem não encontrado")
		return
	}

	response.OK(c, asset)
}

func (h *AssetHandler) Create(c *gin.Context) {
	var input domain.CreateAssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	asset, err := h.service.Create(input)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Created(c, asset)
}

func (h *AssetHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	var input domain.UpdateAssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	asset, err := h.service.Update(id, input)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.OK(c, asset)
}

func (h *AssetHandler) WriteOff(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	var input domain.WriteOffInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	claims := middleware.GetClaims(c)
	if err := h.service.WriteOff(id, input, claims.UserID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, gin.H{"message": "baixa registrada com sucesso"})
}

func (h *AssetHandler) Delete(c *gin.Context) {
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

func (h *AssetHandler) NextNumber(c *gin.Context) {
	assetType := domain.AssetType(c.Query("type"))
	if assetType == "" {
		response.BadRequest(c, "type é obrigatório")
		return
	}
	number, err := h.service.PreviewPatrimonyNumber(assetType)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"number": number})
}
