import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'icon'
  children: ReactNode
}

const variants = {
  primary: 'bg-(--color-primary) hover:bg-(--color-primary-hover) text-white shadow-sm',
  secondary: 'bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) border border-(--color-border)',
  danger: 'bg-(--color-status-exited) hover:bg-red-600 text-white shadow-sm',
  icon: 'bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) p-2',
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const base = variant === 'icon'
    ? 'rounded-lg transition-colors duration-200 flex items-center justify-center'
    : 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2'

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
