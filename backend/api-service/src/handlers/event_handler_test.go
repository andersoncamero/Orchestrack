package handlers

import (
	"testing"

	"github.com/go/orchestrack/backend/proto/docker"
)

func TestIsCriticalContainerEvent(t *testing.T) {
	cases := []struct {
		name      string
		eventType string
		exitCode  int32
		want      bool
	}{
		{"oom es crítico", "oom", 0, true},
		{"exit code positivo es crítico", "die", 1, true},
		{"exit code 137 (SIGKILL) es crítico", "die", 137, true},
		{"exit code negativo es crítico", "die", -1, true},
		{"die con exit code cero no es crítico", "die", 0, false},
		{"stop normal no es crítico", "stop", 0, false},
		{"start no es crítico", "start", 0, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isCriticalContainerEvent(tc.eventType, tc.exitCode); got != tc.want {
				t.Errorf("isCriticalContainerEvent(%q, %d) = %v, want %v", tc.eventType, tc.exitCode, got, tc.want)
			}
		})
	}
}

func TestBuildContainerEventAlert(t *testing.T) {
	event := &docker.ContainerEvent{
		ServiceId:     "svc-1",
		ContainerId:   "abc123",
		ContainerName: "nginx",
		EventType:     "die",
		ExitCode:      1,
		Reason:        "process exited",
	}

	alert := buildContainerEventAlert(event)

	if alert.DeviceID != "svc-1" {
		t.Errorf("DeviceID = %q, want %q", alert.DeviceID, "svc-1")
	}
	if alert.ContainerID != "abc123" {
		t.Errorf("ContainerID = %q, want %q", alert.ContainerID, "abc123")
	}
	if alert.Type != "container.die" {
		t.Errorf("Type = %q, want %q", alert.Type, "container.die")
	}
	if alert.IsRead {
		t.Error("IsRead = true, want false (alerta debe nacer no leída)")
	}
	if alert.Message == "" {
		t.Error("Message vacío, se esperaba un mensaje descriptivo")
	}
}

func TestBuildContainerEventAlertSinReason(t *testing.T) {
	event := &docker.ContainerEvent{
		ServiceId: "svc-1",
		EventType: "oom",
	}

	alert := buildContainerEventAlert(event)

	if alert.Type != "container.oom" {
		t.Errorf("Type = %q, want %q", alert.Type, "container.oom")
	}
	if alert.Message == "" {
		t.Error("Message vacío incluso sin reason")
	}
}
