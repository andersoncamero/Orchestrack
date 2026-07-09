package util

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
)

// Config contiene la configuración de orchestrack-agent.
type Config struct {
	ServiceID  string
	Hostname   string
	NATSURL    string
	LogLevel   string
	AgentToken string
	BackendURL string
}

// LoadConfig carga la configuración desde variables de entorno o valores por defecto.
func LoadConfig() (*Config, error) {
	hostname := os.Getenv("AGENT_HOSTNAME")
	if hostname == "" {
		hostname = os.Getenv("DOCKER_SERVICE_HOSTNAME")
	}
	if hostname == "" {
		var err error
		hostname, err = os.Hostname()
		if err != nil {
			hostname = "unknown"
		}
	}

	serviceID := os.Getenv("AGENT_ID")
	if serviceID == "" {
		serviceID = os.Getenv("DOCKER_SERVICE_ID")
	}
	// Si no se provee un ID explícito, generar uno estable basado en hostname + sufijo aleatorio.
	// Este ID será persistido en .agent_identity.json en el primer registro.
	if serviceID == "" {
		id, err := generateServiceID(hostname)
		if err != nil {
			return nil, fmt.Errorf("failed to generate service id: %w", err)
		}
		serviceID = id
	}

	natsURL := os.Getenv("NATS_URL")
	if natsURL == "" {
		natsURL = "nats://localhost:4222"
	}

	logLevel := os.Getenv("AGENT_LOG_LEVEL")
	if logLevel == "" {
		logLevel = os.Getenv("DOCKER_SERVICE_LOG_LEVEL")
	}
	if logLevel == "" {
		logLevel = "info"
	}

	agentToken := os.Getenv("AGENT_TOKEN")
	backendURL := os.Getenv("BACKEND_URL")
	if backendURL == "" {
		backendURL = "http://localhost:8080"
	}

	return &Config{
		ServiceID:  serviceID,
		Hostname:   hostname,
		NATSURL:    natsURL,
		LogLevel:   logLevel,
		AgentToken: agentToken,
		BackendURL: backendURL,
	}, nil
}

// generateServiceID construye un identificador único estable con formato "<hostname>-<hex6>".
// El sufijo aleatorio diferencia múltiples agentes en el mismo host.
func generateServiceID(hostname string) (string, error) {
	buf := make([]byte, 3) // 3 bytes = 6 caracteres hex
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	// Normalizar hostname: minúsculas, sin espacios
	clean := strings.ToLower(strings.ReplaceAll(hostname, " ", "-"))
	return fmt.Sprintf("%s-%s", clean, hex.EncodeToString(buf)), nil
}

