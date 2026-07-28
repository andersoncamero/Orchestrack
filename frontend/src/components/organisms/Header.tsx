import { UserNavActions } from '../molecules/UserNavActions'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-20 bg-(--color-bg-surface)/90 backdrop-blur-sm border-b border-(--color-border) flex items-center justify-between px-8 sticky top-0 z-10">
      <div>
        <h2 className="text-2xl font-bold text-(--color-text-main)">{title}</h2>
        {subtitle && <p className="text-(--color-text-muted) text-sm mt-0.5">{subtitle}</p>}
      </div>

      <UserNavActions />
    </header>
  )
}
