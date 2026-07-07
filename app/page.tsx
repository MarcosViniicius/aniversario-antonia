'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar, Clock, MapPin, Gift, Heart, CheckCircle2 } from 'lucide-react'
import { gifts as staticGifts, categoryConfig, type GiftCategory, type Gift as GiftType } from '@/lib/gifts-data'
import { getUserClaim, saveUserClaim, clearUserClaim, type UserClaim } from '@/lib/storage'
import GiftCard from '@/components/GiftCard'
import ClaimModal from '@/components/ClaimModal'
import ToastContainer, { type Toast } from '@/components/ToastContainer'

interface ClaimRecord {
  claimedBy: string
  phone: string
  claimedAt: string
}

// Each gift maps to an array of claimants (1 for regular, N for PIX)
type Claims = Record<string, ClaimRecord[]>

type Filter = GiftCategory | 'todos'

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'todos',      label: 'Todos'        },
  { value: 'beleza',     label: 'Beleza'       },
  { value: 'casa',       label: 'Casa'         },
  { value: 'cozinha',    label: 'Cozinha'      },
  { value: 'calcados',   label: 'Calçados'     },
  { value: 'acessorios', label: 'Acessórios'   },
  { value: 'pix',        label: 'Contribuição' },
]

export default function Home() {
  const [giftList,   setGiftList]   = useState<GiftType[]>(staticGifts)
  const [claims,     setClaims]     = useState<Claims>({})
  const [loading,    setLoading]    = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [userClaim,  setUserClaim]  = useState<UserClaim | null>(null)
  const [toasts,     setToasts]     = useState<Toast[]>([])
  const [filter,     setFilter]     = useState<Filter>('todos')
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  // ── Toasts ───────────────────────────────────────────────────────────────────
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchClaims = useCallback(async () => {
    try {
      const res = await fetch('/api/gifts', { cache: 'no-store' })
      if (res.ok) setClaims(await res.json() as Claims)
    } catch { /* keep current state */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/gifts-catalog')
      .then(r => r.ok ? r.json() : null)
      .then((data: GiftType[] | null) => { if (Array.isArray(data) && data.length > 0) setGiftList(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setUserClaim(getUserClaim())
    fetchClaims()
    pollRef.current = setInterval(() => fetchClaims(), 30_000)
    return () => clearInterval(pollRef.current)
  }, [fetchClaims])

  // ── Claim ────────────────────────────────────────────────────────────────────
  const handleClaim = useCallback(async (giftId: number, userName: string, phone: string) => {
    const gift = giftList.find(g => g.id === giftId)
    if (!gift) return

    const now    = new Date().toISOString()
    const record: ClaimRecord = { claimedBy: userName, phone, claimedAt: now }
    const key    = String(giftId)

    // Optimistic update
    setClaims(prev => ({
      ...prev,
      [key]: [...(prev[key] ?? []), record],
    }))

    // Persist to localStorage immediately (redundancy)
    const local: UserClaim = { giftId, giftName: gift.name, userName, phone, claimedAt: now }
    saveUserClaim(local)
    setUserClaim(local)
    setSelectedId(null)

    try {
      const res = await fetch('/api/gifts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ giftId, claimedBy: userName, phone }),
      })

      if (res.ok) {
        addToast('success', `Ótimo, ${userName}! "${gift.name}" reservado com sucesso.`)
      } else if (res.status === 409) {
        // Rollback
        setClaims(prev => ({
          ...prev,
          [key]: (prev[key] ?? []).filter(c => c.claimedBy !== userName),
        }))
        clearUserClaim()
        setUserClaim(null)
        addToast('error', 'Esse presente acabou de ser escolhido por outra pessoa. Tente outro!')
        fetchClaims()
      }
    } catch {
      addToast('info', 'Problema na conexão. Sua escolha está salva localmente e será confirmada em breve.')
      fetchClaims()
    }
  }, [giftList, addToast, fetchClaims])

  // ── Unclaim ──────────────────────────────────────────────────────────────────
  const handleUnclaim = useCallback(async () => {
    if (!userClaim) return
    const { giftId, userName } = userClaim
    const key = String(giftId)

    // Save for rollback
    const prevClaims    = claims
    const prevUserClaim = userClaim

    // Optimistic update
    setClaims(prev => ({
      ...prev,
      [key]: (prev[key] ?? []).filter(c => c.claimedBy !== userName),
    }))
    clearUserClaim()
    setUserClaim(null)

    try {
      const res = await fetch('/api/gifts', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ giftId, claimedBy: userName }),
      })
      if (res.ok) {
        addToast('info', 'Presente liberado. Você pode escolher outro!')
      } else {
        setClaims(prevClaims)
        saveUserClaim(prevUserClaim)
        setUserClaim(prevUserClaim)
        addToast('error', 'Erro ao liberar. Tente novamente.')
      }
    } catch {
      setClaims(prevClaims)
      saveUserClaim(prevUserClaim)
      setUserClaim(prevUserClaim)
      addToast('error', 'Erro ao liberar. Tente novamente.')
      fetchClaims()
    }
  }, [userClaim, claims, addToast, fetchClaims])

  // ── Card click ───────────────────────────────────────────────────────────────
  const handleCardClick = useCallback((gift: GiftType) => {
    const key      = String(gift.id)
    const claimArr = claims[key] ?? []
    const isFull   = gift.limit !== null && claimArr.length >= gift.limit

    if (isFull) return

    // If user already claimed this exact gift, do nothing
    if (userClaim?.giftId === gift.id) return

    // If user has a claim and this is a different gift, block
    if (userClaim) {
      addToast('info', `Você já escolheu: "${userClaim.giftName}". Clique em "Mudar" para trocar.`)
      return
    }

    setSelectedId(gift.id)
  }, [claims, userClaim, addToast])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedGift  = giftList.find(g => g.id === selectedId)
  const filteredGifts = filter === 'todos' ? giftList : giftList.filter(g => g.category === filter)

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#FDF8F3' }}>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <header>
        <div style={{ background: 'linear-gradient(180deg, #F2E0D8 0%, #FBF0EA 55%, #FDF8F3 100%)', position: 'relative', overflow: 'hidden' }}>
          {/* Corner glows */}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: -40, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)' }} />
            <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)' }} />
          </div>

          <div className="relative max-w-2xl mx-auto px-6 pt-10 pb-8 text-center">
            {/* Top ornament */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <div style={{ height: 1, width: 56, background: 'linear-gradient(to right, transparent, #C9A84C)' }} />
              <span style={{ color: '#C9A84C', fontSize: 18, lineHeight: 1 }}>✦</span>
              <div style={{ height: 1, width: 56, background: 'linear-gradient(to left, transparent, #C9A84C)' }} />
            </div>

            <p className="text-xs font-bold tracking-[0.28em] uppercase mb-4" style={{ color: '#B08070' }}>
              Você é nosso convidado especial
            </p>

            <div>
              <span className="font-playfair font-bold leading-none" style={{ fontSize: 'clamp(72px,18vw,100px)', color: '#C9A84C', textShadow: '0 3px 12px rgba(201,168,76,0.25)', display: 'inline-block' }}>
                80
              </span>
              <span className="font-playfair italic ml-2" style={{ fontSize: 'clamp(20px,5vw,28px)', color: '#C9846B' }}>
                anos
              </span>
            </div>

            <p className="font-playfair text-base italic mb-2" style={{ color: '#B08070' }}>de</p>

            <h1 className="font-playfair font-bold mb-6" style={{ fontSize: 'clamp(28px,8vw,44px)', color: '#3D2B1F' }}>
              Antônia Lucena
            </h1>

            <div className="flex items-center justify-center gap-4 mb-5">
              <div style={{ height: 1, width: 40, backgroundColor: '#E8C8BA' }} />
              <Gift size={15} style={{ color: '#C9846B' }} />
              <div style={{ height: 1, width: 40, backgroundColor: '#E8C8BA' }} />
            </div>

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-4 text-sm">
              {([
                { Icon: Calendar, text: '16 de Agosto de 2026' },
                { Icon: Clock,    text: '18h30'                },
                { Icon: MapPin,   text: 'Buffet Diferentes Sabores' },
              ] as const).map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5" style={{ color: '#7A5C4E' }}>
                  <Icon size={13} style={{ color: '#C9846B', flexShrink: 0 }} />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <p className="text-xs leading-relaxed" style={{ color: '#B08070' }}>
              Venha celebrar conosco este momento tão especial!{' '}
              <span className="font-semibold" style={{ color: '#8B5A44' }}>
                Confirme sua presença até 20 de julho de 2026.
              </span>
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <div style={{ height: 1, width: 56, background: 'linear-gradient(to right, transparent, #C9A84C)' }} />
              <span style={{ color: '#C9A84C', fontSize: 18, lineHeight: 1 }}>✦</span>
              <div style={{ height: 1, width: 56, background: 'linear-gradient(to left, transparent, #C9A84C)' }} />
            </div>
          </div>
        </div>

      </header>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* My choice banner */}
        {userClaim && !loading && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3 shadow-sm animate-fade-in"
            style={{ backgroundColor: '#EDF7F5', border: '1.5px solid #A8DDD5' }}
          >
            <CheckCircle2 size={20} style={{ color: '#4CAF9A', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: '#1A5A4A' }}>
                Sua escolha: {userClaim.giftName}
              </p>
              <p className="text-xs" style={{ color: '#4CAF9A' }}>
                Escolhido por {userClaim.userName}
              </p>
            </div>
            <button
              onClick={handleUnclaim}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-white"
              style={{ color: '#4CAF9A', border: '1.5px solid #A8DDD5', backgroundColor: 'rgba(255,255,255,0.7)' }}
            >
              Mudar
            </button>
          </div>
        )}

        {/* Section title */}
        <div className="mb-5">
          <h2 className="font-playfair text-2xl font-bold" style={{ color: '#3D2B1F' }}>
            Lista de Presentes
          </h2>
          <p className="text-sm mt-1" style={{ color: '#B08070' }}>
            {userClaim
              ? 'Você já escolheu um presente. Obrigada!'
              : 'Clique em um presente disponível para reservá-lo.'}
          </p>
        </div>

        {/* How it works — shown only before user claims */}
        {!userClaim && !loading && (
          <div
            className="rounded-2xl p-4 mb-5 grid grid-cols-3 gap-3"
            style={{ backgroundColor: 'white', border: '1px solid #F0E4DE' }}
          >
            {([
              { n: '1', title: 'Escolha', desc: 'Clique no presente que quer dar' },
              { n: '2', title: 'Preencha', desc: 'Seu nome e WhatsApp' },
              { n: '3', title: 'Confirmado', desc: 'Reserva salva, ninguém mais pega' },
            ] as const).map(({ n, title, desc }) => (
              <div key={n} className="text-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #C9846B, #C9A84C)' }}
                >
                  {n}
                </div>
                <p className="text-xs font-bold" style={{ color: '#3D2B1F' }}>{title}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: '#B08070' }}>{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {FILTER_OPTIONS.map(opt => {
            const active = filter === opt.value
            const cfg    = opt.value !== 'todos' ? categoryConfig[opt.value as GiftCategory] : null
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200"
                style={{
                  backgroundColor: active ? (cfg?.color ?? '#C9846B') : 'white',
                  color:           active ? 'white' : '#7A5C4E',
                  border:          `1.5px solid ${active ? (cfg?.color ?? '#C9846B') : '#E5D5CF'}`,
                  boxShadow:       active ? `0 2px 10px ${(cfg?.color ?? '#C9846B')}44` : 'none',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Gift grid — 1 col mobile · 2 cols tablet · 3 cols desktop */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="skeleton h-36" />
            ))}
          </div>
        ) : filteredGifts.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: '#B08070' }}>Nenhum presente nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGifts.map(gift => (
              <GiftCard
                key={gift.id}
                gift={gift}
                claims={claims[String(gift.id)] ?? []}
                isMyGift={userClaim?.giftId === gift.id}
                hasUserClaimed={!!userClaim}
                onClick={() => handleCardClick(gift)}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        {!loading && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
            {[
              { color: '#C9846B', label: 'Disponível'  },
              { color: '#4CAF9A', label: 'Sua escolha' },
              { color: '#D4B8A8', label: 'Já escolhido' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs" style={{ color: '#B08070' }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="text-center pb-8 pt-2">
        <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: '#C8A898' }}>
          <span>Feito com</span>
          <Heart size={11} style={{ color: '#C9846B' }} />
          <span>para os 80 anos de Antônia</span>
        </div>
      </footer>

      {/* ── MODAL ────────────────────────────────────────────────────────────── */}
      {selectedGift && (
        <ClaimModal
          gift={selectedGift}
          onClaim={(name, phone) => handleClaim(selectedGift.id, name, phone)}
          onClose={() => setSelectedId(null)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  )
}
