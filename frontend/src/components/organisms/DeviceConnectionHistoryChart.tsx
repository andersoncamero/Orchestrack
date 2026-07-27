import { useState, useMemo, useEffect } from 'react'
import { Activity, Clock, WifiOff } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
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

// Constantes de dimensiones y diseño del SVG
const WIDTH = 800
const HEIGHT = 130
const PADDING = { top: 70, right: 30, bottom: 30, left: 60 }
const GRID_WIDTH = WIDTH - PADDING.left - PADDING.right
const GRID_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom

const Y_ACTIVE = PADDING.top
const Y_INACTIVE = PADDING.top + GRID_HEIGHT

export function DeviceConnectionHistoryChart({
  samples,
  events = [],
  loading = false,
  range,
  onRangeChange,
  currentStatus,
}: DeviceConnectionHistoryChartProps) {
  const { t } = useLanguage()
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number
    y: number
    sample: ConnectionHistorySample
    status: 'online' | 'offline' | 'no_data'
  } | null>(null)

  // Reloj local para mantener el extremo de la gráfica en el "ahora" real
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000))
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Procesar muestras con ventana de tiempo móvil absoluta
  const processedData = useMemo(() => {
    const now = currentTime
    let minT = now - 24 * 3600
    if (range === '7d') {
      minT = now - 7 * 24 * 3600
    } else if (range === '30d') {
      minT = now - 30 * 24 * 3600
    }
    const maxT = now
    const diffT = maxT - minT || 1

    if (!samples || samples.length === 0) {
      return { points: [], xTicks: [] }
    }

    // Ordenar cronológicamente (ascendente)
    const sortedAll = [...samples].sort((a, b) => a.timestamp - b.timestamp)
    const samplesInside = sortedAll.filter((s) => s.timestamp >= minT && s.timestamp <= maxT)

    // Determinar la muestra inicial para rellenar desde el extremo izquierdo (minT)
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

    // Determinar el estado final para proyectarlo hasta "ahora" (maxT)
    const lastSample = samplesInside[samplesInside.length - 1] || initialSample
    const currentOnlineCount = currentStatus === 'online' ? 1 : 0
    const currentTotalCount = currentStatus ? 1 : (lastSample.total > 0 ? 1 : 0)

    const endSample: ConnectionHistorySample = {
      timestamp: maxT,
      online: currentOnlineCount,
      offline: currentTotalCount - currentOnlineCount,
      total: currentTotalCount,
    }

    // Construir conjunto completo de muestras a graficar
    const graphSamples = [
      startSample,
      ...samplesInside,
      endSample
    ]

    // Mapear muestras a puntos de coordenadas en el SVG
    const points = graphSamples.map((sample) => {
      const x = PADDING.left + ((sample.timestamp - minT) / diffT) * GRID_WIDTH

      let status: 'online' | 'offline' | 'no_data' = 'no_data'
      if (sample.total > 0) {
        status = sample.online > 0 ? 'online' : 'offline'
      }

      const y = status === 'online' ? Y_ACTIVE : Y_INACTIVE

      return {
        x,
        y,
        status,
        sample,
      }
    })

    // Generar marcas del eje X espaciadas equidistantemente con formato según el rango
    const xTicks: { x: number; label: string }[] = []
    const numTicks = range === '24h' ? 7 : 6
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

    for (let i = 0; i < numTicks; i++) {
      const tickTimestamp = minT + (i / (numTicks - 1)) * diffT
      const x = PADDING.left + ((tickTimestamp - minT) / diffT) * GRID_WIDTH
      const date = new Date(tickTimestamp * 1000)

      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const hr = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      const wd = weekDays[date.getDay()]

      const label = range === '24h'
        ? `${hr}:${min}`
        : range === '7d'
          ? `${wd} ${day}/${month}`
          : `${day}/${month}`
      xTicks.push({ x, label })
    }

    return { points, xTicks }
  }, [samples, range, currentStatus, currentTime])

  const { points, xTicks } = processedData

  // Obtener eventos que ocurrieron en el intervalo de la muestra seleccionada
  const intervalEvents = useMemo(() => {
    if (!hoveredPoint || !events) return []
    const tEnd = hoveredPoint.sample.timestamp
    const tStart = tEnd - 3600 // 1 hora atrás

    return events.filter((e) => e.timestamp > tStart && e.timestamp <= tEnd)
  }, [hoveredPoint, events])

  // Obtener el último evento de desconexión antes del timestamp seleccionado
  const lastOfflineEvent = useMemo(() => {
    if (!hoveredPoint || !events || hoveredPoint.status !== 'offline') return null
    return [...events]
      .filter((e) => e.type === 'instance.offline' && e.timestamp <= hoveredPoint.sample.timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)[0] || null
  }, [hoveredPoint, events])

  // Obtener las desconexiones recientes generales para listarlas
  const recentDisconnects = useMemo(() => {
    if (!events) return []
    return [...events]
      .filter((e) => e.type === 'instance.offline')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
  }, [events])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online':
        return t('online') || 'Activo'
      case 'offline':
        return t('offline') || 'Inactivo'
      default:
        return t('noData') || 'Sin datos'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10b981' // Verde
      case 'offline':
        return '#ef4444' // Rojo
      default:
        return 'var(--color-border)' // Gris
    }
  }

  const formatExactTime = (ts: number) => {
    const d = new Date(ts * 1000)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hr = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const sec = String(d.getSeconds()).padStart(2, '0')
    return `${day}/${month}/${year} ${hr}:${min}:${sec}`
  };

  if (loading) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 flex flex-col items-center justify-center min-h-[180px]">
        <Spinner size="lg" />
        <p className="text-(--color-text-muted) text-sm mt-4">Cargando historial de conexión...</p>
      </div>
    )
  }

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-(--color-primary-subtle) border border-(--color-primary)/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-(--color-primary)" />
          </div>
          <div>
            <h3 className="text-(--color-text-main) font-semibold text-base">Historial de Conexión del Equipo</h3>
            <p className="text-(--color-text-muted) text-xs">Monitoreo de estado y cortes en la línea de tiempo</p>
          </div>
        </div>

        {/* Selector de Rango */}
        <div className="flex items-center bg-(--color-bg-base) p-1 rounded-lg border border-(--color-border) self-start sm:self-auto">
          {(['24h', '7d', '30d'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${range === r
                ? 'bg-(--color-bg-surface) text-(--color-text-main) shadow-xs border border-(--color-border)'
                : 'text-(--color-text-muted) hover:text-(--color-text-main)'
                }`}
            >
              {r === '24h' ? '24 Horas' : r === '7d' ? '7 Días' : '30 Días'}
            </button>
          ))}
        </div>
      </div>

      {points.length === 0 ? (
        <div className="flex items-center justify-center min-h-[120px] border border-dashed border-(--color-border) rounded-xl bg-(--color-bg-base)/30">
          <p className="text-(--color-text-muted) text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" /> No se registraron datos de conexión en este periodo.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto relative">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Degradado Verde para Activo */}
              <linearGradient id="gradient-online" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              {/* Degradado Rojo para Inactivo */}
              <linearGradient id="gradient-offline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
              {/* Brillo para las líneas activas */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Líneas guía horizontales */}
            <g className="stroke-(--color-border) opacity-40">
              {/* Línea Activo */}
              <line
                x1={PADDING.left}
                y1={Y_ACTIVE}
                x2={WIDTH - PADDING.right}
                y2={Y_ACTIVE}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              {/* Línea Inactivo */}
              <line
                x1={PADDING.left}
                y1={Y_INACTIVE}
                x2={WIDTH - PADDING.right}
                y2={Y_INACTIVE}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            </g>

            {/* Etiquetas del eje Y (Activo / Inactivo) */}
            <g className="fill-(--color-text-muted) text-[9px] font-sans font-medium">
              <text x={PADDING.left - 12} y={Y_ACTIVE + 4} textAnchor="end" className="fill-[#10b981]">
                Activo
              </text>
              <text x={PADDING.left - 12} y={Y_INACTIVE + 4} textAnchor="end" className="fill-[#ef4444]">
                Inactivo
              </text>
            </g>

            {/* Renderizado de Áreas Degradadas y Líneas de Pasos */}
            {points.map((pt, i) => {
              if (i === points.length - 1) return null

              const nextPt = points[i + 1]
              // Si hay corte (sin datos), no dibujamos este segmento
              if (pt.status === 'no_data' || nextPt.status === 'no_data') return null

              const fillGradient = pt.status === 'online' ? 'url(#gradient-online)' : 'url(#gradient-offline)'
              const color = getStatusColor(pt.status)

              return (
                <g key={i}>
                  {/* Área degradada */}
                  <polygon
                    points={`
                      ${pt.x},${pt.y}
                      ${nextPt.x},${pt.y}
                      ${nextPt.x},${Y_INACTIVE}
                      ${pt.x},${Y_INACTIVE}
                    `}
                    fill={fillGradient}
                  />

                  {/* Línea horizontal de estado */}
                  <line
                    x1={pt.x}
                    y1={pt.y}
                    x2={nextPt.x}
                    y2={pt.y}
                    stroke={color}
                    strokeWidth={1.2}
                    strokeLinecap="round"
                  />

                  {/* Línea vertical de transición (salto de estado) */}
                  {pt.y !== nextPt.y && (
                    <line
                      x1={nextPt.x}
                      y1={pt.y}
                      x2={nextPt.x}
                      y2={nextPt.y}
                      stroke={getStatusColor(nextPt.status)}
                      strokeWidth={1.2}
                      strokeLinecap="round"
                    />
                  )}
                </g>
              )
            })}

            {/* Cuadrícula vertical y etiquetas del eje X */}
            <g>
              {xTicks.map((tick, idx) => (
                <g key={idx}>
                  <line
                    x1={tick.x}
                    y1={PADDING.top}
                    x2={tick.x}
                    y2={Y_INACTIVE}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                    className="opacity-20"
                  />
                  <text
                    x={tick.x}
                    y={Y_INACTIVE + 18}
                    textAnchor="middle"
                    className="fill-(--color-text-muted) text-[9px] font-sans font-medium"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}
            </g>

            {/* Puntos interactivos invisibles para hovered y círculos marcadores */}
            {points.map((pt, i) => {
              if (pt.status === 'no_data') return null

              const isHovered = hoveredPoint && hoveredPoint.sample.timestamp === pt.sample.timestamp

              return (
                <g key={i}>
                  {/* Círculo indicador si está hovered o para destacar cambios de estado */}
                  {(isHovered || (i > 0 && points[i - 1].status !== pt.status)) && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 3.5 : 1.8}
                      fill="var(--color-bg-surface)"
                      stroke={getStatusColor(pt.status)}
                      strokeWidth={1.2}
                      className="transition-all duration-150"
                    />
                  )}

                  {/* Zona interactiva para capturar el mouse (círculo invisible sobre el punto) */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={8}
                    fill="transparent"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              )
            })}

            {/* Punto indicador del momento actual (último punto) */}
            {points.length > 0 && (() => {
              const lastPt = points[points.length - 1]
              if (lastPt.status === 'no_data') return null
              const color = getStatusColor(lastPt.status)
              return (
                <circle
                  cx={lastPt.x}
                  cy={lastPt.y}
                  r={2.5}
                  fill={color}
                />
              )
            })()}

            {/* Tooltip integrado con hora exacta y segundos */}
            {hoveredPoint && (() => {
              const { x, y, sample, status } = hoveredPoint
              const date = new Date(sample.timestamp * 1000)

              // Buscar si hay eventos de cambio de estado en este bloque exacto de 1 hora
              const eventsInHour = intervalEvents.filter((ev) => ev.type === 'instance.offline' || ev.type === 'instance.online')

              const tooltipWidth = 100
              const tooltipHeight = eventsInHour.length > 0 ? 35 + eventsInHour.length * 11 : (lastOfflineEvent && status === 'offline' ? 46 : 32)
              const tooltipX = Math.max(5, Math.min(WIDTH - tooltipWidth - 5, x - tooltipWidth / 2))
              const tooltipY = Math.max(5, y - tooltipHeight - 10)

              // Formato corto de fecha/hora: DD/MM HH:MM
              const day = String(date.getDate()).padStart(2, '0')
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const min = String(date.getMinutes()).padStart(2, '0')
              const shortDate = `${day}/${month} ${String(date.getHours()).padStart(2, '0')}:${min}`

              return (
                <g className="pointer-events-none" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))">
                  <rect
                    x={tooltipX}
                    y={tooltipY}
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx={4}
                    fill="var(--color-bg-surface)"
                    stroke="var(--color-border)"
                    strokeWidth={0.8}
                  />
                  {/* Indicador del color del estado */}
                  <rect
                    x={tooltipX}
                    y={tooltipY}
                    width={2}
                    height={tooltipHeight}
                    rx={1}
                    fill={getStatusColor(status)}
                  />
                  <text
                    x={tooltipX + 6}
                    y={tooltipY + 10}
                    className="fill-(--color-text-main) text-[6.5px] font-bold font-sans"
                  >
                    {shortDate}
                  </text>

                  <text
                    x={tooltipX + 6}
                    y={tooltipY + 18}
                    className="fill-(--color-text-muted) text-[6.5px] font-sans"
                  >
                    Estado: <tspan fill={getStatusColor(status)} className="font-bold">{getStatusLabel(status)}</tspan>
                  </text>

                  {/* Si hay eventos específicos de desconexión/conexión dentro de este bloque, mostrarlos con segundos exactos */}
                  {eventsInHour.length > 0 ? (
                    <g>
                      <text x={tooltipX + 6} y={tooltipY + 26} className="fill-(--color-text-muted) text-[6px] font-bold">
                        Cambios:
                      </text>
                      {eventsInHour.map((ev, index) => {
                        const evTime = new Date(ev.timestamp * 1000)
                        const formattedEv = `${String(evTime.getHours()).padStart(2, '0')}:${String(evTime.getMinutes()).padStart(2, '0')}:${String(evTime.getSeconds()).padStart(2, '0')}`
                        const isOffline = ev.type === 'instance.offline'
                        return (
                          <text
                            key={index}
                            x={tooltipX + 10}
                            y={tooltipY + 34 + index * 10}
                            className="text-[6px] font-sans"
                            fill={isOffline ? '#ef4444' : '#10b981'}
                          >
                            • {isOffline ? 'Caída' : 'Conex.'} {formattedEv}
                          </text>
                        )
                      })}
                    </g>
                  ) : (
                    /* Si está inactivo y no hay eventos en esta hora, mostrar el momento exacto en el que ocurrió la última desconexión */
                    status === 'offline' && lastOfflineEvent ? (
                      <g>
                        <text x={tooltipX + 6} y={tooltipY + 26} className="fill-(--color-text-muted) text-[6px] font-bold">
                          Caída desde:
                        </text>
                        <text x={tooltipX + 6} y={tooltipY + 35} className="fill-[#ef4444] text-[6px] font-bold font-mono">
                          {(() => {
                            const d = new Date(lastOfflineEvent.timestamp * 1000)
                            const h = String(d.getHours()).padStart(2, '0')
                            const m = String(d.getMinutes()).padStart(2, '0')
                            const s = String(d.getSeconds()).padStart(2, '0')
                            return `${d.getDate()}/${d.getMonth() + 1} ${h}:${m}:${s}`
                          })()}
                        </text>
                      </g>
                    ) : (
                      <text x={tooltipX + 6} y={tooltipY + 26} className="fill-(--color-text-muted) text-[6px]">
                        Sin cortes.
                      </text>
                    )
                  )}
                </g>
              )
            })()}
          </svg>
        </div>
      )}

      {/* Resumen e Indicadores */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4 pt-4 border-t border-(--color-border)">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span className="text-(--color-text-secondary) text-xs">Conectado (Activo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="text-(--color-text-secondary) text-xs">Desconectado (Inactivo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-transparent border border-(--color-border)" style={{ backgroundColor: 'var(--color-bg-base)' }} />
            <span className="text-(--color-text-secondary) text-xs">Sin datos</span>
          </div>
        </div>

        <div className="text-[11px] text-(--color-text-muted)">
          Pasa el cursor sobre la línea para ver la fecha y la hora exacta con segundos de las desconexiones.
        </div>
      </div>

      {/* Listado de Últimas Desconexiones con segundos exactos */}
      {recentDisconnects.length > 0 && (
        <div className="mt-5 pt-4 border-t border-(--color-border)/60">
          <h4 className="text-xs font-bold text-(--color-text-main) flex items-center gap-1.5 mb-3">
            <WifiOff className="w-3.5 h-3.5 text-[#ef4444]" />
            Últimas desconexiones registradas (segundos exactos)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recentDisconnects.map((ev, index) => (
              <div key={index} className="bg-(--color-bg-base) border border-(--color-border) rounded-lg p-2.5 flex items-center justify-between text-xs">
                <span className="text-(--color-text-secondary) font-mono">
                  {formatExactTime(ev.timestamp)}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
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
