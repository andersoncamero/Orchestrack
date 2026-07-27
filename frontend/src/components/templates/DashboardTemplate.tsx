import type { ReactNode } from 'react'
import { Header } from '../organisms/Header'
import { MainLayout } from './MainLayout'

interface DashboardTemplateProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function DashboardTemplate({
  title,
  subtitle,
  children,
}: DashboardTemplateProps) {
  return (
    <MainLayout>
      <Header
        title={title}
        subtitle={subtitle}
      />
      <main className="flex-1 p-8 bg-(--color-bg-base)">
        {children}
      </main>
    </MainLayout>
  )
}
