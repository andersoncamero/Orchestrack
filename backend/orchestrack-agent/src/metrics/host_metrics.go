package metrics

import (
	"context"
	"fmt"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go/orchestrack/backend/proto/system"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/mem"
	netUtil "github.com/shirou/gopsutil/v4/net"
	"github.com/shirou/gopsutil/v4/process"
)

// defaultTopProcessesLimit es la cantidad de procesos más demandantes que se envían en el heartbeat.
const defaultTopProcessesLimit = 20

var (
	netMutex        sync.Mutex
	lastNetCounters *netUtil.IOCountersStat
	lastNetTime     time.Time
	lastRttMs       float64
)

// SetLastRttMs permite registrar la latencia RTT medida en la comunicación NATS.
func SetLastRttMs(rtt float64) {
	netMutex.Lock()
	defer netMutex.Unlock()
	lastRttMs = rtt
}

// CollectHostMetrics recolecta métricas del host donde corre docker-service.
func CollectHostMetrics(ctx context.Context) (*system.HostMetrics, error) {
	metrics := &system.HostMetrics{
		Platform: fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH),
	}

	// Información de CPU.
	if cpuPercent, err := cpu.PercentWithContext(ctx, 500*time.Millisecond, false); err == nil && len(cpuPercent) > 0 {
		metrics.CpuPercent = cpuPercent[0]
	}

	if cpuInfo, err := cpu.InfoWithContext(ctx); err == nil && len(cpuInfo) > 0 {
		metrics.CpuCores = int32(len(cpuInfo))
	} else {
		metrics.CpuCores = int32(runtime.NumCPU())
	}

	// Información de memoria.
	if memInfo, err := mem.VirtualMemoryWithContext(ctx); err == nil {
		metrics.MemoryTotal = int64(memInfo.Total)
		metrics.MemoryUsed = int64(memInfo.Used)
		metrics.MemoryPercent = memInfo.UsedPercent
	}

	// Información de disco (partición raíz por defecto).
	if diskInfo, err := disk.UsageWithContext(ctx, "/"); err == nil {
		metrics.DiskTotal = int64(diskInfo.Total)
		metrics.DiskUsed = int64(diskInfo.Used)
		metrics.DiskPercent = diskInfo.UsedPercent
	}

	// Carga promedio del sistema.
	if avg, err := load.AvgWithContext(ctx); err == nil {
		metrics.LoadAverage = avg.Load1
	}

	// Tiempo de actividad.
	if uptime, err := host.UptimeWithContext(ctx); err == nil {
		metrics.UptimeSeconds = int64(uptime)
	}

	// Conteo total de procesos y top procesos demandantes.
	if pids, err := process.PidsWithContext(ctx); err == nil {
		metrics.ProcessCount = int32(len(pids))
	}

	if procs, err := collectTopProcesses(ctx, defaultTopProcessesLimit); err == nil {
		metrics.Processes = procs
	}

	// Métricas de Red y Latencia RTT.
	netMutex.Lock()
	now := time.Now()
	if counters, err := netUtil.IOCountersWithContext(ctx, false); err == nil && len(counters) > 0 {
		current := counters[0]
		if lastNetCounters != nil && !lastNetTime.IsZero() {
			duration := now.Sub(lastNetTime).Seconds()
			if duration > 0 {
				rxDiff := float64(current.BytesRecv - lastNetCounters.BytesRecv)
				txDiff := float64(current.BytesSent - lastNetCounters.BytesSent)
				pktRecvDiff := float64(current.PacketsRecv - lastNetCounters.PacketsRecv)
				pktSentDiff := float64(current.PacketsSent - lastNetCounters.PacketsSent)

				if rxDiff >= 0 {
					metrics.RxBytesPerSec = rxDiff / duration
				}
				if txDiff >= 0 {
					metrics.TxBytesPerSec = txDiff / duration
				}
				if pktRecvDiff >= 0 {
					metrics.PacketsRecvPerSec = pktRecvDiff / duration
				}
				if pktSentDiff >= 0 {
					metrics.PacketsSentPerSec = pktSentDiff / duration
				}
			}
		}
		lastNetCounters = &current
		lastNetTime = now
	}
	metrics.RttMs = lastRttMs
	netMutex.Unlock()

	return metrics, nil
}

