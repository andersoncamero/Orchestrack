package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/repository"
)

// GetMultiHostTopologyHandler devuelve el mapa de relaciones entre todos los servidores conectados (DoD T-015).
func GetMultiHostTopologyHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	deps, err := repository.ListServerDependencies(r.Context())
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve topology"}`, http.StatusInternalServerError)
		return
	}
	if deps == nil {
		deps = make([]*models.ServerDependency, 0)
	}

	// Obtener todos los dispositivos para enriquecer la respuesta
	devices, _ := repository.ListDevices(r.Context())
	deviceMap := make(map[string]string)
	for _, d := range devices {
		deviceMap[d.ServiceID] = d.Hostname
	}

	type enrichedDep struct {
		SourceDeviceID string `json:"source_device_id"`
		SourceHostname string `json:"source_hostname"`
		TargetDeviceID string `json:"target_device_id"`
		TargetHostname string `json:"target_hostname"`
		DependencyType string `json:"dependency_type"`
	}

	result := make([]enrichedDep, 0, len(deps))
	for _, d := range deps {
		result = append(result, enrichedDep{
			SourceDeviceID: d.SourceDeviceID,
			SourceHostname: deviceMap[d.SourceDeviceID],
			TargetDeviceID: d.TargetDeviceID,
			TargetHostname: deviceMap[d.TargetDeviceID],
			DependencyType: d.DependencyType,
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"topology": result,
		"nodes":    len(devices),
		"edges":    len(result),
	})
}
