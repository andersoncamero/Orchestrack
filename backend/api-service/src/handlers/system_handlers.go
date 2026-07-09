package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go/orchestrack/backend/api-service/src/commander"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/proto/docker"
	"github.com/gorilla/mux"
)

// ListPackagesHandler lista los paquetes instalados en el host de una instancia.
func ListPackagesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		query := r.URL.Query().Get("q")
		upgradableOnly := r.URL.Query().Get("upgradable") == "true"

		resp, err := commander.ListPackages(r.Context(), identifier, hostnameRegistry(s), &docker.ListPackagesRequest{
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

// RefreshPackagesHandler refresca la lista de paquetes disponibles en el host.
func RefreshPackagesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]

		var body struct {
			DryRun bool `json:"dry_run"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)

		resp, err := commander.RefreshPackages(r.Context(), identifier, hostnameRegistry(s), &docker.RefreshPackagesRequest{
			DryRun: body.DryRun,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// UpgradePackagesHandler instala las actualizaciones disponibles en el host.
func UpgradePackagesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]

		var req docker.UpgradePackagesRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		resp, err := commander.UpgradePackages(r.Context(), identifier, hostnameRegistry(s), &req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// RemovePackagesHandler elimina paquetes del sistema de una instancia.
func RemovePackagesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]

		var req docker.RemovePackagesRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
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

		resp, err := commander.GetSystemInfo(r.Context(), identifier, hostnameRegistry(s), &docker.GetSystemInfoRequest{})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}
