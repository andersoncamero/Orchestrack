package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"syscall"
	"time"

	"github.com/go/orchestrack/backend/orchestrack-agent/src/docker"
	"github.com/go/orchestrack/backend/orchestrack-agent/src/handlers"
	"github.com/go/orchestrack/backend/orchestrack-agent/src/metrics"
	"github.com/go/orchestrack/backend/orchestrack-agent/src/repository"
	"github.com/go/orchestrack/backend/orchestrack-agent/src/system"
	"github.com/go/orchestrack/backend/orchestrack-agent/src/util"
	"github.com/go/orchestrack/backend/events"
	pb "github.com/go/orchestrack/backend/proto/docker"
)

func main() {
	config, err := util.LoadConfig()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	logger := util.NewLogger(config.LogLevel)
	logger.Info("iniciando orchestrack-agent", "version", "1.0.0")

	// Comprobar registro e identidad local del agente
	identity, err := getLocalIdentity()
	if err != nil {
		logger.Error("error al leer la identidad local del agente", "error", err)
		os.Exit(1)
	}

	if identity == nil {
		if config.AgentToken != "" {
			logger.Info("registrando dispositivo con el servidor", "url", config.BackendURL, "service_id", config.ServiceID)
			if err := registerDeviceWithToken(config.BackendURL, config.AgentToken, config.ServiceID, config.Hostname, logger); err != nil {
				logger.Error("el registro del dispositivo falló", "error", err)
				os.Exit(1)
			}
			if err := saveLocalIdentity(config.ServiceID, config.Hostname); err != nil {
				logger.Error("error al guardar la identidad local", "error", err)
				os.Exit(1)
			}
			logger.Info("dispositivo registrado — pendiente de aprobación en el dashboard", "service_id", config.ServiceID)

			// Esperar a que el administrador apruebe el dispositivo en el dashboard
			if err := waitForApproval(config.BackendURL, config.ServiceID, logger); err != nil {
				logger.Error("error durante la espera de aprobación", "error", err)
				os.Exit(1)
			}
		} else {
			logger.Warn("no se proporcionó AGENT_TOKEN y no hay identidad local. modo legado activo")
		}
	} else {
		logger.Info("identidad local cargada, dispositivo ya registrado", "service_id", identity.ServiceID, "hostname", identity.Hostname)
		config.ServiceID = identity.ServiceID
		config.Hostname = identity.Hostname

		// Verificar el estado actual del dispositivo en el backend.
		// Si el dispositivo sigue pendiente de aprobación, esperar antes de continuar.
		status, err := fetchDeviceStatus(config.BackendURL, config.ServiceID)
		if err != nil {
			logger.Warn("no se pudo verificar el estado del dispositivo — continuando de todas formas", "error", err)
		} else if status == "pending" {
			logger.Info("dispositivo aún pendiente de aprobación — esperando autorización", "service_id", config.ServiceID)
			if err := waitForApproval(config.BackendURL, config.ServiceID, logger); err != nil {
				logger.Error("error durante la espera de aprobación", "error", err)
				os.Exit(1)
			}
		}
	}

	// Daemonizar el agente si no está configurado en primer plano (foreground).
	daemonizeIfNeeded(logger)

	logger.Info("conectando a NATS", "url", config.NATSURL)
	monitor := system.NewConnectionMonitor(config.ServiceID, config.Hostname, logger)
	defer monitor.Close()

	natsStore, err := events.NewNatsWithOptions(config.NATSURL, events.ConnectionCallbacks{
		OnDisconnect: monitor.HandleDisconnect,
		OnReconnect:  monitor.HandleReconnect,
	})
	if err != nil {
		logger.Error("error al conectar a NATS", "url", config.NATSURL, "error", err)
		os.Exit(1)
	}
	events.SetEventStore(natsStore)
	defer events.Close()
	logger.Info("conexión a NATS establecida")

	logger.Info("conectando al daemon Docker")
	dockerClient, err := docker.NewDockerClient()
	if err != nil {
		logger.Error("error al crear el cliente Docker", "error", err)
		os.Exit(1)
	}
	containerRepo := docker.NewContainerRepository(dockerClient)
	repository.SetRepository(containerRepo)
	logger.Info("cliente Docker listo")

	if err := system.EnsureDedicatedUser(logger); err != nil {
		logger.Warn("failed to ensure dedicated user", "error", err)
	}
	if err := system.ConfigureSudoers(system.DetectPackageManager(), logger); err != nil {
		logger.Warn("failed to configure sudoers", "error", err)
	}

	// Watcher de eventos en tiempo real del daemon Docker (die, oom, kill,
	// health_status, restart, destroy) publicados en NATS.
	eventsWatcher := docker.NewEventsWatcher(dockerClient, config.ServiceID, logger)
	watcherCtx, stopWatcher := context.WithCancel(context.Background())
	go eventsWatcher.Run(watcherCtx)

	commandHandler, err := handlers.NewNATSCommandHandler(config.ServiceID, config.Hostname, logger)
	if err != nil {
		logger.Error("error al crear el manejador de comandos", "error", err)
		os.Exit(1)
	}

	if err := commandHandler.Subscribe(); err != nil {
		logger.Error("error al suscribirse a comandos", "error", err)
		os.Exit(1)
	}

	// Publicar heartbeat periódicamente.
	stopHeartbeat := startHeartbeat(config.ServiceID, config.Hostname, logger)

	logger.Info("orchestrack-agent en ejecución — Ctrl+C para detener", "service_id", config.ServiceID, "hostname", config.Hostname)

	// Manejo graceful de señales de terminación.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	<-sigCh
	logger.Info("apagando orchestrack-agent de forma segura")
	stopWatcher()
	stopHeartbeat()
	commandHandler.Close()
}

