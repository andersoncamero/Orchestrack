package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/gorilla/mux"
)

// GenerateTokenResponse contiene el token de registro autogenerado.
type GenerateTokenResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

// RegisterDeviceRequest representa la carga de datos del agente al registrarse.
type RegisterDeviceRequest struct {
	Token     string `json:"token"`
	ServiceID string `json:"service_id"`
	Hostname  string `json:"hostname"`
}

// GenerateTokenHandler crea un nuevo token de activación de un solo uso con vigencia de 24 horas.
func GenerateTokenHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenStr, err := generateSecureToken()
		if err != nil {
			s.Logger().Error("failed to generate secure token", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to generate registration token")
			return
		}

		expiresAt := time.Now().Add(24 * time.Hour)
		regToken := &models.RegistrationToken{
			Token:     tokenStr,
			Used:      false,
			ExpiresAt: expiresAt,
		}

		if err := repository.CreateRegistrationToken(r.Context(), regToken); err != nil {
			s.Logger().Error("failed to persist registration token", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to save registration token")
			return
		}

		writeJSON(w, http.StatusCreated, GenerateTokenResponse{
			Token:     regToken.Token,
			ExpiresAt: regToken.ExpiresAt,
		})
	}
}

// RegisterDeviceHandler procesa el registro inicial del dispositivo por parte del agente usando el token.
func RegisterDeviceHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req RegisterDeviceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if req.Token == "" || req.ServiceID == "" || req.Hostname == "" {
			writeError(w, http.StatusBadRequest, "token, service_id, and hostname are required")
			return
		}

		// Validar token de registro en la base de datos
		tokenModel, err := repository.GetRegistrationToken(r.Context(), req.Token)
		if err != nil {
			s.Logger().Error("failed to fetch registration token", "token", req.Token, "error", err)
			writeError(w, http.StatusInternalServerError, "error validating token")
			return
		}

		if tokenModel == nil || tokenModel.Used || time.Now().After(tokenModel.ExpiresAt) {
			writeError(w, http.StatusUnauthorized, "invalid, expired, or already used registration token")
			return
		}

		// Marcar token como utilizado
		tokenModel.Used = true
		if err := repository.UpdateRegistrationToken(r.Context(), tokenModel); err != nil {
			s.Logger().Error("failed to mark registration token as used", "token", req.Token, "error", err)
			writeError(w, http.StatusInternalServerError, "error processing registration token")
			return
		}

		// Crear o actualizar dispositivo con estatus "pending"
		device := &models.Device{
			ServiceID: req.ServiceID,
			Hostname:  req.Hostname,
			Status:    "pending",
		}

		if err := repository.SaveDevice(r.Context(), device); err != nil {
			s.Logger().Error("failed to register device in database", "service_id", req.ServiceID, "error", err)
			writeError(w, http.StatusInternalServerError, "failed to register device")
			return
		}

		// Registrar evento de registro inicial pendiente
		event := &models.Event{
			DeviceID:  req.ServiceID,
			Type:      "device.registered_pending",
			Payload:   `{"status": "pending"}`,
			Timestamp: time.Now(),
		}
		if err := repository.InsertEvent(r.Context(), event); err != nil {
			s.Logger().Warn("failed to insert registration event", "service_id", req.ServiceID, "error", err)
		}

		// Notificar al Dashboard que hay un nuevo dispositivo pendiente
		if s.Hub() != nil {
			s.Hub().Broadcast("dashboard", map[string]interface{}{
				"type": "device.registered_pending",
				"payload": map[string]interface{}{
					"service_id": req.ServiceID,
					"hostname":   req.Hostname,
					"status":     "pending",
					"timestamp":  time.Now().Unix(),
				},
			})
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"message":    "device successfully registered as pending approval",
			"service_id": req.ServiceID,
			"status":     "pending",
		})
	}
}

// ApproveDeviceHandler aprueba el dispositivo para que empiece a reportar datos de producción.
func ApproveDeviceHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		serviceID := vars["identifier"]

		if serviceID == "" {
			writeError(w, http.StatusBadRequest, "device identifier is required")
			return
		}

		device, err := repository.GetDeviceByServiceID(r.Context(), serviceID)
		if err != nil {
			s.Logger().Error("failed to query device for approval", "service_id", serviceID, "error", err)
			writeError(w, http.StatusInternalServerError, "error fetching device")
			return
		}

		if device == nil {
			writeError(w, http.StatusNotFound, "device not found")
			return
		}

		if device.Status == "active" {
			writeJSON(w, http.StatusOK, map[string]string{"message": "device is already active"})
			return
		}

		device.Status = "active"
		if err := repository.SaveDevice(r.Context(), device); err != nil {
			s.Logger().Error("failed to activate device in database", "service_id", serviceID, "error", err)
			writeError(w, http.StatusInternalServerError, "failed to approve device")
			return
		}

		// Registrar evento de aprobación
		event := &models.Event{
			DeviceID:  serviceID,
			Type:      "device.approved",
			Payload:   `{"status": "active"}`,
			Timestamp: time.Now(),
		}
		if err := repository.InsertEvent(r.Context(), event); err != nil {
			s.Logger().Warn("failed to insert approval event", "service_id", serviceID, "error", err)
		}

		// Notificar al Dashboard que el dispositivo ya está activo
		if s.Hub() != nil {
			s.Hub().Broadcast("dashboard", map[string]interface{}{
				"type": "device.approved",
				"payload": map[string]interface{}{
					"service_id": serviceID,
					"hostname":   device.Hostname,
					"status":     "active",
					"timestamp":  time.Now().Unix(),
				},
			})
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"message":    "device approved and activated successfully",
			"service_id": serviceID,
			"status":     "active",
		})
	}
}

// generateSecureToken genera una cadena segura aleatoria codificada en hexágonal con prefijo reg_tok_.
func generateSecureToken() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "reg_tok_" + hex.EncodeToString(bytes), nil
}

// GetDeviceStatusHandler devuelve el estado actual del dispositivo (endpoint público para el agente).
// El agente lo consulta periódicamente para saber cuándo fue aprobado.
func GetDeviceStatusHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		serviceID := vars["identifier"]

		if serviceID == "" {
			writeError(w, http.StatusBadRequest, "device identifier is required")
			return
		}

		device, err := repository.GetDeviceByServiceID(r.Context(), serviceID)
		if err != nil {
			s.Logger().Error("failed to query device status", "service_id", serviceID, "error", err)
			writeError(w, http.StatusInternalServerError, "error fetching device status")
			return
		}

		if device == nil {
			writeError(w, http.StatusNotFound, "device not found")
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"service_id": device.ServiceID,
			"status":     device.Status,
		})
	}
}
