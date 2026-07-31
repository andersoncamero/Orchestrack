export interface ProcessInfo {
  pid: number
  name: string
  cpu_percent: number
  memory_percent: number
  memory_bytes: number
}

export interface HostMetrics {
  cpu_percent: number
  memory_total: number
  memory_used: number
  memory_percent: number
  disk_total: number
  disk_used: number
  disk_percent: number
  load_average: number
  uptime_seconds: number
  cpu_cores: number
  platform: string
  process_count?: number
  processes?: ProcessInfo[]
  rx_bytes_per_sec?: number
  tx_bytes_per_sec?: number
  packets_recv_per_sec?: number
  packets_sent_per_sec?: number
  rtt_ms?: number
}

export interface Instance {
  service_id: string
  hostname: string
  status: 'online' | 'offline' | 'pending'
  last_seen: number
  host_metrics?: HostMetrics
  total_containers?: number
  running_containers?: number
  stopped_containers?: number
  process_count?: number
}

export interface Port {
  ip: string
  private_port: number
  public_port: number
  type: string
}

export interface ContainerSummary {
  id: string
  name: string
  image: string
  status: string
  state: string
  ports: Port[]
  created: number
  service_id?: string
}

export interface Container {
  id: string
  name: string
  image: string
  status: string
  state: string
  command: string
  args: string[]
  env: { key: string; value: string }[]
  ports: Port[]
  volumes: { source: string; target: string; type: string; read_only: boolean }[]
  labels: { key: string; value: string }[]
  tty: boolean
  interactive: boolean
  auto_remove: boolean
  created: number
  platform: string
}

export type ContainerState = 'running' | 'exited' | 'created' | 'paused' | 'restarting' | 'removing' | 'dead' | 'stopped' | 'unhealthy' | 'crashloopbackoff' | 'oomkilled'

export interface ContainerEvent {
  id: string
  type: string
  message: string
  timestamp: number
  container_id: string
  container_name: string
}

export interface ContainerLogOptions {
  tail?: number
  timestamps?: boolean
  stdout?: boolean
  stderr?: boolean
}

export interface ImageSummary {
  id: string
  repo_tags: string[]
  created: number
  size: number
  shared_size: number
  virtual_size: number
  labels: string[]
}

export interface ImageSearchResult {
  name: string
  description: string
  star_count: number
  pull_count: number
  is_official: boolean
  default_tag: string
}

export interface ImageSearchResponse {
  query: string
  total: number
  images: ImageSearchResult[]
}

export type PackageManager =
  | 'unknown'
  | 'apt'
  | 'dnf'
  | 'yum'
  | 'pacman'
  | 'apk'
  | 'brew'
  | 'choco'
  | 'winget'

export interface SystemInfo {
  os: string
  os_version: string
  architecture: string
  package_manager: PackageManager
  package_manager_version: string
}

export interface SystemPackage {
  name: string
  version: string
  architecture: string
  source: string
  status: string
  installed_size: number
  summary: string
}

export interface ListPackagesResponse {
  packages: SystemPackage[]
  total: number
}

export interface RefreshPackagesResponse {
  success: boolean
  output: string
  upgradable_packages: SystemPackage[]
  upgradable_count: number
}

export interface UpgradePackagesResponse {
  success: boolean
  output: string
  upgraded_count: number
  installed_count: number
  removed_count: number
}

export interface RemovePackagesResponse {
  success: boolean
  output: string
  removed_count: number
}

export interface ConnectionHistorySample {
  timestamp: number
  online: number
  offline: number
  total: number
}

export interface ConnectionHistoryResponse {
  hours: number
  samples: ConnectionHistorySample[]
}

export interface DeviceConnectionEvent {
  type: string
  timestamp: number
}

export interface DeviceConnectionHistoryResponse {
  hours: number
  samples: ConnectionHistorySample[]
  events: DeviceConnectionEvent[]
}

export interface SearchProcessesResponse {
  processes: ProcessInfo[]
  total: number
}

export interface SystemNotification {
  id: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  host: string
  timestamp: number
  read: boolean
}

export interface DeviceNetworkMetric {
  id: string
  device_id: string
  rx_bytes_per_sec: number
  tx_bytes_per_sec: number
  packets_recv_per_sec: number
  packets_sent_per_sec: number
  rtt_ms: number
  recorded_at: string
}

export interface DeviceNetworkMetricsResponse {
  device_id: string
  metrics: DeviceNetworkMetric[]
  total: number
}

export interface IncidentEvent {
  id: string
  incident_id: string
  event_id: string
  event_type: string
  container_id?: string
  container_name?: string
  sequence_order: number
  created_at: string
}

export interface Incident {
  id: string
  title: string
  device_id: string
  root_cause_event_id: string
  root_cause_type: string
  status: 'open' | 'resolved'
  severity: 'critical' | 'warning' | 'info'
  started_at: string
  resolved_at?: string
  created_at: string
  updated_at: string
  events?: IncidentEvent[]
}

export interface IncidentTimelineResponse {
  incident_id: string
  timeline: IncidentEvent[]
}

export interface IncidentEvidence {
  id: string
  incident_id: string
  device_id: string
  evidence_type: string
  payload_json: string
  created_at: string
}

export interface IncidentPropagation {
  id: string
  incident_id: string
  from_device_id: string
  to_device_id: string
  from_hostname: string
  to_hostname: string
  propagation_type: string
  time_delta_sec: number
  created_at: string
}

export interface BlastRadius {
  incident_id: string
  affected_devices: number
  affected_containers: number
  total_devices: number
  total_containers: number
  propagation_depth: number
  max_propagation_depth: number
}

export interface IncidentPropagationResponse {
  incident_id: string
  origin: string
  propagations: IncidentPropagation[]
  propagation_paths: { id: string; incident_id: string; step_order: number; affected_device_id: string; affected_container_id?: string }[]
  blast_radius: BlastRadius
}

export interface ServerDependency {
  source_device_id: string
  source_hostname: string
  target_device_id: string
  target_hostname: string
  dependency_type: string
}

export interface TopologyResponse {
  topology: ServerDependency[]
  nodes: number
  edges: number
}

export interface AffectedTransaction {
  id: string
  incident_id: string
  device_id: string
  service_category: string
  transaction_type: string
  failed_count: number
  window_start: string
  window_end: string
  created_at: string
}

export interface TransactionCategoryGroup {
  category: string
  label: string
  failed_count: number
  transaction_types: string[]
}

export interface IncidentTransactionsResponse {
  incident_id: string
  total_failed: number
  affected_devices: number
  categories: TransactionCategoryGroup[]
  transactions: AffectedTransaction[]
}

export interface ServerTransactionImpact {
  id: string
  incident_id: string
  server_transaction_id: string
  failed_requests_count: number
  error_code: string
  created_at: string
  device_id: string
  service_name: string
  endpoint?: string
}

export interface IncidentServerTransactionsResponse {
  incident_id: string
  total_records: number
  records: ServerTransactionImpact[]
}

export interface ContainerNetworkLink {
  source_container_id: string
  source_container_name: string
  target_container_id: string
  target_container_name: string
  network: string
  type: 'network_shared' | 'compose_link' | 'port_exposed'
}

export interface ContainerTopologyResponse {
  links: ContainerNetworkLink[]
}

