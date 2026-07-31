package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/gorilla/mux"
)

// GetIncidentPropagationHandler devuelve el mapa de propagación de un incidente y su blast radius (DoD T-014).
func GetIncidentPropagationHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		http.Error(w, `{"error":"incident ID is required"}`, http.StatusBadRequest)
		return
	}

	// Obtener incidente
	incident, err := repository.GetIncidentByID(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve incident"}`, http.StatusInternalServerError)
		return
	}
	if incident == nil {
		http.Error(w, `{"error":"incident not found"}`, http.StatusNotFound)
		return
	}

	// Obtener propagaciones
	propagations, err := repository.ListIncidentPropagations(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve propagation data"}`, http.StatusInternalServerError)
		return
	}

	// Obtener flujo paso a paso de la propagación (DoD T-015)
	propagationPaths, err := repository.ListIncidentPropagationPaths(r.Context(), id)
	if err != nil {
		propagationPaths = nil
	}

	// Calcular blast radius sobre la marcha
	blast := calculateBlastRadius(r.Context(), incident, propagations)

	// Construir respuesta
	response := map[string]interface{}{
		"incident_id":        id,
		"origin":             incident.DeviceID,
		"propagations":       propagations,
		"propagation_paths":  propagationPaths,
		"blast_radius":       blast,
	}

	json.NewEncoder(w).Encode(response)
}

// calculateBlastRadius computa el impacto cuantificado de un incidente.
func calculateBlastRadius(ctx context.Context, incident *models.Incident, propagations []*models.IncidentPropagation) *models.BlastRadius {
	if incident == nil {
		return nil
	}

	// Dispositivos afectados
	affectedDevices := map[string]bool{incident.DeviceID: true}
	for _, p := range propagations {
		affectedDevices[p.FromDeviceID] = true
		affectedDevices[p.ToDeviceID] = true
	}

	// Contenedores afectados desde eventos del incidente
	affectedContainers := 0
	for _, ev := range incident.Events {
		if ev.ContainerID != "" {
			affectedContainers++
		}
	}

	// Totales del clúster
	allDevices, _ := repository.ListDevices(ctx)
	totalContainers := 0
	for _, d := range allDevices {
		totalContainers += d.TotalContainers
	}

	// Profundidad máxima
	maxDepth := 0
	depthMap := make(map[string]int)
	depthMap[incident.DeviceID] = 0
	for _, p := range propagations {
		fromDepth := depthMap[p.FromDeviceID]
		if fromDepth+1 > depthMap[p.ToDeviceID] {
			depthMap[p.ToDeviceID] = fromDepth + 1
			if fromDepth+1 > maxDepth {
				maxDepth = fromDepth + 1
			}
		}
	}

	return &models.BlastRadius{
		IncidentID:          incident.ID,
		AffectedDevices:     len(affectedDevices),
		AffectedContainers:  affectedContainers,
		TotalDevices:        len(allDevices),
		TotalContainers:     totalContainers,
		PropagationDepth:    maxDepth,
		MaxPropagationDepth: maxDepth,
	}
}
