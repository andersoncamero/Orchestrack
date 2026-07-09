import type { ReactNode } from 'react'
import { Sidebar } from '../organisms/Sidebar'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-(--color-bg-base)">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  )
}
