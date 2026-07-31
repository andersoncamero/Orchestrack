package docker

import (
	"context"
	"errors"
	"log/slog"
	"strconv"
	"strings"
	"time"

	dockerevents "github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/go/orchestrack/backend/events"
	"github.com/go/orchestrack/backend/proto/docker"
)

// watchedContainerActions son las acciones de contenedor que el agente
// procesa y republica en NATS en tiempo real.
var watchedContainerActions = []string{"die", "oom", "kill", "health_status", "restart", "destroy"}

const (
	// watchInitialBackoff es la espera inicial antes de re-suscribirse al
	// stream de eventos cuando la conexión con el daemon se pierde.
	watchInitialBackoff = 1 * time.Second
	// watchMaxBackoff es la espera máxima entre reintentos de suscripción.
	watchMaxBackoff = 30 * time.Second
	// pingTimeout limita cada comprobación de salud del daemon Docker.
	pingTimeout = 5 * time.Second
)

// EventsWatcher se suscribe al stream nativo de eventos de Docker Engine
// y publica los eventos clave de contenedores en NATS en tiempo real.
type EventsWatcher struct {
	client    *client.Client
	serviceID string
	logger    *slog.Logger
}

// NewEventsWatcher crea un nuevo watcher de eventos de Docker Engine.
func NewEventsWatcher(client *client.Client, serviceID string, logger *slog.Logger) *EventsWatcher {
	if logger == nil {
		logger = slog.Default()
	}
	return &EventsWatcher{
		client:    client,
		serviceID: serviceID,
		logger:    logger,
	}
}

// Run inicia el bucle de vigilancia de eventos y bloquea hasta que el
// contexto se cancela (apagado del agente). Si el daemon de Docker se
// reinicia o el stream se interrumpe, espera a que el daemon responda y
// re-suscribe automáticamente con backoff exponencial (1s → máx 30s).
func (w *EventsWatcher) Run(ctx context.Context) {
	backoff := watchInitialBackoff
	for {
		err := w.watch(ctx)
		if ctx.Err() != nil {
			w.logger.Info("watcher de eventos de Docker detenido")
			return
		}
		w.logger.Warn("stream de eventos de Docker interrumpido — reintentando", "error", err, "retry_in", backoff)

		// Esperar a que el daemon vuelva a responder antes de re-suscribirse.
		for {
			if !sleepOrDone(ctx, backoff) {
				return
			}
			pingCtx, cancel := context.WithTimeout(ctx, pingTimeout)
			_, pingErr := w.client.Ping(pingCtx)
			cancel()
			if pingErr == nil {
				backoff = watchInitialBackoff
				break
			}
			w.logger.Warn("el daemon Docker aún no responde", "error", pingErr, "retry_in", backoff)
			backoff = nextBackoff(backoff)
		}
	}
}

// watch abre la suscripción al stream de eventos del daemon y procesa los
// mensajes hasta que el contexto se cancela o el stream termina con error
// (p.ej. si el daemon de Docker se reinicia).
func (w *EventsWatcher) watch(ctx context.Context) error {
	eventFilters := filters.NewArgs(filters.Arg("type", "container"))
	for _, action := range watchedContainerActions {
		eventFilters.Add("event", action)
	}

	msgCh, errCh := w.client.Events(ctx, dockerevents.ListOptions{Filters: eventFilters})
	w.logger.Info("suscrito al stream de eventos de Docker", "actions", watchedContainerActions)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case err, ok := <-errCh:
			if !ok {
				return errors.New("canal de errores del stream de eventos cerrado")
			}
			if err != nil {
				return err
			}
		case msg, ok := <-msgCh:
			if !ok {
				return errors.New("canal de mensajes del stream de eventos cerrado")
			}
			w.handleMessage(msg)
		}
	}
}

