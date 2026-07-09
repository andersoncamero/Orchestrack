import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-(--color-bg-surface) border border-(--color-border) rounded-xl shadow-sm p-6 ${className}`}>
      {children}
    </div>
  )
}
