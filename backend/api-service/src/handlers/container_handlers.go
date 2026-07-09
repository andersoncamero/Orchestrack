package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go/orchestrack/backend/api-service/src/commander"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/api-service/src/repository"
	"github.com/go/orchestrack/backend/proto/docker"
	"github.com/gorilla/mux"
)

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func hostnameRegistry(s ports.Server) map[string]string {
	result := make(map[string]string)
	for _, svc := range s.Registry().List() {
		result[svc.Hostname] = svc.ServiceID
	}
	return result
}

func resolveIdentifier(identifier string, registry map[string]string) string {
	if id, ok := registry[identifier]; ok {
		return id
	}
	return identifier
}

// ListInstancesHandler lista todas las instancias registradas en la BD cruzadas con memoria.
func ListInstancesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dbDevices, err := repository.ListDevices(r.Context())
		if err != nil {
			s.Logger().Error("failed to list devices from database", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to load devices")
			return
		}

		type DeviceResponse struct {
			ServiceID         string              `json:"ServiceID"`
			Hostname          string              `json:"Hostname"`
			Status            string              `json:"Status"`
			LastSeen          int64               `json:"LastSeen"`
			HostMetrics       *docker.HostMetrics `json:"HostMetrics,omitempty"`
			TotalContainers   int                 `json:"TotalContainers"`
			RunningContainers int                 `json:"RunningContainers"`
			StoppedContainers int                 `json:"StoppedContainers"`
			ProcessCount      int32               `json:"ProcessCount"`
		}

		response := make([]DeviceResponse, 0, len(dbDevices))
		for _, dev := range dbDevices {
			status := dev.Status
			var hostMetrics *docker.HostMetrics
			if status != "pending" {
				if cachedSvc, ok := s.Registry().Get(dev.ServiceID); !ok {
					status = "offline"
				} else {
					status = "online"
					hostMetrics = cachedSvc.HostMetrics
				}
			}

			if hostMetrics == nil {
				hostMetrics = &docker.HostMetrics{
					CpuPercent:    dev.CpuPercent,
					MemoryPercent: dev.MemoryPercent,
					DiskPercent:   dev.DiskPercent,
					LoadAverage:   dev.LoadAverage,
					UptimeSeconds: dev.UptimeSeconds,
					CpuCores:      dev.CpuCores,
					MemoryTotal:   dev.MemoryTotal,
					MemoryUsed:    dev.MemoryUsed,
					DiskTotal:     dev.DiskTotal,
					DiskUsed:      dev.DiskUsed,
					Platform:      dev.Platform,
				}
			}

			response = append(response, DeviceResponse{
				ServiceID:         dev.ServiceID,
				Hostname:          dev.Hostname,
				Status:            status,
				LastSeen:          dev.LastSeen,
				HostMetrics:       hostMetrics,
				TotalContainers:   dev.TotalContainers,
				RunningContainers: dev.RunningContainers,
				StoppedContainers: dev.StoppedContainers,
				ProcessCount:      dev.ProcessCount,
			})
		}

		writeJSON(w, http.StatusOK, response)
	}
}

// ListContainersHandler lista contenedores de una instancia.
func ListContainersHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		all := r.URL.Query().Get("all") == "true"

		serviceID := resolveIdentifier(identifier, hostnameRegistry(s))

		// Consultar directamente por NATS.
		resp, err := commander.ListContainers(r.Context(), serviceID, hostnameRegistry(s), &docker.ListContainersRequest{All: all})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// GetContainerHandler devuelve el detalle de un contenedor.
func GetContainerHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		id := mux.Vars(r)["id"]

		// Consultar directamente por NATS.
		resp, err := commander.GetContainer(r.Context(), identifier, hostnameRegistry(s), &docker.GetContainerRequest{Id: id})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// CreateContainerHandler crea un contenedor.
func CreateContainerHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]

		var req docker.CreateContainerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		resp, err := commander.CreateContainer(r.Context(), identifier, hostnameRegistry(s), &req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, resp)
	}
}

// StartContainerHandler inicia un contenedor.
func StartContainerHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		id := mux.Vars(r)["id"]

		resp, err := commander.StartContainer(r.Context(), identifier, hostnameRegistry(s), &docker.StartContainerRequest{Id: id})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// StopContainerHandler detiene un contenedor.
func StopContainerHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		id := mux.Vars(r)["id"]

		timeout := 10
		if t := r.URL.Query().Get("timeout"); t != "" {
			if parsed, err := strconv.Atoi(t); err == nil {
				timeout = parsed
			}
		}

		resp, err := commander.StopContainer(r.Context(), identifier, hostnameRegistry(s), &docker.StopContainerRequest{
			Id:             id,
			TimeoutSeconds: int32(timeout),
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// RestartContainerHandler reinicia un contenedor.
func RestartContainerHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		id := mux.Vars(r)["id"]

		timeout := 10
		if t := r.URL.Query().Get("timeout"); t != "" {
			if parsed, err := strconv.Atoi(t); err == nil {
				timeout = parsed
			}
		}

		resp, err := commander.RestartContainer(r.Context(), identifier, hostnameRegistry(s), &docker.RestartContainerRequest{
			Id:             id,
			TimeoutSeconds: int32(timeout),
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// RenameContainerHandler renombra un contenedor.
func RenameContainerHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		id := mux.Vars(r)["id"]

		var body struct {
			NewName string `json:"new_name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		resp, err := commander.RenameContainer(r.Context(), identifier, hostnameRegistry(s), &docker.RenameContainerRequest{
			Id:      id,
			NewName: body.NewName,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// RemoveContainerHandler elimina un contenedor.
func RemoveContainerHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		id := mux.Vars(r)["id"]

		force := r.URL.Query().Get("force") == "true"
		removeVolumes := r.URL.Query().Get("volumes") == "true"

		resp, err := commander.RemoveContainer(r.Context(), identifier, hostnameRegistry(s), &docker.RemoveContainerRequest{
			Id:            id,
			Force:         force,
			RemoveVolumes: removeVolumes,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}
