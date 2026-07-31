package engine

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/go/orchestrack/backend/api-service/src/models"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"gorm.io/gorm"
)

// mockRepo es una implementación mínima de repository.Repository para pruebas unitarias.
type mockRepo struct {
	device             *models.Device
	devices            []*models.Device
	openIncident       *models.Incident
	incidentByID       *models.Incident
	recentIncidents    []*models.Incident
	recentAlerts       []*models.Alert
	recentPropagations []*models.IncidentPropagation
	recentPaths        []*models.IncidentPropagationPath
	txs                []*models.AffectedTransaction
	serverTxs          []*models.ServerTransaction
	impacts            []*models.IncidentTransactionImpact
	dependencies       []*models.ServerDependency
	events             []*models.IncidentEvent
	containerEvents    int64
	openIncidentsCount int64

	insertedIncidents      []*models.Incident
	insertedIncidentEvents []*models.IncidentEvent
	insertedAlerts         []*models.Alert
	insertedPropagations   []*models.IncidentPropagation
	insertedPaths          []*models.IncidentPropagationPath
	insertedTxs            []*models.AffectedTransaction
	insertedServerTxs      []*models.ServerTransaction
	insertedImpacts        []*models.IncidentTransactionImpact
	insertedDependencies   []*models.ServerDependency
	upsertedDependencies   []*models.ServerDependency
	savedDevices           []*models.Device
}

