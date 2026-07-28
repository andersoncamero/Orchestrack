package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go/orchestrack/backend/api-service/src/commander"
	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/go/orchestrack/backend/proto/system"
	"github.com/gorilla/mux"
)

// ListPackagesHandler lista los paquetes instalados en el host de una instancia.
func ListPackagesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		query := r.URL.Query().Get("q")

		upgradableOnly := false
		if raw := r.URL.Query().Get("upgradable_only"); raw == "true" {
			upgradableOnly = true
		}

		resp, err := commander.ListPackages(r.Context(), identifier, hostnameRegistry(s), &system.ListPackagesRequest{
			Query:          query,
			UpgradableOnly: upgradableOnly,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// RefreshPackagesHandler actualiza el índice de paquetes en la instancia.
func RefreshPackagesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]

		var req system.RefreshPackagesRequest
		if r.ContentLength > 0 {
			_ = json.NewDecoder(r.Body).Decode(&req)
		}

		resp, err := commander.RefreshPackages(r.Context(), identifier, hostnameRegistry(s), &req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// UpgradePackagesHandler instala actualizaciones en la instancia.
func UpgradePackagesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]

		var req system.UpgradePackagesRequest
		if r.ContentLength > 0 {
			_ = json.NewDecoder(r.Body).Decode(&req)
		}

		resp, err := commander.UpgradePackages(r.Context(), identifier, hostnameRegistry(s), &req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// RemovePackagesHandler desinstala paquetes de la instancia.
func RemovePackagesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]

		var req system.RemovePackagesRequest
		if r.ContentLength > 0 {
			_ = json.NewDecoder(r.Body).Decode(&req)
		}

		resp, err := commander.RemovePackages(r.Context(), identifier, hostnameRegistry(s), &req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// GetSystemInfoHandler devuelve información del sistema operativo del host.
func GetSystemInfoHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]

		resp, err := commander.GetSystemInfo(r.Context(), identifier, hostnameRegistry(s), &system.GetSystemInfoRequest{})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// GetDeviceNetworkMetricsHandler devuelve el historial de métricas de red y latencia RTT por servidor (DoD T-007.3).
func GetDeviceNetworkMetricsHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		deviceID := resolveIdentifier(identifier, hostnameRegistry(s))

		limit := 50
		if raw := r.URL.Query().Get("limit"); raw != "" {
			if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
				limit = parsed
			}
		}

		metricsList, err := repository.ListDeviceNetworkMetrics(r.Context(), deviceID, limit)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if metricsList == nil {
			metricsList = make([]*models.DeviceNetworkMetric, 0)
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"device_id": deviceID,
			"metrics":   metricsList,
			"total":     len(metricsList),
		})
	}
}
