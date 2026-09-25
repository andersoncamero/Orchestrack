import type { ConnectionHistoryResponse, Container, ContainerEvent, ContainerSummary, ContainerTopologyResponse, HostMetrics, ImageSearchResponse, ImageSummary, Instance, ListPackagesResponse, RefreshPackagesResponse, RemovePackagesResponse, SearchProcessesResponse, SystemInfo, UpgradePackagesResponse, DeviceConnectionHistoryResponse, DeviceNetworkMetricsResponse, Incident, IncidentTimelineResponse, IncidentPropagationResponse, TopologyResponse, IncidentTransactionsResponse, IncidentServerTransactionsResponse, IncidentEvidence } from '../types'
import { getToken } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = token
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers,
    ...options,
  })

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('orchestrack:unauthorized'))
    const error = await response.json().catch(() => ({ error: 'Unauthorized' }))
    throw new Error(error.error || 'Unauthorized')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

interface ApiInstance {
  ServiceID: string
  Hostname: string
  Status: string
  LastSeen: number
  HostMetrics?: HostMetrics
  TotalContainers?: number
  RunningContainers?: number
  StoppedContainers?: number
  ProcessCount?: number
}

const statusNames: Record<number, string> = {
  0: 'unknown',
  1: 'created',
  2: 'running',
  3: 'paused',
  4: 'restarting',
  5: 'removing',
  6: 'exited',
  7: 'dead',
}

function mapInstance(data: ApiInstance): Instance {
  return {
    service_id: data.ServiceID,
    hostname: data.Hostname,
    status: data.Status as Instance['status'],
    last_seen: data.LastSeen,
    host_metrics: data.HostMetrics,
    total_containers: data.TotalContainers,
    running_containers: data.RunningContainers,
    stopped_containers: data.StoppedContainers,
    process_count: data.ProcessCount,
  }
}

function mapContainer(data: ContainerSummary): ContainerSummary {
  const status = typeof data.status === 'number' ? statusNames[data.status] ?? 'unknown' : data.status
  return {
    ...data,
    status,
    state: data.state || status,
    ports: data.ports || [],
  }
}

