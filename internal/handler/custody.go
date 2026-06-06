package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CustodyHandler struct {
	service domain.CustodyService
}

func NewCustodyHandler(service domain.CustodyService) *CustodyHandler {
	return &CustodyHandler{service: service}
}

func (h *CustodyHandler) List(c *gin.Context) {
	page, limit := response.PaginationParams(c, 20)

	var userID, assetID *uuid.UUID
	if s := c.Query("user_id"); s != "" {
		if id, err := uuid.Parse(s); err == nil {
			userID = &id
		}
	}
	if s := c.Query("asset_id"); s != "" {
		if id, err := uuid.Parse(s); err == nil {
			assetID = &id
		}
	}

	custodies, total, err := h.service.List(page, limit, userID, assetID)
	if err != nil {
		response.InternalError(c, err)
		return
	}

	response.Paginated(c, custodies, response.BuildMeta(page, limit, total))
}

func (h *CustodyHandler) GetActiveCustody(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "asset_id inválido")
		return
	}

	custody, err := h.service.GetActiveCustody(assetID)
	if err != nil {
		response.NotFound(c, "nenhuma custódia ativa")
		return
	}

	response.OK(c, custody)
}

func (h *CustodyHandler) Assign(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var input domain.AssignCustodyInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	custody, err := h.service.Assign(input, claims.UserID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Created(c, custody)
}

func (h *CustodyHandler) Release(c *gin.Context) {
	claims := middleware.GetClaims(c)
	assetID, err := uuid.Parse(c.Param("asset_id"))
	if err != nil {
		response.BadRequest(c, "asset_id inválido")
		return
	}

	var req domain.ReleaseCustodyInput
	_ = c.ShouldBindJSON(&req)

	if err := h.service.Release(assetID, req.Notes, claims.UserID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, gin.H{"message": "custódia encerrada com sucesso"})
}

func (h *CustodyHandler) UserCarga(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "user_id inválido")
		return
	}

	custodies, err := h.service.GetUserCarga(userID)
	if err != nil {
		response.InternalError(c, err)
		return
	}

	response.OK(c, custodies)
}
