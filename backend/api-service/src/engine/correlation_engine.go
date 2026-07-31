package engine

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/go/orchestrack/backend/api-service/src/websocket"
)

// IncidentCorrelationEngine es el motor central de correlación de eventos y detección de causa raíz (T-010).
type IncidentCorrelationEngine struct {
	mu            sync.RWMutex
	recentEvents  map[string][]recentEventRecord // key: deviceID
	windowSeconds float64
	hub           *websocket.Hub
}

type recentEventRecord struct {
	EventID       string
	EventType     string
	ContainerID   string
	ContainerName string
	Timestamp     time.Time
}

var (
	engineInstance *IncidentCorrelationEngine
	once           sync.Once
)

// GetCorrelationEngine obtiene la instancia única (Singleton) del motor de correlación.
func GetCorrelationEngine() *IncidentCorrelationEngine {
	once.Do(func() {
		engineInstance = &IncidentCorrelationEngine{
			recentEvents:  make(map[string][]recentEventRecord),
			windowSeconds: 60.0, // Ventana temporal de 60 segundos
		}
	})
	return engineInstance
}

// SetHub establece el Hub de WebSockets para las notificaciones en tiempo real (T-012).
func (e *IncidentCorrelationEngine) SetHub(hub *websocket.Hub) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.hub = hub
}

// ProcessHostAlert evalúa alertas del host (latencia, memoria, disco) para correlación y causa raíz.
func (e *IncidentCorrelationEngine) ProcessHostAlert(ctx context.Context, deviceID, alertType, title, alertID string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	openInc, err := repository.GetOpenIncidentByDevice(ctx, deviceID)
	if err != nil {
		return err
	}

	now := time.Now()

	// Si ya existe un incidente abierto, anexar esta alerta si es parte del flujo
	if openInc != nil {
		seqOrder := len(openInc.Events) + 1
		incEv := &models.IncidentEvent{
			IncidentID:    openInc.ID,
			EventID:       alertID,
			EventType:     alertType,
			SequenceOrder: seqOrder,
			CreatedAt:     now,
		}
		_ = repository.InsertIncidentEvent(ctx, incEv)
		return nil
	}

	// Crear nuevo incidente con la alerta del host como causa raíz inicial
	newInc := &models.Incident{
		Title:            fmt.Sprintf("Incidente de Infraestructura: %s", title),
		DeviceID:         deviceID,
		RootCauseEventID: alertID,
		RootCauseType:    alertType,
		Status:           "open",
		Severity:         "critical",
		StartedAt:        now,
	}

	if err := repository.InsertIncident(ctx, newInc); err != nil {
		return fmt.Errorf("failed to create incident: %w", err)
	}

	rootEv := &models.IncidentEvent{
		IncidentID:    newInc.ID,
		EventID:       alertID,
		EventType:     alertType,
		SequenceOrder: 1,
		CreatedAt:     now,
	}
	_ = repository.InsertIncidentEvent(ctx, rootEv)
	newInc.Events = append(newInc.Events, *rootEv)

	// Registrar paso inicial de propagación (DoD T-015)
	e.recordIncidentOriginPath(ctx, newInc)

	// Emitir evento incident.created vía WebSocket (T-012)
	e.broadcastIncidentEvent("incident.created", newInc)

	// Analizar propagación en cascada (DoD T-014)
	go e.AnalyzePropagation(ctx, newInc)

	// Analizar transacciones afectadas (DoD T-018)
	go e.AnalyzeAffectedTransactions(ctx, newInc)

	return nil
}

