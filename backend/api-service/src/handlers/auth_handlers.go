package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/segmentio/ksuid"
	"golang.org/x/crypto/bcrypt"
)

type contextKey string

const userIDKey contextKey = "userID"

const (
	hashCost     = 10
	tokenExpiry  = 7 * 24 * time.Hour
)

// AuthRequest representa el body de login/signup.
type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// SignUpResponse devuelve los datos del usuario creado.
type SignUpResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

// LoginResponse devuelve el token JWT.
type LoginResponse struct {
	Token string `json:"token"`
}

// MeResponse devuelve la información del usuario autenticado.
type MeResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func writeAuthError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func parseAuthRequest(r *http.Request) (*AuthRequest, error) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	return &req, nil
}

func validateAuthRequest(req *AuthRequest) error {
	if req.Email == "" || req.Password == "" {
		return errors.New("email and password are required")
	}
	if len(req.Password) < 6 {
		return errors.New("password must be at least 6 characters")
	}
	return nil
}

func generateToken(userID string, secret string) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   userID,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(tokenExpiry)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// SignUpHandler registra un nuevo usuario.
func SignUpHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		req, err := parseAuthRequest(r)
		if err != nil {
			writeAuthError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateAuthRequest(req); err != nil {
			writeAuthError(w, http.StatusBadRequest, err.Error())
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), hashCost)
		if err != nil {
			writeAuthError(w, http.StatusInternalServerError, "failed to hash password")
			return
		}

		id, err := ksuid.NewRandom()
		if err != nil {
			writeAuthError(w, http.StatusInternalServerError, "failed to generate user id")
			return
		}

		user := &models.User{
			ID:       id.String(),
			Email:    req.Email,
			Password: string(hashedPassword),
		}

		if err := repository.InsertUser(r.Context(), user); err != nil {
			if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
				writeAuthError(w, http.StatusConflict, "email already registered")
				return
			}
			writeAuthError(w, http.StatusInternalServerError, "failed to create user")
			return
		}

		writeJSON(w, http.StatusCreated, SignUpResponse{ID: user.ID, Email: user.Email})
	}
}

// LoginHandler autentica un usuario y devuelve un JWT.
func LoginHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		req, err := parseAuthRequest(r)
		if err != nil {
			writeAuthError(w, http.StatusBadRequest, err.Error())
			return
		}

		user, err := repository.GetUserByEmail(r.Context(), req.Email)
		if err != nil {
			writeAuthError(w, http.StatusInternalServerError, "failed to fetch user")
			return
		}
		if user == nil {
			writeAuthError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			writeAuthError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}

		tokenString, err := generateToken(user.ID, s.Config().JWTSecret)
		if err != nil {
			writeAuthError(w, http.StatusInternalServerError, "failed to generate token")
			return
		}

		writeJSON(w, http.StatusOK, LoginResponse{Token: tokenString})
	}
}

// MeHandler devuelve la información del usuario autenticado.
func MeHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := UserIDFromContext(r.Context())
		if !ok || userID == "" {
			writeAuthError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		user, err := repository.GetUserById(r.Context(), userID)
		if err != nil {
			writeAuthError(w, http.StatusInternalServerError, "failed to fetch user")
			return
		}
		if user == nil {
			writeAuthError(w, http.StatusUnauthorized, "user not found")
			return
		}

		writeJSON(w, http.StatusOK, MeResponse{ID: user.ID, Email: user.Email})
	}
}

// WithUserID agrega el userID al contexto.
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// UserIDFromContext extrae el userID del contexto.
func UserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(userIDKey).(string)
	return userID, ok
}
