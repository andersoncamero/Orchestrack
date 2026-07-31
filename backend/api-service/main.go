package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/go/orchestrack/backend/api-service/src/handlers"
	"github.com/go/orchestrack/backend/api-service/src/middleware"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/api-service/src/server"
	"github.com/go/orchestrack/backend/api-service/src/util"
	"github.com/go/orchestrack/backend/events"
	"github.com/gorilla/mux"
)

func main() {
	config, err := util.LoadConfig()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	logger := util.NewLogger(config.LogLevel)

	natsStore, err := events.NewNats(config.NATSURL)
	if err != nil {
		logger.Error("failed to connect to nats", "error", err)
		os.Exit(1)
	}
	events.SetEventStore(natsStore)

	srv, err := server.NewServer(config, logger)
	if err != nil {
		logger.Error("failed to create server", "error", err)
		os.Exit(1)
	}

	// Manejo graceful de señales de terminación.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigCh
		logger.Info("shutting down api-service gracefully")
		srv.Stop()
	}()

	logger.Info("starting api-service", "address", config.Address())
	if err := srv.Start(BindRoutes); err != nil {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}
}

// BindRoutes registra las rutas REST del api-service.
func BindRoutes(s ports.Server, r *mux.Router) {
	// Public routes.
	r.HandleFunc("/api/v1/signup", handlers.SignUpHandler(s)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/login", handlers.LoginHandler(s)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/devices/register", handlers.RegisterDeviceHandler(s)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/devices/{identifier}/status", handlers.GetDeviceStatusHandler(s)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/health", healthCheckHandler).Methods(http.MethodGet)


	// Protected routes.
	protected := r.PathPrefix("/api/v1").Subrouter()
	protected.Use(middleware.AuthMiddleware(s))

	protected.HandleFunc("/me", handlers.MeHandler(s)).Methods(http.MethodGet)
	protected.HandleFunc("/instances", handlers.ListInstancesHandler(s)).Methods(http.MethodGet)
	protected.HandleFunc("/instances/history", handlers.ConnectionHistoryHandler(s)).Methods(http.MethodGet)
	protected.HandleFunc("/images/search", handlers.SearchImagesHandler(s)).Methods(http.MethodGet)
	protected.HandleFunc("/devices/tokens", handlers.GenerateTokenHandler(s)).Methods(http.MethodPost)
	protected.HandleFunc("/system/retention", handlers.GetRetentionSettingHandler(s)).Methods(http.MethodGet)
	protected.HandleFunc("/system/retention", handlers.UpdateRetentionSettingHandler(s)).Methods(http.MethodPut)
	protected.HandleFunc("/system/retention/cleanup", handlers.TriggerMetricsCleanupHandler(s)).Methods(http.MethodPost)
	protected.HandleFunc("/ws", s.Hub().HandleWebSocket)

	// Rutas de Incidentes y Causa Raíz (DoD T-011)
	protected.HandleFunc("/incidents", handlers.GetIncidentsHandler).Methods(http.MethodGet)
	protected.HandleFunc("/incidents/{id}", handlers.GetIncidentByIDHandler).Methods(http.MethodGet)
	protected.HandleFunc("/incidents/{id}/timeline", handlers.GetIncidentTimelineHandler).Methods(http.MethodGet)
	protected.HandleFunc("/incidents/{id}/propagation", handlers.GetIncidentPropagationHandler).Methods(http.MethodGet)
	protected.HandleFunc("/incidents/{id}/transactions", handlers.GetIncidentTransactionsHandler).Methods(http.MethodGet)
	protected.HandleFunc("/incidents/{id}/evidence", handlers.GetIncidentEvidenceHandler).Methods(http.MethodGet)
	protected.HandleFunc("/incidents/{id}/evidence/export", handlers.ExportIncidentEvidenceHandler).Methods(http.MethodGet)

	// Rutas de Topología Multi-Host y Dependencias (DoD T-015)
	protected.HandleFunc("/topology/multi-host", handlers.GetMultiHostTopologyHandler).Methods(http.MethodGet)

	instances := protected.PathPrefix("/instances/{identifier}").Subrouter()
	instances.HandleFunc("/approve", handlers.ApproveDeviceHandler(s)).Methods(http.MethodPost)
	instances.HandleFunc("/history", handlers.DeviceConnectionHistoryHandler(s)).Methods(http.MethodGet)
	instances.HandleFunc("/containers", handlers.ListContainersHandler(s)).Methods(http.MethodGet)
	instances.HandleFunc("/containers/topology", handlers.GetContainerTopologyHandler(s)).Methods(http.MethodGet)
	instances.HandleFunc("/containers/{id}", handlers.GetContainerHandler(s)).Methods(http.MethodGet)
	instances.HandleFunc("/containers/{id}/events", handlers.ListContainerEventsHandler(s)).Methods(http.MethodGet)
	instances.HandleFunc("/containers/{id}/logs", handlers.GetContainerLogsHandler(s)).Methods(http.MethodGet)
	instances.HandleFunc("/containers", handlers.CreateContainerHandler(s)).Methods(http.MethodPost)
	instances.HandleFunc("/containers/{id}/start", handlers.StartContainerHandler(s)).Methods(http.MethodPost)
	instances.HandleFunc("/containers/{id}/stop", handlers.StopContainerHandler(s)).Methods(http.MethodPost)
	instances.HandleFunc("/containers/{id}/restart", handlers.RestartContainerHandler(s)).Methods(http.MethodPost)
	instances.HandleFunc("/containers/{id}", handlers.RenameContainerHandler(s)).Methods(http.MethodPatch)
	instances.HandleFunc("/containers/{id}", handlers.RemoveContainerHandler(s)).Methods(http.MethodDelete)
	instances.HandleFunc("/images", handlers.ListImagesHandler(s)).Methods(http.MethodGet)
	instances.HandleFunc("/images/pull", handlers.PullImageHandler(s)).Methods(http.MethodPost)
	instances.HandleFunc("/images/{id}", handlers.RemoveImageHandler(s)).Methods(http.MethodDelete)

	// System/package routes.
	instances.HandleFunc("/system/info", handlers.GetSystemInfoHandler(s)).Methods(http.MethodGet)
	instances.HandleFunc("/system/packages", handlers.ListPackagesHandler(s)).Methods(http.MethodGet)
	instances.HandleFunc("/system/packages/refresh", handlers.RefreshPackagesHandler(s)).Methods(http.MethodPost)
	instances.HandleFunc("/system/packages/upgrade", handlers.UpgradePackagesHandler(s)).Methods(http.MethodPost)
	instances.HandleFunc("/system/packages/remove", handlers.RemovePackagesHandler(s)).Methods(http.MethodPost)

	// Network metrics route (DoD T-007.3).
	instances.HandleFunc("/metrics/network", handlers.GetDeviceNetworkMetricsHandler(s)).Methods(http.MethodGet)

	// Process routes.
	instances.HandleFunc("/processes/search", handlers.SearchProcessesHandler(s)).Methods(http.MethodGet)
}

// healthCheckHandler responde a peticiones de salud.
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
