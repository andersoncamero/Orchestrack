package events

import (
	"context"
	"time"

	"google.golang.org/protobuf/proto"
)

// EventStore define las operaciones del bus de eventos/mensajes.
type EventStore interface {
	Publish(subject string, msg proto.Message) error
	Request(ctx context.Context, subject string, req proto.Message, resp proto.Message) error
	Subscribe(subject string, handler func([]byte)) (*Subscription, error)
	SubscribeAsync(subject string, handler func([]byte)) (*Subscription, error)
	SubscribeRequest(subject string, handler func([]byte) []byte) (*Subscription, error)
	Close() error
}

// Subscription envuelve una suscripción para poder cerrarla.
type Subscription struct {
	Unsubscribe func() error
}

// ConnectionCallbacks define las funciones que se llamarán en eventos de socket de red.
type ConnectionCallbacks struct {
	OnDisconnect func(err error)
	OnReconnect  func()
}

var implementation EventStore

// SetEventStore inyecta la implementación concreta del bus de eventos.
func SetEventStore(store EventStore) {
	implementation = store
}

// Publish envía un mensaje a un subject.
func Publish(subject string, msg proto.Message) error {
	return implementation.Publish(subject, msg)
}

// Request envía un request y espera una respuesta.
func Request(ctx context.Context, subject string, req proto.Message, resp proto.Message) error {
	return implementation.Request(ctx, subject, req, resp)
}

// Subscribe se suscribe a un subject con handler síncrono.
func Subscribe(subject string, handler func([]byte)) (*Subscription, error) {
	return implementation.Subscribe(subject, handler)
}

// SubscribeAsync se suscribe a un subject con handler asíncrono.
func SubscribeAsync(subject string, handler func([]byte)) (*Subscription, error) {
	return implementation.SubscribeAsync(subject, handler)
}

// SubscribeRequest se suscribe a un subject con request-reply.
func SubscribeRequest(subject string, handler func([]byte) []byte) (*Subscription, error) {
	return implementation.SubscribeRequest(subject, handler)
}

// Close cierra el bus de eventos.
func Close() error {
	return implementation.Close()
}

// DefaultRequestTimeout es el tiempo máximo de espera por una respuesta.
const DefaultRequestTimeout = 10 * time.Second
