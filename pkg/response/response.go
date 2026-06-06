package response

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Meta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, gin.H{"data": data})
}

func Paginated(c *gin.Context, data interface{}, meta Meta) {
	c.JSON(http.StatusOK, gin.H{"data": data, "meta": meta})
}

func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, gin.H{"data": data})
}

func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

func BadRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, gin.H{"error": message})
}

func Unauthorized(c *gin.Context) {
	c.JSON(http.StatusUnauthorized, gin.H{"error": "não autorizado"})
}

func Forbidden(c *gin.Context) {
	c.JSON(http.StatusForbidden, gin.H{"error": "acesso negado"})
}

func NotFound(c *gin.Context, message string) {
	c.JSON(http.StatusNotFound, gin.H{"error": message})
}

func Conflict(c *gin.Context, message string) {
	c.JSON(http.StatusConflict, gin.H{"error": message})
}

func InternalError(c *gin.Context, err error) {
	c.JSON(http.StatusInternalServerError, gin.H{"error": "erro interno do servidor"})
}

func PaginationParams(c *gin.Context, defaultLimit int) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", strconv.Itoa(defaultLimit)))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = defaultLimit
	}
	if limit > 1000 {
		limit = 1000
	}
	return page, limit
}

func BuildMeta(page, limit int, total int64) Meta {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}
	return Meta{Page: page, Limit: limit, Total: total, TotalPages: totalPages}
}
