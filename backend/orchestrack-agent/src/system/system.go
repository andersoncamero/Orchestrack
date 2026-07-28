package system

import (
	"bufio"
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/go/orchestrack/backend/proto/docker"
)

// DetectPackageManager determina el gestor de paquetes disponible en el host.
func DetectPackageManager() docker.PackageManager {
	switch runtime.GOOS {
	case "darwin":
		if commandExists("brew") {
			return docker.PackageManager_PACKAGE_MANAGER_BREW
		}
	case "windows":
		if commandExists("winget") {
			return docker.PackageManager_PACKAGE_MANAGER_WINGET
		}
		if commandExists("choco") {
			return docker.PackageManager_PACKAGE_MANAGER_CHOCO
		}
	case "linux":
		if commandExists("apt-get") || commandExists("apt") {
			return docker.PackageManager_PACKAGE_MANAGER_APT
		}
		if commandExists("dnf") {
			return docker.PackageManager_PACKAGE_MANAGER_DNF
		}
		if commandExists("yum") {
			return docker.PackageManager_PACKAGE_MANAGER_YUM
		}
		if commandExists("pacman") {
			return docker.PackageManager_PACKAGE_MANAGER_PACMAN
		}
		if commandExists("apk") {
			return docker.PackageManager_PACKAGE_MANAGER_APK
		}
	}
	return docker.PackageManager_PACKAGE_MANAGER_UNSPECIFIED
}

// GetSystemInfo devuelve información básica del sistema operativo.
func GetSystemInfo() *docker.SystemInfo {
	pm := DetectPackageManager()
	return &docker.SystemInfo{
		Os:               runtime.GOOS,
		Architecture:     runtime.GOARCH,
		PackageManager:   pm,
	}
}

// ListPackages lista los paquetes instalados según el gestor detectado.
func ListPackages(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error) {
	pm := DetectPackageManager()
	switch pm {
	case docker.PackageManager_PACKAGE_MANAGER_APT:
		return listPackagesApt(ctx, query, upgradableOnly)
	case docker.PackageManager_PACKAGE_MANAGER_DNF, docker.PackageManager_PACKAGE_MANAGER_YUM:
		return listPackagesRpm(ctx, query, upgradableOnly)
	case docker.PackageManager_PACKAGE_MANAGER_PACMAN:
		return listPackagesPacman(ctx, query, upgradableOnly)
	case docker.PackageManager_PACKAGE_MANAGER_APK:
		return listPackagesApk(ctx, query, upgradableOnly)
	case docker.PackageManager_PACKAGE_MANAGER_BREW:
		return listPackagesBrew(ctx, query, upgradableOnly)
	case docker.PackageManager_PACKAGE_MANAGER_CHOCO:
		return listPackagesChoco(ctx, query, upgradableOnly)
	case docker.PackageManager_PACKAGE_MANAGER_WINGET:
		return listPackagesWinget(ctx, query, upgradableOnly)
	default:
		return nil, fmt.Errorf("unsupported package manager for OS %s", runtime.GOOS)
	}
}

// RefreshPackages actualiza la lista de paquetes disponibles.
func RefreshPackages(ctx context.Context, dryRun bool) (*docker.RefreshPackagesResponse, error) {
	pm := DetectPackageManager()
	cmd := refreshCommand(pm, dryRun)
	if cmd == nil {
		return nil, fmt.Errorf("unsupported package manager for refresh")
	}

	output, err := runPrivilegedCommand(ctx, cmd[0], cmd[1:]...)
	resp := &docker.RefreshPackagesResponse{
		Success: err == nil,
		Output:  output,
	}
	if err != nil {
		return resp, err
	}

	// Tras refrescar, detectar paquetes con actualización disponible.
	upgradable, err := ListPackages(ctx, "", true)
	if err == nil {
		resp.UpgradablePackages = upgradable
		resp.UpgradableCount = int32(len(upgradable))
	}
	return resp, nil
}

