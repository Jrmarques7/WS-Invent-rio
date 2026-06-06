package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	service domain.AuthService
}

func NewAuthHandler(s domain.AuthService) *AuthHandler {
	return &AuthHandler{service: s}
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type refreshRequest struct {
	Refresh string `json:"refresh" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	pair, user, err := h.service.Login(req.Email, req.Password)
	if err != nil {
		response.Unauthorized(c)
		return
	}

	response.OK(c, gin.H{
		"access":  pair.Access,
		"refresh": pair.Refresh,
		"user":    user,
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	pair, err := h.service.RefreshToken(req.Refresh)
	if err != nil {
		response.Unauthorized(c)
		return
	}

	response.OK(c, pair)
}
