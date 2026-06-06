package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/internal/middleware"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserHandler struct {
	service domain.UserService
}

func NewUserHandler(service domain.UserService) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) List(c *gin.Context) {
	page, limit := response.PaginationParams(c, 20)
	search := c.Query("search")

	users, total, err := h.service.List(page, limit, search)
	if err != nil {
		response.InternalError(c, err)
		return
	}

	response.Paginated(c, users, response.BuildMeta(page, limit, total))
}

func (h *UserHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	user, err := h.service.GetByID(id)
	if err != nil {
		response.NotFound(c, "usuário não encontrado")
		return
	}

	response.OK(c, user)
}

func (h *UserHandler) Me(c *gin.Context) {
	claims := middleware.GetClaims(c)
	user, err := h.service.GetByID(claims.UserID)
	if err != nil {
		response.NotFound(c, "usuário não encontrado")
		return
	}
	response.OK(c, user)
}

func (h *UserHandler) Create(c *gin.Context) {
	var input domain.CreateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user, err := h.service.Create(input)
	if err != nil {
		response.Conflict(c, err.Error())
		return
	}

	response.Created(c, user)
}

func (h *UserHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}

	var input domain.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user, err := h.service.Update(id, input)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.OK(c, user)
}

func (h *UserHandler) Delete(c *gin.Context) {
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

func (h *UserHandler) ChangePassword(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var req struct {
		Current string `json:"current" binding:"required"`
		New     string `json:"new" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.service.ChangePassword(claims.UserID, req.Current, req.New); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, gin.H{"message": "senha alterada com sucesso"})
}