// ProcessContainerEvent correlaciona fallas de contenedores (die, oom, kill) con alertas previas o crea nuevos incidentes.
func (e *IncidentCorrelationEngine) ProcessContainerEvent(ctx context.Context, deviceID string, event *models.ContainerEvent) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Filtrar solo eventos críticos de contenedor
	isCritical := event.EventType == "oom" || event.EventType == "die" || event.EventType == "kill" || event.ExitCode != 0
	if !isCritical {
		return nil
	}

	now := time.Now()
	eventIDStr := fmt.Sprintf("%d", event.ID)
	openInc, err := repository.GetOpenIncidentByDevice(ctx, deviceID)
	if err != nil {
		return err
	}

	// Si ya existe un incidente abierto en la misma ventana, anexar este fallo de contenedor
	if openInc != nil {
		seqOrder := len(openInc.Events) + 1
		incEv := &models.IncidentEvent{
			IncidentID:    openInc.ID,
			EventID:       eventIDStr,
			EventType:     event.EventType,
			ContainerID:   event.ContainerID,
			ContainerName: event.ContainerName,
			SequenceOrder: seqOrder,
			CreatedAt:     now,
		}
		_ = repository.InsertIncidentEvent(ctx, incEv)

		// Re-emitir actualización
		openInc.Events = append(openInc.Events, *incEv)
		e.broadcastIncidentEvent("incident.updated", openInc)
		return nil
	}

	// Si no hay incidente previo, evaluar reglas de precedencia para determinar causa raíz (DoD T-010)
	windowStart := now.Add(-time.Duration(e.windowSeconds) * time.Second)
	rootCauseAlert := e.findRootCauseAlert(ctx, deviceID, event, windowStart)

	var newInc *models.Incident
	if rootCauseAlert != nil {
		// La alerta de host es la causa raíz; el contenedor es efecto secundario
		alertIDStr := fmt.Sprintf("%d", rootCauseAlert.ID)
		newInc = &models.Incident{
			Title:            fmt.Sprintf("Incidente de Infraestructura: %s", rootCauseAlert.Message),
			DeviceID:         deviceID,
			RootCauseEventID: alertIDStr,
			RootCauseType:    rootCauseAlert.Type,
			Status:           "open",
			Severity:         "critical",
			StartedAt:        rootCauseAlert.CreatedAt,
		}
		if err := repository.InsertIncident(ctx, newInc); err != nil {
			return fmt.Errorf("failed to insert host-root incident: %w", err)
		}
		// Evento raíz (alerta de host)
		rootEv := &models.IncidentEvent{
			IncidentID:    newInc.ID,
			EventID:       alertIDStr,
			EventType:     rootCauseAlert.Type,
			SequenceOrder: 1,
			CreatedAt:     rootCauseAlert.CreatedAt,
		}
		_ = repository.InsertIncidentEvent(ctx, rootEv)
		newInc.Events = append(newInc.Events, *rootEv)
		// Evento derivado (contenedor)
		derivedEv := &models.IncidentEvent{
			IncidentID:    newInc.ID,
			EventID:       eventIDStr,
			EventType:     event.EventType,
			ContainerID:   event.ContainerID,
			ContainerName: event.ContainerName,
			SequenceOrder: 2,
			CreatedAt:     now,
		}
		_ = repository.InsertIncidentEvent(ctx, derivedEv)
		newInc.Events = append(newInc.Events, *derivedEv)
	} else {
		// No se encontró alerta causal previa: el contenedor es la causa raíz
		rootCauseType := event.EventType
		if event.EventType == "oom" {
			rootCauseType = "container_oom"
		} else if event.EventType == "die" {
			rootCauseType = "container_die"
		}

		newInc = &models.Incident{
			Title:            fmt.Sprintf("Fallo en contenedor %s (%s)", event.ContainerName, event.EventType),
			DeviceID:         deviceID,
			RootCauseEventID: eventIDStr,
			RootCauseType:    rootCauseType,
			Status:           "open",
			Severity:         "critical",
			StartedAt:        now,
		}

		if err := repository.InsertIncident(ctx, newInc); err != nil {
			return fmt.Errorf("failed to insert container incident: %w", err)
		}

		rootEv := &models.IncidentEvent{
			IncidentID:    newInc.ID,
			EventID:       eventIDStr,
			EventType:     event.EventType,
			ContainerID:   event.ContainerID,
			ContainerName: event.ContainerName,
			SequenceOrder: 1,
			CreatedAt:     now,
		}
		_ = repository.InsertIncidentEvent(ctx, rootEv)
		newInc.Events = append(newInc.Events, *rootEv)
	}

	// Registrar paso inicial de propagación (DoD T-015)
	e.recordIncidentOriginPath(ctx, newInc)

	// Emitir evento incident.created vía WebSocket (T-012)
	e.broadcastIncidentEvent("incident.created", newInc)

	// Analizar propagación en cascada (DoD T-014)
	go e.AnalyzePropagation(ctx, newInc)

	// Analizar transacciones afectadas (DoD T-018)
	go e.AnalyzeAffectedTransactions(ctx, newInc)

	return nil
}

