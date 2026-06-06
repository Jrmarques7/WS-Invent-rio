package middleware

import (
	"patrimonio/internal/domain"
	"patrimonio/pkg/response"

	"github.com/gin-gonic/gin"
)

func RequireRole(roles ...domain.UserRole) gin.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[string(r)] = true
	}

	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil || !allowed[claims.Role] {
			response.Forbidden(c)
			c.Abort()
			return
		}
		c.Next()
	}
}