func (m *mockRepo) InsertUser(ctx context.Context, user *models.User) error                          { return nil }
func (m *mockRepo) GetUserById(ctx context.Context, id string) (*models.User, error)                   { return nil, nil }
func (m *mockRepo) GetUserByEmail(ctx context.Context, email string) (*models.User, error)            { return nil, nil }
func (m *mockRepo) SaveDevice(ctx context.Context, device *models.Device) error {
	m.savedDevices = append(m.savedDevices, device)
	return nil
}
func (m *mockRepo) GetDeviceByServiceID(ctx context.Context, serviceID string) (*models.Device, error) { return m.device, nil }
func (m *mockRepo) ListDevices(ctx context.Context) ([]*models.Device, error)                           { return m.devices, nil }
func (m *mockRepo) InsertEvent(ctx context.Context, event *models.Event) error                          { return nil }
func (m *mockRepo) ListEventsByDevice(ctx context.Context, deviceID string, limit int) ([]*models.Event, error) { return nil, nil }
func (m *mockRepo) InsertContainerEvent(ctx context.Context, event *models.ContainerEvent) error       { return nil }
func (m *mockRepo) ListContainerEventsByContainer(ctx context.Context, deviceID, containerID string, limit, offset int) ([]*models.ContainerEvent, error) {
	return nil, nil
}
func (m *mockRepo) InsertAlert(ctx context.Context, alert *models.Alert) error {
	m.insertedAlerts = append(m.insertedAlerts, alert)
	return nil
}
func (m *mockRepo) ListRecentAlertsByDevice(ctx context.Context, deviceID string, types []string, since time.Time, limit int) ([]*models.Alert, error) {
	return m.recentAlerts, nil
}
func (m *mockRepo) InsertDeviceNetworkMetric(ctx context.Context, metric *models.DeviceNetworkMetric) error { return nil }
func (m *mockRepo) ListDeviceNetworkMetrics(ctx context.Context, deviceID string, limit int) ([]*models.DeviceNetworkMetric, error) {
	return nil, nil
}
func (m *mockRepo) GetSystemSetting(ctx context.Context, key string) (string, error)                   { return "", nil }
func (m *mockRepo) SetSystemSetting(ctx context.Context, key, value string) error                       { return nil }
func (m *mockRepo) CleanupOldDeviceNetworkMetrics(ctx context.Context, retentionDays int) (int64, error) { return 0, nil }
func (m *mockRepo) CreateRegistrationToken(ctx context.Context, token *models.RegistrationToken) error   { return nil }
func (m *mockRepo) GetRegistrationToken(ctx context.Context, tokenStr string) (*models.RegistrationToken, error) { return nil, nil }
func (m *mockRepo) UpdateRegistrationToken(ctx context.Context, token *models.RegistrationToken) error    { return nil }
func (m *mockRepo) DeleteExpiredRegistrationTokens(ctx context.Context) error                              { return nil }
func (m *mockRepo) InsertIncident(ctx context.Context, incident *models.Incident) error {
	m.insertedIncidents = append(m.insertedIncidents, incident)
	return nil
}
func (m *mockRepo) UpdateIncident(ctx context.Context, incident *models.Incident) error { return nil }
func (m *mockRepo) GetIncidentByID(ctx context.Context, id string) (*models.Incident, error) {
	if m.incidentByID != nil {
		return m.incidentByID, nil
	}
	return nil, nil
}
func (m *mockRepo) GetOpenIncidentByDevice(ctx context.Context, deviceID string) (*models.Incident, error) {
	return m.openIncident, nil
}
func (m *mockRepo) ListIncidents(ctx context.Context, deviceID, status string, limit int) ([]*models.Incident, error) {
	return nil, nil
}
func (m *mockRepo) InsertIncidentEvent(ctx context.Context, event *models.IncidentEvent) error {
	m.insertedIncidentEvents = append(m.insertedIncidentEvents, event)
	return nil
}
func (m *mockRepo) ListIncidentEvents(ctx context.Context, incidentID string) ([]*models.IncidentEvent, error) {
	return m.events, nil
}
func (m *mockRepo) InsertIncidentPropagation(ctx context.Context, propagation *models.IncidentPropagation) error {
	m.insertedPropagations = append(m.insertedPropagations, propagation)
	return nil
}
func (m *mockRepo) ListIncidentPropagations(ctx context.Context, incidentID string) ([]*models.IncidentPropagation, error) {
	return m.recentPropagations, nil
}
func (m *mockRepo) ListRecentIncidentsByType(ctx context.Context, excludeDeviceID string, eventTypes []string, since time.Time, limit int) ([]*models.Incident, error) {
	return m.recentIncidents, nil
}
func (m *mockRepo) CountOpenIncidents(ctx context.Context) (int64, error)                         { return m.openIncidentsCount, nil }
func (m *mockRepo) CountOpenContainerEvents(ctx context.Context, deviceIDs []string, since time.Time) (int64, error) {
	return m.containerEvents, nil
}
func (m *mockRepo) UpsertServerDependency(ctx context.Context, dep *models.ServerDependency) error {
	m.upsertedDependencies = append(m.upsertedDependencies, dep)
	return nil
}
func (m *mockRepo) ListServerDependencies(ctx context.Context) ([]*models.ServerDependency, error)            { return m.dependencies, nil }
func (m *mockRepo) GetServerDependenciesForDevice(ctx context.Context, deviceID string) ([]*models.ServerDependency, error) {
	return nil, nil
}
func (m *mockRepo) InsertIncidentPropagationPath(ctx context.Context, path *models.IncidentPropagationPath) error {
	m.insertedPaths = append(m.insertedPaths, path)
	return nil
}
func (m *mockRepo) ListIncidentPropagationPaths(ctx context.Context, incidentID string) ([]*models.IncidentPropagationPath, error) {
	return m.recentPaths, nil
}
func (m *mockRepo) InsertAffectedTransaction(ctx context.Context, tx *models.AffectedTransaction) error {
	m.insertedTxs = append(m.insertedTxs, tx)
	return nil
}
func (m *mockRepo) ListAffectedTransactions(ctx context.Context, incidentID string) ([]*models.AffectedTransaction, error) {
	return m.txs, nil
}
func (m *mockRepo) CountAffectedTransactionsByCategory(ctx context.Context, incidentID string) (map[string]int64, error) {
	return nil, nil
}
func (m *mockRepo) InsertServerTransaction(ctx context.Context, st *models.ServerTransaction) error {
	m.insertedServerTxs = append(m.insertedServerTxs, st)
	return nil
}
func (m *mockRepo) GetOrCreateServerTransaction(ctx context.Context, deviceID, serviceName, endpoint string) (*models.ServerTransaction, error) {
	return nil, nil
}
func (m *mockRepo) GetServerTransactionByID(ctx context.Context, id string) (*models.ServerTransaction, error) { return nil, nil }
func (m *mockRepo) ListServerTransactionsByDevice(ctx context.Context, deviceID string) ([]*models.ServerTransaction, error) {
	return m.serverTxs, nil
}
func (m *mockRepo) InsertIncidentTransactionImpact(ctx context.Context, iti *models.IncidentTransactionImpact) error {
	m.insertedImpacts = append(m.insertedImpacts, iti)
	return nil
}
func (m *mockRepo) ListIncidentTransactionImpacts(ctx context.Context, incidentID string) ([]*models.IncidentTransactionImpact, error) {
	return m.impacts, nil
}
func (m *mockRepo) InsertContainerDependency(ctx context.Context, dep *models.ContainerDependency) error { return nil }
func (m *mockRepo) DeleteContainerDependenciesByDevice(ctx context.Context, deviceID string) error        { return nil }
func (m *mockRepo) ListContainerDependenciesByDevice(ctx context.Context, deviceID string) ([]*models.ContainerDependency, error) {
	return nil, nil
}
func (m *mockRepo) InsertIncidentEvidence(ctx context.Context, evidence *models.IncidentEvidence) error { return nil }
func (m *mockRepo) GetIncidentEvidenceByIncidentID(ctx context.Context, incidentID string) ([]*models.IncidentEvidence, error) {
	return nil, nil
}
func (m *mockRepo) Close() error { return nil }

func setupMockRepo(mock *mockRepo) {
	repository.SetRepository(mock)
	engineInstance = nil
	once = sync.Once{}
}