// fetchDeviceStatus consulta el estado actual del dispositivo en el backend.
// Retorna el status ("pending", "active", "offline") o error si no se puede contactar.
func fetchDeviceStatus(backendURL, serviceID string) (string, error) {
	client := &http.Client{Timeout: 8 * time.Second}
	url := fmt.Sprintf("%s/api/v1/devices/%s/status", backendURL, serviceID)

	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", err
	}
	return body.Status, nil
}

// waitForApproval consulta el estado del dispositivo cada 5 segundos hasta que sea aprobado (status=active).
// Imprime puntos de progreso animados en la terminal para indicar que está esperando.
func waitForApproval(backendURL, serviceID string, logger *slog.Logger) error {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	dots := 0
	fmt.Printf("\033[90m  esperando aprobación del administrador")

	for range ticker.C {
		dots++
		fmt.Printf(".")
		if dots%20 == 0 {
			fmt.Printf("\n  ")
		}

		status, err := fetchDeviceStatus(backendURL, serviceID)
		if err != nil {
			// Error de red — seguir esperando silenciosamente
			logger.Warn("no se pudo consultar el estado del dispositivo", "error", err)
			continue
		}

		if status == "active" {
			fmt.Printf("\033[0m\n")
			logger.Info("dispositivo aprobado — iniciando operación normal", "service_id", serviceID)
			return nil
		}
	}
	return nil
}


func startHeartbeat(serviceID, hostname string, logger *slog.Logger) func() {
	ticker := time.NewTicker(10 * time.Second)
	done := make(chan struct{})

	publish := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		hostMetrics, err := metrics.CollectHostMetrics(ctx)
		if err != nil {
			logger.Warn("failed to collect host metrics", "error", err)
		}

		event := &pb.DockerServiceHeartbeat{
			ServiceId:   serviceID,
			Hostname:    hostname,
			Status:      "online",
			Timestamp:   time.Now().Unix(),
			HostMetrics: hostMetrics,
		}
		start := time.Now()
		if err := events.Publish(events.SubjectDockerServiceHeartbeat, event); err != nil {
			logger.Warn("failed to publish heartbeat", "error", err)
		} else {
			rttMs := float64(time.Since(start).Microseconds()) / 1000.0
			metrics.SetLastRttMs(rttMs)
		}
	}

	publish() // primer heartbeat inmediato

	go func() {
		for {
			select {
			case <-ticker.C:
				publish()
			case <-done:
				return
			}
		}
	}()

	return func() {
		close(done)
		ticker.Stop()
	}
}

