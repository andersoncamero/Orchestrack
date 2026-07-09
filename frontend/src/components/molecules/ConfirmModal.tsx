import type { ReactNode } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '../atoms/Button'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  children?: ReactNode
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isLoading = false,
  children,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-(--color-text-main)/40 flex items-center justify-center z-50">
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-(--color-text-main) font-semibold text-lg">{title}</h3>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-(--color-text-muted) hover:text-(--color-text-main) disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-(--color-text-secondary) text-sm mb-6">{message}</p>
        {children}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
