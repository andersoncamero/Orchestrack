interface GaugeChartProps {
  value: number
  max?: number
  label: string
  sublabel?: string
  size?: number
}

function getColor(value: number): string {
  if (value > 80) return 'var(--color-status-exited)'
  if (value > 50) return 'var(--color-status-warning)'
  return 'var(--color-status-running)'
}

export function GaugeChart({ value, max = 100, label, sublabel, size = 200 }: GaugeChartProps) {
  const radius = size * 0.4
  const stroke = size * 0.08
  const normalized = Math.min(Math.max(value, 0), max)
  const percent = (normalized / max) * 100
  const circumference = Math.PI * radius
  const offset = circumference * (1 - percent / 100)
  const color = getColor(percent)

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 flex flex-col items-center">
      <h4 className="text-(--color-text-main) font-semibold text-sm w-full text-left mb-2">{label}</h4>
      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
          <path
            d={`M ${stroke} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke} ${size / 2}`}
            fill="none"
            stroke="var(--color-bg-base)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${stroke} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-bold text-(--color-text-main)">{value.toFixed(1)}%</span>
          {sublabel && <span className="text-xs text-(--color-text-muted)">{sublabel}</span>}
        </div>
      </div>
    </div>
  )
}