func TestProcessContainerEvent_CreatesIncidentWithContainerAsRootCause(t *testing.T) {
	mock := &mockRepo{}
	setupMockRepo(mock)
	eng := GetCorrelationEngine()
	eng.SetHub(nil)

	event := &models.ContainerEvent{
		DeviceID:      "dev-1",
		ContainerID:   "c123",
		ContainerName: "nginx",
		EventType:     "oom",
		ExitCode:      137,
		Model:         gorm.Model{CreatedAt: time.Now()},
	}

	err := eng.ProcessContainerEvent(context.Background(), "dev-1", event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(mock.insertedIncidents) != 1 {
		t.Fatalf("expected 1 incident, got %d", len(mock.insertedIncidents))
	}
	inc := mock.insertedIncidents[0]
	if inc.RootCauseType != "container_oom" {
		t.Errorf("expected root cause type container_oom, got %s", inc.RootCauseType)
	}
	if len(mock.insertedIncidentEvents) != 1 {
		t.Fatalf("expected 1 incident event, got %d", len(mock.insertedIncidentEvents))
	}
}

func TestProcessContainerEvent_CreatesIncidentWithHostAlertAsRootCause(t *testing.T) {
	alertTime := time.Now().Add(-30 * time.Second)
	mock := &mockRepo{
		recentAlerts: []*models.Alert{
			{Model: gorm.Model{ID: 42, CreatedAt: alertTime}, Type: "host.memory.high", Message: "Memory >95%", DeviceID: "dev-1"},
		},
	}
	setupMockRepo(mock)
	eng := GetCorrelationEngine()
	eng.SetHub(nil)

	event := &models.ContainerEvent{
		DeviceID:      "dev-1",
		ContainerID:   "c123",
		ContainerName: "nginx",
		EventType:     "oom",
		ExitCode:      137,
		Model:         gorm.Model{CreatedAt: time.Now()},
	}

	err := eng.ProcessContainerEvent(context.Background(), "dev-1", event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(mock.insertedIncidents) != 1 {
		t.Fatalf("expected 1 incident, got %d", len(mock.insertedIncidents))
	}
	inc := mock.insertedIncidents[0]
	if inc.RootCauseType != "host.memory.high" {
		t.Errorf("expected root cause type host.memory.high, got %s", inc.RootCauseType)
	}
	if inc.RootCauseEventID != "42" {
		t.Errorf("expected root cause event id 42, got %s", inc.RootCauseEventID)
	}
	if len(mock.insertedIncidentEvents) != 2 {
		t.Fatalf("expected 2 incident events (root + derived), got %d", len(mock.insertedIncidentEvents))
	}
	if mock.insertedIncidentEvents[0].EventType != "host.memory.high" {
		t.Errorf("expected first event type host.memory.high, got %s", mock.insertedIncidentEvents[0].EventType)
	}
	if mock.insertedIncidentEvents[1].EventType != "oom" {
		t.Errorf("expected second event type oom, got %s", mock.insertedIncidentEvents[1].EventType)
	}
}

func TestProcessContainerEvent_AppendsToOpenIncident(t *testing.T) {
	mock := &mockRepo{
		openIncident: &models.Incident{
			ID:            "inc-1",
			DeviceID:      "dev-1",
			Status:        "open",
			RootCauseType: "container_oom",
			Events: []models.IncidentEvent{
				{IncidentID: "inc-1", EventType: "oom", SequenceOrder: 1},
			},
		},
	}
	setupMockRepo(mock)
	eng := GetCorrelationEngine()
	eng.SetHub(nil)

	event := &models.ContainerEvent{
		DeviceID:      "dev-1",
		ContainerID:   "c456",
		ContainerName: "redis",
		EventType:     "die",
		ExitCode:      1,
		Model:         gorm.Model{CreatedAt: time.Now()},
	}

	err := eng.ProcessContainerEvent(context.Background(), "dev-1", event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(mock.insertedIncidents) != 0 {
		t.Errorf("expected no new incident, got %d", len(mock.insertedIncidents))
	}
	if len(mock.insertedIncidentEvents) != 1 {
		t.Fatalf("expected 1 appended incident event, got %d", len(mock.insertedIncidentEvents))
	}
	if mock.insertedIncidentEvents[0].SequenceOrder != 2 {
		t.Errorf("expected sequence order 2, got %d", mock.insertedIncidentEvents[0].SequenceOrder)
	}
}

func TestHostAlertPrecedence_OOM(t *testing.T) {
	eng := &IncidentCorrelationEngine{}
	types := eng.hostAlertPrecedence("oom")
	expected := []string{"host.memory.high", "host.cpu.high", "high_latency"}
	if len(types) != len(expected) {
		t.Fatalf("expected %v, got %v", expected, types)
	}
	for i, v := range expected {
		if types[i] != v {
			t.Errorf("expected precedence[%d] = %s, got %s", i, v, types[i])
		}
	}
}

func TestHostAlertPrecedence_Die(t *testing.T) {
	eng := &IncidentCorrelationEngine{}
	types := eng.hostAlertPrecedence("die")
	expected := []string{"host.cpu.high", "host.memory.high", "host.disk.high", "high_latency"}
	if len(types) != len(expected) {
		t.Fatalf("expected %v, got %v", expected, types)
	}
	for i, v := range expected {
		if types[i] != v {
			t.Errorf("expected precedence[%d] = %s, got %s", i, v, types[i])
		}
	}
}
