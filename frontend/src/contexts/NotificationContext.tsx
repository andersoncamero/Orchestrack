import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useInstances } from '../hooks/useInstances'
import { useLanguage } from './LanguageContext'
import type { SystemNotification, Instance } from '../types'

interface NotificationContextType {
  notifications: SystemNotification[]
  unreadCount: number
  markAllAsRead: () => void
  markAsRead: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

function buildAlerts(instances: Instance[], t: (key: string) => string): Omit<SystemNotification, 'read'>[] {
  const alerts: Omit<SystemNotification, 'read'>[] = []

  instances.forEach((instance) => {
    if (instance.status === 'offline') {
      alerts.push({
        id: `${instance.service_id}-offline`,
        severity: 'critical',
        message: t('hostOfflineAlert'),
        host: instance.hostname,
        timestamp: instance.last_seen,
      })
      return
    }

    const m = instance.host_metrics
    if (!m) return

    if (m.cpu_percent > 80) {
      alerts.push({
        id: `${instance.service_id}-cpu`,
        severity: 'critical',
        message: t('cpuHighAlert').replace('{value}', m.cpu_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    } else if (m.cpu_percent > 50) {
      alerts.push({
        id: `${instance.service_id}-cpu-warning`,
        severity: 'warning',
        message: t('cpuWarningAlert').replace('{value}', m.cpu_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    }

    if (m.memory_percent > 80) {
      alerts.push({
        id: `${instance.service_id}-memory`,
        severity: 'critical',
        message: t('memoryHighAlert').replace('{value}', m.memory_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    } else if (m.memory_percent > 50) {
      alerts.push({
        id: `${instance.service_id}-memory-warning`,
        severity: 'warning',
        message: t('memoryWarningAlert').replace('{value}', m.memory_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    }

    if (m.disk_percent > 80) {
      alerts.push({
        id: `${instance.service_id}-disk`,
        severity: 'critical',
        message: t('diskHighAlert').replace('{value}', m.disk_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    } else if (m.disk_percent > 50) {
      alerts.push({
        id: `${instance.service_id}-disk-warning`,
        severity: 'warning',
        message: t('diskWarningAlert').replace('{value}', m.disk_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    }

    if (m.cpu_cores > 0 && m.load_average > m.cpu_cores * 0.9) {
      alerts.push({
        id: `${instance.service_id}-load`,
        severity: 'warning',
        message: t('loadHighAlert').replace('{value}', m.load_average.toFixed(2)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    }
  })

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity]
    }
    return b.timestamp - a.timestamp
  })
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const { instances } = useInstances()
  const [readIds, setReadIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('orchestrack-read-notifications')
    return saved ? JSON.parse(saved) : []
  })



  useEffect(() => {
    localStorage.setItem('orchestrack-read-notifications', JSON.stringify(readIds))
  }, [readIds])

  const notifications = useMemo(() => {
    const activeAlerts = buildAlerts(instances, t)
    return activeAlerts.map((alert) => ({
      ...alert,
      read: readIds.includes(alert.id),
    }))
  }, [instances, readIds, t])

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length
  }, [notifications])

  const markAllAsRead = () => {
    const activeIds = notifications.map((n) => n.id)
    setReadIds((prev) => {
      const merged = new Set([...prev, ...activeIds])
      return Array.from(merged)
    })
  }

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
