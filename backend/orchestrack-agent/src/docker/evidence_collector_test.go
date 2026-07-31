package docker

import (
	"context"
	"testing"
)

func TestCollectDockerDaemonLogs(t *testing.T) {
	// collectDockerDaemonLogs is best effort and should return a string under any circumstances (never crash)
	logs := collectDockerDaemonLogs()
	if logs == "" {
		t.Error("expected non-empty log output/status message")
	}
}

func TestCollectEvidenceGracefulNoContainer(t *testing.T) {
	ctx := context.Background()
	bundle, err := CollectEvidence(ctx, "test-device", "", "test-container")
	if err != nil {
		t.Fatalf("expected no error during graceful collection without docker client setup, got %v", err)
	}

	if bundle == nil {
		t.Fatal("expected non-nil bundle")
	}

	if bundle.DeviceID != "test-device" {
		t.Errorf("expected DeviceID 'test-device', got %s", bundle.DeviceID)
	}
}
