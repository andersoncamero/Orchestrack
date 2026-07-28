import { useState, useMemo, useEffect } from 'react'
import { Activity, Clock, WifiOff } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

  // Procesar métricas y desconexiones reales sin inventar periodos de inactividad previos al registro del servidor
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

    // Ordenar todas las muestras registradas
    const sortedAll = [...samples].sort((a, b) => a.timestamp - b.timestamp)
    const samplesInside = sortedAll.filter((s) => s.timestamp >= minT && s.timestamp <= maxT)

    if (samplesInside.length === 0) {
      return []
    }

    // Determinar inicio del timeline basado en el primer registro real dentro del rango
    const firstSampleTime = samplesInside[0].timestamp
    const startPointTime = Math.max(minT, firstSampleTime)
    const firstStatusVal = samplesInside[0].online > 0 ? 1 : 0

    const startPoint = {
      timestamp: startPointTime,
      statusVal: firstStatusVal,
      isRealDisconnect: false,
    }

    // Set de timestamps exactos de eventos de desconexión
    const offlineEventTimes = new Set(
      (events || []).filter((e) => e.type === 'instance.offline').map((e) => e.timestamp)
    )

    const mappedSamples = samplesInside.map((sample, idx) => {
      const isOnline = sample.online > 0
      const statusVal = isOnline ? 1 : 0
      const prevStatusVal = idx > 0 ? (samplesInside[idx - 1].online > 0 ? 1 : 0) : firstStatusVal
      // Es una desconexión real si la conexión cae de Activo a Inactivo (transición) o coincide con un evento registrado
      const isRealDisconnect = !isOnline && (prevStatusVal === 1 || offlineEventTimes.has(sample.timestamp))

      return {
        timestamp: sample.timestamp,
        statusVal,
        isRealDisconnect,
      }
    })

    const currentOnlineVal = currentStatus === 'online' ? 1 : (currentStatus === 'offline' ? 0 : firstStatusVal)
    const lastSampleVal = samplesInside[samplesInside.length - 1].online > 0 ? 1 : 0
    const endPoint = {
      timestamp: maxT,
      statusVal: currentOnlineVal,
      isRealDisconnect: currentStatus === 'offline' && lastSampleVal === 1,
    }

    const allPoints = [startPoint, ...mappedSamples, endPoint]

    // Muestreo inteligente: mantener cambios de estado y desconexiones reales, espaciando puntos estables
    const stepInterval = range === '7d' ? 1800 : range === '30d' ? 3600 * 4 : 300
    const filteredPoints: typeof allPoints = []
    let lastKeepTime = 0

    allPoints.forEach((pt, idx) => {
      const isFirst = idx === 0
      const isLast = idx === allPoints.length - 1
      const isStateChange = idx > 0 && pt.statusVal !== allPoints[idx - 1].statusVal
      const isDisconnect = pt.isRealDisconnect

      if (isFirst || isLast || isStateChange || isDisconnect || (pt.timestamp - lastKeepTime >= stepInterval)) {
        filteredPoints.push(pt)
        lastKeepTime = pt.timestamp
      }
    })

    return filteredPoints.map((pt) => {
      const d = new Date(pt.timestamp * 1000)
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

      return {
        timestamp: pt.timestamp,
        label,
        statusVal: pt.statusVal,
        isRealDisconnect: pt.isRealDisconnect,
        exactTime: formatExactTime(pt.timestamp),
      }
    })
  }, [samples, events, range, currentStatus, currentTime])

  // Obtener las desconexiones recientes reales para el listado inferior
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

  // Renderizar punto rojo ÚNICAMENTE en las desconexiones reales
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (cx === undefined || cy === undefined || !payload) return null
    
    if (payload.isRealDisconnect) {
      return (
        <circle
          key={`dot-${payload.timestamp}-${cx}`}
          cx={cx}
          cy={cy}
          r={5}
          fill="#ef4444"
          stroke={isDark ? '#0f172a' : '#ffffff'}
          strokeWidth={2}
        />
      )
    }
    return null
  }

  // Renderizar punto activo emergente al pasar el cursor (dinámico: verde si Activo, rojo si Inactivo)
  const renderActiveDot = (props: any) => {
    const { cx, cy, payload } = props
    if (cx === undefined || cy === undefined || !payload) return null
    const isOnline = payload.statusVal === 1
    const color = isOnline ? '#10b981' : '#ef4444'

    return (
      <circle
        key={`act-dot-${payload.timestamp}-${cx}`}
        cx={cx}
        cy={cy}
        r={6}
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
            <p className="text-(--color-text-muted) text-xs">Monitoreo de estado y cortes en la línea de tiempo con Recharts Simple Line Chart</p>
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

      {/* Gráfico Recharts Simple Line Chart de Desconexiones Reales */}
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
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="label"
                  stroke={axisStroke}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  minTickGap={45}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke={axisStroke}
                  domain={[0, 1]}
                  ticks={[0, 1]}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  tickFormatter={(val) => (val === 1 ? 'Activo' : 'Inactivo')}
                />
                <Tooltip content={<CustomTooltip t={t} />} />
                <Line
                  type="stepAfter"
                  dataKey="statusVal"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={renderCustomDot}
                  activeDot={renderActiveDot}
                />
              </LineChart>
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
