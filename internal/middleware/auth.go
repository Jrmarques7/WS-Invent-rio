package middleware

import (
	"patrimonio/internal/domain"
	"patrimonio/pkg/jwt"
	"patrimonio/pkg/response"
	"strings"

	"github.com/gin-gonic/gin"
)

const userClaimsKey = "user_claims"

func Auth(jwtManager *jwt.Manager, userRepo domain.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims, err := jwtManager.Validate(tokenStr)
		if err != nil {
			response.Unauthorized(c)
			c.Abort()
			return
		}
		if claims.TokenType != "access" {
			response.Unauthorized(c)
			c.Abort()
			return
		}
		user, err := userRepo.FindByID(claims.UserID)
		if err != nil || !user.IsActive {
			response.Unauthorized(c)
			c.Abort()
			return
		}
		claims.Role = string(user.Role)
		claims.Email = user.Email

		c.Set(userClaimsKey, claims)
		c.Next()
	}
}

func GetClaims(c *gin.Context) *jwt.Claims {
	val, _ := c.Get(userClaimsKey)
	claims, _ := val.(*jwt.Claims)
	return claims
}