// ProcessInstanceStatusChange gestiona la desconexión o reconexión global de un servidor.
func (e *IncidentCorrelationEngine) ProcessInstanceStatusChange(ctx context.Context, deviceID, status string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now()
	openInc, err := repository.GetOpenIncidentByDevice(ctx, deviceID)
	if err != nil {
		return err
	}

	if status == "offline" {
		if openInc == nil {
			newInc := &models.Incident{
				Title:            fmt.Sprintf("Desconexión de Servidor %s", deviceID),
				DeviceID:         deviceID,
				RootCauseEventID: fmt.Sprintf("offline-%s-%d", deviceID, now.Unix()),
				RootCauseType:    "instance_offline",
				Status:           "open",
				Severity:         "critical",
				StartedAt:        now,
			}
			if err := repository.InsertIncident(ctx, newInc); err == nil {
				rootEv := &models.IncidentEvent{
					IncidentID:    newInc.ID,
					EventID:       newInc.RootCauseEventID,
					EventType:     "instance_offline",
					SequenceOrder: 1,
					CreatedAt:     now,
				}
				_ = repository.InsertIncidentEvent(ctx, rootEv)
				newInc.Events = append(newInc.Events, *rootEv)

				// Registrar paso inicial de propagación (DoD T-015)
				e.recordIncidentOriginPath(ctx, newInc)

				e.broadcastIncidentEvent("incident.created", newInc)

				// Analizar propagación en cascada (DoD T-014)
				go e.AnalyzePropagation(ctx, newInc)
			}
		}
	} else if status == "online" {
		if openInc != nil {
			openInc.Status = "resolved"
			openInc.ResolvedAt = &now
			if err := repository.UpdateIncident(ctx, openInc); err == nil {
				e.broadcastIncidentEvent("incident.resolved", openInc)
			}
		}
	}

	return nil
}

