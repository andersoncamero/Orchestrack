package events

import (
	"context"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
	"google.golang.org/protobuf/proto"
)

// NatsEventStore implementa EventStore usando NATS.
type NatsEventStore struct {
	conn *nats.Conn
}

// NewNats crea una nueva conexión a NATS.
func NewNats(url string) (*NatsEventStore, error) {
	conn, err := nats.Connect(url, nats.Timeout(5*time.Second))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to nats: %w", err)
	}
	return &NatsEventStore{conn: conn}, nil
}

// NewNatsWithOptions crea una nueva conexión a NATS configurando callbacks de Socket de Red.
func NewNatsWithOptions(url string, callbacks ConnectionCallbacks) (*NatsEventStore, error) {
	opts := []nats.Option{
		nats.Timeout(5 * time.Second),
	}

	if callbacks.OnDisconnect != nil {
		opts = append(opts, nats.DisconnectErrHandler(func(c *nats.Conn, err error) {
			callbacks.OnDisconnect(err)
		}))
	}

	if callbacks.OnReconnect != nil {
		opts = append(opts, nats.ReconnectHandler(func(c *nats.Conn) {
			callbacks.OnReconnect()
		}))
	}

	conn, err := nats.Connect(url, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to nats with options: %w", err)
	}
	return &NatsEventStore{conn: conn}, nil
}

// Publish envía un mensaje protobuf a un subject.
func (n *NatsEventStore) Publish(subject string, msg proto.Message) error {
	data, err := proto.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}
	return n.conn.Publish(subject, data)
}

// Request envía un request protobuf y deserializa la respuesta.
func (n *NatsEventStore) Request(ctx context.Context, subject string, req proto.Message, resp proto.Message) error {
	data, err := proto.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	msg, err := n.conn.RequestWithContext(ctx, subject, data)
	if err != nil {
		return fmt.Errorf("nats request failed: %w", err)
	}

	if err := proto.Unmarshal(msg.Data, resp); err != nil {
		return fmt.Errorf("failed to unmarshal response: %w", err)
	}
	return nil
}

// Subscribe se suscribe síncronamente a un subject.
func (n *NatsEventStore) Subscribe(subject string, handler func([]byte)) (*Subscription, error) {
	sub, err := n.conn.Subscribe(subject, func(msg *nats.Msg) {
		handler(msg.Data)
	})
	if err != nil {
		return nil, err
	}
	return &Subscription{Unsubscribe: sub.Unsubscribe}, nil
}

// SubscribeAsync se suscribe asíncronamente a un subject.
func (n *NatsEventStore) SubscribeAsync(subject string, handler func([]byte)) (*Subscription, error) {
	sub, err := n.conn.Subscribe(subject, func(msg *nats.Msg) {
		go handler(msg.Data)
	})
	if err != nil {
		return nil, err
	}
	return &Subscription{Unsubscribe: sub.Unsubscribe}, nil
}

// SubscribeRequest se suscribe a un subject y responde request-reply.
func (n *NatsEventStore) SubscribeRequest(subject string, handler func([]byte) []byte) (*Subscription, error) {
	sub, err := n.conn.Subscribe(subject, func(msg *nats.Msg) {
		resp := handler(msg.Data)
		if msg.Reply != "" && resp != nil {
			if err := n.conn.Publish(msg.Reply, resp); err != nil {
				// Log would require logger injection; silently ignore for now.
			}
		}
	})
	if err != nil {
		return nil, err
	}
	return &Subscription{Unsubscribe: sub.Unsubscribe}, nil
}

// Close cierra la conexión a NATS.
func (n *NatsEventStore) Close() error {
	if n.conn != nil {
		n.conn.Close()
	}
	return nil
}
