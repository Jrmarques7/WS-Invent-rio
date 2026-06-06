package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InventoryHandler struct{ service domain.InventoryService }

func NewInventoryHandler(s domain.InventoryService) *InventoryHandler { return &InventoryHandler{s} }

func (h *InventoryHandler) List(c *gin.Context) {
	page, limit := response.PaginationParams(c, 20)

	inventories, total, err := h.service.List(page, limit)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.Paginated(c, inventories, response.BuildMeta(page, limit, total))
}

func (h *InventoryHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	inv, err := h.service.GetByID(id)
	if err != nil {
		response.NotFound(c, "inventário não encontrado")
		return
	}
	response.OK(c, inv)
}

func (h *InventoryHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)
	var input domain.CreateInventoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	inv, err := h.service.Create(input, claims.UserID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Created(c, inv)
}

func (h *InventoryHandler) Start(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	if err := h.service.Start(id); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "inventário iniciado"})
}

func (h *InventoryHandler) Complete(c *gin.Context) {
	claims := middleware.GetClaims(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	if err := h.service.Complete(id, claims.UserID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "inventário concluído"})
}

func (h *InventoryHandler) Cancel(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	if err := h.service.Cancel(id); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "inventário cancelado"})
}

func (h *InventoryHandler) Items(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	items, err := h.service.GetItems(id)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, items)
}

func (h *InventoryHandler) AddItems(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.AddInventoryItemsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.service.AddItems(id, input.AssetIDs); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "itens adicionados"})
}

func (h *InventoryHandler) RemoveItem(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	assetID, err := uuid.Parse(c.Param("asset_id"))
	if err != nil {
		response.BadRequest(c, "asset_id inválido")
		return
	}
	if err := h.service.RemoveItem(id, assetID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "item removido"})
}

func (h *InventoryHandler) VerifyItem(c *gin.Context) {
	claims := middleware.GetClaims(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	var input domain.VerifyItemInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.service.VerifyItem(id, input, claims.UserID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "item verificado"})
}
