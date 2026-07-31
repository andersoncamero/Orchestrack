package util

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config contiene la configuración del api-service.
type Config struct {
	HTTPPort    string
	NATSURL     string
	LogLevel    string
	DatabaseURL string
	JWTSecret   string
	MongoURL    string
}

// LoadConfig carga la configuración desde variables de entorno o valores por defecto.
func LoadConfig() (*Config, error) {
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Error loadibg .env file")
	}

	port := os.Getenv("API_SERVICE_PORT")
	logLevel := os.Getenv("API_SERVICE_LOG_LEVEL")
	natsURL := os.Getenv("NATS_URL")
	databaseURL := os.Getenv("DATABASE_URL")
	jwtSecret := os.Getenv("JWT_SECRET")
	mongoURL := os.Getenv("MONGO_URL")
	if mongoURL == "" {
		mongoURL = "mongodb://localhost:27017"
	}

	return &Config{
		HTTPPort:    port,
		NATSURL:     natsURL,
		LogLevel:    logLevel,
		DatabaseURL: databaseURL,
		JWTSecret:   jwtSecret,
		MongoURL:    mongoURL,
	}, nil
}

// Address devuelve la dirección completa de escucha del servidor HTTP.
func (c *Config) Address() string {
	return fmt.Sprintf(":%s", c.HTTPPort)
}
