package handlers

import (
	"net/http"
	"strconv"

	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/gorilla/mux"
)

// ListContainerEventsHandler devuelve el historial persistido de eventos de un contenedor
// con paginación mediante los query params limit y offset.
func ListContainerEventsHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		identifier := vars["identifier"]
		containerID := vars["id"]
		if identifier == "" || containerID == "" {
			writeError(w, http.StatusBadRequest, "missing device identifier or container id")
			return
		}

		serviceID := resolveIdentifier(identifier, hostnameRegistry(s))

		limit := 50
		if l := r.URL.Query().Get("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 500 {
				limit = parsed
			}
		}

		offset := 0
		if o := r.URL.Query().Get("offset"); o != "" {
			if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
				offset = parsed
			}
		}

		events, err := repository.ListContainerEventsByContainer(r.Context(), serviceID, containerID, limit, offset)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to retrieve container events")
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"limit":  limit,
			"offset": offset,
			"events": events,
		})
	}
}
