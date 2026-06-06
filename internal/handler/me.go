package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MeHandler struct {
	custody     domain.CustodyService
	inventory   domain.InventoryService
	maintenance domain.MaintenanceService
	transfer    domain.TransferRequestService
	users       domain.UserService
}

func NewMeHandler(
	custody domain.CustodyService,
	inventory domain.InventoryService,
	maintenance domain.MaintenanceService,
	transfer domain.TransferRequestService,
	users domain.UserService,
) *MeHandler {
	return &MeHandler{custody: custody, inventory: inventory, maintenance: maintenance, transfer: transfer, users: users}
}

func (h *MeHandler) Custody(c *gin.Context) {
	claims := middleware.GetClaims(c)
	items, err := h.custody.GetUserCarga(claims.UserID)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, items)
}

func (h *MeHandler) Inventory(c *gin.Context) {
	claims := middleware.GetClaims(c)
	items, err := h.inventory.GetUserItems(claims.UserID)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, items)
}

func (h *MeHandler) VerifyInventory(c *gin.Context) {
	claims := middleware.GetClaims(c)
	inventoryID, err := uuid.Parse(c.Param("inventory_id"))
	if err != nil {
		response.BadRequest(c, "inventory_id inválido")
		return
	}

	var input domain.VerifyItemInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.inventory.VerifyOwnItem(inventoryID, input, claims.UserID); err != nil {
		response.Forbidden(c)
		return
	}
	response.OK(c, gin.H{"message": "feedback registrado"})
}

func (h *MeHandler) CreateMaintenance(c *gin.Context) {
	claims := middleware.GetClaims(c)
	assetID, err := uuid.Parse(c.Param("asset_id"))
	if err != nil {
		response.BadRequest(c, "asset_id inválido")
		return
	}

	var input domain.CreateMaintenanceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	input.AssetID = assetID

	record, err := h.maintenance.CreateOwn(input, claims.UserID)
	if err != nil {
		response.Forbidden(c)
		return
	}
	response.Created(c, record)
}

func (h *MeHandler) TransferTargets(c *gin.Context) {
	claims := middleware.GetClaims(c)
	users, _, err := h.users.List(1, 1000, "")
	if err != nil {
		response.InternalError(c, err)
		return
	}

	targets := make([]*domain.User, 0, len(users))
	for _, user := range users {
		if user.ID != claims.UserID && user.IsActive {
			targets = append(targets, user)
		}
	}
	response.OK(c, targets)
}

func (h *MeHandler) Transfers(c *gin.Context) {
	claims := middleware.GetClaims(c)
	items, total, err := h.transfer.ListMine(1, 1000, claims.UserID)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.Paginated(c, items, response.BuildMeta(1, 1000, total))
}

func (h *MeHandler) RequestTransfer(c *gin.Context) {
	claims := middleware.GetClaims(c)
	var input domain.CreateTransferRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	request, err := h.transfer.Request(input, claims.UserID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Created(c, request)
}

func (h *MeHandler) AcceptTransfer(c *gin.Context) {
	claims := middleware.GetClaims(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	var input domain.RecipientTransferRequestInput
	_ = c.ShouldBindJSON(&input)
	request, err := h.transfer.Accept(id, claims.UserID, input.Notes)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, request)
}

func (h *MeHandler) DeclineTransfer(c *gin.Context) {
	claims := middleware.GetClaims(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	var input domain.RecipientTransferRequestInput
	_ = c.ShouldBindJSON(&input)
	request, err := h.transfer.Decline(id, claims.UserID, input.Notes)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, request)
}
