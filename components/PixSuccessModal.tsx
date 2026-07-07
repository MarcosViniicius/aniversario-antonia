'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Check, MessageCircle, ExternalLink, CheckCircle2 } from 'lucide-react'
import type { Gift as GiftType } from '@/lib/gifts-data'
import { waLink } from '@/lib/phone'

interface PixSettings {
  pix_key?: string
  pix_owner_name?: string
  pix_receipt_phone?: string
}

export default function PixSuccessModal({
  gift,
  userName,
  onClose,
}: {
  gift: GiftType
  userName: string
  onClose: () => void
}) {
  const [pix,    setPix]    = useState<PixSettings>({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : {})
      .then((d: PixSettings) => setPix(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCopy = async () => {
    if (!pix.pix_key) return
    try {
      await navigator.clipboard.writeText(pix.pix_key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* clipboard indisponível */ }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(61,43,31,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pix-success-title"
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl animate-slide-up overflow-y-auto"
        style={{ backgroundColor: '#FDF8F3', maxHeight: '92dvh' }}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#E5D5CF' }} />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#EDF7F5' }}>
                <CheckCircle2 size={20} style={{ color: '#4CAF9A' }} />
              </div>
              <div>
                <h2 id="pix-success-title" className="font-playfair text-lg font-semibold"
                  style={{ color: '#3D2B1F' }}>
                  Presente confirmado!
                </h2>
                <p className="text-xs font-semibold" style={{ color: '#4CAF9A' }}>
                  Obrigada, {userName}! 💛
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

          {/* Gift tag */}
          <div className="rounded-2xl p-4 mb-4"
            style={{ backgroundColor: '#F5F0EB', border: '1.5px solid #E5D5CF' }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#B08070' }}>Presente escolhido</p>
            <p className="text-sm font-semibold" style={{ color: '#3D2B1F' }}>{gift.name}</p>
          </div>

          {/* PIX block */}
          <div className="rounded-2xl overflow-hidden mb-5"
            style={{ border: '1.5px solid #A8DDD5' }}>

            {/* Chave */}
            <div className="px-4 pt-4 pb-4" style={{ backgroundColor: '#EDF7F5' }}>
              <p className="text-xs font-bold mb-3" style={{ color: '#1A5A4A' }}>
                💳 Realize o pagamento via Pix
              </p>

              {pix.pix_key ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs mb-0.5" style={{ color: '#4CAF9A' }}>
                      Chave Pix{pix.pix_owner_name ? ` · ${pix.pix_owner_name}` : ''}
                    </p>
                    <p className="text-sm font-mono font-bold break-all" style={{ color: '#1A5A4A' }}>
                      {pix.pix_key}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{
                      backgroundColor: copied ? '#4CAF9A' : 'white',
                      color:           copied ? 'white'   : '#2D8070',
                      border:          `1.5px solid ${copied ? '#4CAF9A' : '#A8DDD5'}`,
                      boxShadow:       copied ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                    }}
                    aria-label="Copiar chave Pix"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              ) : (
                <p className="text-xs" style={{ color: '#7ABFB5' }}>
                  A chave Pix será informada no evento.
                </p>
              )}
            </div>

            {/* Comprovante */}
            {pix.pix_receipt_phone && (
              <div className="px-4 py-3 border-t"
                style={{ borderColor: '#A8DDD5', backgroundColor: 'white' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#3D2B1F' }}>
                  Após pagar, envie o comprovante:
                </p>
                <a
                  href={waLink(pix.pix_receipt_phone, `Olá! Segue o comprovante do Pix referente ao presente "${gift.name}" para os 80 anos de Antônia Lucena. 🎂`)}
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
                  <span className="flex-1">{pix.pix_receipt_phone}</span>
                  <ExternalLink size={12} style={{ opacity: 0.8 }} />
                </a>
                <p className="text-xs mt-1.5 text-center" style={{ color: '#B08070' }}>
                  Toque para abrir o WhatsApp
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-50"
            style={{ border: '1.5px solid #E5D5CF', color: '#7A5C4E', backgroundColor: 'white' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