export const api = {
  getInstances: async () => {
    const data = await fetchJson<ApiInstance[]>('/api/v1/instances')
    return data.map(mapInstance)
  },

  getContainers: async (identifier: string, all = true) => {
    const data = await fetchJson<{ containers: ContainerSummary[] }>(`/api/v1/instances/${identifier}/containers?all=${all}`)
    return { containers: (data.containers || []).map((c) => ({ ...mapContainer(c), service_id: identifier })) }
  },

  getContainer: (identifier: string, id: string) =>
    fetchJson<{ container: Container }>(`/api/v1/instances/${identifier}/containers/${id}`),

  getContainerLogs: async (identifier: string, id: string, opts?: { tail?: number; timestamps?: boolean; stdout?: boolean; stderr?: boolean }): Promise<string[]> => {
    const params = new URLSearchParams()
    if (opts?.tail !== undefined) params.set('tail', String(opts.tail))
    if (opts?.timestamps !== undefined) params.set('timestamps', String(opts.timestamps))
    if (opts?.stdout !== undefined) params.set('stdout', String(opts.stdout))
    if (opts?.stderr !== undefined) params.set('stderr', String(opts.stderr))
    const res = await fetchJson<{ lines?: string[] } | string[]>(`/api/v1/instances/${identifier}/containers/${id}/logs?${params.toString()}`)
    if (Array.isArray(res)) {
      return res
    }
    return res?.lines || []
  },

  getContainerEvents: (identifier: string, id: string, opts?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    if (opts?.limit !== undefined) params.set('limit', String(opts.limit))
    if (opts?.offset !== undefined) params.set('offset', String(opts.offset))
    return fetchJson<{ events: ContainerEvent[]; limit: number; offset: number }>(`/api/v1/instances/${identifier}/containers/${id}/events?${params.toString()}`)
  },

  createContainer: (identifier: string, body: Partial<Container>) =>
    fetchJson<{ id: string; name: string; warnings: string[] }>(`/api/v1/instances/${identifier}/containers`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  startContainer: (identifier: string, id: string) =>
    fetchJson<{ id: string }>(`/api/v1/instances/${identifier}/containers/${id}/start`, { method: 'POST' }),

  stopContainer: (identifier: string, id: string, timeout = 10) =>
    fetchJson<{ id: string }>(`/api/v1/instances/${identifier}/containers/${id}/stop?timeout=${timeout}`, { method: 'POST' }),

  restartContainer: (identifier: string, id: string, timeout = 10) =>
    fetchJson<{ id: string }>(`/api/v1/instances/${identifier}/containers/${id}/restart?timeout=${timeout}`, { method: 'POST' }),

  renameContainer: (identifier: string, id: string, newName: string) =>
    fetchJson<{ id: string; name: string }>(`/api/v1/instances/${identifier}/containers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ new_name: newName }),
    }),

  removeContainer: (identifier: string, id: string, force = false, removeVolumes = false) =>
    fetchJson<{ id: string }>(`/api/v1/instances/${identifier}/containers/${id}?force=${force}&volumes=${removeVolumes}`, {
      method: 'DELETE',
    }),

  getImages: (identifier: string, all = true) =>
    fetchJson<{ images: ImageSummary[] }>(`/api/v1/instances/${identifier}/images?all=${all}`),

  pullImage: (identifier: string, image: string) =>
    fetchJson<{ image: string }>(`/api/v1/instances/${identifier}/images/pull`, {
      method: 'POST',
      body: JSON.stringify({ image }),
    }),

  removeImage: (identifier: string, id: string, force = false, prune = false) =>
    fetchJson<{ id: string; deleted: string[] }>(`/api/v1/instances/${identifier}/images/${id}?force=${force}&prune=${prune}`, {
      method: 'DELETE',
    }),

  searchImages: (query: string, limit = 10) =>
    fetchJson<ImageSearchResponse>(`/api/v1/images/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  getSystemInfo: (identifier: string) =>
    fetchJson<{ info: SystemInfo }>(`/api/v1/instances/${identifier}/system/info`),

  getPackages: (identifier: string, query?: string, upgradableOnly = false) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (upgradableOnly) params.set('upgradable', 'true')
    return fetchJson<ListPackagesResponse>(`/api/v1/instances/${identifier}/system/packages?${params.toString()}`)
  },

  refreshPackages: (identifier: string, dryRun = false) =>
    fetchJson<RefreshPackagesResponse>(`/api/v1/instances/${identifier}/system/packages/refresh`, {
      method: 'POST',
      body: JSON.stringify({ dry_run: dryRun }),
    }),

  upgradePackages: (identifier: string, dryRun = false, autoConfirm = true, packages: string[] = []) =>
    fetchJson<UpgradePackagesResponse>(`/api/v1/instances/${identifier}/system/packages/upgrade`, {
      method: 'POST',
      body: JSON.stringify({ dry_run: dryRun, auto_confirm: autoConfirm, packages }),
    }),

  removePackages: (identifier: string, packages: string[], purge = false, autoConfirm = true, dryRun = false) =>
    fetchJson<RemovePackagesResponse>(`/api/v1/instances/${identifier}/system/packages/remove`, {
      method: 'POST',
      body: JSON.stringify({ packages, purge, auto_confirm: autoConfirm, dry_run: dryRun }),
    }),

  getConnectionHistory: (hours = 24) =>
    fetchJson<ConnectionHistoryResponse>(`/api/v1/instances/history?hours=${hours}`),

  getDeviceConnectionHistory: (identifier: string, hours = 24) =>
    fetchJson<DeviceConnectionHistoryResponse>(`/api/v1/instances/${identifier}/history?hours=${hours}`),

  signUp: async (email: string, password: string) => {
    const data = await fetchJson<{ token: string; user: { id: string; email: string } }>('/api/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return data
  },

  login: async (email: string, password: string) => {
    const data = await fetchJson<{ token: string; user: { id: string; email: string } }>('/api/v1/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return data
  },

  me: async () => fetchJson<{ id: string; email: string }>('/api/v1/me'),

  generateRegistrationToken: async () => {
    return fetchJson<{ token: string; expires_at: string }>('/api/v1/devices/tokens', {
      method: 'POST',
    })
  },

  approveDevice: async (identifier: string) => {
    return fetchJson<{ message: string; service_id: string }>(`/api/v1/instances/${identifier}/approve`, {
      method: 'POST',
    })
  },

  searchProcesses: (identifier: string, query?: string, searchByPid = false, limit = 20) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (searchByPid) params.set('search_by_pid', 'true')
    if (limit) params.set('limit', limit.toString())
    return fetchJson<SearchProcessesResponse>(`/api/v1/instances/${identifier}/processes/search?${params.toString()}`)
  },

  getDeviceNetworkMetrics: (identifier: string, limit = 50) =>
    fetchJson<DeviceNetworkMetricsResponse>(`/api/v1/instances/${identifier}/metrics/network?limit=${limit}`),

  getRetentionSetting: async () => {
    return fetchJson<{ retention_days: number }>('/api/v1/system/retention')
  },

  updateRetentionSetting: async (retentionDays: number) => {
    return fetchJson<{ retention_days: number; message: string }>('/api/v1/system/retention', {
      method: 'PUT',
      body: JSON.stringify({ retention_days: retentionDays }),
    })
  },

  triggerMetricsCleanup: async () => {
    return fetchJson<{ deleted_count: number; retention_days: number; message: string }>('/api/v1/system/retention/cleanup', {
      method: 'POST',
    })
  },

  getIncidents: (deviceId?: string, status?: string, limit = 50) => {
    const params = new URLSearchParams()
    if (deviceId) params.set('device_id', deviceId)
    if (status) params.set('status', status)
    if (limit) params.set('limit', limit.toString())
    return fetchJson<Incident[]>(`/api/v1/incidents?${params.toString()}`)
  },

  getIncidentByID: (id: string) => fetchJson<Incident>(`/api/v1/incidents/${id}`),

  getIncidentTimeline: (id: string) => fetchJson<IncidentTimelineResponse>(`/api/v1/incidents/${id}/timeline`),

  getIncidentPropagation: (id: string) => fetchJson<IncidentPropagationResponse>(`/api/v1/incidents/${id}/propagation`),

  getTopology: () => fetchJson<TopologyResponse>('/api/v1/topology/multi-host'),

  getIncidentTransactions: (incidentId: string) =>
    fetchJson<IncidentTransactionsResponse>(`/api/v1/incidents/${incidentId}/transactions`),

  getIncidentServerTransactions: (incidentId: string) =>
    fetchJson<IncidentServerTransactionsResponse>(`/api/v1/incidents/${incidentId}/server-transactions`),

  getIncidentEvidence: (incidentId: string) =>
    fetchJson<IncidentEvidence[]>(`/api/v1/incidents/${incidentId}/evidence`),

  getContainerTopology: (identifier: string) =>
    fetchJson<ContainerTopologyResponse>(`/api/v1/instances/${identifier}/containers/topology`),
}
