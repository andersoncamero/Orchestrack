package handlers

import (
	"net/http"
	"strconv"

	"github.com/go/orchestrack/backend/api-service/src/commander"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/proto/docker"
	"github.com/gorilla/mux"
)

// SearchProcessesHandler busca procesos en el host de una instancia por nombre o PID.
func SearchProcessesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		query := r.URL.Query().Get("q")

		searchByPID := false
		if raw := r.URL.Query().Get("search_by_pid"); raw == "true" {
			searchByPID = true
		}

		limit := int32(20)
		if raw := r.URL.Query().Get("limit"); raw != "" {
			if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 100 {
				limit = int32(parsed)
			}
		}

		resp, err := commander.SearchProcesses(r.Context(), identifier, hostnameRegistry(s), &docker.SearchProcessesRequest{
			Query:       query,
			SearchByPid: searchByPID,
			Limit:       limit,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}
