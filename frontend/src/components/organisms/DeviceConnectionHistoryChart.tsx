import { useState, useMemo, useEffect } from 'react'
import { Activity, Clock, WifiOff } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Spinner } from '../atoms/Spinner'
import type { ConnectionHistorySample, DeviceConnectionEvent } from '../../types'

export type TimeRange = '24h' | '7d' | '30d'

interface DeviceConnectionHistoryChartProps {
  samples: ConnectionHistorySample[]
  events: DeviceConnectionEvent[]
  loading?: boolean
  range: TimeRange
  onRangeChange: (range: TimeRange) => void
  currentStatus?: 'online' | 'offline' | 'pending'
}

const CustomTooltip = ({ active, payload, t }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const isOnline = data.statusVal === 1

    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) text-(--color-text-main) p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-48 z-50">
        <p className="text-(--color-text-muted) font-mono text-[11px] font-semibold">{data.exactTime}</p>
        <div className="flex items-center justify-between font-medium">
          <span>{t('status') || 'Estado'}:</span>
          <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
            isOnline 
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
          }`}>
            {isOnline ? (t('online') || 'Conectado (Activo)') : (t('offline') || 'Desconectado (Inactivo)')}
          </span>
        </div>
      </div>
    )
  }
  return null
}

export function DeviceConnectionHistoryChart({
  samples = [],
  events = [],
  loading = false,
  range,
  onRangeChange,
  currentStatus,
}: DeviceConnectionHistoryChartProps) {
  const { t } = useLanguage()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Reloj local para mantener la ventana de tiempo actualizada
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000))
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const formatExactTime = (ts: number) => {
    const d = new Date(ts * 1000)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hr = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const sec = String(d.getSeconds()).padStart(2, '0')
    return `${day}/${month}/${year} ${hr}:${min}:${sec}`
  }

  // Procesar muestras con ventana de tiempo móvil absoluta
  const chartData = useMemo(() => {
    const now = currentTime
    let minT = now - 24 * 3600
    if (range === '7d') {
      minT = now - 7 * 24 * 3600
    } else if (range === '30d') {
      minT = now - 30 * 24 * 3600
    }
    const maxT = now

    if (!samples || samples.length === 0) {
      return []
    }

    const sortedAll = [...samples].sort((a, b) => a.timestamp - b.timestamp)
    const samplesInside = sortedAll.filter((s) => s.timestamp >= minT && s.timestamp <= maxT)

    let initialSample = samplesInside[0] || sortedAll[sortedAll.length - 1]
    const samplesBefore = sortedAll.filter((s) => s.timestamp < minT)
    if (samplesBefore.length > 0) {
      initialSample = samplesBefore[samplesBefore.length - 1]
    }

    const startSample: ConnectionHistorySample = {
      timestamp: minT,
      online: initialSample.online,
      offline: initialSample.offline,
      total: initialSample.total,
    }

    const lastSample = samplesInside[samplesInside.length - 1] || initialSample
    const currentOnlineCount = currentStatus === 'online' ? 1 : 0
    const currentTotalCount = currentStatus ? 1 : (lastSample.total > 0 ? 1 : 0)

    const endSample: ConnectionHistorySample = {
      timestamp: maxT,
      online: currentOnlineCount,
      offline: currentTotalCount - currentOnlineCount,
      total: currentTotalCount,
    }

    const graphSamples = [
      startSample,
      ...samplesInside,
      endSample
    ]

    return graphSamples.map((sample) => {
      const d = new Date(sample.timestamp * 1000)
      const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const hr = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      const wd = weekDays[d.getDay()]

      const label = range === '24h'
        ? `${hr}:${min}`
        : range === '7d'
          ? `${wd} ${day}/${month}`
          : `${day}/${month}`

      const isOnline = sample.online > 0

      return {
        timestamp: sample.timestamp,
        label,
        statusVal: isOnline ? 1 : 0,
        exactTime: formatExactTime(sample.timestamp),
        online: sample.online,
        offline: sample.offline,
      }
    })
  }, [samples, range, currentStatus, currentTime])

  // Obtener las desconexiones recientes para la lista inferior
  const recentDisconnects = useMemo(() => {
    if (!events) return []
    return [...events]
      .filter((e) => e.type === 'instance.offline')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
  }, [events])

  // Colores adaptativos para Recharts
  const gridStroke = isDark ? '#1e293b' : '#e2e8f0'
  const axisStroke = isDark ? '#64748b' : '#94a3b8'
  const tickFill = isDark ? '#94a3b8' : '#475569'

  // Renderizado personalizado de puntos: Verde en Activo (1), Rojo en Inactivo (0)
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (cx === undefined || cy === undefined || !payload) return null
    const isOnline = payload.statusVal === 1
    const color = isOnline ? '#10b981' : '#ef4444'

    return (
      <circle
        key={`dot-${payload.timestamp}-${cx}`}
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
        stroke={isDark ? '#0f172a' : '#ffffff'}
        strokeWidth={2}
      />
    )
  }

  if (loading) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 flex flex-col items-center justify-center min-h-[180px]">
        <Spinner size="lg" />
        <p className="text-(--color-text-muted) text-sm mt-4">Cargando historial de conexión...</p>
      </div>
    )
  }

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 shadow-sm space-y-6">
      {/* Header y Selector de Rango */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-(--color-border) pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-(--color-primary-subtle) border border-(--color-primary)/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-(--color-primary)" />
          </div>
          <div>
            <h3 className="text-(--color-text-main) font-semibold text-base">Historial de Conexión del Equipo</h3>
            <p className="text-(--color-text-muted) text-xs">Monitoreo de estado y cortes en la línea de tiempo con Recharts</p>
          </div>
        </div>

        {/* Selector de Rango */}
        <div className="flex items-center bg-(--color-bg-base) p-1 rounded-lg border border-(--color-border) self-start sm:self-auto">
          {(['24h', '7d', '30d'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                range === r
                  ? 'bg-(--color-bg-surface) text-(--color-text-main) shadow-xs border border-(--color-border)'
                  : 'text-(--color-text-muted) hover:text-(--color-text-main)'
              }`}
            >
              {r === '24h' ? '24 Horas' : r === '7d' ? '7 Días' : '30 Días'}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico Recharts AreaChart (Step) con Gradiente Verde/Rojo */}
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center min-h-[120px] border border-dashed border-(--color-border) rounded-xl bg-(--color-bg-base)/30">
          <p className="text-(--color-text-muted) text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" /> No se registraron datos de conexión en este periodo.
          </p>
        </div>
      ) : (
        <div className="relative bg-(--color-bg-base) border border-(--color-border) rounded-xl p-4">
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <defs>
                  {/* Gradiente del Trazo: Verde en Activo (arriba=1), Rojo en Inactivo (abajo=0) */}
                  <linearGradient id="statusStrokeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="15%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="85%" stopColor="#ef4444" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={1} />
                  </linearGradient>

                  {/* Gradiente del Área Verde */}
                  <linearGradient id="activeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="label"
                  stroke={axisStroke}
                  tick={{ fill: tickFill, fontSize: 11 }}
                />
                <YAxis
                  stroke={axisStroke}
                  domain={[0, 1]}
                  ticks={[0, 1]}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  tickFormatter={(val) => (val === 1 ? 'Activo' : 'Inactivo')}
                />
                <Tooltip content={<CustomTooltip t={t} />} />
                <Area
                  type="stepAfter"
                  dataKey="statusVal"
                  stroke="url(#statusStrokeGradient)"
                  strokeWidth={2.5}
                  fill="url(#activeAreaGradient)"
                  dot={renderCustomDot}
                  activeDot={{ r: 7, stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Leyenda e Instrucciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-(--color-text-muted) pt-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-emerald-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Conectado (Activo)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-rose-500">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Desconectado (Inactivo)
          </span>
        </div>
        <span>Pasa el cursor sobre la línea para ver la fecha y la hora exacta con segundos.</span>
      </div>

      {/* Listado de Últimas Desconexiones Registradas */}
      {recentDisconnects.length > 0 && (
        <div className="pt-3 border-t border-(--color-border) space-y-3">
          <h4 className="text-xs font-semibold text-(--color-text-main) flex items-center gap-1.5">
            <WifiOff className="w-4 h-4 text-rose-500" />
            Últimas desconexiones registradas (segundos exactos)
          </h4>
          <div className="flex flex-wrap gap-2">
            {recentDisconnects.map((e, idx) => (
              <div
                key={idx}
                className="bg-rose-500/10 border border-rose-500/30 text-rose-500 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2"
              >
                <span>{formatExactTime(e.timestamp)}</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-[10px] font-bold uppercase">
                  Desconectado
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
