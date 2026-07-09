import type { ReactNode } from 'react'
import { Header } from '../organisms/Header'
import { MainLayout } from './MainLayout'
import type { Instance } from '../../types'

interface DashboardTemplateProps {
  title: string
  subtitle?: string
  instances: Instance[]
  selectedInstance: string
  onSelectInstance: (id: string) => void
  children: ReactNode
}

export function DashboardTemplate({
  title,
  subtitle,
  instances,
  selectedInstance,
  onSelectInstance,
  children,
}: DashboardTemplateProps) {
  return (
    <MainLayout>
      <Header
        title={title}
        subtitle={subtitle}
        instances={instances}
        selectedInstance={selectedInstance}
        onSelectInstance={onSelectInstance}
      />
      <main className="flex-1 p-8 bg-(--color-bg-base)">
        {children}
      </main>
    </MainLayout>
  )
}
