package system

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/go/orchestrack/backend/events"
	pb "github.com/go/orchestrack/backend/proto/docker"
)

// ConnectionMonitor maneja el estado de conexión del agente con NATS de forma asíncrona.
type ConnectionMonitor struct {
	mu                 sync.Mutex
	serviceID          string
	hostname           string
	logger             *slog.Logger
	lastDisconnectTime time.Time
	reconnectTimer     *time.Timer
	cancelFn           context.CancelFunc
}

// NewConnectionMonitor crea un nuevo monitor de conectividad.
func NewConnectionMonitor(serviceID, hostname string, logger *slog.Logger) *ConnectionMonitor {
	return &ConnectionMonitor{
		serviceID: serviceID,
		hostname:  hostname,
		logger:    logger.With("component", "connection-monitor"),
	}
}

// HandleDisconnect registra la desconexión de red de forma inmediata.
func (m *ConnectionMonitor) HandleDisconnect(err error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.logger.Warn("network connection lost", "error", err)

	// Cancelar cualquier temporizador de reconexión (online) activo.
	if m.cancelFn != nil {
		m.cancelFn()
		m.cancelFn = nil
	}
	if m.reconnectTimer != nil {
		m.reconnectTimer.Stop()
		m.reconnectTimer = nil
	}

	// Registrar la marca de tiempo de la caída sólo si no estaba ya registrado.
	if m.lastDisconnectTime.IsZero() {
		m.lastDisconnectTime = time.Now()
		m.logger.Info("disconnection timestamp recorded", "time", m.lastDisconnectTime)
	}
}

// HandleReconnect gestiona la reconexión, enviando el evento offline retroactivo
// y programando la confirmación online tras un periodo de estabilidad de 40 segundos.
func (m *ConnectionMonitor) HandleReconnect() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.logger.Info("network connection re-established")

	// 1. Reportar inmediatamente el evento offline retroactivo
	if !m.lastDisconnectTime.IsZero() {
		disconnectUnix := m.lastDisconnectTime.Unix()
		m.logger.Info("publishing retroactive offline event", "disconnected_at", m.lastDisconnectTime)

		offlineEvent := &pb.AgentStatusEvent{
			ServiceId: m.serviceID,
			Hostname:  m.hostname,
			Status:    "offline",
			Timestamp: disconnectUnix,
			Reason:    "network_loss",
		}

		// Publicar evento offline
		go func(evt *pb.AgentStatusEvent) {
			subject := events.EventSubject(events.SubjectAgentStatus, m.serviceID)
			if err := events.Publish(subject, evt); err != nil {
				m.logger.Error("failed to publish retroactive offline event", "error", err)
			}
		}(offlineEvent)

		// Resetear la hora de caída
		m.lastDisconnectTime = time.Time{}
	}

	// Cancelar temporizadores previos por seguridad
	if m.cancelFn != nil {
		m.cancelFn()
	}
	if m.reconnectTimer != nil {
		m.reconnectTimer.Stop()
	}

	// 2. Programar la confirmación de estado online tras 40 segundos de estabilidad
	ctx, cancel := context.WithCancel(context.Background())
	m.cancelFn = cancel

	m.logger.Info("scheduling online status confirmation in 40 seconds")

	m.reconnectTimer = time.AfterFunc(40*time.Second, func() {
		m.mu.Lock()
		defer m.mu.Unlock()

		// Verificar que el contexto no haya sido cancelado por una nueva desconexión
		if ctx.Err() != nil {
			m.logger.Warn("scheduled online event cancelled due to another connection loss")
			return
		}

		m.logger.Info("connection stable, publishing online status event")

		onlineEvent := &pb.AgentStatusEvent{
			ServiceId: m.serviceID,
			Hostname:  m.hostname,
			Status:    "online",
			Timestamp: time.Now().Unix(),
			Reason:    "network_restored",
		}

		subject := events.EventSubject(events.SubjectAgentStatus, m.serviceID)
		if err := events.Publish(subject, onlineEvent); err != nil {
			m.logger.Error("failed to publish online status event", "error", err)
		}

		m.cancelFn = nil
		m.reconnectTimer = nil
	})
}

// Close limpia los temporizadores activos y publica un evento offline ordenado.
func (m *ConnectionMonitor) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.logger.Info("closing connection monitor")

	if m.cancelFn != nil {
		m.cancelFn()
		m.cancelFn = nil
	}
	if m.reconnectTimer != nil {
		m.reconnectTimer.Stop()
		m.reconnectTimer = nil
	}

	// Publicar un evento offline ordenado por cierre del servicio
	shutdownEvent := &pb.AgentStatusEvent{
		ServiceId: m.serviceID,
		Hostname:  m.hostname,
		Status:    "offline",
		Timestamp: time.Now().Unix(),
		Reason:    "shutdown",
	}

	subject := events.EventSubject(events.SubjectAgentStatus, m.serviceID)
	// Intento síncrono antes del cierre total de NATS
	_ = events.Publish(subject, shutdownEvent)
}
