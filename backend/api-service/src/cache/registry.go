package cache

import (
	"sync"
	"time"

	"github.com/go/orchestrack/backend/proto/system"
)

// DockerServiceInfo representa una instancia registrada de docker-service.
type DockerServiceInfo struct {
	ServiceID   string
	Hostname    string
	Status      string
	LastSeen    int64
	HostMetrics *system.HostMetrics
}

// Registry mantiene el listado de docker-service activos.
type Registry struct {
	mu        sync.RWMutex
	services  map[string]*DockerServiceInfo
	hostnames map[string]string // hostname -> serviceID
}

// NewRegistry crea un nuevo registro vacío.
func NewRegistry() *Registry {
	return &Registry{
		services:  make(map[string]*DockerServiceInfo),
		hostnames: make(map[string]string),
	}
}

// Register o actualiza una instancia.
func (r *Registry) Register(info *DockerServiceInfo) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.services[info.ServiceID] = info
	r.hostnames[info.Hostname] = info.ServiceID
}

// Deregister elimina una instancia por su ServiceID.
func (r *Registry) Deregister(serviceID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if svc, ok := r.services[serviceID]; ok {
		delete(r.hostnames, svc.Hostname)
		delete(r.services, serviceID)
	}
}

// Get devuelve una instancia por serviceID.
func (r *Registry) Get(serviceID string) (*DockerServiceInfo, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	svc, ok := r.services[serviceID]
	return svc, ok
}

// GetByHostname resuelve hostname a serviceID y devuelve la instancia.
func (r *Registry) GetByHostname(hostname string) (*DockerServiceInfo, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	serviceID, ok := r.hostnames[hostname]
	if !ok {
		return nil, false
	}
	svc, ok := r.services[serviceID]
	return svc, ok
}

// List devuelve todas las instancias registradas.
func (r *Registry) List() []*DockerServiceInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]*DockerServiceInfo, 0, len(r.services))
	for _, svc := range r.services {
		result = append(result, svc)
	}
	return result
}

// Cleanup elimina instancias que no han enviado heartbeat en el timeout dado y las retorna.
func (r *Registry) Cleanup(timeout time.Duration) []*DockerServiceInfo {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := time.Now().Unix()
	var removed []*DockerServiceInfo
	for id, svc := range r.services {
		if now-svc.LastSeen > int64(timeout.Seconds()) {
			removed = append(removed, svc)
			delete(r.services, id)
			delete(r.hostnames, svc.Hostname)
		}
	}
	return removed
}

// ConnectionCounts devuelve la cantidad de instancias online, offline y total.
func (r *Registry) ConnectionCounts() (online, offline, total int) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	total = len(r.services)
	for _, svc := range r.services {
		if svc.Status == "online" {
			online++
		} else {
			offline++
		}
	}
	return
}
