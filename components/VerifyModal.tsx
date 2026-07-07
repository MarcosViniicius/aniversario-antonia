'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, CheckCircle2, Gift, Phone, RotateCcw, AlertCircle } from 'lucide-react'
import { type Gift as GiftType } from '@/lib/gifts-data'
import { type UserClaim } from '@/lib/storage'
import { maskPhone, digitsOnly, phoneMatch } from '@/lib/phone'

interface ClaimRecord {
  claimedBy: string
  phone: string
  claimedAt: string
}

interface Props {
  claims: Record<string, ClaimRecord[]>
  giftList: GiftType[]
  currentUserClaims: UserClaim[]
  onRestore: (claims: UserClaim[]) => void
  onClose: () => void
}

type Step = 'input' | 'results'

interface FoundClaim {
  giftId: number
  giftName: string
  claimedBy: string
  phone: string
  claimedAt: string
}

export default function VerifyModal({ claims, giftList, currentUserClaims, onRestore, onClose }: Props) {
  const [step,     setStep]     = useState<Step>('input')
  const [phone,    setPhone]    = useState('')
  const [found,    setFound]    = useState<FoundClaim[]>([])
  const [loading,  setLoading]  = useState(false)
  const phoneRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => phoneRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (digitsOnly(phone).length < 8) return

    setLoading(true)
    setTimeout(() => {
      const results: FoundClaim[] = []
      for (const [giftIdStr, records] of Object.entries(claims)) {
        for (const rec of records) {
          if (phoneMatch(rec.phone, phone)) {
            const gift = giftList.find(g => g.id === Number(giftIdStr))
            results.push({
              giftId:    Number(giftIdStr),
              giftName:  gift?.name ?? `Presente #${giftIdStr}`,
              claimedBy: rec.claimedBy,
              phone:     rec.phone,
              claimedAt: rec.claimedAt,
            })
          }
        }
      }
      setFound(results)
      setStep('results')
      setLoading(false)
    }, 400)
  }

  const alreadySaved = (giftId: number) =>
    currentUserClaims.some(c => c.giftId === giftId)

  const allSaved = found.length > 0 && found.every(f => alreadySaved(f.giftId))

  const handleRestore = () => {
    const toRestore: UserClaim[] = found.map(f => ({
      giftId:    f.giftId,
      giftName:  f.giftName,
      userName:  f.claimedBy,
      phone:     f.phone,
      claimedAt: f.claimedAt,
    }))
    onRestore(toRestore)
  }

  const phoneDigits = digitsOnly(phone)
  const phoneValid  = phoneDigits.length >= 8

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(61,43,31,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-title"
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl animate-slide-up"
        style={{ backgroundColor: '#FDF8F3' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#E5D5CF' }} />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#EDF7F5' }}
              >
                <Search size={18} style={{ color: '#4CAF9A' }} />
              </div>
              <div>
                <h2 id="verify-title" className="font-playfair text-lg font-semibold" style={{ color: '#3D2B1F' }}>
                  Verificar minha reserva
                </h2>
                <p className="text-xs" style={{ color: '#B08070' }}>
                  {step === 'input'
                    ? 'Informe seu telefone para localizar'
                    : found.length > 0 ? 'Reservas encontradas' : 'Nenhuma reserva localizada'}
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

          {/* ── STEP 1: input ── */}
          {step === 'input' && (
            <form onSubmit={handleSearch} noValidate>
              <label htmlFor="verifyPhone" className="block text-sm font-semibold mb-1.5" style={{ color: '#3D2B1F' }}>
                Seu telefone / WhatsApp <span style={{ color: '#C9846B' }}>*</span>
              </label>
              <div className="relative mb-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Phone size={14} style={{ color: '#B08070' }} />
                </div>
                <input
                  id="verifyPhone"
                  ref={phoneRef}
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={e => setPhone(maskPhone(e.target.value))}
                  placeholder="(99) 99999-9999"
                  maxLength={16}
                  autoComplete="tel"
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    border: '2px solid #E5D5CF',
                    backgroundColor: 'white',
                    color: '#3D2B1F',
                    transition: 'border-color 150ms ease',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#C9846B' }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = '#E5D5CF' }}
                />
              </div>

              <p className="text-xs mb-5" style={{ color: '#B08070' }}>
                Usamos o telefone para localizar suas reservas no servidor.
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
                  disabled={!phoneValid || loading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #4CAF9A 0%, #2D8070 100%)',
                    boxShadow: phoneValid ? '0 4px 14px rgba(76,175,154,0.35)' : 'none',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Buscando…
                    </>
                  ) : (
                    <>
                      <Search size={14} />
                      Buscar
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: results ── */}
          {step === 'results' && (
            <div>
              {found.length === 0 ? (
                <div className="text-center py-6">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: '#FDF0EE' }}
                  >
                    <AlertCircle size={24} style={{ color: '#C9846B' }} />
                  </div>
                  <p className="font-semibold mb-1" style={{ color: '#3D2B1F' }}>
                    Nenhuma reserva encontrada
                  </p>
                  <p className="text-sm" style={{ color: '#B08070' }}>
                    Verifique o número digitado ou escolha seus presentes abaixo.
                  </p>
                  <button
                    onClick={() => { setStep('input'); setPhone('') }}
                    className="mt-4 text-sm font-semibold flex items-center gap-1.5 mx-auto"
                    style={{ color: '#C9846B' }}
                  >
                    <RotateCcw size={13} />
                    Tentar outro número
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-5">
                    {found.map(f => (
                      <div
                        key={f.giftId}
                        className="flex items-center gap-3 rounded-xl p-3"
                        style={{ backgroundColor: alreadySaved(f.giftId) ? '#EDF7F5' : 'white', border: `1.5px solid ${alreadySaved(f.giftId) ? '#A8DDD5' : '#E5D5CF'}` }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: alreadySaved(f.giftId) ? '#C8EDE7' : '#F5EDE8' }}
                        >
                          {alreadySaved(f.giftId)
                            ? <CheckCircle2 size={16} style={{ color: '#4CAF9A' }} />
                            : <Gift size={16} style={{ color: '#C9846B' }} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug" style={{ color: '#3D2B1F' }}>
                            {f.giftName}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#B08070' }}>
                            Reservado por {f.claimedBy}
                            {alreadySaved(f.giftId) && (
                              <span className="ml-1.5 font-semibold" style={{ color: '#4CAF9A' }}>
                                · salvo aqui
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!allSaved ? (
                    <>
                      <p className="text-xs text-center mb-4" style={{ color: '#B08070' }}>
                        Suas reservas estão no servidor mas não neste dispositivo.
                        Clique abaixo para salvar.
                      </p>
                      <button
                        onClick={handleRestore}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg, #4CAF9A 0%, #2D8070 100%)',
                          boxShadow: '0 4px 14px rgba(76,175,154,0.35)',
                        }}
                      >
                        <RotateCcw size={14} />
                        Salvar neste dispositivo
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-center font-semibold py-2" style={{ color: '#4CAF9A' }}>
                      Tudo certo! Suas reservas já estão salvas aqui.
                    </p>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-50"
                    style={{ border: '1.5px solid #E5D5CF', color: '#7A5C4E', backgroundColor: 'white' }}
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
