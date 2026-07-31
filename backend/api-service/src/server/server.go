package server

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"

	"github.com/go/orchestrack/backend/api-service/src/cache"
	"github.com/go/orchestrack/backend/api-service/src/database"
	"github.com/go/orchestrack/backend/api-service/src/handlers"
	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/go/orchestrack/backend/api-service/src/util"
	"github.com/go/orchestrack/backend/api-service/src/websocket"
	"github.com/go/orchestrack/backend/events"
)

// Broker implementa ports.Server y encapsula el servidor HTTP del api-service.
type Broker struct {
	config            *util.Config
	logger            *slog.Logger
	registry          *cache.Registry
	connectionHistory *cache.ConnectionHistory
	hub               *websocket.Hub
	router            *mux.Router
	server            *http.Server
}

func (b *Broker) Logger() *slog.Logger {
	return b.logger
}

func (b *Broker) Config() *util.Config {
	return b.config
}

func (b *Broker) Registry() *cache.Registry {
	return b.registry
}

func (b *Broker) ConnectionHistory() *cache.ConnectionHistory {
	return b.connectionHistory
}

func (b *Broker) Hub() *websocket.Hub {
	return b.hub
}

// NewServer crea una nueva instancia del servidor.
func NewServer(config *util.Config, logger *slog.Logger) (ports.Server, error) {
	registry := cache.NewRegistry()
	connectionHistory := cache.NewConnectionHistory()
	hub := websocket.NewHub(logger)

	if config.HTTPPort == "" {
		return nil, errors.New("port is required")
	}

	if config.DatabaseURL == "" {
		return nil, errors.New("database url is required")
	}

	if config.JWTSecret == "" {
		return nil, errors.New("jwt secret is required")
	}

	postgresRepo, err := database.NewPostgresRepository(config.DatabaseURL, config.MongoURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create postgres repository: %w", err)
	}
	repository.SetRepository(postgresRepo)

	// Precargar el historial de conexiones desde la base de datos
	populateConnectionHistoryFromDB(context.Background(), connectionHistory, logger)

	if err := handlers.SubscribeContainerEvents(registry, connectionHistory, hub, logger); err != nil {
		return nil, fmt.Errorf("failed to subscribe to container events: %w", err)
	}

	go hub.Run()

	b := &Broker{
		config:            config,
		logger:            logger,
		registry:          registry,
		connectionHistory: connectionHistory,
		hub:               hub,
		router:            mux.NewRouter(),
	}

	// Purga periódica de métricas de red antiguas según la retención configurada (cada 1 hora).
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			val, err := repository.GetSystemSetting(context.Background(), "metrics_retention_days")
			days := 7
			if err == nil && val != "" {
				if parsed, err := strconv.Atoi(val); err == nil && parsed > 0 {
					days = parsed
				}
			}
			deleted, err := repository.CleanupOldDeviceNetworkMetrics(context.Background(), days)
			if err != nil {
				logger.Warn("failed to auto-cleanup old device network metrics", "error", err)
			} else if deleted > 0 {
				logger.Info("auto-cleaned old device network metrics", "deleted_rows", deleted, "retention_days", days)
			}
		}
	}()

	// Cleanup de instancias inactivas cada 30 segundos.
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			// Eliminar tokens de registro expirados o usados
			if err := repository.DeleteExpiredRegistrationTokens(context.Background()); err != nil {
				logger.Warn("failed to delete expired registration tokens", "error", err)
			}

			removed := registry.Cleanup(60 * time.Second)
			if len(removed) > 0 {
				if connectionHistory != nil {
					onlineCount, offlineCount, totalCount, err := handlers.GetConnectionStats(context.Background(), registry)
					if err != nil {
						logger.Warn("failed to get connection stats in cleanup using database as source of truth", "error", err)
						o, f, t := registry.ConnectionCounts()
						connectionHistory.Record(time.Now().Unix(), o, f, t)
					} else {
						connectionHistory.Record(time.Now().Unix(), onlineCount, offlineCount, totalCount)
					}
				}
				for _, svc := range removed {
					// 1. Actualizar el dispositivo en BD a "offline"
					if dev, err := repository.GetDeviceByServiceID(context.Background(), svc.ServiceID); err == nil && dev != nil {
						dev.Status = "offline"
						if err := repository.SaveDevice(context.Background(), dev); err != nil {
							logger.Warn("failed to update device status to offline in database", "service_id", svc.ServiceID, "error", err)
						}
					}

				// 2. Insertar evento de desconexión
				evt := &models.Event{
					DeviceID:  svc.ServiceID,
					Type:      "instance.offline",
					Payload:   `{"status": "offline"}`,
					Timestamp: time.Now().UTC(),
				}
					if err := repository.InsertEvent(context.Background(), evt); err != nil {
						logger.Warn("failed to insert device offline event in database", "service_id", svc.ServiceID, "error", err)
					}

					if hub != nil {
						evtPayload := map[string]interface{}{
							"service_id": svc.ServiceID,
							"hostname":   svc.Hostname,
							"status":     "offline",
							"timestamp":  time.Now().Unix(),
						}
						hub.Broadcast("dashboard", map[string]interface{}{
							"type":    "instance.offline",
							"payload": evtPayload,
						})
						hub.Broadcast("device:"+svc.ServiceID, map[string]interface{}{
							"type":    "instance.offline",
							"payload": evtPayload,
						})
					}
				}
			}
		}
	}()

	return b, nil
}

