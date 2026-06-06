package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MovementHandler struct {
	service domain.MovementService
}

func NewMovementHandler(service domain.MovementService) *MovementHandler {
	return &MovementHandler{service: service}
}

func (h *MovementHandler) List(c *gin.Context) {
	page, limit := response.PaginationParams(c, 20)

	var assetID *uuid.UUID
	if s := c.Query("asset_id"); s != "" {
		if id, err := uuid.Parse(s); err == nil {
			assetID = &id
		}
	}

	movements, total, err := h.service.List(page, limit, assetID)
	if err != nil {
		response.InternalError(c, err)
		return
	}

	response.Paginated(c, movements, response.BuildMeta(page, limit, total))
}

func (h *MovementHandler) AssetHistory(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "asset_id inválido")
		return
	}

	history, err := h.service.GetAssetHistory(assetID)
	if err != nil {
		response.InternalError(c, err)
		return
	}

	response.OK(c, history)
}

func (h *MovementHandler) Register(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var input domain.RegisterMovementInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	movement, err := h.service.Register(input, claims.UserID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Created(c, movement)
}
