import type { LucideIcon } from 'lucide-react'
import { Card } from '../atoms/Card'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'blue' | 'slate' | 'emerald' | 'rose'
}

const colorStyles = {
  blue: 'text-(--color-primary) bg-(--color-primary-subtle)',
  slate: 'text-(--color-status-neutral) bg-(--color-status-neutral-subtle)',
  emerald: 'text-(--color-status-running) bg-(--color-status-running-subtle)',
  rose: 'text-(--color-status-exited) bg-(--color-status-exited-subtle)',
}

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-(--color-text-muted) text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-(--color-text-main) mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  )
}
