package websocket

import (
	"sync"

	"github.com/gorilla/websocket"
)

// Client representa una conexión WebSocket conectada al Hub.
type Client struct {
	hub      *Hub
	socket   *websocket.Conn
	outbound chan []byte
	rooms    map[string]bool
	mu       sync.RWMutex
}

// NewClient crea un nuevo cliente WebSocket.
func NewClient(hub *Hub, socket *websocket.Conn) *Client {
	return &Client{
		hub:      hub,
		socket:   socket,
		outbound: make(chan []byte, 256),
		rooms:    make(map[string]bool),
	}
}

// Write escribe mensajes del canal outbound hacia el socket.
func (c *Client) Write() {
	defer c.socket.Close()
	for {
		message, ok := <-c.outbound
		if !ok {
			c.socket.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}
		if err := c.socket.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}

// Join une al cliente a una sala.
func (c *Client) Join(room string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.rooms[room] = true
}

// Leave saca al cliente de una sala.
func (c *Client) Leave(room string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.rooms, room)
}

// IsInRoom verifica si el cliente está en una sala.
func (c *Client) IsInRoom(room string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.rooms[room]
}
