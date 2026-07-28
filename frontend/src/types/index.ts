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