// UpgradePackages instala las actualizaciones disponibles.
func UpgradePackages(ctx context.Context, dryRun, autoConfirm bool, packages []string) (*docker.UpgradePackagesResponse, error) {
	pm := DetectPackageManager()
	cmd := upgradeCommand(pm, dryRun, autoConfirm, packages)
	if cmd == nil {
		return nil, fmt.Errorf("unsupported package manager for upgrade")
	}

	output, err := runPrivilegedCommand(ctx, cmd[0], cmd[1:]...)
	resp := &docker.UpgradePackagesResponse{
		Success: err == nil,
		Output:  output,
	}
	if err != nil {
		return resp, err
	}

	// Estimación básica de cambios (el parsing exacto varía mucho entre gestores).
	resp.UpgradedCount = estimateCount(output, "upgraded", "upgrading")
	resp.InstalledCount = estimateCount(output, "installed", "installing")
	resp.RemovedCount = estimateCount(output, "removed", "removing")
	return resp, nil
}

// RemovePackages elimina los paquetes indicados del sistema.
func RemovePackages(ctx context.Context, packages []string, purge, autoConfirm, dryRun bool) (*docker.RemovePackagesResponse, error) {
	if len(packages) == 0 {
		return nil, fmt.Errorf("no packages specified for removal")
	}
	pm := DetectPackageManager()
	cmd := removeCommand(pm, purge, autoConfirm, dryRun, packages)
	if cmd == nil {
		return nil, fmt.Errorf("unsupported package manager for remove")
	}

	output, err := runPrivilegedCommand(ctx, cmd[0], cmd[1:]...)
	resp := &docker.RemovePackagesResponse{
		Success: err == nil,
		Output:  output,
	}
	if err != nil {
		return resp, err
	}

	resp.RemovedCount = int32(len(packages))
	return resp, nil
}

// ---------- Helpers de detección y ejecución ----------

