package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TransferRequestHandler struct {
	service domain.TransferRequestService
}

func NewTransferRequestHandler(service domain.TransferRequestService) *TransferRequestHandler {
	return &TransferRequestHandler{service: service}
}

func (h *TransferRequestHandler) List(c *gin.Context) {
	page, limit := response.PaginationParams(c, 20)
	status := domain.TransferRequestStatus(c.Query("status"))

	items, total, err := h.service.List(page, limit, status)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.Paginated(c, items, response.BuildMeta(page, limit, total))
}

func (h *TransferRequestHandler) Approve(c *gin.Context) {
	claims := middleware.GetClaims(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.ReviewTransferRequestInput
	_ = c.ShouldBindJSON(&input)
	item, err := h.service.Approve(id, claims.UserID, input.Notes)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, item)
}

func (h *TransferRequestHandler) Reject(c *gin.Context) {
	claims := middleware.GetClaims(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	var input domain.ReviewTransferRequestInput
	_ = c.ShouldBindJSON(&input)
	item, err := h.service.Reject(id, claims.UserID, input.Notes)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, item)
}
