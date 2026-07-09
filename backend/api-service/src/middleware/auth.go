package middleware

import (
	"net/http"
	"strings"

	"github.com/go/orchestrack/backend/api-service/src/handlers"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware valida el token JWT en las peticiones protegidas.
func AuthMiddleware(s ports.Server) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenString := strings.TrimSpace(r.Header.Get("Authorization"))
			if tokenString == "" {
				tokenString = strings.TrimSpace(r.URL.Query().Get("token"))
			}
			if tokenString == "" {
				http.Error(w, "missing authorization header", http.StatusUnauthorized)
				return
			}

			token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(t *jwt.Token) (interface{}, error) {
				return []byte(s.Config().JWTSecret), nil
			})
			if err != nil || !token.Valid {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(*jwt.RegisteredClaims)
			if !ok || claims.Subject == "" {
				http.Error(w, "invalid token claims", http.StatusUnauthorized)
				return
			}

			ctx := handlers.WithUserID(r.Context(), claims.Subject)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