func commandExists(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

func isRoot() bool {
	return os.Geteuid() == 0
}

func runCommand(ctx context.Context, name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	path, lookErr := exec.LookPath(name)
	if lookErr != nil {
		slog.Warn("command not found in PATH", "command", name, "error", lookErr)
		return "", fmt.Errorf("command %q not found in PATH: %w", name, lookErr)
	}

	cmd := exec.CommandContext(ctx, path, args...)
	out, err := cmd.CombinedOutput()
	output := string(out)
	if err != nil {
		slog.Warn("command failed", "command", name, "args", args, "error", err, "output", output)
	}
	return output, err
}

// runPrivilegedCommand ejecuta un comando y, si falla por permisos y no somos root,
// reintenta con sudo -n (non-interactive).
func runPrivilegedCommand(ctx context.Context, name string, args ...string) (string, error) {
	output, err := runCommand(ctx, name, args...)
	if err == nil {
		return output, nil
	}

	if isRoot() {
		return output, err
	}

	// Si sudo no está disponible, devolvemos el error original.
	if _, sudoErr := exec.LookPath("sudo"); sudoErr != nil {
		return output, err
	}

	slog.Info("retrying command with sudo", "command", name, "args", args)
	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	var sudoArgs []string
	if runtime.GOOS == "linux" && IsDedicatedUserConfigured() {
		sudoArgs = append([]string{"-n", "-u", dedicatedUser, name}, args...)
	} else {
		sudoArgs = append([]string{"-n", name}, args...)
	}
	cmd := exec.CommandContext(ctx, "sudo", sudoArgs...)
	out, sudoRunErr := cmd.CombinedOutput()
	sudoOutput := string(out)
	if sudoRunErr != nil {
		slog.Warn("privileged command failed", "command", name, "args", args, "error", sudoRunErr, "output", sudoOutput)
		// Devolvemos un error combinado que incluya el output para diagnóstico.
		return sudoOutput, fmt.Errorf("%v (sudo fallback: %v)\n%s", err, sudoRunErr, strings.TrimSpace(sudoOutput))
	}
	return sudoOutput, nil
}

func refreshCommand(pm docker.PackageManager, dryRun bool) []string {
	switch pm {
	case docker.PackageManager_PACKAGE_MANAGER_APT:
		if dryRun {
			return []string{"apt-get", "update", "--dry-run"}
		}
		return []string{"apt-get", "update"}
	case docker.PackageManager_PACKAGE_MANAGER_DNF:
		return []string{"dnf", "check-update"}
	case docker.PackageManager_PACKAGE_MANAGER_YUM:
		return []string{"yum", "check-update"}
	case docker.PackageManager_PACKAGE_MANAGER_PACMAN:
		return []string{"pacman", "-Sy"}
	case docker.PackageManager_PACKAGE_MANAGER_APK:
		return []string{"apk", "update"}
	case docker.PackageManager_PACKAGE_MANAGER_BREW:
		return []string{"brew", "update"}
	case docker.PackageManager_PACKAGE_MANAGER_CHOCO:
		return []string{"choco", "outdated"}
	case docker.PackageManager_PACKAGE_MANAGER_WINGET:
		return []string{"winget", "upgrade"}
	default:
		return nil
	}
}

func upgradeCommand(pm docker.PackageManager, dryRun, autoConfirm bool, packages []string) []string {
	switch pm {
	case docker.PackageManager_PACKAGE_MANAGER_APT:
		args := []string{"apt-get", "upgrade"}
		if dryRun {
			args = append(args, "--dry-run")
		}
		if autoConfirm {
			args = append(args, "-y")
		}
		if len(packages) > 0 {
			args = append(args, packages...)
		}
		return args
	case docker.PackageManager_PACKAGE_MANAGER_DNF:
		args := []string{"dnf", "upgrade"}
		if dryRun {
			args = append(args, "--assumeno")
		} else if autoConfirm {
			args = append(args, "-y")
		}
		if len(packages) > 0 {
			args = append(args, packages...)
		}
		return args
	case docker.PackageManager_PACKAGE_MANAGER_YUM:
		args := []string{"yum", "update"}
		if dryRun {
			args = append(args, "--assumeno")
		} else if autoConfirm {
			args = append(args, "-y")
		}
		if len(packages) > 0 {
			args = append(args, packages...)
		}
		return args
	case docker.PackageManager_PACKAGE_MANAGER_PACMAN:
		args := []string{"pacman", "-Su"}
		if dryRun {
			args = append(args, "--print")
		} else if autoConfirm {
			args = append(args, "--noconfirm")
		}
		if len(packages) > 0 {
			args = append(args, packages...)
		}
		return args
	case docker.PackageManager_PACKAGE_MANAGER_APK:
		args := []string{"apk", "upgrade"}
		if dryRun {
			args = append(args, "--simulate")
		}
		if len(packages) > 0 {
			args = append(args, packages...)
		}
		return args
	case docker.PackageManager_PACKAGE_MANAGER_BREW:
		args := []string{"brew", "upgrade"}
		if dryRun {
			args = append(args, "--dry-run")
		}
		if len(packages) > 0 {
			args = append(args, packages...)
		}
		return args
	case docker.PackageManager_PACKAGE_MANAGER_CHOCO:
		args := []string{"choco", "upgrade"}
		if dryRun {
			args = append(args, "--what-if")
		} else if autoConfirm {
			args = append(args, "-y")
		}
		if len(packages) > 0 {
			args = append(args, packages...)
		} else {
			args = append(args, "all")
		}
		return args
	case docker.PackageManager_PACKAGE_MANAGER_WINGET:
		args := []string{"winget", "upgrade"}
		if dryRun {
			args = append(args, "--what-if")
		} else {
			args = append(args, "--all", "--accept-package-agreements", "--accept-source-agreements")
		}
		return args
	default:
		return nil
	}
}

func removeCommand(pm docker.PackageManager, purge, autoConfirm, dryRun bool, packages []string) []string {
	switch pm {
	case docker.PackageManager_PACKAGE_MANAGER_APT:
		action := "remove"
		if purge {
			action = "purge"
		}
		args := []string{"apt-get", action}
		if dryRun {
			args = append(args, "--dry-run")
		}
		if autoConfirm {
			args = append(args, "-y")
		}
		args = append(args, packages...)
		return args
	case docker.PackageManager_PACKAGE_MANAGER_DNF:
		args := []string{"dnf", "remove"}
		if dryRun {
			args = append(args, "--assumeno")
		} else if autoConfirm {
			args = append(args, "-y")
		}
		args = append(args, packages...)
		return args
	case docker.PackageManager_PACKAGE_MANAGER_YUM:
		args := []string{"yum", "remove"}
		if dryRun {
			args = append(args, "--assumeno")
		} else if autoConfirm {
			args = append(args, "-y")
		}
		args = append(args, packages...)
		return args
	case docker.PackageManager_PACKAGE_MANAGER_PACMAN:
		args := []string{"pacman", "-R"}
		if purge {
			args = []string{"pacman", "-Rn"}
		}
		if dryRun {
			args = append(args, "--print")
		} else if autoConfirm {
			args = append(args, "--noconfirm")
		}
		args = append(args, packages...)
		return args
	case docker.PackageManager_PACKAGE_MANAGER_APK:
		args := []string{"apk", "del"}
		if dryRun {
			args = append(args, "--simulate")
		}
		args = append(args, packages...)
		return args
	case docker.PackageManager_PACKAGE_MANAGER_BREW:
		args := []string{"brew", "uninstall"}
		if dryRun {
			args = append(args, "--dry-run")
		}
		args = append(args, packages...)
		return args
	case docker.PackageManager_PACKAGE_MANAGER_CHOCO:
		args := []string{"choco", "uninstall"}
		if dryRun {
			args = append(args, "--what-if")
		} else if autoConfirm {
			args = append(args, "-y")
		}
		args = append(args, packages...)
		return args
	case docker.PackageManager_PACKAGE_MANAGER_WINGET:
		args := []string{"winget", "uninstall"}
		if dryRun {
			args = append(args, "--what-if")
		}
		args = append(args, packages...)
		return args
	default:
		return nil
	}
}

func estimateCount(output string, singular, plural string) int32 {
	count := int32(0)
	lower := strings.ToLower(output)
	for _, term := range []string{singular, plural, "updated", "update"} {
		count += int32(strings.Count(lower, term))
	}
	if count > 0 {
		return count
	}
	return 0
}

func matchesQuery(name, query string) bool {
	if query == "" {
		return true
	}
	return strings.Contains(strings.ToLower(name), strings.ToLower(query))
}

// ---------- Listado por gestor de paquetes ----------

func listPackagesApt(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error) {
	args := []string{"-W", "-f=${Package}\t${Version}\t${Architecture}\t${Installed-Size}\t${Status}\t${Source}\n"}
	output, err := runCommand(ctx, "dpkg-query", args...)
	if err != nil {
		return nil, err
	}

	var packages []*docker.SystemPackage
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		fields := strings.Split(scanner.Text(), "\t")
		if len(fields) < 5 {
			continue
		}
		name := fields[0]
		if !matchesQuery(name, query) {
			continue
		}
		size, _ := strconv.ParseInt(fields[3], 10, 64)
		packages = append(packages, &docker.SystemPackage{
			Name:           name,
			Version:        fields[1],
			Architecture:   fields[2],
			InstalledSize:  size * 1024,
			Status:         fields[4],
			Source:         safeField(fields, 5),
		})
	}

	if upgradableOnly {
		return filterUpgradableApt(ctx, packages)
	}
	return packages, scanner.Err()
}

