package docker

import (
	"testing"
	"time"

	dockerevents "github.com/docker/docker/api/types/events"
)

func TestMapEventMessageToProtoDie(t *testing.T) {
	msg := dockerevents.Message{
		Type:   dockerevents.ContainerEventType,
		Action: dockerevents.ActionDie,
		Actor: dockerevents.Actor{
			ID: "abc123def456",
			Attributes: map[string]string{
				"name":     "web",
				"image":    "nginx:latest",
				"exitCode": "137",
			},
		},
		Time: 1700000000,
	}

	event := mapEventMessageToProto("svc-1", msg)
	if event == nil {
		t.Fatal("se esperaba un ContainerEvent, se obtuvo nil")
	}

	if event.ServiceId != "svc-1" {
		t.Errorf("ServiceId = %q, want %q", event.ServiceId, "svc-1")
	}
	if event.ContainerId != "abc123def456" {
		t.Errorf("ContainerId = %q, want %q", event.ContainerId, "abc123def456")
	}
	if event.ContainerName != "web" {
		t.Errorf("ContainerName = %q, want %q", event.ContainerName, "web")
	}
	if event.Image != "nginx:latest" {
		t.Errorf("Image = %q, want %q", event.Image, "nginx:latest")
	}
	if event.EventType != "die" {
		t.Errorf("EventType = %q, want %q", event.EventType, "die")
	}
	if event.ExitCode != 137 {
		t.Errorf("ExitCode = %d, want %d", event.ExitCode, 137)
	}
	if event.Timestamp != 1700000000 {
		t.Errorf("Timestamp = %d, want %d", event.Timestamp, 1700000000)
	}
}

func TestMapEventMessageToProtoDieExitCodeInvalido(t *testing.T) {
	msg := dockerevents.Message{
		Action: dockerevents.ActionDie,
		Actor: dockerevents.Actor{
			ID: "abc123",
			Attributes: map[string]string{
				"exitCode": "no-es-un-numero",
			},
		},
		Time: 1700000000,
	}

	event := mapEventMessageToProto("svc-1", msg)
	if event == nil {
		t.Fatal("se esperaba un ContainerEvent, se obtuvo nil")
	}
	if event.ExitCode != 0 {
		t.Errorf("ExitCode = %d, want 0 (exitCode inválido debe ignorarse)", event.ExitCode)
	}
}

func TestMapEventMessageToProtoExitCodeSoloEnDie(t *testing.T) {
	msg := dockerevents.Message{
		Action: dockerevents.ActionOOM,
		Actor: dockerevents.Actor{
			ID: "abc123",
			Attributes: map[string]string{
				"name":     "db",
				"image":    "postgres:16",
				"exitCode": "1",
			},
		},
		Time: 1700000000,
	}

	event := mapEventMessageToProto("svc-1", msg)
	if event == nil {
		t.Fatal("se esperaba un ContainerEvent, se obtuvo nil")
	}
	if event.EventType != "oom" {
		t.Errorf("EventType = %q, want %q", event.EventType, "oom")
	}
	if event.ExitCode != 0 {
		t.Errorf("ExitCode = %d, want 0 (el exit code solo aplica a eventos die)", event.ExitCode)
	}
}

func TestMapEventMessageToProtoHealthStatus(t *testing.T) {
	msg := dockerevents.Message{
		Action: dockerevents.ActionHealthStatusUnhealthy,
		Actor: dockerevents.Actor{
			ID: "abc123",
			Attributes: map[string]string{
				"name":  "api",
				"image": "api:1.2.3",
			},
		},
		Time: 1700000000,
	}

	event := mapEventMessageToProto("svc-1", msg)
	if event == nil {
		t.Fatal("se esperaba un ContainerEvent, se obtuvo nil")
	}
	// Para health_status se conserva la acción completa.
	if event.EventType != "health_status: unhealthy" {
		t.Errorf("EventType = %q, want %q", event.EventType, "health_status: unhealthy")
	}
	if event.ContainerName != "api" {
		t.Errorf("ContainerName = %q, want %q", event.ContainerName, "api")
	}
}