// AnalyzePropagation detecta si un incidente recién creado se propagó desde otro servidor
// o hacia otros servidores dentro de una ventana temporal (DoD T-014).
func (e *IncidentCorrelationEngine) AnalyzePropagation(ctx context.Context, incident *models.Incident) {
	if incident == nil {
		return
	}

	// Ventana de propagación: 5 minutos antes del incidente actual
	windowStart := incident.StartedAt.Add(-5 * time.Minute)
	windowEnd := incident.StartedAt.Add(5 * time.Minute)

	// Buscar incidentes abiertos en otros dispositivos dentro de la ventana
	relatedTypes := e.relatedCauseTypes(incident.RootCauseType)
	recentIncidents, err := repository.ListRecentIncidentsByType(ctx, incident.DeviceID, relatedTypes, windowStart, 50)
	if err != nil || len(recentIncidents) == 0 {
		return
	}

	// Para cada incidente candidato, verificar si ocurrió antes (posible origen)
	for _, candidate := range recentIncidents {
		if candidate.StartedAt.After(windowEnd) {
			continue
		}

		// Determinar dirección: candidate -> incident (origen -> destino)
		fromDevice := candidate
		toDevice := incident

		// Obtener hostnames de los dispositivos
		fromDev, _ := repository.GetDeviceByServiceID(ctx, fromDevice.DeviceID)
		toDev, _ := repository.GetDeviceByServiceID(ctx, toDevice.DeviceID)
		fromHostname := fromDevice.DeviceID
		toHostname := toDevice.DeviceID
		if fromDev != nil {
			fromHostname = fromDev.Hostname
		}
		if toDev != nil {
			toHostname = toDev.Hostname
		}

		timeDelta := int(toDevice.StartedAt.Sub(fromDevice.StartedAt).Seconds())
		if timeDelta < 0 {
			timeDelta = -timeDelta
		}

		propagation := &models.IncidentPropagation{
			IncidentID:      toDevice.ID,
			FromDeviceID:    fromDevice.DeviceID,
			ToDeviceID:      toDevice.DeviceID,
			FromHostname:    fromHostname,
			ToHostname:      toHostname,
			PropagationType: "cascade",
			TimeDeltaSec:    timeDelta,
		}
		_ = repository.InsertIncidentPropagation(ctx, propagation)

		// Persistir dependencia multi-host entre servidores (DoD T-015)
		dep := &models.ServerDependency{
			SourceDeviceID: fromDevice.DeviceID,
			TargetDeviceID: toDevice.DeviceID,
			DependencyType: "cascade",
		}
		_ = repository.UpsertServerDependency(ctx, dep)

		// Registrar paso adicional de propagación en el incidente destino (DoD T-015)
		existingPaths, _ := repository.ListIncidentPropagationPaths(ctx, toDevice.ID)
		nextStep := len(existingPaths)
		path := &models.IncidentPropagationPath{
			IncidentID:       toDevice.ID,
			StepOrder:          nextStep,
			AffectedDeviceID:   fromDevice.DeviceID,
			AffectedContainerID: "",
		}
		_ = repository.InsertIncidentPropagationPath(ctx, path)
	}

	// Calcular y notificar blast radius
	blast := e.calculateBlastRadius(ctx, incident.ID)
	if blast != nil && e.hub != nil {
		wsMsg := map[string]interface{}{
			"type":         "incident.propagation",
			"incident_id":  incident.ID,
			"blast_radius": blast,
			"timestamp":    time.Now().Unix(),
		}
		e.hub.Broadcast("dashboard", wsMsg)
		e.hub.Broadcast(fmt.Sprintf("device:%s", incident.DeviceID), wsMsg)
	}

	// Emitir árbol de impacto multi-host en tiempo real (DoD T-016)
	e.broadcastMultiHostPropagation(ctx, incident)
}

// findRootCauseAlert busca alertas de host recientes que podrían haber desencadenado un fallo crítico de contenedor,
// aplicando reglas de precedencia (DoD T-010). Devuelve la alerta más antigua que encaje con el tipo de fallo.
func (e *IncidentCorrelationEngine) findRootCauseAlert(ctx context.Context, deviceID string, event *models.ContainerEvent, windowStart time.Time) *models.Alert {
	alertTypes := e.hostAlertPrecedence(event.EventType)
	if len(alertTypes) == 0 {
		return nil
	}

	alerts, err := repository.ListRecentAlertsByDevice(ctx, deviceID, alertTypes, windowStart, 10)
	if err != nil || len(alerts) == 0 {
		return nil
	}

	// Prioridad: la alerta más antigua dentro de la ventana se considera el detonador inicial.
	return alerts[0]
}

// hostAlertPrecedence define qué tipos de alertas de host buscar según el evento del contenedor.
func (e *IncidentCorrelationEngine) hostAlertPrecedence(containerEventType string) []string {
	switch containerEventType {
	case "oom":
		return []string{"host.memory.high", "host.cpu.high", "high_latency"}
	case "die":
		return []string{"host.cpu.high", "host.memory.high", "host.disk.high", "high_latency"}
	case "kill":
		return []string{"host.cpu.high", "host.memory.high", "high_latency"}
	default:
		return []string{"host.cpu.high", "host.memory.high", "host.disk.high", "high_latency"}
	}
}

