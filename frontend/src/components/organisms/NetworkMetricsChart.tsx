import { useMemo } from 'react'
import { Activity, ArrowDownLeft, ArrowUpRight, Gauge, Radio } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Spinner } from '../atoms/Spinner'
import { formatBytes } from '../../utils/time'
import { useTheme } from '../../contexts/ThemeContext'
import type { DeviceNetworkMetric } from '../../types'

interface NetworkMetricsChartProps {
  metrics: DeviceNetworkMetric[]
  loading?: boolean
  latestRttMs?: number
  latestRxBytesPerSec?: number
  latestTxBytesPerSec?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const rxVal = payload.find((p: any) => p.dataKey === 'Descarga (RX)')?.value || 0
    const txVal = payload.find((p: any) => p.dataKey === 'Carga (TX)')?.value || 0
    const rttVal = payload[0]?.payload?.rtt || 0

    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) text-(--color-text-main) p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-48">
        <p className="text-(--color-text-muted) font-mono text-[11px] font-semibold">{label}</p>
        <div className="flex items-center justify-between text-cyan-500 dark:text-cyan-400 font-medium">
          <span>Descarga (RX):</span>
          <span className="font-bold">{formatBytes(rxVal)}/s</span>
        </div>
        <div className="flex items-center justify-between text-indigo-500 dark:text-indigo-400 font-medium">
          <span>Carga (TX):</span>
          <span className="font-bold">{formatBytes(txVal)}/s</span>
        </div>
        <div className="flex items-center justify-between text-amber-500 dark:text-amber-400 font-medium pt-1 border-t border-(--color-border)">
          <span>Latencia RTT:</span>
          <span className="font-bold">{rttVal.toFixed(1)} ms</span>
        </div>
      </div>
    )
  }
  return null
}

export function NetworkMetricsChart({
  metrics = [],
  loading = false,
  latestRttMs = 0,
  latestRxBytesPerSec = 0,
  latestTxBytesPerSec = 0,
}: NetworkMetricsChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Colores dinámicos para Recharts según el modo de la página (Oscuro vs Claro)
  const gridStroke = isDark ? '#1e293b' : '#e2e8f0'
  const axisStroke = isDark ? '#64748b' : '#94a3b8'
  const tickFill = isDark ? '#94a3b8' : '#475569'

  // Formatear datos para el gráfico Simple Line Chart de Recharts
  const chartData = useMemo(() => {
    if (!metrics || metrics.length === 0) return []

    const sorted = [...metrics].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )

    return sorted.map((m) => {
      const timeStr = new Date(m.recorded_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      return {
        timestamp: timeStr,
        rtt: m.rtt_ms,
        'Descarga (RX)': m.rx_bytes_per_sec,
        'Carga (TX)': m.tx_bytes_per_sec,
      }
    })
  }, [metrics])

  // Sparkline de RTT para la tarjeta de latencia
  const rttSparkline = useMemo(() => {
    if (!metrics || metrics.length < 2) return ''
    const sorted = [...metrics].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )
    let maxRtt = 100
    sorted.forEach((m) => {
      if (m.rtt_ms > maxRtt) maxRtt = m.rtt_ms
    })
    const w = 120
    const h = 32
    const step = w / (sorted.length - 1)
    return sorted
      .map((m, i) => {
        const x = i * step
        const y = h - (m.rtt_ms / (maxRtt * 1.2)) * h
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }, [metrics])

  // Evaluación de estado de Latencia RTT
  const rttStatus = useMemo(() => {
    if (latestRttMs <= 0) return { label: 'Excelente (<100ms)', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' }
    if (latestRttMs < 100) return { label: 'Excelente (<100ms)', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' }
    if (latestRttMs <= 500) return { label: 'Normal (100-500ms)', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' }
    return { label: 'Latencia Alta (>500ms)', color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' }
  }, [latestRttMs])

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--color-border) pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-(--color-text-main) flex items-center gap-2">
              Rendimiento de Red y Latencia
            </h3>
            <p className="text-xs text-(--color-text-muted)">
              Visualización en tiempo real de ancho de banda (RX/TX) y tiempo de respuesta RTT con Recharts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>En vivo (WebSocket)</span>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI de Red y Latencia (Adaptables a modo Claro / Oscuro) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI Descarga RX */}
        <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-(--color-text-muted) font-medium uppercase tracking-wider">
              <ArrowDownLeft className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span>Descarga (RX)</span>
            </div>
            <p className="text-2xl font-bold text-(--color-text-main) mt-1">
              {formatBytes(latestRxBytesPerSec)}/s
            </p>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
        </div>

        {/* KPI Carga TX */}
        <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-(--color-text-muted) font-medium uppercase tracking-wider">
              <ArrowUpRight className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>Carga (TX)</span>
            </div>
            <p className="text-2xl font-bold text-(--color-text-main) mt-1">
              {formatBytes(latestTxBytesPerSec)}/s
            </p>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
        </div>

        {/* KPI Latencia RTT */}
        <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-(--color-text-muted) font-medium uppercase tracking-wider">
              <Gauge className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Latencia RTT</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-(--color-text-main)">
                {latestRttMs >= 0 ? `${latestRttMs.toFixed(1)} ms` : '-'}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${rttStatus.bg} ${rttStatus.color} font-medium`}>
                {rttStatus.label}
              </span>
            </div>
          </div>

          {/* Sparkline mini para RTT */}
          {rttSparkline && (
            <svg className="w-24 h-8 overflow-visible" viewBox="0 0 120 32">
              <path d={rttSparkline} fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>

      {/* Gráfico Recharts Simple Line Chart con Fondo Adaptativo */}
      <div className="relative bg-(--color-bg-base) border border-(--color-border) rounded-xl p-5">
        {loading && (
          <div className="absolute inset-0 bg-(--color-bg-base)/80 backdrop-blur-xs flex items-center justify-center z-10 rounded-xl">
            <Spinner size="md" />
          </div>
        )}

        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-xs font-semibold text-(--color-text-main)">
            Flujo de Datos de Red (Throughput)
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-(--color-text-muted) text-sm">
            Esperando métricas de red del servidor...
          </div>
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="timestamp"
                  stroke={axisStroke}
                  tick={{ fill: tickFill, fontSize: 11 }}
                />
                <YAxis
                  stroke={axisStroke}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  tickFormatter={(val) => `${formatBytes(val)}/s`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="Descarga (RX)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, fill: '#06b6d4' }}
                />
                <Line
                  type="monotone"
                  dataKey="Carga (TX)"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
