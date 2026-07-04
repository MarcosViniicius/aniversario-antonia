'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Gift, Phone, Copy, Check } from 'lucide-react'
import { categoryConfig, type Gift as GiftType } from '@/lib/gifts-data'

const PIX_KEY = process.env.NEXT_PUBLIC_PIX_KEY ?? ''

interface Props {
  gift: GiftType
  onClaim: (userName: string, phone: string) => Promise<void>
  onClose: () => void
}

/** Formats typed digits as (XX) XXXXX-XXXX or (XX) XXXX-XXXX */
function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0)  return ''
  if (d.length <= 2)   return `(${d}`
  if (d.length <= 6)   return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10)  return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function digitsOnly(v: string): string {
  return v.replace(/\D/g, '')
}

export default function ClaimModal({ gift, onClaim, onClose }: Props) {
  const cfg      = categoryConfig[gift.category]
  const isPix    = gift.category === 'pix'
  const [name,       setName]       = useState('')
  const [phone,      setPhone]      = useState('')
  const [phoneDirty, setPhoneDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copied,     setCopied]     = useState(false)
  const nameRef  = useRef<HTMLInputElement>(null)

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard not available
    }
  }

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const phoneDigits   = digitsOnly(phone)
  const phoneValid    = phoneDigits.length >= 10  // 10 = fixo, 11 = celular
  const phoneError    = phoneDirty && !phoneValid
  const canSubmit     = name.trim().length >= 2 && phoneValid

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneDirty(true)
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      await onClaim(name.trim(), phone.trim())
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = (hasError: boolean) => ({
    border: `2px solid ${hasError ? '#E05050' : '#E5D5CF'}`,
    backgroundColor: hasError ? '#FDF2F2' : 'white',
    color: '#3D2B1F',
    transition: 'border-color 150ms ease',
  })

  const onFocus = (e: React.FocusEvent<HTMLInputElement>, hasError: boolean) => {
    if (!hasError) e.currentTarget.style.borderColor = '#C9846B'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>, hasError: boolean) => {
    if (!hasError) e.currentTarget.style.borderColor = '#E5D5CF'
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.bgColor }}>
                <Gift size={18} style={{ color: cfg.color }} />
              </div>
              <div>
                <h2 id="modal-title" className="font-playfair text-lg font-semibold" style={{ color: '#3D2B1F' }}>
                  Escolher presente
                </h2>
                <p className="text-xs" style={{ color: '#B08070' }}>
                  Preencha seus dados para reservar
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
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: cfg.bgColor, border: `1.5px solid ${cfg.borderColor}` }}>
            <p className="text-sm font-semibold leading-snug" style={{ color: '#3D2B1F' }}>{gift.name}</p>
            {gift.brand && <p className="text-xs mt-1" style={{ color: cfg.color }}>{gift.brand}</p>}
          </div>

          {/* PIX key — shown when NEXT_PUBLIC_PIX_KEY is set */}
          {isPix && PIX_KEY && (
            <div
              className="rounded-xl p-3 mb-4 flex items-center justify-between gap-3"
              style={{ backgroundColor: '#EDF7F5', border: '1.5px solid #A8DDD5' }}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#1A5A4A' }}>Chave Pix</p>
                <p className="text-sm font-mono break-all" style={{ color: '#2D8070' }}>{PIX_KEY}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyPix}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: copied ? '#4CAF9A' : 'white',
                  color:           copied ? 'white' : '#2D8070',
                  border:          `1px solid ${copied ? '#4CAF9A' : '#A8DDD5'}`,
                }}
                aria-label="Copiar chave Pix"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <label htmlFor="userName" className="block text-sm font-semibold mb-1.5" style={{ color: '#3D2B1F' }}>
              Seu nome <span style={{ color: '#C9846B' }}>*</span>
            </label>
            <input
              id="userName"
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Como você se chama?"
              required
              maxLength={50}
              autoComplete="given-name"
              autoCapitalize="words"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
              style={inputStyle(false)}
              onFocus={e => onFocus(e, false)}
              onBlur={e  => onBlur(e,  false)}
            />

            {/* Phone */}
            <label htmlFor="userPhone" className="block text-sm font-semibold mb-1.5" style={{ color: '#3D2B1F' }}>
              Seu telefone / WhatsApp <span style={{ color: '#C9846B' }}>*</span>
            </label>
            <div className="relative mb-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Phone size={14} style={{ color: phoneError ? '#E05050' : '#B08070' }} />
              </div>
              <input
                id="userPhone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhoneChange}
                onBlur={() => setPhoneDirty(true)}
                placeholder="(99) 99999-9999"
                required
                maxLength={16}
                autoComplete="tel"
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                style={inputStyle(phoneError)}
                onFocus={e => onFocus(e, phoneError)}
                aria-describedby={phoneError ? 'phone-error' : undefined}
                aria-invalid={phoneError}
              />
            </div>
            {phoneError && (
              <p id="phone-error" role="alert" className="text-xs mb-1" style={{ color: '#E05050' }}>
                Digite um número válido com DDD (ex: (11) 99999-9999)
              </p>
            )}
            <p className="text-xs mb-5" style={{ color: '#B08070' }}>
              Usado apenas para contato sobre o presente.
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
                disabled={!canSubmit || submitting}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #C9846B 0%, #C9A84C 100%)',
                  boxShadow: canSubmit ? '0 4px 14px rgba(201,132,107,0.4)' : 'none',
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