// collectTopProcesses obtiene los procesos más demandantes del host ordenados por un score
// combinado de CPU + memoria. El límite por defecto es 20 para mantener los heartbeats ligeros.
func collectTopProcesses(ctx context.Context, limit int) ([]*system.ProcessInfo, error) {
	pids, err := process.PidsWithContext(ctx)
	if err != nil {
		return nil, err
	}

	items := make([]*system.ProcessInfo, 0, len(pids))
	for _, pid := range pids {
		p, err := process.NewProcessWithContext(ctx, pid)
		if err != nil {
			continue
		}

		name, err := p.NameWithContext(ctx)
		if err != nil || name == "" {
			continue
		}

		cpuPct, err := p.CPUPercentWithContext(ctx)
		if err != nil {
			continue
		}

		memPct, err := p.MemoryPercentWithContext(ctx)
		if err != nil {
			continue
		}

		memInfo, err := p.MemoryInfoWithContext(ctx)
		if err != nil {
			continue
		}

		items = append(items, &system.ProcessInfo{
			Pid:           pid,
			Name:          name,
			CpuPercent:    cpuPct,
			MemoryPercent: float64(memPct),
			MemoryBytes:   int64(memInfo.RSS),
		})
	}

	// Ordenar por score combinado descendente (CPU + memoria).
	sort.Slice(items, func(i, j int) bool {
		scoreI := items[i].CpuPercent + items[i].MemoryPercent
		scoreJ := items[j].CpuPercent + items[j].MemoryPercent
		return scoreI > scoreJ
	})

	if limit > len(items) {
		limit = len(items)
	}

	return items[:limit], nil
}

// SearchProcesses busca procesos en el host por nombre (substring, case-insensitive)
// o por PID exacto. Devuelve hasta `limit` resultados ordenados por score combinado.
func SearchProcesses(ctx context.Context, query string, searchByPID bool, limit int) ([]*system.ProcessInfo, int32, error) {
	pids, err := process.PidsWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}

	if limit <= 0 {
		limit = defaultTopProcessesLimit
	}

	query = strings.TrimSpace(strings.ToLower(query))
	var pidFilter int32
	if searchByPID && query != "" {
		if parsed, err := strconv.ParseInt(query, 10, 32); err == nil {
			pidFilter = int32(parsed)
		}
	}

	items := make([]*system.ProcessInfo, 0)
	for _, pid := range pids {
		p, err := process.NewProcessWithContext(ctx, pid)
		if err != nil {
			continue
		}

		name, err := p.NameWithContext(ctx)
		if err != nil || name == "" {
			continue
		}

		// Aplicar filtro por nombre o PID.
		nameLower := strings.ToLower(name)
		matches := false
		if query == "" {
			matches = true
		} else if strings.Contains(nameLower, query) {
			matches = true
		} else if searchByPID && int32(pid) == pidFilter {
			matches = true
		}

		if !matches {
			continue
		}

		cpuPct, err := p.CPUPercentWithContext(ctx)
		if err != nil {
			continue
		}

		memPct, err := p.MemoryPercentWithContext(ctx)
		if err != nil {
			continue
		}

		memInfo, err := p.MemoryInfoWithContext(ctx)
		if err != nil {
			continue
		}

		items = append(items, &system.ProcessInfo{
			Pid:           pid,
			Name:          name,
			CpuPercent:    cpuPct,
			MemoryPercent: float64(memPct),
			MemoryBytes:   int64(memInfo.RSS),
		})
	}

	// Ordenar por score combinado descendente.
	sort.Slice(items, func(i, j int) bool {
		scoreI := items[i].CpuPercent + items[i].MemoryPercent
		scoreJ := items[j].CpuPercent + items[j].MemoryPercent
		return scoreI > scoreJ
	})

	total := int32(len(items))
	if limit > len(items) {
		limit = len(items)
	}

	return items[:limit], total, nil
}