// relatedCauseTypes devuelve tipos de causa raíz relacionados para detectar propagación.
func (e *IncidentCorrelationEngine) relatedCauseTypes(rootCauseType string) []string {
	switch rootCauseType {
	case "host.cpu.high", "host.memory.high", "host.disk.high":
		return []string{"host.cpu.high", "host.memory.high", "host.disk.high", "instance_offline"}
	case "container_die", "container_oom", "container_kill":
		return []string{"container_die", "container_oom", "container_kill", "host.memory.high"}
	case "instance_offline":
		return []string{"host.cpu.high", "host.memory.high", "host.disk.high", "instance_offline", "container_die", "container_oom"}
	default:
		return []string{rootCauseType}
	}
}

// calculateBlastRadius calcula el impacto cuantificado de un incidente (DoD T-014).
func (e *IncidentCorrelationEngine) calculateBlastRadius(ctx context.Context, incidentID string) *models.BlastRadius {
	// Obtener incidente con eventos
	incident, err := repository.GetIncidentByID(ctx, incidentID)
	if err != nil || incident == nil {
		return nil
	}

	// Obtener propagaciones relacionadas
	propagations, err := repository.ListIncidentPropagations(ctx, incidentID)
	if err != nil {
		propagations = nil
	}

	// Construir conjunto de dispositivos afectados
	affectedDevices := map[string]bool{incident.DeviceID: true}
	for _, p := range propagations {
		affectedDevices[p.FromDeviceID] = true
		affectedDevices[p.ToDeviceID] = true
	}

	// Contar contenedores afectados desde eventos del incidente
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

	// Profundidad de propagación (máximo de saltos únicos)
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
		IncidentID:          incidentID,
		AffectedDevices:     len(affectedDevices),
		AffectedContainers:  affectedContainers,
		TotalDevices:        len(allDevices),
		TotalContainers:     totalContainers,
		PropagationDepth:    maxDepth,
		MaxPropagationDepth: maxDepth,
	}
}

// broadcastMultiHostPropagation emite el árbol de impacto en tiempo real vía WebSocket (DoD T-016).
func (e *IncidentCorrelationEngine) broadcastMultiHostPropagation(ctx context.Context, incident *models.Incident) {
	if e.hub == nil || incident == nil {
		return
	}

	propagations, err := repository.ListIncidentPropagations(ctx, incident.ID)
	if err != nil {
		propagations = nil
	}

	// Construir lista de servidores afectados con hostnames
	type affectedNode struct {
		DeviceID   string `json:"device_id"`
		Hostname   string `json:"hostname"`
		Status     string `json:"status"`
		IsOrigin   bool   `json:"is_origin"`
	}

	affectedMap := map[string]*affectedNode{}
	affectedMap[incident.DeviceID] = &affectedNode{
		DeviceID: incident.DeviceID,
		Hostname: incident.DeviceID,
		Status:   "down",
		IsOrigin: true,
	}

	for _, p := range propagations {
		if affectedMap[p.FromDeviceID] == nil {
			affectedMap[p.FromDeviceID] = &affectedNode{
				DeviceID: p.FromDeviceID,
				Hostname: p.FromHostname,
				Status:   "down",
				IsOrigin: false,
			}
		}
		if affectedMap[p.ToDeviceID] == nil {
			affectedMap[p.ToDeviceID] = &affectedNode{
				DeviceID: p.ToDeviceID,
				Hostname: p.ToHostname,
				Status:   "down",
				IsOrigin: false,
			}
		}
	}

	// Enriquecer hostnames desde devices si es posible
	for _, node := range affectedMap {
		dev, _ := repository.GetDeviceByServiceID(ctx, node.DeviceID)
		if dev != nil && node.Hostname == node.DeviceID {
			node.Hostname = dev.Hostname
		}
	}

	// Calcular totales para porcentaje
	allDevices, _ := repository.ListDevices(ctx)
	totalDevices := len(allDevices)
	affectedCount := len(affectedMap)
	percentage := 0.0
	if totalDevices > 0 {
		percentage = float64(affectedCount) / float64(totalDevices) * 100.0
	}

	nodes := make([]affectedNode, 0, affectedCount)
	for _, n := range affectedMap {
		nodes = append(nodes, *n)
	}

	wsMsg := map[string]interface{}{
		"type":                     "multi_host_propagation_updated",
		"incident_id":              incident.ID,
		"affected_servers":         nodes,
		"affected_count":           affectedCount,
		"total_devices":            totalDevices,
		"infrastructure_affected":  percentage,
		"timestamp":                time.Now().Unix(),
	}

	e.hub.Broadcast("dashboard", wsMsg)
	e.hub.Broadcast(fmt.Sprintf("device:%s", incident.DeviceID), wsMsg)
}

