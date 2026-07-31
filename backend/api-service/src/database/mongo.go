package database

import (
	"context"
	"time"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type mongoDeviceNetworkMetric struct {
	ID                string    `bson:"_id"`
	DeviceID          string    `bson:"device_id"`
	RxBytesPerSec     float64   `bson:"rx_bytes_per_sec"`
	TxBytesPerSec     float64   `bson:"tx_bytes_per_sec"`
	PacketsRecvPerSec float64   `bson:"packets_recv_per_sec"`
	PacketsSentPerSec float64   `bson:"packets_sent_per_sec"`
	RttMs             float64   `bson:"rtt_ms"`
	RecordedAt        time.Time `bson:"recorded_at"`
}

func toMongoMetric(m *models.DeviceNetworkMetric) *mongoDeviceNetworkMetric {
	return &mongoDeviceNetworkMetric{
		ID:                m.ID,
		DeviceID:          m.DeviceID,
		RxBytesPerSec:     m.RxBytesPerSec,
		TxBytesPerSec:     m.TxBytesPerSec,
		PacketsRecvPerSec: m.PacketsRecvPerSec,
		PacketsSentPerSec: m.PacketsSentPerSec,
		RttMs:             m.RttMs,
		RecordedAt:        m.RecordedAt,
	}
}

func toModelMetric(m *mongoDeviceNetworkMetric) *models.DeviceNetworkMetric {
	return &models.DeviceNetworkMetric{
		ID:                m.ID,
		DeviceID:          m.DeviceID,
		RxBytesPerSec:     m.RxBytesPerSec,
		TxBytesPerSec:     m.TxBytesPerSec,
		PacketsRecvPerSec: m.PacketsRecvPerSec,
		PacketsSentPerSec: m.PacketsSentPerSec,
		RttMs:             m.RttMs,
		RecordedAt:        m.RecordedAt,
	}
}

// ConnectMongoDB inicializa la conexión con MongoDB y configura el índice TTL para métricas.
func ConnectMongoDB(mongoURL string) (*mongo.Client, *mongo.Collection, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURL))
	if err != nil {
		return nil, nil, err
	}

	if err := mongoClient.Ping(ctx, nil); err != nil {
		return nil, nil, err
	}

	mongoColl := mongoClient.Database("orchestrack").Collection("device_network_metrics")

	// Crear TTL index para expiración automática (24 horas)
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "recorded_at", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(24 * 3600),
	}
	_, _ = mongoColl.Indexes().CreateOne(ctx, indexModel)

	return mongoClient, mongoColl, nil
}

// InsertDeviceNetworkMetric guarda una muestra de métricas de red y latencia en MongoDB.
func (repo *PostgresRepository) InsertDeviceNetworkMetric(ctx context.Context, metric *models.DeviceNetworkMetric) error {
	if metric.ID == "" {
		metric.ID = uuid.New().String()
	}
	if metric.RecordedAt.IsZero() {
		metric.RecordedAt = time.Now()
	}
	_, err := repo.mongoColl.InsertOne(ctx, toMongoMetric(metric))
	return err
}

// ListDeviceNetworkMetrics consulta el historial de métricas de red y latencia por servidor en MongoDB.
func (repo *PostgresRepository) ListDeviceNetworkMetrics(ctx context.Context, deviceID string, limit int) ([]*models.DeviceNetworkMetric, error) {
	if limit <= 0 {
		limit = 50
	}
	var results []*mongoDeviceNetworkMetric
	opts := options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "recorded_at", Value: -1}})
	cursor, err := repo.mongoColl.Find(ctx, bson.M{"device_id": deviceID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	modelMetrics := make([]*models.DeviceNetworkMetric, len(results))
	for i, r := range results {
		modelMetrics[i] = toModelMetric(r)
	}
	return modelMetrics, nil
}

// CleanupOldDeviceNetworkMetrics elimina métricas de red antiguas según los días de retención especificados en MongoDB.
func (repo *PostgresRepository) CleanupOldDeviceNetworkMetrics(ctx context.Context, retentionDays int) (int64, error) {
	if retentionDays <= 0 {
		retentionDays = 7 // Valor por defecto seguro
	}
	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	res, err := repo.mongoColl.DeleteMany(ctx, bson.M{"recorded_at": bson.M{"$lt": cutoff}})
	if err != nil {
		return 0, err
	}
	return res.DeletedCount, nil
}