// handleMessage mapea un mensaje del stream a un ContainerEvent y lo
// publica en el subject events.orchestrack-agent.{service_id}.container_event.
func (w *EventsWatcher) handleMessage(msg dockerevents.Message) {
	event := mapEventMessageToProto(w.serviceID, msg)
	if event == nil {
		return
	}

	subject := events.EventSubject(events.SubjectContainerEvent, w.serviceID)
	if err := events.Publish(subject, event); err != nil {
		w.logger.Warn("error al publicar evento de contenedor", "subject", subject, "container", event.ContainerName, "event_type", event.EventType, "error", err)
		return
	}
	w.logger.Debug("evento de contenedor publicado", "subject", subject, "container", event.ContainerName, "event_type", event.EventType, "exit_code", event.ExitCode, "reason", event.Reason)

	// Iniciar de forma asíncrona la recolección de evidencias si es un evento crítico/incidente
	isCritical := event.EventType == "oom" ||
		(event.EventType == "die" && event.ExitCode != 0) ||
		(strings.HasPrefix(event.EventType, "health_status") && strings.Contains(event.EventType, "unhealthy"))

	if isCritical {
		go func(serviceID, containerID, containerName string, eventType string) {
			w.logger.Info("alerta/incidente crítica detectada en el agente; iniciando recolector de evidencia instantánea...", "container", containerName, "event_type", eventType)
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

			bundle, err := CollectEvidence(ctx, serviceID, containerID, containerName)
			if err != nil {
				w.logger.Error("error al recolectar evidencia", "container", containerName, "error", err)
				return
			}

			if err := CompressAndPublishEvidence(ctx, serviceID, bundle); err != nil {
				w.logger.Error("error al comprimir/publicar evidencia", "container", containerName, "error", err)
				return
			}
			w.logger.Info("evidencia de incidente enviada exitosamente a través de NATS", "container", containerName)
		}(w.serviceID, event.ContainerId, event.ContainerName, event.EventType)
	}
}

// mapEventMessageToProto convierte un events.Message del Docker SDK en un
// docker.ContainerEvent estructurado. Devuelve nil si la acción no está
// entre las vigiladas (die, oom, kill, health_status, restart, destroy).
func mapEventMessageToProto(serviceID string, msg dockerevents.Message) *docker.ContainerEvent {
	action := string(msg.Action)
	if !isWatchedAction(action) {
		return nil
	}

	attrs := msg.Actor.Attributes
	event := &docker.ContainerEvent{
		ServiceId:     serviceID,
		ContainerId:   msg.Actor.ID,
		ContainerName: attrs["name"],
		Image:         attrs["image"],
		EventType:     action,
		Reason:        firstNonEmpty(attrs["error"], attrs["errorReason"]),
		Timestamp:     eventTimestamp(msg),
	}

	// El exit code solo aplica a eventos "die".
	if action == "die" {
		if exitCode, err := strconv.ParseInt(attrs["exitCode"], 10, 32); err == nil {
			event.ExitCode = int32(exitCode)
		}
	}

	return event
}

// isWatchedAction indica si la acción del evento es una de las procesadas.
// Las acciones health_status llevan sufijo (ej. "health_status: unhealthy"),
// por lo que se comparan por prefijo.
func isWatchedAction(action string) bool {
	if strings.HasPrefix(action, "health_status") {
		return true
	}
	switch action {
	case "die", "oom", "kill", "restart", "destroy":
		return true
	default:
		return false
	}
}

// eventTimestamp extrae el timestamp Unix del mensaje, con fallback al
// tiempo actual si el daemon no lo informa.
func eventTimestamp(msg dockerevents.Message) int64 {
	if msg.Time > 0 {
		return msg.Time
	}
	if msg.TimeNano > 0 {
		return msg.TimeNano / int64(time.Second)
	}
	return time.Now().Unix()
}

// firstNonEmpty devuelve el primer valor no vacío de la lista.
func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

// nextBackoff duplica la espera actual hasta el máximo configurado.
func nextBackoff(current time.Duration) time.Duration {
	next := current * 2
	if next > watchMaxBackoff {
		return watchMaxBackoff
	}
	return next
}

// sleepOrDone espera d y devuelve true, o false si el contexto se cancela antes.
func sleepOrDone(ctx context.Context, d time.Duration) bool {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
