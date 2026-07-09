import { useState, useMemo } from 'react'
import { Activity } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { Spinner } from '../atoms/Spinner'
import type { ConnectionHistorySample } from '../../types'

interface ConnectionHistoryChartProps {
  samples: ConnectionHistorySample[]
  loading?: boolean
}

export function ConnectionHistoryChart({ samples, loading }: ConnectionHistoryChartProps) {
  const { t } = useLanguage()
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null)

  const numDays = 30

  // Generar la matriz: 24 filas (horas) x 30 columnas (días)
  const { days, matrix } = useMemo(() => {
    // Generar los últimos N días de forma secuencial (de más antiguo a más reciente/hoy)
    const dayList: { date: Date; key: string; label: string }[] = []
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      dayList.push({ date: d, key: dayKey, label })
    }

    // Indexar muestras por hora y fecha "YYYY-MM-DD HH:00"
    const sampleMap: Record<string, ConnectionHistorySample> = {}
    samples.forEach((sample) => {
      const d = new Date(sample.timestamp * 1000)
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const hourKey = `${dayKey} ${String(d.getHours()).padStart(2, '0')}:00`
      sampleMap[hourKey] = sample
    })

    // Construir la matriz de 24 filas (horas) x 30 columnas (días)
    const mat: { hourLabel: string; cells: { dayLabel: string; hourLabel: string; sample: ConnectionHistorySample | null }[] }[] = []
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = `${String(hour).padStart(2, '0')}:00`
      const rowCells = dayList.map((day) => {
        const hourKey = `${day.key} ${hourStr}`
        return {
          dayLabel: day.label,
          hourLabel: hourStr,
          sample: sampleMap[hourKey] || null,
        }
      })
      mat.push({
        hourLabel: hourStr,
        cells: rowCells,
      })
    }

    return { days: dayList, matrix: mat }
  }, [samples])

  if (loading) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 flex items-center justify-center min-h-[380px]">
        <Spinner size="lg" />
      </div>
    )
  }

  // Dimensiones del SVG y celdas (Celdas más anchas para ocupar el espacio horizontal)
  const cellSizeX = 16
  const cellSizeY = 4
  const gapX = 1
  const gapY = 0.5
  const padding = { top: 8, right: 5, bottom: 12, left: 35 }

  const gridWidth = numDays * (cellSizeX + gapX) - gapX
  const gridHeight = 24 * (cellSizeY + gapY) - gapY

  const width = padding.left + gridWidth + padding.right
  const height = padding.top + gridHeight + padding.bottom

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <Activity className="w-5 h-5 text-(--color-primary)" />
        <h3 className="text-(--color-text-main) font-semibold text-base">{t('connectionHistory')}</h3>
      </div>

      <div className="overflow-x-auto relative flex justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {matrix.map((row, rIdx) => {
            const y = padding.top + rIdx * (cellSizeY + gapY)

            return (
              <g key={row.hourLabel}>
                {/* Etiquetas eje Y (horas) - cada 4 horas para mantener limpieza visual */}
                {rIdx % 4 === 0 && (
                  <text
                    x={padding.left - 5}
                    y={y + cellSizeY / 2 + 3}
                    textAnchor="end"
                    className="fill-(--color-text-muted) text-[9px] font-sans font-medium"
                  >
                    {row.hourLabel}
                  </text>
                )}

                {row.cells.map((cell, cIdx) => {
                  const x = padding.left + cIdx * (cellSizeX + gapX)
                  const isHovered = hoveredCell && hoveredCell.r === rIdx && hoveredCell.c === cIdx
                  const opacity = hoveredCell ? (isHovered ? 1.0 : 0.4) : 1.0

                  // Determinar color de la celda
                  let fillClass = "fill-bg-surface-subtle"
                  let style: React.CSSProperties = { fill: 'var(--color-bg-base)', opacity }

                  if (cell.sample) {
                    const { online, offline } = cell.sample
                    if (online > 0 && offline === 0) {
                      fillClass = "fill-(--color-status-running)"
                      style = { opacity }
                    } else if (offline > 0 && online === 0) {
                      fillClass = "fill-(--color-status-exited)"
                      style = { opacity }
                    } else if (online > 0 && offline > 0) {
                      fillClass = "fill-status-warning"
                      style = { fill: '#f97316', opacity } // Ámbar / Mixto
                    }
                  }

                  return (
                    <rect
                      key={cIdx}
                      x={x}
                      y={y}
                      width={cellSizeX}
                      height={cellSizeY}
                      rx={1}
                      className={`${fillClass} transition-all duration-150 cursor-pointer`}
                      style={style}
                      stroke={isHovered ? "var(--color-text-main)" : "none"}
                      strokeWidth={isHovered ? 0.8 : 0}
                      onMouseEnter={() => setHoveredCell({ r: rIdx, c: cIdx })}
                      onMouseLeave={() => setHoveredCell(null)}
                    />
                  )
                })}
              </g>
            )
          })}

          {/* Etiquetas eje X (días) - cada 5 días para evitar colisión */}
          {days.map((day, cIdx) => {
            const x = padding.left + cIdx * (cellSizeX + gapX)
            if (cIdx % 5 !== 0) return null
            return (
              <text
                key={day.key}
                x={x + cellSizeX / 2}
                y={height - 5}
                textAnchor="middle"
                className="fill-(--color-text-muted) text-[9px] font-sans font-medium"
              >
                {day.label}
              </text>
            )
          })}

          {/* Tooltip SVG integrado */}
          {hoveredCell !== null && (() => {
            const { r, c } = hoveredCell
            const cell = matrix[r]?.cells[c]
            if (!cell) return null

            const x = padding.left + c * (cellSizeX + gapX) + cellSizeX / 2
            const y = padding.top + r * (cellSizeY + gapY)

            const tooltipWidth = 140
            const tooltipHeight = 65
            
            // Posicionar horizontalmente a la izquierda o derecha para evitar tapar la celda seleccionada
            const tooltipX = x > width / 2
              ? x - tooltipWidth - 12
              : x + 12

            // Posicionar verticalmente centrado con respecto a la celda, limitándolo dentro del SVG
            const tooltipY = Math.max(5, Math.min(height - tooltipHeight - 5, y - tooltipHeight / 2 + cellSizeY / 2))

            return (
              <g className="pointer-events-none">
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx={6}
                  fill="var(--color-bg-surface)"
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  className="filter drop-shadow-md"
                />
                <text
                  x={tooltipX + 10}
                  y={tooltipY + 16}
                  className="fill-(--color-text-muted) text-[9px] font-medium font-sans"
                >
                  {cell.dayLabel} {cell.hourLabel}
                </text>
                {cell.sample ? (
                  <>
                    <text
                      x={tooltipX + 10}
                      y={tooltipY + 34}
                      className="fill-(--color-status-running) text-[11px] font-semibold font-sans"
                    >
                      ● {t('online')}: {cell.sample.online}
                    </text>
                    <text
                      x={tooltipX + 10}
                      y={tooltipY + 50}
                      className="fill-(--color-status-exited) text-[11px] font-semibold font-sans"
                    >
                      ● {t('offline')}: {cell.sample.offline}
                    </text>
                  </>
                ) : (
                  <text
                    x={tooltipX + 10}
                    y={tooltipY + 38}
                    className="fill-(--color-text-muted) text-[11px] font-sans"
                  >
                    {t('noData') || 'Sin datos'}
                  </text>
                )}
              </g>
            )
          })()}
        </svg>
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-(--color-status-running)" />
          <span className="text-(--color-text-secondary) text-xs">{t('online')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]" />
          <span className="text-(--color-text-secondary) text-xs">Mixto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-(--color-status-exited)" />
          <span className="text-(--color-text-secondary) text-xs">{t('offline')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-transparent border border-(--color-border)" style={{ backgroundColor: 'var(--color-bg-base)' }} />
          <span className="text-(--color-text-secondary) text-xs">Sin datos</span>
        </div>
      </div>
    </div>
  )
}
