package system

import (
	systemPb "github.com/go/orchestrack/backend/proto/system"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"runtime"
	"strings"

)

const dedicatedUser = "orchestrack-agent"
const dedicatedHome = "/var/lib/orchestrack-agent"

// EnsureDedicatedUser crea el usuario dedicado si no existe (Linux + root).
// Es idempotente: si el usuario ya existe, no hace nada.
func EnsureDedicatedUser(logger *slog.Logger) error {
	if runtime.GOOS != "linux" {
		return nil
	}

	if os.Geteuid() != 0 {
		logger.Warn("not running as root, skipping dedicated user setup")
		return nil
	}

	if userExists(dedicatedUser) {
		logger.Info("dedicated user already exists", "user", dedicatedUser)
		return nil
	}

	logger.Info("creating dedicated user", "user", dedicatedUser, "home", dedicatedHome)

	cmd := exec.Command("useradd",
		"-r",
		"-s", "/bin/false",
		"-d", dedicatedHome,
		"-M",
		dedicatedUser,
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("useradd failed: %w\n%s", err, string(out))
	}

	if err := os.MkdirAll(dedicatedHome, 0755); err != nil {
		return fmt.Errorf("mkdir home failed: %w", err)
	}
	if err := os.Chown(dedicatedHome, 0, 0); err != nil {
		return fmt.Errorf("chown home failed: %w", err)
	}

	// Obtener UID del usuario recién creado para hacer chown con UID real
	idCmd := exec.Command("id", "-u", dedicatedUser)
	uidOut, err := idCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to get uid of new user: %w\n%s", err, string(uidOut))
	}

	// El usuario ya existe, podemos confiar en userExists + chown por nombre
	if err := os.Chown(dedicatedHome, -1, -1); err != nil {
		return fmt.Errorf("chown home failed: %w", err)
	}
	// Re-hacer chown por nombre vía exec
	chownCmd := exec.Command("chown", dedicatedUser+":", dedicatedHome)
	if out, err := chownCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("chown home by name failed: %w\n%s", err, string(out))
	}

	return nil
}

// ConfigureSudoers crea el archivo sudoers.d para el usuario dedicado (Linux + root).
func ConfigureSudoers(pm systemPb.PackageManager, logger *slog.Logger) error {
	if runtime.GOOS != "linux" {
		return nil
	}

	if os.Geteuid() != 0 {
		logger.Warn("not running as root, skipping sudoers configuration")
		return nil
	}

	lines := buildSudoersLines(pm)
	if len(lines) == 0 {
		logger.Warn("no sudoers lines for package manager, skipping", "pm", pm)
		return nil
	}

	content := strings.Join(lines, "\n") + "\n"
	path := "/etc/sudoers.d/orchestrack-agent"

	logger.Info("writing sudoers file", "path", path)

	if err := os.WriteFile(path, []byte(content), 0440); err != nil {
		return fmt.Errorf("failed to write sudoers file: %w", err)
	}

	return nil
}

// IsDedicatedUserConfigured devuelve true si el usuario dedicado existe en el sistema.
func IsDedicatedUserConfigured() bool {
	return userExists(dedicatedUser)
}

// buildSudoersLines genera las líneas de sudoers según el gestor de paquetes.
// Es una función pura para facilitar el testing.
func buildSudoersLines(pm systemPb.PackageManager) []string {
	switch pm {
	case systemPb.PackageManager_PACKAGE_MANAGER_APT:
		return []string{
			"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/apt-get",
			"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/dpkg-query",
		}
	case systemPb.PackageManager_PACKAGE_MANAGER_DNF:
		return []string{
			"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/dnf",
			"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/rpm",
		}
	case systemPb.PackageManager_PACKAGE_MANAGER_YUM:
		return []string{
			"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/yum",
			"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/rpm",
		}
	case systemPb.PackageManager_PACKAGE_MANAGER_PACMAN:
		return []string{
			"orchestrack-agent ALL=(ALL) NOPASSWD: /usr/bin/pacman",
		}
	case systemPb.PackageManager_PACKAGE_MANAGER_APK:
		return []string{
			"orchestrack-agent ALL=(ALL) NOPASSWD: /sbin/apk",
		}
	default:
		return nil
	}
}

// userExists verifica si un usuario existe en el sistema usando el comando id.
func userExists(name string) bool {
	cmd := exec.Command("id", "-u", name)
	if err := cmd.Run(); err != nil {
		return false
	}
	return true
}
