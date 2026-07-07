'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Gift, Phone, Copy, Check, MessageCircle, ExternalLink } from 'lucide-react'
import { categoryConfig, type Gift as GiftType } from '@/lib/gifts-data'
import { maskPhone, digitsOnly, normalizeBrPhone, mightMissNine, waLink } from '@/lib/phone'

interface PixSettings {
  pix_key?: string
  pix_owner_name?: string
  pix_receipt_phone?: string
}

interface Props {
  gift: GiftType
  onClaim: (userName: string, phone: string) => Promise<void>
  onClose: () => void
  prefillName?: string
  prefillPhone?: string
  giftNumber?: 1 | 2
}


export default function ClaimModal({ gift, onClaim, onClose, prefillName = '', prefillPhone = '', giftNumber }: Props) {
  const cfg       = categoryConfig[gift.category]
  const isPix     = gift.category === 'pix'
  const hasPrefill = !!prefillName

  const [name,       setName]       = useState(prefillName)
  const [phone,      setPhone]      = useState(prefillPhone)
  const [phoneDirty, setPhoneDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copied,     setCopied]     = useState(false)
  const [pixSettings, setPixSettings] = useState<PixSettings>({})
  const nameRef = useRef<HTMLInputElement>(null)

  // Fetch PIX settings from server (only for PIX gifts)
  useEffect(() => {
    if (!isPix) return
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : {})
      .then((d: PixSettings) => setPixSettings(d))
      .catch(() => {})
  }, [isPix])

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCopyPix = async () => {
    if (!pixSettings.pix_key) return
    try {
      await navigator.clipboard.writeText(pixSettings.pix_key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* clipboard not available */ }
  }

  const phoneDigits = digitsOnly(phone)
  const phoneValid  = phoneDigits.length >= 10
  const phoneError  = phoneDirty && !phoneValid
  const canSubmit   = name.trim().length >= 2 && phoneValid

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneDirty(true)
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      await onClaim(name.trim(), normalizeBrPhone(phone))
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
        className="w-full max-w-md rounded-3xl shadow-2xl animate-slide-up overflow-y-auto"
        style={{ backgroundColor: '#FDF8F3', maxHeight: '92dvh' }}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#E5D5CF' }} />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ backgroundColor: cfg.bgColor }}>
                <Gift size={18} style={{ color: cfg.color }} />
                {giftNumber && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#C9846B,#C9A84C)', fontSize: 10 }}>
                    {giftNumber}
                  </span>
                )}
              </div>
              <div>
                <h2 id="modal-title" className="font-playfair text-lg font-semibold" style={{ color: '#3D2B1F' }}>
                  {giftNumber === 2 ? '2º presente' : 'Escolher presente'}
                </h2>
                <p className="text-xs" style={{ color: '#B08070' }}>
                  {hasPrefill ? 'Seus dados foram preenchidos automaticamente' : 'Preencha seus dados para reservar'}
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

          {/* PIX block */}
          {isPix && (
            <div className="rounded-2xl mb-4 overflow-hidden" style={{ border: '1.5px solid #A8DDD5' }}>
              {/* Chave PIX */}
              {pixSettings.pix_key ? (
                <div className="p-3" style={{ backgroundColor: '#EDF7F5' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold mb-0.5" style={{ color: '#1A5A4A' }}>
                        Chave Pix
                        {pixSettings.pix_owner_name && (
                          <span className="ml-1.5 font-normal" style={{ color: '#4CAF9A' }}>
                            · {pixSettings.pix_owner_name}
                          </span>
                        )}
                      </p>
                      <p className="text-sm font-mono break-all font-semibold" style={{ color: '#2D8070' }}>
                        {pixSettings.pix_key}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                      style={{
                        backgroundColor: copied ? '#4CAF9A' : 'white',
                        color:           copied ? 'white'    : '#2D8070',
                        border:          `1px solid ${copied ? '#4CAF9A' : '#A8DDD5'}`,
                        boxShadow:       copied ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                      aria-label="Copiar chave Pix"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3" style={{ backgroundColor: '#EDF7F5' }}>
                  <p className="text-xs" style={{ color: '#7ABFB5' }}>
                    A chave Pix será informada no evento.
                  </p>
                </div>
              )}

              {/* Comprovante */}
              {pixSettings.pix_receipt_phone && (
                <div className="p-3 border-t" style={{ borderColor: '#A8DDD5', backgroundColor: 'white' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#3D2B1F' }}>
                    Envie o comprovante para:
                  </p>
                  <a
                    href={waLink(pixSettings.pix_receipt_phone, `Olá! Segue o comprovante do Pix referente ao presente "${gift.name}" para os 80 anos de Antônia Lucena. 🎂`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                    style={{
                      backgroundColor: '#25D366',
                      color: 'white',
                      boxShadow: '0 2px 10px rgba(37,211,102,0.35)',
                      textDecoration: 'none',
                    }}
                  >
                    <MessageCircle size={15} />
                    <span className="flex-1">
                      {pixSettings.pix_receipt_phone}
                    </span>
                    <ExternalLink size={12} style={{ opacity: 0.8 }} />
                  </a>
                  <p className="text-xs mt-2 text-center" style={{ color: '#B08070' }}>
                    Clique para abrir o WhatsApp e enviar o comprovante
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
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
            {!phoneError && mightMissNine(phone) && (
              <p className="text-xs mb-1" style={{ color: '#C9846B' }}>
                Parece que falta o 9 — será salvo como{' '}
                <span className="font-bold">{maskPhone(normalizeBrPhone(phone))}</span>
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