// broadcastServerTransactionDegraded emite alertas en tiempo real cuando las transacciones de un servidor se degradan (DoD T-020).
func (e *IncidentCorrelationEngine) broadcastServerTransactionDegraded(ctx context.Context, incident *models.Incident, category, txType string, failedCount int) {
	if e.hub == nil || incident == nil {
		return
	}

	// Obtener hostname del dispositivo afectado
	dev, _ := repository.GetDeviceByServiceID(ctx, incident.DeviceID)
	hostname := incident.DeviceID
	if dev != nil {
		hostname = dev.Hostname
	}

	failureRate := 0.0
	if failedCount > 0 {
		failureRate = float64(failedCount) / 100.0 * 100.0
		if failureRate > 100.0 {
			failureRate = 100.0
		}
	}

	wsMsg := map[string]interface{}{
		"type":              "server_transaction_degraded",
		"incident_id":       incident.ID,
		"device_id":         incident.DeviceID,
		"hostname":          hostname,
		"service_category":  category,
		"service_name":      txType,
		"failed_requests":   failedCount,
		"failure_rate":      failureRate,
		"error_code":        incident.RootCauseType,
		"timestamp":         time.Now().Unix(),
	}

	e.hub.Broadcast("dashboard", wsMsg)
	e.hub.Broadcast(fmt.Sprintf("device:%s", incident.DeviceID), wsMsg)
}

// AnalyzeAffectedTransactions evalúa las transacciones y operaciones afectadas por un incidente (DoD T-018).
func (e *IncidentCorrelationEngine) AnalyzeAffectedTransactions(ctx context.Context, incident *models.Incident) {
	if incident == nil {
		return
	}

	windowStart := incident.StartedAt.Add(-5 * time.Minute)
	windowEnd := incident.StartedAt.Add(5 * time.Minute)

	// Mapear causa raíz a categoría de servicio y tipo de transacción
	category, txType, failedCount := e.mapRootCauseToTransaction(incident.RootCauseType, incident)

	tx := &models.AffectedTransaction{
		IncidentID:      incident.ID,
		DeviceID:        incident.DeviceID,
		ServiceCategory: category,
		TransactionType: txType,
		FailedCount:     failedCount,
		WindowStart:     windowStart,
		WindowEnd:       windowEnd,
	}
	_ = repository.InsertAffectedTransaction(ctx, tx)

	// Si hay eventos de contenedor en el incidente, registrar transacciones adicionales de contenedores
	for _, ev := range incident.Events {
		if ev.ContainerID != "" {
			containerTx := &models.AffectedTransaction{
				IncidentID:      incident.ID,
				DeviceID:        incident.DeviceID,
				ServiceCategory: "containers",
				TransactionType: fmt.Sprintf("container_%s", ev.EventType),
				FailedCount:     1,
				WindowStart:     windowStart,
				WindowEnd:       windowEnd,
			}
			_ = repository.InsertAffectedTransaction(ctx, containerTx)
		}
	}

	// Evaluar propagaciones hacia otros dispositivos
	propagations, err := repository.ListIncidentPropagations(ctx, incident.ID)
	if err != nil || len(propagations) == 0 {
		return
	}

	for _, p := range propagations {
		// Transacciones de conectividad degradada entre servidores
		depTx := &models.AffectedTransaction{
			IncidentID:      incident.ID,
			DeviceID:        p.ToDeviceID,
			ServiceCategory: "connectivity",
			TransactionType: "inter_host_dependency",
			FailedCount:     1,
			WindowStart:     windowStart,
			WindowEnd:       windowEnd,
		}
		_ = repository.InsertAffectedTransaction(ctx, depTx)
		// DoD T-019 — persistir histórico de transacciones de servidor
		st, _ := repository.GetOrCreateServerTransaction(ctx, p.ToDeviceID, "connectivity", "inter_host_dependency")
		if st != nil {
			_ = repository.InsertIncidentTransactionImpact(ctx, &models.IncidentTransactionImpact{
				IncidentID:          incident.ID,
				ServerTransactionID: st.ID,
				FailedRequestsCount: 1,
				ErrorCode:           "PROPAGATION_DEGRADED",
			})
		}
	}
	// DoD T-019 — persistir también el impacto sobre el dispositivo origen (host afectado)
	stHost, _ := repository.GetOrCreateServerTransaction(ctx, incident.DeviceID, category, txType)
	if stHost != nil {
		_ = repository.InsertIncidentTransactionImpact(ctx, &models.IncidentTransactionImpact{
			IncidentID:          incident.ID,
			ServerTransactionID: stHost.ID,
			FailedRequestsCount: failedCount,
			ErrorCode:           incident.RootCauseType,
		})
	}

	// DoD T-020 — emitir alerta en tiempo real vía WebSocket
	e.broadcastServerTransactionDegraded(ctx, incident, category, txType, failedCount)
}

