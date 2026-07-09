import { useState, useMemo } from 'react'
import { Cpu, MemoryStick, Search } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatBytes } from '../../utils/time'
import type { ProcessInfo } from '../../types'

interface ProcessesTableProps {
  processes?: ProcessInfo[]
}

function usageColor(value: number): string {
  if (value > 80) return 'text-(--color-status-exited) font-bold'
  if (value > 50) return 'text-(--color-status-warning) font-semibold'
  return 'text-(--color-status-running)'
}

function MiniProgress({ value, type }: { value: number; type: 'cpu' | 'memory' }) {
  const barColor = type === 'cpu' ? 'bg-(--color-primary)' : 'bg-(--color-status-running)'
  return (
    <div className="h-1.5 w-12 bg-(--color-bg-base) rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

export function ProcessesTable({ processes }: ProcessesTableProps) {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')

  // Normalizar y limpiar procesos
  const normalized = useMemo(() => {
    return (processes || []).map((proc) => ({
      pid: typeof proc.pid === 'number' ? proc.pid : 0,
      name: proc.name || '-',
      cpu_percent: typeof proc.cpu_percent === 'number' && !Number.isNaN(proc.cpu_percent) ? proc.cpu_percent : 0,
      memory_percent: typeof proc.memory_percent === 'number' && !Number.isNaN(proc.memory_percent) ? proc.memory_percent : 0,
      memory_bytes: typeof proc.memory_bytes === 'number' && !Number.isNaN(proc.memory_bytes) ? proc.memory_bytes : 0,
    }))
  }, [processes])

  // Filtrar por término de búsqueda
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return normalized
    const term = searchTerm.toLowerCase()
    return normalized.filter((proc) => proc.name.toLowerCase().includes(term))
  }, [normalized, searchTerm])

  // Top 15 por CPU
  const topCpu = useMemo(() => {
    return [...filtered]
      .sort((a, b) => b.cpu_percent - a.cpu_percent)
      .slice(0, 15)
  }, [filtered])

  // Top 15 por Memoria
  const topMemory = useMemo(() => {
    return [...filtered]
      .sort((a, b) => b.memory_bytes - a.memory_bytes)
      .slice(0, 15)
  }, [filtered])

  if (normalized.length === 0) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6">
        <p className="text-(--color-text-muted)">{t('noProcesses')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barra de Búsqueda Global */}
      <div className="flex items-center gap-3 bg-(--color-bg-surface) border border-(--color-border) px-4 py-2.5 rounded-xl max-w-md focus-within:border-(--color-primary) transition-colors">
        <Search className="w-5 h-5 text-(--color-text-muted)" />
        <input
          type="text"
          placeholder="Buscar proceso por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none outline-none text-(--color-text-main) placeholder-(--color-text-muted) w-full text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tabla de Consumo de CPU */}
        <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-4 border-b border-(--color-border) flex items-center gap-3 bg-(--color-bg-surface-hover)/30">
            <Cpu className="w-5 h-5 text-(--color-primary)" />
            <h3 className="text-(--color-text-main) font-semibold text-lg">Alto Consumo de CPU</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-(--color-border) bg-(--color-bg-surface-hover)/10">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-(--color-text-muted) uppercase">PID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-(--color-text-muted) uppercase">Nombre</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-(--color-text-muted) uppercase">CPU</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-(--color-text-muted) uppercase">Memoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {topCpu.map((proc) => (
                  <tr key={`cpu-${proc.pid}`} className="hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-(--color-text-muted) font-mono text-sm">{proc.pid}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-(--color-text-main) font-medium max-w-[180px] truncate" title={proc.name}>
                      {proc.name}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${usageColor(proc.cpu_percent)}`}>{proc.cpu_percent.toFixed(1)}%</span>
                        <MiniProgress value={proc.cpu_percent} type="cpu" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-(--color-text-secondary) text-sm">{formatBytes(proc.memory_bytes)}</td>
                  </tr>
                ))}
                {topCpu.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-(--color-text-muted) text-sm">No se encontraron procesos activos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de Consumo de Memoria */}
        <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-4 border-b border-(--color-border) flex items-center gap-3 bg-(--color-bg-surface-hover)/30">
            <MemoryStick className="w-5 h-5 text-(--color-status-running)" />
            <h3 className="text-(--color-text-main) font-semibold text-lg">Alto Consumo de Memoria</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-(--color-border) bg-(--color-bg-surface-hover)/10">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-(--color-text-muted) uppercase">PID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-(--color-text-muted) uppercase">Nombre</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-(--color-text-muted) uppercase">Uso RAM</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-(--color-text-muted) uppercase">% RAM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {topMemory.map((proc) => (
                  <tr key={`mem-${proc.pid}`} className="hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-(--color-text-muted) font-mono text-sm">{proc.pid}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-(--color-text-main) font-medium max-w-[180px] truncate" title={proc.name}>
                      {proc.name}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-(--color-text-main) font-semibold text-sm">{formatBytes(proc.memory_bytes)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${usageColor(proc.memory_percent)}`}>{proc.memory_percent.toFixed(1)}%</span>
                        <MiniProgress value={proc.memory_percent} type="memory" />
                      </div>
                    </td>
                  </tr>
                ))}
                {topMemory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-(--color-text-muted) text-sm">No se encontraron procesos activos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
