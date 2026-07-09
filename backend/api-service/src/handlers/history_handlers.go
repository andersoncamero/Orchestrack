package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/gorilla/mux"
)

// ConnectionHistoryHandler devuelve el historial de conectividad del cluster.
func ConnectionHistoryHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		hours := 720
		if h := r.URL.Query().Get("hours"); h != "" {
			if parsed, err := strconv.Atoi(h); err == nil && parsed > 0 && parsed <= 720 {
				hours = parsed
			}
		}

		since := time.Now().Add(-time.Duration(hours) * time.Hour)
		history := s.ConnectionHistory().GetHistory(since)

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"hours":   hours,
			"samples": history,
		})
	}
}

// DeviceConnectionHistoryHandler devuelve el historial de conectividad de un dispositivo específico.
func DeviceConnectionHistoryHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		identifier := vars["identifier"]
		if identifier == "" {
			writeError(w, http.StatusBadRequest, "missing device identifier")
			return
		}

		ctx := r.Context()
		dev, err := repository.GetDeviceByServiceID(ctx, identifier)
		if err != nil {
			writeError(w, http.StatusNotFound, "device not found")
			return
		}

		hours := 720
		if h := r.URL.Query().Get("hours"); h != "" {
			if parsed, err := strconv.Atoi(h); err == nil && parsed > 0 && parsed <= 720 {
				hours = parsed
			}
		}

		evts, err := repository.ListEventsByDevice(ctx, dev.ServiceID, 10000)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to retrieve device events")
			return
		}

		// Ordenar cronológicamente (ascendente)
		for i, j := 0, len(evts)-1; i < j; i, j = i+1, j-1 {
			evts[i], evts[j] = evts[j], evts[i]
		}

		now := time.Now().UTC()
		interval := time.Hour
		start := now.Add(-time.Duration(hours) * time.Hour).Truncate(time.Hour)

		type Sample struct {
			Timestamp int64 `json:"timestamp"`
			Online    int   `json:"online"`
			Offline   int   `json:"offline"`
			Total     int   `json:"total"`
		}

		type EventSample struct {
			Type      string `json:"type"`
			Timestamp int64  `json:"timestamp"`
		}

		var samples []Sample

		for t := start; t.Before(now) || t.Equal(now); t = t.Add(interval) {
			tUnix := t.Unix()

			if dev.CreatedAt.Unix() > tUnix {
				samples = append(samples, Sample{
					Timestamp: tUnix,
					Online:    0,
					Offline:   0,
					Total:     0,
				})
				continue
			}

			// Determinar el estado al final del intervalo tUnix
			currentStatus := "offline"
			for _, ev := range evts {
				if ev.Timestamp.Unix() <= tUnix {
					if ev.Type == "instance.online" {
						currentStatus = "online"
					} else if ev.Type == "instance.offline" {
						currentStatus = "offline"
					}
				} else {
					break
				}
			}

			onlineVal := 0
			offlineVal := 0
			if currentStatus == "online" {
				onlineVal = 1
			} else {
				offlineVal = 1
			}

			samples = append(samples, Sample{
				Timestamp: tUnix,
				Online:    onlineVal,
				Offline:   offlineVal,
				Total:     1,
			})
		}

		// Extraer eventos exactos ocurridos dentro del rango de tiempo
		var events []EventSample
		for _, ev := range evts {
			evUnix := ev.Timestamp.Unix()
			if evUnix >= start.Unix() && evUnix <= now.Unix() {
				if ev.Type == "instance.online" || ev.Type == "instance.offline" {
					events = append(events, EventSample{
						Type:      ev.Type,
						Timestamp: evUnix,
					})
				}
			}
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"hours":   hours,
			"samples": samples,
			"events":  events,
		})
	}
}