// mapRootCauseToTransaction clasifica una causa raíz en categoría de servicio, tipo de transacción y volumen estimado de fallos.
func (e *IncidentCorrelationEngine) mapRootCauseToTransaction(rootCauseType string, incident *models.Incident) (category, txType string, failedCount int) {
	failedCount = 1
	switch rootCauseType {
	case "host.cpu.high":
		category = "api_backend"
		txType = "http_requests"
		failedCount = 50 + int(incident.Events[0].SequenceOrder)*10
	case "host.memory.high":
		category = "api_backend"
		txType = "memory_allocations"
		failedCount = 30 + int(incident.Events[0].SequenceOrder)*5
	case "host.disk.high":
		category = "database"
		txType = "disk_writes"
		failedCount = 20
	case "container_die", "container_oom", "container_kill":
		category = "containers"
		txType = "container_lifecycle"
		failedCount = 1
	case "instance_offline":
		category = "connectivity"
		txType = "host_unreachable"
		failedCount = 100
	default:
		category = "api_backend"
		txType = "generic_operations"
	}
	return
}

// recordIncidentOriginPath registra el paso 0 del dispositivo origen en el flujo de propagación (DoD T-015).
func (e *IncidentCorrelationEngine) recordIncidentOriginPath(ctx context.Context, incident *models.Incident) {
	if incident == nil {
		return
	}
	path := &models.IncidentPropagationPath{
		IncidentID:         incident.ID,
		StepOrder:          0,
		AffectedDeviceID:   incident.DeviceID,
		AffectedContainerID: "",
	}
	_ = repository.InsertIncidentPropagationPath(ctx, path)
}

// broadcastIncidentEvent retransmite las notificaciones de incidentes vía WebSockets (T-012).
func (e *IncidentCorrelationEngine) broadcastIncidentEvent(action string, incident *models.Incident) {
	if e.hub == nil {
		return
	}

	wsMsg := map[string]interface{}{
		"type":      action,
		"incident":  incident,
		"device_id": incident.DeviceID,
		"timestamp": time.Now().Unix(),
	}

	// Transmitir a la sala global dashboard y a la sala específica del servidor
	e.hub.Broadcast("dashboard", wsMsg)
	e.hub.Broadcast(fmt.Sprintf("device:%s", incident.DeviceID), wsMsg)
}
