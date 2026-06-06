package handler

import (
	"patrimonio/internal/domain"
	"patrimonio/pkg/response"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DepreciationHandler struct{ service domain.DepreciationService }

func NewDepreciationHandler(s domain.DepreciationService) *DepreciationHandler {
	return &DepreciationHandler{s}
}

func (h *DepreciationHandler) GetPeriod(c *gin.Context) {
	year, _ := strconv.Atoi(c.DefaultQuery("year", strconv.Itoa(time.Now().Year())))
	month, _ := strconv.Atoi(c.DefaultQuery("month", strconv.Itoa(int(time.Now().Month()))))

	records, err := h.service.GetByPeriod(year, month)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, records)
}

func (h *DepreciationHandler) Calculate(c *gin.Context) {
	year, _ := strconv.Atoi(c.DefaultQuery("year", strconv.Itoa(time.Now().Year())))
	month, _ := strconv.Atoi(c.DefaultQuery("month", strconv.Itoa(int(time.Now().Month()))))

	if err := h.service.CalculateMonthly(year, month); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "depreciação calculada com sucesso"})
}

func (h *DepreciationHandler) GetAssetHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "id inválido")
		return
	}
	records, err := h.service.GetAssetHistory(id)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, records)
}