func filterUpgradableApt(ctx context.Context, installed []*docker.SystemPackage) ([]*docker.SystemPackage, error) {
	output, err := runCommand(ctx, "apt-get", "-s", "upgrade")
	if err != nil {
		return nil, err
	}
	upgradable := make(map[string]bool)
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "Inst ") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				upgradable[parts[1]] = true
			}
		}
	}

	var result []*docker.SystemPackage
	for _, pkg := range installed {
		if upgradable[pkg.Name] {
			pkg.Status = "upgradable"
			result = append(result, pkg)
		}
	}
	return result, nil
}

func listPackagesRpm(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error) {
	format := `%{NAME}\t%{VERSION}-%{RELEASE}\t%{ARCH}\t%{SIZE}\tinstalled\t%{SOURCERPM}\n`
	output, err := runCommand(ctx, "rpm", "-qa", "--queryformat", format)
	if err != nil {
		return nil, err
	}

	var packages []*docker.SystemPackage
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		fields := strings.Split(scanner.Text(), "\t")
		if len(fields) < 5 {
			continue
		}
		name := fields[0]
		if !matchesQuery(name, query) {
			continue
		}
		size, _ := strconv.ParseInt(fields[3], 10, 64)
		packages = append(packages, &docker.SystemPackage{
			Name:          name,
			Version:       fields[1],
			Architecture:  fields[2],
			InstalledSize: size,
			Status:        fields[4],
			Source:        safeField(fields, 5),
		})
	}

	if upgradableOnly {
		return filterUpgradableRpm(ctx, packages)
	}
	return packages, scanner.Err()
}

func filterUpgradableRpm(ctx context.Context, installed []*docker.SystemPackage) ([]*docker.SystemPackage, error) {
	output, err := runCommand(ctx, "dnf", "check-update")
	if err != nil && len(output) == 0 {
		return nil, err
	}
	upgradable := make(map[string]bool)
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "Last metadata") || strings.HasPrefix(line, "Obsoleting") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) >= 2 {
			upgradable[fields[0]] = true
		}
	}

	var result []*docker.SystemPackage
	for _, pkg := range installed {
		if upgradable[pkg.Name] {
			pkg.Status = "upgradable"
			result = append(result, pkg)
		}
	}
	return result, nil
}

