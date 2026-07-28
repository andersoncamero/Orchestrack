package system

import (
	"testing"

	"github.com/go/orchestrack/backend/proto/docker"
)

func TestBuildSudoersLines(t *testing.T) {
	tests := []struct {
		name     string
		pm       docker.PackageManager
		want     []string
		wantLen  int
	}{
		{
			name:    "apt",
			pm:      docker.PackageManager_PACKAGE_MANAGER_APT,
			wantLen: 2,
			want: []string{
				"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/apt-get",
				"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/dpkg-query",
			},
		},
		{
			name:    "dnf",
			pm:      docker.PackageManager_PACKAGE_MANAGER_DNF,
			wantLen: 2,
			want: []string{
				"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/dnf",
				"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/rpm",
			},
		},
		{
			name:    "yum",
			pm:      docker.PackageManager_PACKAGE_MANAGER_YUM,
			wantLen: 2,
			want: []string{
				"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/yum",
				"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/rpm",
			},
		},
		{
			name:    "pacman",
			pm:      docker.PackageManager_PACKAGE_MANAGER_PACMAN,
			wantLen: 1,
			want: []string{
				"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/pacman",
			},
		},
		{
			name:    "apk",
			pm:      docker.PackageManager_PACKAGE_MANAGER_APK,
			wantLen: 1,
			want: []string{
				"orchestrack-agent ALL=(ALL) NOPASSWD: /sbin/apk",
			},
		},
		{
			name:    "unspecified",
			pm:      docker.PackageManager_PACKAGE_MANAGER_UNSPECIFIED,
			wantLen: 0,
			want:    nil,
		},
		{
			name:    "brew",
			pm:      docker.PackageManager_PACKAGE_MANAGER_BREW,
			wantLen: 0,
			want:    nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildSudoersLines(tt.pm)
			if len(got) != tt.wantLen {
				t.Fatalf("buildSudoersLines(%v) returned %d lines, want %d", tt.pm, len(got), tt.wantLen)
			}
			for i, line := range got {
				if line != tt.want[i] {
					t.Errorf("line %d = %q, want %q", i, line, tt.want[i])
				}
			}
		})
	}
}

func TestUserExists(t *testing.T) {
	// root debería existir en cualquier sistema Unix-like
	if !userExists("root") {
		t.Error("userExists(\"root\") = false, expected true")
	}

	// Un usuario inexistente no debería existir
	if userExists("orchestrack-agent-nonexistent-12345") {
		t.Error("userExists(\"orchestrack-agent-nonexistent-12345\") = true, expected false")
	}
}

func TestIsDedicatedUserConfigured(t *testing.T) {
	// No podemos asumir que el usuario dedicado existe o no en el entorno de test,
	// pero sí podemos verificar que IsDedicatedUserConfigured es coherente con userExists.
	configured := IsDedicatedUserConfigured()
	expected := userExists(dedicatedUser)
	if configured != expected {
		t.Fatalf("IsDedicatedUserConfigured() = %v, but userExists(%q) = %v", configured, dedicatedUser, expected)
	}
}
