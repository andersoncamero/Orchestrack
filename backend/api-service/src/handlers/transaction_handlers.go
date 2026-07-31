package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/gorilla/mux"
)

// GetIncidentTransactionsHandler devuelve el análisis de transacciones afectadas por un incidente (DoD T-018).
func GetIncidentTransactionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		http.Error(w, `{"error":"incident ID is required"}`, http.StatusBadRequest)
		return
	}

	// Verificar que el incidente existe
	incident, err := repository.GetIncidentByID(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve incident"}`, http.StatusInternalServerError)
		return
	}
	if incident == nil {
		http.Error(w, `{"error":"incident not found"}`, http.StatusNotFound)
		return
	}

	// Obtener transacciones afectadas
	transactions, err := repository.ListAffectedTransactions(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve affected transactions"}`, http.StatusInternalServerError)
		return
	}
	if transactions == nil {
		transactions = make([]*models.AffectedTransaction, 0)
	}

	// Agrupar por categoría
	categoryCounts, err := repository.CountAffectedTransactionsByCategory(r.Context(), id)
	if err != nil {
		categoryCounts = make(map[string]int64)
	}

	// Construir grupos con etiquetas legibles
	categoryLabels := map[string]string{
		"api_backend":         "API Backend",
		"containers":            "Containers",
		"package_management":  "Package Management",
		"connectivity":          "Connectivity",
		"database":              "Database",
	}

	type categoryGroup struct {
		Category        string   `json:"category"`
		Label           string   `json:"label"`
		FailedCount     int64    `json:"failed_count"`
		TransactionTypes []string `json:"transaction_types"`
	}

	groups := make(map[string]*categoryGroup)
	for _, tx := range transactions {
		g, ok := groups[tx.ServiceCategory]
		if !ok {
			g = &categoryGroup{
				Category:         tx.ServiceCategory,
				Label:            categoryLabels[tx.ServiceCategory],
				TransactionTypes: []string{},
			}
			groups[tx.ServiceCategory] = g
		}
		// Deduplicar tipos de transacción
		found := false
		for _, t := range g.TransactionTypes {
			if t == tx.TransactionType {
				found = true
				break
			}
		}
		if !found {
			g.TransactionTypes = append(g.TransactionTypes, tx.TransactionType)
		}
	}

	groupList := make([]categoryGroup, 0, len(groups))
	for cat, g := range groups {
		g.FailedCount = categoryCounts[cat]
		groupList = append(groupList, *g)
	}

	// Totales
	var totalFailed int64
	for _, v := range categoryCounts {
		totalFailed += v
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"incident_id":       id,
		"total_failed":      totalFailed,
		"affected_devices":  len(incident.Events),
		"categories":        groupList,
		"transactions":      transactions,
	})
}

// GetIncidentServerTransactionsHandler devuelve el histórico de transacciones afectadas por servidor e incidente (DoD T-019).
func GetIncidentServerTransactionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		http.Error(w, `{"error":"incident ID is required"}`, http.StatusBadRequest)
		return
	}

	// Verificar que el incidente existe
	incident, err := repository.GetIncidentByID(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve incident"}`, http.StatusInternalServerError)
		return
	}
	if incident == nil {
		http.Error(w, `{"error":"incident not found"}`, http.StatusNotFound)
		return
	}

	// Obtener impactos de transacciones de servidor
	impacts, err := repository.ListIncidentTransactionImpacts(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error":"failed to retrieve server transaction impacts"}`, http.StatusInternalServerError)
		return
	}
	if impacts == nil {
		impacts = make([]*models.IncidentTransactionImpact, 0)
	}

	// Enriquecer con datos de ServerTransaction
	type enrichedImpact struct {
		*models.IncidentTransactionImpact
		DeviceID    string `json:"device_id"`
		ServiceName string `json:"service_name"`
		Endpoint    string `json:"endpoint,omitempty"`
	}

	enriched := make([]enrichedImpact, 0, len(impacts))
	for _, iti := range impacts {
		stx, err := repository.GetServerTransactionByID(r.Context(), iti.ServerTransactionID)
		if err != nil || stx == nil {
			continue
		}
		enriched = append(enriched, enrichedImpact{
			IncidentTransactionImpact: iti,
			DeviceID:                  stx.DeviceID,
			ServiceName:               stx.ServiceName,
			Endpoint:                  stx.Endpoint,
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"incident_id":    id,
		"total_records":  len(enriched),
		"records":        enriched,
	})
}
