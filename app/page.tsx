'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar, Clock, MapPin, Gift, Heart, CheckCircle2, X, Search } from 'lucide-react'
import { gifts as staticGifts, categoryConfig, type GiftCategory, type Gift as GiftType } from '@/lib/gifts-data'
import { getUserClaims, saveUserClaims, clearUserClaims, type UserClaim } from '@/lib/storage'
import { phoneMatch } from '@/lib/phone'
import GiftCard from '@/components/GiftCard'
import ClaimModal from '@/components/ClaimModal'
import VerifyModal from '@/components/VerifyModal'
import PixSuccessModal from '@/components/PixSuccessModal'
import ToastContainer, { type Toast } from '@/components/ToastContainer'

interface ClaimRecord {
  claimedBy: string
  phone: string
  claimedAt: string
}

type Claims = Record<string, ClaimRecord[]>

type Filter = GiftCategory | 'todos'

const MAX_CLAIMS = 2

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
  const [giftList,    setGiftList]    = useState<GiftType[]>(staticGifts)
  const [claims,      setClaims]      = useState<Claims>({})
  const [loading,     setLoading]     = useState(true)
  const [selectedId,  setSelectedId]  = useState<number | null>(null)
  const [userClaims,  setUserClaims]  = useState<UserClaim[]>([])
  const [toasts,      setToasts]      = useState<Toast[]>([])
  const [filter,      setFilter]      = useState<Filter>('todos')
  const [showVerify,  setShowVerify]  = useState(false)
  const [pixSuccess,  setPixSuccess]  = useState<{ gift: GiftType; userName: string } | null>(null)
  const pollRef        = useRef<ReturnType<typeof setInterval>>()
  const hasValidatedRef = useRef(false)

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
    setUserClaims(getUserClaims())
    fetchClaims()
    pollRef.current = setInterval(() => fetchClaims(), 30_000)
    return () => clearInterval(pollRef.current)
  }, [fetchClaims])

  // ── Validação do cache local contra o servidor ───────────────────────────
  // Roda uma vez após o carregamento inicial. Remove do localStorage qualquer
  // reserva que o admin já tenha excluído do servidor.
  useEffect(() => {
    if (loading || hasValidatedRef.current) return
    hasValidatedRef.current = true
    const local = getUserClaims()
    if (local.length === 0) return
    const validated = local.filter(uc => {
      const serverRecs = claims[String(uc.giftId)] ?? []
      return serverRecs.some(sc =>
        sc.claimedBy === uc.userName || phoneMatch(sc.phone, uc.phone)
      )
    })
    if (validated.length < local.length) {
      saveUserClaims(validated)
      setUserClaims(validated)
      addToast('info', 'Algumas reservas foram removidas pelo organizador.')
    }
  }, [loading, claims, addToast])

  // ── Claim ────────────────────────────────────────────────────────────────────
  const handleClaim = useCallback(async (giftId: number, userName: string, phone: string) => {
    const gift = giftList.find(g => g.id === giftId)
    if (!gift) return
    const isPix = gift.category === 'pix'

    const now    = new Date().toISOString()
    const record: ClaimRecord = { claimedBy: userName, phone, claimedAt: now }
    const key    = String(giftId)
    const local: UserClaim = { giftId, giftName: gift.name, userName, phone, claimedAt: now }

    // Optimistic update
    setClaims(prev => ({ ...prev, [key]: [...(prev[key] ?? []), record] }))
    const prevUserClaims = userClaims
    setSelectedId(null)

    // PIX não entra no localStorage/userClaims — só abre o modal de pagamento
    if (isPix) {
      setPixSuccess({ gift, userName })
    } else {
      const newUserClaims = [...userClaims, local]
      saveUserClaims(newUserClaims)
      setUserClaims(newUserClaims)
    }

    try {
      const res = await fetch('/api/gifts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ giftId, claimedBy: userName, phone }),
      })

      if (res.ok) {
        if (!isPix) {
          const isSecond = prevUserClaims.length === 1
          addToast('success', isSecond
            ? `Perfeito! Você escolheu seus 2 presentes. Obrigada, ${userName}!`
            : `Ótimo, ${userName}! "${gift.name}" reservado com sucesso.`)
        }
      } else if (res.status === 409) {
        setClaims(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(c => c.claimedBy !== userName) }))
        if (!isPix) {
          saveUserClaims(prevUserClaims)
          setUserClaims(prevUserClaims)
        } else {
          setPixSuccess(null)
        }
        addToast('error', 'Esse presente acabou de ser escolhido por outra pessoa. Tente outro!')
        fetchClaims()
      }
    } catch {
      addToast('info', 'Problema na conexão. Sua escolha está salva localmente.')
      fetchClaims()
    }
  }, [giftList, userClaims, addToast, fetchClaims])

  // ── Unclaim ──────────────────────────────────────────────────────────────────
  const handleUnclaim = useCallback(async (giftId: number) => {
    const claim = userClaims.find(c => c.giftId === giftId)
    if (!claim) return
    const key = String(giftId)

    const prevClaims     = claims
    const prevUserClaims = userClaims

    // Optimistic update
    setClaims(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(c => c.claimedBy !== claim.userName) }))
    const newUserClaims = userClaims.filter(c => c.giftId !== giftId)
    saveUserClaims(newUserClaims)
    setUserClaims(newUserClaims)

    try {
      const res = await fetch('/api/gifts', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ giftId, claimedBy: claim.userName }),
      })
      if (res.ok) {
        addToast('info', 'Presente liberado. Você pode escolher outro!')
      } else {
        setClaims(prevClaims)
        saveUserClaims(prevUserClaims)
        setUserClaims(prevUserClaims)
        addToast('error', 'Erro ao liberar. Tente novamente.')
      }
    } catch {
      setClaims(prevClaims)
      saveUserClaims(prevUserClaims)
      setUserClaims(prevUserClaims)
      addToast('error', 'Erro ao liberar. Tente novamente.')
      fetchClaims()
    }
  }, [userClaims, claims, addToast, fetchClaims])

  // ── Card click ───────────────────────────────────────────────────────────────
  const handleCardClick = useCallback((gift: GiftType) => {
    const claimArr = claims[String(gift.id)] ?? []
    const isPix    = gift.category === 'pix'
    const isFull   = gift.limit !== null && claimArr.length >= gift.limit
    if (isFull) return
    if (!isPix && userClaims.some(c => c.giftId === gift.id)) return

    if (!isPix && userClaims.length >= MAX_CLAIMS) {
      addToast('info', 'Você já escolheu 2 presentes. Clique em "Mudar" para trocar um deles.')
      return
    }

    setSelectedId(gift.id)
  }, [claims, userClaims, addToast])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedGift   = giftList.find(g => g.id === selectedId)
  const filteredGifts  = filter === 'todos' ? giftList : giftList.filter(g => g.category === filter)
  const firstClaim     = userClaims[0]
  const giftNumber     = (userClaims.length + 1) as 1 | 2

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#FDF8F3' }}>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <header>
        <div style={{ background: 'linear-gradient(180deg, #F2E0D8 0%, #FBF0EA 55%, #FDF8F3 100%)', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: -40, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)' }} />
            <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)' }} />
          </div>

          <div className="relative max-w-2xl mx-auto px-6 pt-10 pb-8 text-center">
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

            {/* Mapa — iframe no desktop, card clicável no mobile */}
            <div className="mt-5">
              {/* Mobile: card que abre o app Maps */}
              <a
                href="https://maps.app.goo.gl/1SQhCcoGbJZSMuaM6"
                target="_blank"
                rel="noopener noreferrer"
                className="sm:hidden flex items-center gap-4 p-4 rounded-2xl active:scale-98 transition-transform"
                style={{ backgroundColor: 'white', border: '1.5px solid #E8C8BA', textDecoration: 'none' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F2E0D8, #EAC5B8)' }}>
                  <MapPin size={20} style={{ color: '#C9846B' }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold leading-tight" style={{ color: '#3D2B1F' }}>
                    Buffet Diferentes Sabores
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#B08070' }}>
                    Toque para abrir no Maps
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9846B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>

              {/* Desktop: iframe embed */}
              <div className="hidden sm:block overflow-hidden rounded-2xl shadow-sm" style={{ border: '1.5px solid #E8C8BA' }}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3968.7562724831896!2d-35.25448968851259!3d-5.88982789406941!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7b257fa68cf98e3%3A0xb1eaeb15beb274f2!2sDiferentes%20Sabores!5e0!3m2!1spt-BR!2sbr!4v1783391464329!5m2!1spt-BR!2sbr"
                  width="100%"
                  height="180"
                  style={{ border: 0, display: 'block' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Localização — Buffet Diferentes Sabores"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mt-5">
              <div style={{ height: 1, width: 56, background: 'linear-gradient(to right, transparent, #C9A84C)' }} />
              <span style={{ color: '#C9A84C', fontSize: 18, lineHeight: 1 }}>✦</span>
              <div style={{ height: 1, width: 56, background: 'linear-gradient(to left, transparent, #C9A84C)' }} />
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── Painel de presentes escolhidos ───────────────────────────────── */}
        {userClaims.length > 0 && !loading && (
          <div
            className="rounded-2xl p-4 mb-6 shadow-sm animate-fade-in"
            style={{ backgroundColor: '#EDF7F5', border: '1.5px solid #A8DDD5' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} style={{ color: '#4CAF9A' }} />
                <p className="text-sm font-bold" style={{ color: '#1A5A4A' }}>
                  {userClaims.length === 1 ? 'Seu presente' : 'Seus presentes'}
                </p>
              </div>
              {/* Progress dots + counter */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5" aria-label={`${userClaims.length} de 2 presentes escolhidos`}>
                  {[0, 1].map(i => (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: i < userClaims.length ? '#4CAF9A' : '#C8EDE7',
                        transition: 'background-color 300ms ease',
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold" style={{ color: '#4CAF9A' }}>
                  {userClaims.length} de 2
                </span>
              </div>
            </div>

            {/* Gift slots */}
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map(i => {
                const claim = userClaims[i]
                if (claim) {
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-3 flex flex-col gap-2"
                      style={{ backgroundColor: 'white', border: '1.5px solid #A8DDD5' }}
                    >
                      <div className="flex items-start gap-1.5 min-w-0">
                        <CheckCircle2 size={13} style={{ color: '#4CAF9A', flexShrink: 0, marginTop: 1 }} />
                        <p className="text-xs font-semibold leading-snug" style={{ color: '#1A5A4A' }}>
                          {claim.giftName}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnclaim(claim.giftId)}
                        className="self-start flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all hover:bg-red-50 active:scale-95"
                        style={{ color: '#C05050', border: '1px solid #F0C0C0', backgroundColor: 'white' }}
                        aria-label={`Remover ${claim.giftName}`}
                      >
                        <X size={10} />
                        Mudar
                      </button>
                    </div>
                  )
                }
                return (
                  <div
                    key={i}
                    className="rounded-xl p-3 flex items-center justify-center min-h-[72px]"
                    style={{ backgroundColor: 'rgba(255,255,255,0.5)', border: '1.5px dashed #A8DDD5' }}
                  >
                    <p className="text-xs font-semibold text-center" style={{ color: '#7ABFB5' }}>
                      + escolher mais 1
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Nudge quando só 1 de 2 escolhido */}
            {userClaims.length === 1 && (
              <p className="text-xs text-center mt-3 font-semibold" style={{ color: '#4CAF9A' }}>
                Você pode escolher mais 1 presente!
              </p>
            )}
          </div>
        )}

        {/* Section title */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-playfair text-2xl font-bold" style={{ color: '#3D2B1F' }}>
              Lista de Presentes
            </h2>
            <p className="text-sm mt-1" style={{ color: '#B08070' }}>
              {userClaims.length >= MAX_CLAIMS
                ? 'Você escolheu seus 2 presentes. Obrigada!'
                : userClaims.length === 1
                ? 'Você pode escolher mais 1 presente.'
                : 'Escolha até 2 presentes. Clique em um disponível para reservar.'}
            </p>
          </div>
          <button
            onClick={() => setShowVerify(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-white active:scale-95"
            style={{ color: '#7A5C4E', border: '1.5px solid #E5D5CF', backgroundColor: 'transparent' }}
            aria-label="Verificar minha reserva"
          >
            <Search size={12} style={{ color: '#C9846B' }} />
            Verificar reserva
          </button>
        </div>

        {/* How it works — só aparece antes de qualquer escolha */}
        {userClaims.length === 0 && !loading && (
          <div
            className="rounded-2xl p-4 mb-5 grid grid-cols-3 gap-3"
            style={{ backgroundColor: 'white', border: '1px solid #F0E4DE' }}
          >
            {([
              { n: '1', title: 'Escolha', desc: 'Até 2 presentes da lista' },
              { n: '2', title: 'Preencha', desc: 'Seu nome e WhatsApp' },
              { n: '3', title: 'Confirmado', desc: 'Reserva salva na hora' },
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

        {/* Gift grid */}
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
                isMyGift={userClaims.some(c => c.giftId === gift.id)}
                userClaimsCount={userClaims.length}
                onClick={() => handleCardClick(gift)}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        {!loading && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
            {[
              { color: '#C9846B', label: 'Disponível'   },
              { color: '#C9A84C', label: '2º presente'  },
              { color: '#4CAF9A', label: 'Sua escolha'  },
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
      <footer className="mt-6 pb-6 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Heart size={10} style={{ color: '#DBBAA8' }} />
          <span className="text-xs" style={{ color: '#C8A898' }}>
            Feito com carinho para os 80 anos de Antônia Lucena
          </span>
          <Heart size={10} style={{ color: '#DBBAA8' }} />
        </div>
        <p className="text-xs" style={{ color: '#D4B8A8' }}>
          dev por{' '}
          <a href="https://www.linkedin.com/in/marcosvinicius1/" target="_blank" rel="noopener noreferrer"
            className="hover:underline transition-opacity hover:opacity-70" style={{ color: '#C0A090' }}>
            LinkedIn
          </a>
          {' · '}
          <a href="https://github.com/MarcosViniicius" target="_blank" rel="noopener noreferrer"
            className="hover:underline transition-opacity hover:opacity-70" style={{ color: '#C0A090' }}>
            GitHub
          </a>
        </p>
      </footer>

      {/* ── MODAL ────────────────────────────────────────────────────────────── */}
      {selectedGift && (
        <ClaimModal
          gift={selectedGift}
          onClaim={(name, phone) => handleClaim(selectedGift.id, name, phone)}
          onClose={() => setSelectedId(null)}
          prefillName={firstClaim?.userName}
          prefillPhone={firstClaim?.phone}
          giftNumber={giftNumber}
        />
      )}

      {pixSuccess && (
        <PixSuccessModal
          gift={pixSuccess.gift}
          userName={pixSuccess.userName}
          onClose={() => setPixSuccess(null)}
        />
      )}

      {showVerify && (
        <VerifyModal
          claims={claims}
          giftList={giftList}
          currentUserClaims={userClaims}
          onRestore={(restored) => {
            saveUserClaims(restored)
            setUserClaims(restored)
            setShowVerify(false)
            addToast('success', `${restored.length} reserva${restored.length > 1 ? 's restauradas' : ' restaurada'} neste dispositivo!`)
          }}
          onClose={() => setShowVerify(false)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  )
}
