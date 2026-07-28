package handlers

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/go/orchestrack/backend/api-service/src/commander"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/proto/docker"
	"github.com/gorilla/mux"
)

const defaultLogTailLines = 100

// GetContainerLogsHandler devuelve los logs (stdout/stderr) de un contenedor.
func GetContainerLogsHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		id := mux.Vars(r)["id"]

		tail, timestamps, stdout, stderr := parseLogsOptions(r.URL.Query())
		if !stdout && !stderr {
			writeError(w, http.StatusBadRequest, "at least one of stdout or stderr must be enabled")
			return
		}

		serviceID := resolveIdentifier(identifier, hostnameRegistry(s))

		resp, err := commander.GetContainerLogs(r.Context(), serviceID, hostnameRegistry(s), &docker.GetContainerLogsRequest{
			Id:         id,
			TailLines:  tail,
			Timestamps: timestamps,
			ShowStdout: stdout,
			ShowStderr: stderr,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		resp.Lines = sanitizeLogLines(resp.Lines)
		writeJSON(w, http.StatusOK, resp)
	}
}

// parseLogsOptions extrae las opciones de logs de los query params:
// tail (por defecto 100), timestamps (por defecto false), stdout/stderr (por defecto true).
func parseLogsOptions(q url.Values) (tail uint32, timestamps, stdout, stderr bool) {
	tail = defaultLogTailLines
	if t := q.Get("tail"); t != "" {
		if parsed, err := strconv.ParseUint(t, 10, 32); err == nil {
			tail = uint32(parsed)
		}
	}
	timestamps = q.Get("timestamps") == "true"
	stdout = parseBoolDefault(q.Get("stdout"), true)
	stderr = parseBoolDefault(q.Get("stderr"), true)
	return tail, timestamps, stdout, stderr
}

// parseBoolDefault interpreta un query param booleano aplicando un valor por defecto si está ausente.
func parseBoolDefault(v string, def bool) bool {
	if v == "" {
		return def
	}
	return v == "true"
}

// sanitizeLogLines sanea cada línea de log antes de responder JSON limpio.
func sanitizeLogLines(lines []string) []string {
	sanitized := make([]string, len(lines))
	for i, line := range lines {
		sanitized[i] = sanitizeLogLine(line)
	}
	return sanitized
}

// sanitizeLogLine elimina bytes nulos y restos de cabeceras multiplexadas de 8 bytes
// de Docker ([stream][0][0][0][size big-endian 4 bytes]) de una línea de log.
func sanitizeLogLine(line string) string {
	b := []byte(line)
	out := make([]byte, 0, len(b))
	for i := 0; i < len(b); {
		if i+8 <= len(b) && b[i] <= 2 && b[i+1] == 0 && b[i+2] == 0 && b[i+3] == 0 {
			// Cabecera multiplexada de 8 bytes: se descarta entera.
			i += 8
			continue
		}
		if b[i] == 0 {
			// Byte nulo suelto: se descarta.
			i++
			continue
		}
		out = append(out, b[i])
		i++
	}
	return string(out)
}
