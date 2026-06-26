'use client'

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

const styles = {
  success: { bg: '#EDF7F2', border: '#A8DDD5', icon: CheckCircle2, iconColor: '#4CAF9A', text: '#1A5A4A' },
  error:   { bg: '#FDF2F2', border: '#EDCFCF', icon: AlertCircle,  iconColor: '#D45050', text: '#7A2020' },
  info:    { bg: '#EFF5FD', border: '#C5D9F5', icon: Info,          iconColor: '#5090D9', text: '#1A3A7A' },
}

interface Props {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  return (
    <div
      className="fixed bottom-5 right-4 left-4 sm:left-auto sm:w-96 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const s = styles[toast.type]
        const Icon = s.icon
        return (
          <div
            key={toast.id}
            role="alert"
            className="flex items-start gap-3 p-4 rounded-2xl shadow-lg pointer-events-auto animate-slide-up"
            style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
          >
            <Icon size={18} style={{ color: s.iconColor, flexShrink: 0, marginTop: 1 }} />
            <p className="flex-1 text-sm font-medium leading-snug" style={{ color: s.text }}>
              {toast.message}
            </p>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-0.5 rounded transition-opacity hover:opacity-60 flex-shrink-0"
              style={{ color: s.iconColor }}
              aria-label="Fechar notificação"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
