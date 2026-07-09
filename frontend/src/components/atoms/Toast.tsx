import { useEffect, useState } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastItemProps {
  toast: ToastMessage
  onRemove: (id: string) => void
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: string; iconColor: string }> = {
  success: {
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.3)',
    icon: `<polyline points="20 6 9 17 4 12" />`,
    iconColor: '#10b981',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.3)',
    icon: `<path d="M12 8v4m0 4h.01" /><circle cx="12" cy="12" r="10" />`,
    iconColor: '#ef4444',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.3)',
    icon: `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />`,
    iconColor: '#f59e0b',
  },
  info: {
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.3)',
    icon: `<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />`,
    iconColor: '#6366f1',
  },
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [visible, setVisible] = useState(false)
  const style = variantStyles[toast.variant]

  useEffect(() => {
    // Pequeño delay para triggear la animación de entrada
    const showTimer = setTimeout(() => setVisible(true), 10)
    // Auto-dismiss después de 4 segundos
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, 4000)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [toast.id, onRemove])

  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: '10px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
        maxWidth: '360px',
        minWidth: '260px',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={style.iconColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: style.icon }}
      />
      <span style={{ fontSize: '13px', color: 'var(--color-text-main)', lineHeight: '1.4', flex: 1 }}>
        {toast.message}
      </span>
      <button
        onClick={() => {
          setVisible(false)
          setTimeout(() => onRemove(toast.id), 300)
        }}
        style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-end',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// Hook para usar toasts fácilmente
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, variant }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return { toasts, addToast, removeToast }
}