func listPackagesPacman(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error) {
	args := []string{"-Q"}
	if upgradableOnly {
		args = []string{"-Qu"}
	}
	output, err := runCommand(ctx, "pacman", args...)
	if err != nil {
		return nil, err
	}

	var packages []*docker.SystemPackage
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 2 {
			continue
		}
		name := fields[0]
		if !matchesQuery(name, query) {
			continue
		}
		status := "installed"
		if upgradableOnly {
			status = "upgradable"
		}
		packages = append(packages, &docker.SystemPackage{
			Name:         name,
			Version:      fields[1],
			Architecture: runtime.GOARCH,
			Status:       status,
		})
	}
	return packages, nil
}

func listPackagesApk(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error) {
	output, err := runCommand(ctx, "apk", "list", "--installed")
	if err != nil {
		return nil, err
	}

	var packages []*docker.SystemPackage
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Fields(line)
		if len(fields) < 1 {
			continue
		}
		name := fields[0]
		if !matchesQuery(name, query) {
			continue
		}
		packages = append(packages, &docker.SystemPackage{
			Name:         name,
			Architecture: safeField(fields, 1),
			Status:       "installed",
		})
	}

	if upgradableOnly {
		return filterUpgradableApk(ctx, packages)
	}
	return packages, nil
}

func filterUpgradableApk(ctx context.Context, installed []*docker.SystemPackage) ([]*docker.SystemPackage, error) {
	output, err := runCommand(ctx, "apk", "upgrade", "--simulate")
	if err != nil {
		return nil, err
	}
	upgradable := make(map[string]bool)
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) >= 1 {
			upgradable[fields[0]] = true
		}
	}

	var result []*docker.SystemPackage
	for _, pkg := range installed {
		if upgradable[pkg.Name] {
			pkg.Status = "upgradable"
			result = append(result, pkg)
		}
	}
	return result, nil
}

func listPackagesBrew(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error) {
	args := []string{"list", "--versions"}
	if upgradableOnly {
		args = []string{"outdated"}
	}
	output, err := runCommand(ctx, "brew", args...)
	if err != nil {
		return nil, err
	}

	var packages []*docker.SystemPackage
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 1 {
			continue
		}
		name := fields[0]
		if !matchesQuery(name, query) {
			continue
		}
		version := ""
		if len(fields) >= 2 {
			version = fields[1]
		}
		status := "installed"
		if upgradableOnly {
			status = "upgradable"
		}
		packages = append(packages, &docker.SystemPackage{
			Name:         name,
			Version:      version,
			Architecture: runtime.GOARCH,
			Status:       status,
		})
	}
	return packages, nil
}

func listPackagesChoco(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error) {
	args := []string{"list", "--local-only"}
	if upgradableOnly {
		args = []string{"outdated"}
	}
	output, err := runCommand(ctx, "choco", args...)
	if err != nil {
		return nil, err
	}

	var packages []*docker.SystemPackage
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 2 {
			continue
		}
		name := fields[0]
		if !matchesQuery(name, query) {
			continue
		}
		status := "installed"
		if upgradableOnly {
			status = "upgradable"
		}
		packages = append(packages, &docker.SystemPackage{
			Name:         name,
			Version:      fields[1],
			Architecture: "x64",
			Status:       status,
		})
	}
	return packages, nil
}

func listPackagesWinget(ctx context.Context, query string, upgradableOnly bool) ([]*docker.SystemPackage, error) {
	args := []string{"list"}
	if upgradableOnly {
		args = []string{"upgrade"}
	}
	output, err := runCommand(ctx, "winget", args...)
	if err != nil {
		return nil, err
	}

	var packages []*docker.SystemPackage
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "---") || strings.Contains(line, "Name") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		name := fields[0]
		if !matchesQuery(name, query) {
			continue
		}
		status := "installed"
		if upgradableOnly {
			status = "upgradable"
		}
		packages = append(packages, &docker.SystemPackage{
			Name:         name,
			Version:      safeField(fields, 1),
			Architecture: safeField(fields, 2),
			Status:       status,
		})
	}
	return packages, nil
}

func safeField(fields []string, index int) string {
	if index < len(fields) {
		return fields[index]
	}
	return ""
}
