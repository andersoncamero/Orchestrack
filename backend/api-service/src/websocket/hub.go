package websocket

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// RoomMessage representa un mensaje destinado a una sala específica.
type RoomMessage struct {
	Room string
	Data []byte
}

// Hub mantiene el conjunto de clientes WebSocket conectados.
type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan RoomMessage
	mutex      sync.RWMutex
	logger     *slog.Logger
}

// NewHub crea una nueva instancia del Hub.
func NewHub(logger *slog.Logger) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client, 16),
		unregister: make(chan *Client, 16),
		broadcast:  make(chan RoomMessage, 256),
		logger:     logger,
	}
}

// Run inicia el bucle de gestión de clientes.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			h.logger.Debug("websocket client connected", "remote", client.socket.RemoteAddr().String(), "clients", len(h.clients))

		case client := <-h.unregister:
			h.removeClient(client)

		case message := <-h.broadcast:
			h.mutex.RLock()
			clients := make([]*Client, 0, len(h.clients))
			for client := range h.clients {
				clients = append(clients, client)
			}
			h.mutex.RUnlock()

			for _, client := range clients {
				if client.IsInRoom(message.Room) {
					select {
					case client.outbound <- message.Data:
					default:
						select {
						case h.unregister <- client:
						default:
							h.removeClient(client)
						}
					}
				}
			}
		}
	}
}

func (h *Hub) removeClient(client *Client) {
	h.mutex.Lock()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.outbound)
	}
	h.mutex.Unlock()
	client.socket.Close()
	h.logger.Debug("websocket client disconnected", "remote", client.socket.RemoteAddr().String(), "clients", len(h.clients))
}

// HandleWebSocket actualiza una petición HTTP a WebSocket y registra el cliente.
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	socket, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Warn("websocket upgrade failed", "error", err, "remote", r.RemoteAddr)
		return
	}

	client := NewClient(h, socket)

	select {
	case h.register <- client:
	default:
		h.logger.Warn("websocket register channel full, closing connection", "remote", r.RemoteAddr)
		socket.Close()
		return
	}

	// Suscribir a salas iniciales pasadas por query string
	roomsParam := r.URL.Query().Get("rooms")
	if roomsParam != "" {
		for _, roomName := range strings.Split(roomsParam, ",") {
			client.Join(strings.TrimSpace(roomName))
		}
	}

	go client.Write()

	// Leer mensajes hasta que el cliente cierre la conexión.
	defer func() {
		select {
		case h.unregister <- client:
		default:
			h.removeClient(client)
		}
	}()

	for {
		_, msg, err := socket.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				h.logger.Debug("websocket read error", "error", err, "remote", socket.RemoteAddr().String())
			}
			break
		}

		// Leer acciones para unirse o salir de salas dinámicamente
		var req struct {
			Action string `json:"action"`
			Room   string `json:"room"`
		}
		if err := json.Unmarshal(msg, &req); err == nil && req.Action != "" && req.Room != "" {
			switch req.Action {
			case "join":
				client.Join(req.Room)
				h.logger.Debug("client joined room", "room", req.Room, "remote", socket.RemoteAddr().String())
			case "leave":
				client.Leave(req.Room)
				h.logger.Debug("client left room", "room", req.Room, "remote", socket.RemoteAddr().String())
			}
		}
	}
}

// Broadcast envía un mensaje JSON a los clientes en una sala específica.
func (h *Hub) Broadcast(room string, message interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		h.logger.Warn("failed to marshal websocket message", "error", err)
		return
	}
	select {
	case h.broadcast <- RoomMessage{Room: room, Data: data}:
	default:
		h.logger.Warn("websocket broadcast channel full, dropping message")
	}
}

// BroadcastRaw envía bytes crudos a los clientes en una sala específica.
func (h *Hub) BroadcastRaw(room string, data []byte) {
	select {
	case h.broadcast <- RoomMessage{Room: room, Data: data}:
	default:
		h.logger.Warn("websocket broadcast channel full, dropping message")
	}
}
