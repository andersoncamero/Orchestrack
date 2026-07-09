package cache

import (
	"sync"
	"time"
)

// ConnectionHistorySample representa una muestra agregada de conectividad en un momento dado.
type ConnectionHistorySample struct {
	Timestamp int64 `json:"timestamp"`
	Online    int   `json:"online"`
	Offline   int   `json:"offline"`
	Total     int   `json:"total"`
}

// ConnectionHistory almacena el historial de conectividad de las instancias.
type ConnectionHistory struct {
	mu       sync.RWMutex
	samples  []ConnectionHistorySample
	interval time.Duration
	maxAge   time.Duration
	lastSlot int64
}

// NewConnectionHistory crea un nuevo historial con muestras cada hora y retención de 30 días (720 horas).
func NewConnectionHistory() *ConnectionHistory {
	return &ConnectionHistory{
		interval: time.Hour,
		maxAge:   720 * time.Hour,
		samples:  make([]ConnectionHistorySample, 0),
	}
}

// Record registra una muestra de conectividad. Si el timestamp cae en el mismo slot
// que la última muestra, la actualiza; de lo contrario, agrega una nueva.
func (h *ConnectionHistory) Record(timestamp int64, online, offline, total int) {
	h.mu.Lock()
	defer h.mu.Unlock()

	slot := timestamp / int64(h.interval.Seconds())
	if slot == h.lastSlot && len(h.samples) > 0 {
		last := &h.samples[len(h.samples)-1]
		if online > last.Online {
			last.Online = online
		}
		if offline > last.Offline {
			last.Offline = offline
		}
		if total > last.Total {
			last.Total = total
		}
		return
	}

	h.samples = append(h.samples, ConnectionHistorySample{
		Timestamp: timestamp,
		Online:    online,
		Offline:   offline,
		Total:     total,
	})
	h.lastSlot = slot
	h.cleanupLocked()
}

// GetHistory devuelve las muestras dentro del rango solicitado.
func (h *ConnectionHistory) GetHistory(since time.Time) []ConnectionHistorySample {
	h.mu.RLock()
	defer h.mu.RUnlock()

	cutoff := since.Unix()
	result := make([]ConnectionHistorySample, 0, len(h.samples))
	for _, sample := range h.samples {
		if sample.Timestamp >= cutoff {
			result = append(result, sample)
		}
	}
	return result
}

func (h *ConnectionHistory) cleanupLocked() {
	cutoff := time.Now().Add(-h.maxAge).Unix()
	start := 0
	for i, sample := range h.samples {
		if sample.Timestamp >= cutoff {
			start = i
			break
		}
	}
	if start > 0 {
		h.samples = h.samples[start:]
	}
}