// Identity representa el estado del registro local del agente.
type Identity struct {
	Registered   bool      `json:"registered"`
	ServiceID    string    `json:"service_id"`
	Hostname     string    `json:"hostname"`
	RegisteredAt time.Time `json:"registered_at"`
}

const identityFile = ".agent_identity.json"

func getLocalIdentity() (*Identity, error) {
	data, err := os.ReadFile(identityFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var id Identity
	if err := json.Unmarshal(data, &id); err != nil {
		return nil, err
	}
	return &id, nil
}

func saveLocalIdentity(serviceID, hostname string) error {
	id := Identity{
		Registered:   true,
		ServiceID:    serviceID,
		Hostname:     hostname,
		RegisteredAt: time.Now(),
	}
	data, err := json.MarshalIndent(id, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(identityFile, data, 0644)
}

func registerDeviceWithToken(backendURL, token, serviceID, hostname string, logger *slog.Logger) error {
	logger.Info("attempting to register device with server", "url", backendURL, "service_id", serviceID)

	reqBody, err := json.Marshal(map[string]string{
		"token":      token,
		"service_id": serviceID,
		"hostname":   hostname,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal registration body: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/devices/register", backendURL)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create http request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute registration request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp map[string]string
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		errMsg := "unknown error"
		if errResp != nil && errResp["error"] != "" {
			errMsg = errResp["error"]
		}
		return fmt.Errorf("registration server returned status %d: %s", resp.StatusCode, errMsg)
	}

	return nil
}

// daemonizeIfNeeded maneja el fork a segundo plano (daemon) si el agente no está forzado a primer plano.
func daemonizeIfNeeded(logger *slog.Logger) {
	if os.Getenv("ORCHESTRACK_DAEMON_CHILD") == "true" {
		return
	}

	foreground := false
	for _, arg := range os.Args {
		if arg == "--foreground" || arg == "-foreground" || arg == "-f" {
			foreground = true
		}
	}
	if os.Getenv("AGENT_FOREGROUND") == "true" {
		foreground = true
	}
	if foreground {
		logger.Info("ejecutando en primer plano (foreground)")
		return
	}

	executable, err := os.Executable()
	if err != nil {
		logger.Error("no se pudo obtener la ruta del ejecutable para daemonizar", "error", err)
		os.Exit(1)
	}

	logFile := "orchestrack-agent.log"
	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		logger.Error("no se pudo abrir el archivo de logs para daemonizar", "logFile", logFile, "error", err)
		os.Exit(1)
	}

	env := append(os.Environ(), "ORCHESTRACK_DAEMON_CHILD=true")

	cmd := exec.Command(executable, os.Args[1:]...)
	cmd.Env = env
	cmd.Stdout = file
	cmd.Stderr = file
	cmd.Stdin = nil
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setsid: true,
	}

	err = cmd.Start()
	if err != nil {
		logger.Error("no se pudo iniciar el agente en segundo plano", "error", err)
		os.Exit(1)
	}

	fmt.Printf("\n\033[32m✓ Dispositivo aprobado/activo.\033[0m\n")
	fmt.Printf("\033[34m→ Iniciando orchestrack-agent en segundo plano (PID: %d).\033[0m\n", cmd.Process.Pid)
	fmt.Printf("\033[90m→ Logs redirigidos a: %s\033[0m\n\n", logFile)

	os.Exit(0)
}