func TestMapEventMessageToProtoReason(t *testing.T) {
	cases := []struct {
		name  string
		attrs map[string]string
		want  string
	}{
		{"atributo error", map[string]string{"error": "OOMKilled"}, "OOMKilled"},
		{"atributo errorReason", map[string]string{"errorReason": "task: non-zero exit (1)"}, "task: non-zero exit (1)"},
		{"error tiene prioridad sobre errorReason", map[string]string{"error": "e1", "errorReason": "e2"}, "e1"},
		{"sin atributos de error", map[string]string{}, ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			msg := dockerevents.Message{
				Action: dockerevents.ActionDie,
				Actor:  dockerevents.Actor{ID: "abc123", Attributes: tc.attrs},
				Time:   1700000000,
			}
			event := mapEventMessageToProto("svc-1", msg)
			if event == nil {
				t.Fatal("se esperaba un ContainerEvent, se obtuvo nil")
			}
			if event.Reason != tc.want {
				t.Errorf("Reason = %q, want %q", event.Reason, tc.want)
			}
		})
	}
}

func TestMapEventMessageToProtoAccionesNoVigiladas(t *testing.T) {
	for _, action := range []string{"start", "create", "stop", "pause", "exec_create: ls", ""} {
		msg := dockerevents.Message{
			Action: dockerevents.Action(action),
			Actor:  dockerevents.Actor{ID: "abc123"},
			Time:   1700000000,
		}
		if event := mapEventMessageToProto("svc-1", msg); event != nil {
			t.Errorf("acción %q: se esperaba nil, se obtuvo %+v", action, event)
		}
	}
}

func TestMapEventMessageToProtoTodasLasAccionesVigiladas(t *testing.T) {
	for _, action := range watchedContainerActions {
		msg := dockerevents.Message{
			Action: dockerevents.Action(action),
			Actor:  dockerevents.Actor{ID: "abc123"},
			Time:   1700000000,
		}
		if event := mapEventMessageToProto("svc-1", msg); event == nil {
			t.Errorf("acción %q: se esperaba un ContainerEvent, se obtuvo nil", action)
		}
	}
}

func TestEventTimestamp(t *testing.T) {
	t.Run("usa Time cuando está presente", func(t *testing.T) {
		msg := dockerevents.Message{Time: 1700000000, TimeNano: 1700000000123456789}
		if got := eventTimestamp(msg); got != 1700000000 {
			t.Errorf("eventTimestamp = %d, want %d", got, 1700000000)
		}
	})

	t.Run("deriva de TimeNano si Time es cero", func(t *testing.T) {
		msg := dockerevents.Message{TimeNano: 1700000000123456789}
		if got := eventTimestamp(msg); got != 1700000000 {
			t.Errorf("eventTimestamp = %d, want %d", got, 1700000000)
		}
	})

	t.Run("fallback al tiempo actual", func(t *testing.T) {
		before := time.Now().Unix()
		got := eventTimestamp(dockerevents.Message{})
		after := time.Now().Unix()
		if got < before || got > after {
			t.Errorf("eventTimestamp = %d, se esperaba entre %d y %d", got, before, after)
		}
	})
}

func TestNextBackoff(t *testing.T) {
	if got := nextBackoff(1 * time.Second); got != 2*time.Second {
		t.Errorf("nextBackoff(1s) = %v, want 2s", got)
	}
	if got := nextBackoff(30 * time.Second); got != watchMaxBackoff {
		t.Errorf("nextBackoff(30s) = %v, want %v (tope)", got, watchMaxBackoff)
	}
	if got := nextBackoff(20 * time.Second); got != watchMaxBackoff {
		t.Errorf("nextBackoff(20s) = %v, want %v (tope)", got, watchMaxBackoff)
	}
}
