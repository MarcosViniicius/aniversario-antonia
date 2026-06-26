'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Gift } from 'lucide-react'
import { categoryConfig, type Gift as GiftType } from '@/lib/gifts-data'

interface Props {
  gift: GiftType
  onClaim: (userName: string) => Promise<void>
  onClose: () => void
}

export default function ClaimModal({ gift, onClaim, onClose }: Props) {
  const cfg = categoryConfig[gift.category]
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus input after mount animation
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      await onClaim(name.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(61,43,31,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl animate-slide-up"
        style={{ backgroundColor: '#FDF8F3' }}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#E5D5CF' }} />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: cfg.bgColor }}
              >
                <Gift size={18} style={{ color: cfg.color }} />
              </div>
              <div>
                <h2 id="modal-title" className="font-playfair text-lg font-semibold" style={{ color: '#3D2B1F' }}>
                  Escolher presente
                </h2>
                <p className="text-xs" style={{ color: '#B08070' }}>
                  Insira seu nome para reservar
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-colors hover:bg-black/5"
              style={{ color: '#B08070' }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Gift preview */}
          <div
            className="rounded-2xl p-4 mb-5"
            style={{ backgroundColor: cfg.bgColor, border: `1.5px solid ${cfg.borderColor}` }}
          >
            <p className="text-sm font-semibold leading-snug" style={{ color: '#3D2B1F' }}>
              {gift.name}
            </p>
            {gift.brand && (
              <p className="text-xs mt-1" style={{ color: cfg.color }}>
                {gift.brand}
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <label htmlFor="userName" className="block text-sm font-semibold mb-2" style={{ color: '#3D2B1F' }}>
              Seu nome <span style={{ color: '#C9846B' }}>*</span>
            </label>
            <input
              id="userName"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como você se chama?"
              required
              maxLength={50}
              autoComplete="given-name"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                border: '2px solid #E5D5CF',
                backgroundColor: 'white',
                color: '#3D2B1F',
                transition: 'border-color 150ms ease',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#C9846B')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#E5D5CF')}
            />
            <p className="text-xs mt-2 mb-6" style={{ color: '#B08070' }}>
              Seu nome ficará visível na lista para que todos saibam quem está trazendo o quê.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ border: '1.5px solid #E5D5CF', color: '#7A5C4E', backgroundColor: 'white' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!name.trim() || submitting}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #C9846B 0%, #C9A84C 100%)',
                  boxShadow: name.trim() ? '0 4px 14px rgba(201,132,107,0.4)' : 'none',
                }}
              >
                {submitting ? 'Salvando...' : 'Confirmar presente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
