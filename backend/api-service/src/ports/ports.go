package ports

import (
	"log/slog"

	"github.com/go/orchestrack/backend/api-service/src/cache"
	"github.com/go/orchestrack/backend/api-service/src/util"
	"github.com/go/orchestrack/backend/api-service/src/websocket"
	"github.com/gorilla/mux"
)

// Server expone las dependencias compartidas a los handlers.
type Server interface {
	Logger() *slog.Logger
	Config() *util.Config
	Registry() *cache.Registry
	ConnectionHistory() *cache.ConnectionHistory
	Hub() *websocket.Hub
	Start(binder func(s Server, r *mux.Router)) error
	Stop()
}
