'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, RefreshCw, Trash2, Gift, CheckCircle2, Circle,
  Users, Package, ShoppingBag, ChefHat, Sparkles, Home,
  Gem, Banknote, Phone,
} from 'lucide-react'
import { gifts, categoryConfig, type GiftCategory } from '@/lib/gifts-data'

interface ClaimRecord { claimedBy: string; phone: string; claimedAt: string }
type Claims = Record<string, ClaimRecord[]>

const categoryIcons: Record<GiftCategory, React.ElementType> = {
  beleza: Sparkles, casa: Home, calcados: ShoppingBag,
  cozinha: ChefHat, acessorios: Gem, pix: Banknote,
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPage() {
  const router = useRouter()

  const [claims,    setClaims]    = useState<Claims>({})
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)
  const [removing,  setRemoving]  = useState<string | null>(null) // key = `${giftId}-${claimedBy}`
  const [toast,     setToast]     = useState<{ type: 'ok'|'err'; msg: string } | null>(null)

  const showToast = useCallback((type: 'ok'|'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchClaims = useCallback(async (spinner = false) => {
    if (spinner) setRefreshing(true)
    try {
      const res = await fetch('/api/gifts', { cache: 'no-store' })
      if (res.ok) setClaims(await res.json() as Claims)
    } catch { /* ignore */ }
    finally {
      setLoading(false)
      if (spinner) setTimeout(() => setRefreshing(false), 500)
    }
  }, [])

  useEffect(() => { fetchClaims() }, [fetchClaims])

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const handleUnclaim = async (giftId: number, claimedBy: string) => {
    const key = `${giftId}-${claimedBy}`
    setRemoving(key)
    try {
      const res = await fetch('/api/admin/unclaim', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ giftId, claimedBy }),
      })
      if (res.ok) {
        showToast('ok', `"${claimedBy}" removido com sucesso.`)
        setClaims(prev => ({
          ...prev,
          [String(giftId)]: (prev[String(giftId)] ?? []).filter(c => c.claimedBy !== claimedBy),
        }))
      } else {
        showToast('err', 'Erro ao remover. Tente novamente.')
      }
    } catch {
      showToast('err', 'Erro de conexão.')
    } finally {
      setRemoving(null)
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const regularGifts   = gifts.filter(g => g.limit !== null)
  const pixGift        = gifts.find(g => g.limit === null)
  const claimedRegular = regularGifts.filter(g => (claims[String(g.id)] ?? []).length > 0)
  const pixContribs    = pixGift ? (claims[String(pixGift.id)] ?? []) : []

  const stats = [
    { label: 'Presentes disponíveis', value: regularGifts.length - claimedRegular.length, icon: Package,       color: '#C9846B', bg: '#FDF0EC' },
    { label: 'Presentes escolhidos',  value: claimedRegular.length,                       icon: CheckCircle2,  color: '#4CAF9A', bg: '#EDF7F5' },
    { label: 'Total de presentes',    value: regularGifts.length,                         icon: Gift,          color: '#C9A84C', bg: '#FDFAED' },
    { label: 'Contribuições Pix',     value: pixContribs.length,                          icon: Users,         color: '#8B7BA8', bg: '#F4F0FA' },
  ]

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#F5F0ED' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b shadow-sm" style={{ backgroundColor: 'white', borderColor: '#E8D8D0' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C9846B, #C9A84C)' }}>
              <Gift size={15} color="white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold" style={{ color: '#3D2B1F' }}>Painel Admin</p>
              <p className="text-xs hidden sm:block" style={{ color: '#B08070' }}>Antônia Lucena — 80 Anos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchClaims(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: '#B08070', border: '1px solid #E5D5CF', backgroundColor: 'white' }}
              aria-label="Atualizar"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-red-50"
              style={{ color: '#D45050', border: '1px solid #EDCFCF', backgroundColor: 'white' }}
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: 'white', border: '1px solid #F0E4DE' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                    <Icon size={14} style={{ color: s.color }} />
                  </div>
                  <span className="text-xs" style={{ color: '#B08070' }}>{s.label}</span>
                </div>
                <p className="font-playfair text-2xl font-bold" style={{ color: s.color }}>
                  {loading ? '—' : s.value}
                </p>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        {!loading && (
          <div className="rounded-2xl p-4 mb-6 shadow-sm" style={{ backgroundColor: 'white', border: '1px solid #F0E4DE' }}>
            <div className="flex justify-between text-xs mb-2" style={{ color: '#B08070' }}>
              <span>{claimedRegular.length} de {regularGifts.length} presentes escolhidos</span>
              <span>{Math.round((claimedRegular.length / regularGifts.length) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F0E4DE' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(claimedRegular.length / regularGifts.length) * 100}%`,
                  background: 'linear-gradient(90deg, #C9846B, #C9A84C)',
                }}
              />
            </div>
          </div>
        )}

        {/* Gift list */}
        <h2 className="font-playfair text-xl font-bold mb-4" style={{ color: '#3D2B1F' }}>
          Todos os Presentes
        </h2>

        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {gifts.map(gift => {
              const cfg        = categoryConfig[gift.category]
              const Icon       = categoryIcons[gift.category]
              const giftClaims = claims[String(gift.id)] ?? []
              const isFull     = gift.limit !== null && giftClaims.length >= gift.limit
              const isUnlimited = gift.limit === null

              return (
                <div
                  key={gift.id}
                  className="rounded-2xl p-4 shadow-sm"
                  style={{
                    backgroundColor: 'white',
                    border: `1.5px solid ${isFull ? '#A8DDD5' : giftClaims.length ? '#E8CFA0' : '#F0E4DE'}`,
                  }}
                >
                  {/* Gift header */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: cfg.bgColor }}>
                      <Icon size={15} style={{ color: cfg.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: '#3D2B1F' }}>
                          {gift.name}
                        </p>
                        {gift.brand && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bgColor, color: cfg.color }}>
                            {gift.brand}
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {isFull ? (
                          <CheckCircle2 size={12} style={{ color: '#4CAF9A' }} />
                        ) : (
                          <Circle size={12} style={{ color: '#D4B8A8' }} />
                        )}
                        <span className="text-xs" style={{ color: isFull ? '#2D8070' : isUnlimited ? cfg.color : '#B08070' }}>
                          {isUnlimited
                            ? giftClaims.length === 0 ? 'Sem contribuições ainda' : `${giftClaims.length} contribuição(ões)`
                            : isFull ? 'Escolhido' : 'Disponível'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Claimants */}
                  {giftClaims.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2 pl-11">
                      {giftClaims.map((claim, idx) => {
                        const key = `${gift.id}-${claim.claimedBy}-${idx}`
                        const rmKey = `${gift.id}-${claim.claimedBy}`
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl"
                            style={{ backgroundColor: '#F8F5F3' }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: '#3D2B1F' }}>
                                {claim.claimedBy}
                              </p>
                              {claim.phone && (
                                <a
                                  href={`https://wa.me/55${claim.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs hover:underline"
                                  style={{ color: '#4CAF9A' }}
                                  aria-label={`WhatsApp de ${claim.claimedBy}`}
                                >
                                  <Phone size={10} />
                                  {claim.phone}
                                </a>
                              )}
                              <p className="text-xs mt-0.5" style={{ color: '#B08070' }}>
                                {fmt(claim.claimedAt)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleUnclaim(gift.id, claim.claimedBy)}
                              disabled={removing === rmKey}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-red-50 disabled:opacity-50"
                              style={{ color: '#D45050', border: '1px solid #EDCFCF', backgroundColor: 'white' }}
                              aria-label={`Remover escolha de ${claim.claimedBy}`}
                            >
                              {removing === rmKey ? (
                                <span className="w-3 h-3 rounded-full border-2 border-red-300 border-t-transparent animate-spin" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                              <span>Remover</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-5 right-4 left-4 sm:left-auto sm:w-80 z-50 p-4 rounded-2xl shadow-lg animate-slide-up text-sm font-semibold"
          style={{
            backgroundColor: toast.type === 'ok' ? '#EDF7F2' : '#FDF2F2',
            border:          toast.type === 'ok' ? '1px solid #A8DDD5' : '1px solid #EDCFCF',
            color:           toast.type === 'ok' ? '#1A5A4A' : '#7A2020',
          }}
          role="alert"
        >
          {toast.msg}
        </div>
      )}
    </main>
  )
}
