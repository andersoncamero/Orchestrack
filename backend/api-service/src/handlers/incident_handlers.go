package handlers

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/gorilla/mux"
)

// GetIncidentsHandler maneja la consulta del historial de incidentes (GET /api/v1/incidents).
func GetIncidentsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	deviceID := r.URL.Query().Get("device_id")
	status := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")

	limit := 50
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	incidents, err := repository.ListIncidents(r.Context(), deviceID, status, limit)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve incidents"}`, http.StatusInternalServerError)
		return
	}

	if incidents == nil {
		incidents = make([]*models.Incident, 0)
	}

	json.NewEncoder(w).Encode(incidents)
}

// GetIncidentByIDHandler maneja la obtención del detalle de un incidente (GET /api/v1/incidents/{id}).
func GetIncidentByIDHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		http.Error(w, `{"error":"incident ID is required"}`, http.StatusBadRequest)
		return
	}

	incident, err := repository.GetIncidentByID(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve incident"}`, http.StatusInternalServerError)
		return
	}

	if incident == nil {
		http.Error(w, `{"error":"incident not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(incident)
}

// GetIncidentTimelineHandler maneja la secuencia cronológica de eventos de un incidente (GET /api/v1/incidents/{id}/timeline).
func GetIncidentTimelineHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		http.Error(w, `{"error":"incident ID is required"}`, http.StatusBadRequest)
		return
	}

	events, err := repository.ListIncidentEvents(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve incident timeline"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"incident_id": id,
		"timeline":    events,
	})
}

// GetIncidentEvidenceHandler obtiene las evidencias forenses asociadas a un incidente (GET /api/v1/incidents/{id}/evidence).
func GetIncidentEvidenceHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		http.Error(w, `{"error":"incident ID is required"}`, http.StatusBadRequest)
		return
	}

	evidences, err := repository.GetIncidentEvidenceByIncidentID(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve incident evidence"}`, http.StatusInternalServerError)
		return
	}

	if evidences == nil {
		evidences = make([]*models.IncidentEvidence, 0)
	}

	json.NewEncoder(w).Encode(evidences)
}

// ExportIncidentEvidenceHandler genera y descarga un paquete forense ZIP con la evidencia (GET /api/v1/incidents/{id}/evidence/export).
func ExportIncidentEvidenceHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		http.Error(w, `{"error":"incident ID is required"}`, http.StatusBadRequest)
		return
	}

	incident, err := repository.GetIncidentByID(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve incident information"}`, http.StatusInternalServerError)
		return
	}
	if incident == nil {
		http.Error(w, `{"error":"incident not found"}`, http.StatusNotFound)
		return
	}

	evidences, err := repository.GetIncidentEvidenceByIncidentID(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve incident evidence"}`, http.StatusInternalServerError)
		return
	}

	// Establecer headers para la descarga de archivo ZIP
	filename := fmt.Sprintf("incident_evidence_%s.zip", id)
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	// Crear el escritor de ZIP directamente en la respuesta HTTP
	zipWriter := zip.NewWriter(w)
	defer zipWriter.Close()

	// 1. Agregar metadata del incidente al ZIP
	metaFile, err := zipWriter.Create("metadata.json")
	if err == nil {
		metaData := map[string]interface{}{
			"incident_id":        incident.ID,
			"title":              incident.Title,
			"device_id":          incident.DeviceID,
			"severity":           incident.Severity,
			"status":             incident.Status,
			"started_at":         incident.StartedAt,
			"evidence_retrieved": len(evidences),
			"exported_at":        time.Now(),
		}
		if bytes, err := json.MarshalIndent(metaData, "", "  "); err == nil {
			_, _ = metaFile.Write(bytes)
		}
	}

	// 2. Iterar sobre las evidencias y escribir cada una
	for idx, ev := range evidences {
		var bundle struct {
			ContainerLogs string      `json:"container_logs"`
			DockerLogs    string      `json:"docker_logs"`
			HostMetrics   interface{} `json:"host_metrics"`
		}

		if err := json.Unmarshal([]byte(ev.PayloadJSON), &bundle); err != nil {
			// Si no es un bundle estándar del agente, guardamos el JSON plano
			rawFile, err := zipWriter.Create(fmt.Sprintf("evidence_%d_raw.json", idx+1))
			if err == nil {
				_, _ = rawFile.Write([]byte(ev.PayloadJSON))
			}
			continue
		}

		prefix := fmt.Sprintf("evidence_%d", idx+1)

		// Logs de contenedor
		if bundle.ContainerLogs != "" {
			logFile, err := zipWriter.Create(fmt.Sprintf("%s_container_logs.txt", prefix))
			if err == nil {
				_, _ = logFile.Write([]byte(bundle.ContainerLogs))
			}
		}

		// Logs del daemon Docker
		if bundle.DockerLogs != "" {
			dockFile, err := zipWriter.Create(fmt.Sprintf("%s_docker_daemon_logs.txt", prefix))
			if err == nil {
				_, _ = dockFile.Write([]byte(bundle.DockerLogs))
			}
		}

		// Métricas del host
		if bundle.HostMetrics != nil {
			metricsFile, err := zipWriter.Create(fmt.Sprintf("%s_host_metrics_snapshot.json", prefix))
			if err == nil {
				if mBytes, err := json.MarshalIndent(bundle.HostMetrics, "", "  "); err == nil {
					_, _ = metricsFile.Write(mBytes)
				}
			}
		}
	}
}