// corsMiddleware agrega los headers de CORS y responde a peticiones OPTIONS.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Start inicia el servidor HTTP y bloquea hasta que falle o se cierre.
func (b *Broker) Start(binder func(s ports.Server, r *mux.Router)) error {
	binder(b, b.router)

	b.server = &http.Server{
		Addr:    b.config.Address(),
		Handler: corsMiddleware(b.router),
	}

	b.logger.Info("api-service HTTP server starting", "address", b.config.Address())
	return b.server.ListenAndServe()
}

// Stop detiene el servidor gracefulmente.
func (b *Broker) Stop() {
	if b.server != nil {
		_ = b.server.Close()
	}
	_ = repository.Close()
	events.Close()
}

func populateConnectionHistoryFromDB(ctx context.Context, history *cache.ConnectionHistory, logger *slog.Logger) {
	devices, err := repository.ListDevices(ctx)
	if err != nil {
		logger.Warn("failed to list devices for history populating", "error", err)
		return
	}

	// Filtrar dispositivos aprobados (no pending)
	var activeDevices []*models.Device
	for _, d := range devices {
		if d.Status != "pending" {
			activeDevices = append(activeDevices, d)
		}
	}

	if len(activeDevices) == 0 {
		return
	}

	// Obtener los eventos para cada dispositivo y ordenarlos cronológicamente
	deviceEvents := make(map[string][]*models.Event)
	for _, dev := range activeDevices {
		evts, err := repository.ListEventsByDevice(ctx, dev.ServiceID, 10000)
		if err != nil {
			logger.Warn("failed to fetch events for device history populating", "device_id", dev.ServiceID, "error", err)
			continue
		}
		// Invertir el orden para que sea ascendente (cronológico)
		for i, j := 0, len(evts)-1; i < j; i, j = i+1, j-1 {
			evts[i], evts[j] = evts[j], evts[i]
		}
		deviceEvents[dev.ServiceID] = evts
	}

	now := time.Now().UTC()
	interval := time.Hour
	// Calculamos el inicio hace 720 horas (30 días), alineado a la hora UTC
	start := now.Add(-720 * time.Hour).Truncate(time.Hour)

	// Reconstruir hora a hora.
	// Un dispositivo cuenta como online si estuvo online en algún momento del intervalo,
	// y como offline si estuvo offline en algún momento. Si ambos son true, la celda se
	// muestra como "Mixto" (online + offline dentro de la misma hora).
	for t := start; t.Before(now) || t.Equal(now); t = t.Add(interval) {
		tUnix := t.Unix()
		tPrev := t.Add(-interval).Unix()
		onlineCount := 0
		offlineCount := 0
		totalCount := 0

		for _, dev := range activeDevices {
			// Si el dispositivo fue creado después de tUnix, no existía en este slot.
			if dev.CreatedAt.Unix() > tUnix {
				continue
			}

			totalCount++
			evts := deviceEvents[dev.ServiceID]

			// 1. Estado al inicio del intervalo.
			initialStatus := "offline"
			for _, ev := range evts {
				if ev.Timestamp.Unix() <= tPrev {
					if ev.Type == "instance.online" {
						initialStatus = "online"
					} else if ev.Type == "instance.offline" {
						initialStatus = "offline"
					}
				} else {
					break
				}
			}

			// 2. ¿Hubo estados online y/o offline durante el intervalo?
			hasOnline := initialStatus == "online"
			hasOffline := initialStatus == "offline"

			for _, ev := range evts {
				evTime := ev.Timestamp.Unix()
				if evTime > tPrev && evTime <= tUnix {
					if ev.Type == "instance.online" {
						hasOnline = true
					} else if ev.Type == "instance.offline" {
						hasOffline = true
					}
				}
			}

			// 3. Si el dispositivo fue creado durante este intervalo, no asumir
			// que estuvo offline antes de existir.
			if dev.CreatedAt.Unix() > tPrev && initialStatus == "offline" && !hasOffline {
				hasOffline = false
			}

			// 4. Fallback: si no hay eventos, usar el status actual del dispositivo
			// (útil para el intervalo actual antes de que llegue el primer evento).
			if !hasOnline && !hasOffline && len(evts) == 0 {
				if dev.Status == "online" {
					hasOnline = true
				} else {
					hasOffline = true
				}
			}

			if hasOnline {
				onlineCount++
			}
			if hasOffline {
				offlineCount++
			}
		}

		if totalCount > 0 {
			history.Record(tUnix, onlineCount, offlineCount, totalCount)
		}
	}
	logger.Info("connection history preloaded successfully from database", "samples", len(history.GetHistory(start)))
}
