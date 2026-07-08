'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, RefreshCw, Trash2, Gift, CheckCircle2, Circle,
  ShoppingBag, ChefHat, Sparkles, Home, Gem, Banknote,
  Phone, Download, Search, X,
} from 'lucide-react'
import { categoryConfig, type GiftCategory } from '@/lib/gifts-data'
import type { Gift as GiftType } from '@/lib/gifts-data'

interface ClaimRecord { claimedBy: string; phone: string; claimedAt: string }
type Claims = Record<string, ClaimRecord[]>

const categoryIcons: Record<GiftCategory, React.ElementType> = {
  beleza: Sparkles, casa: Home, calcados: ShoppingBag,
  cozinha: ChefHat, acessorios: Gem, pix: Banknote,
}

type Filter = 'todos' | 'escolhidos' | 'disponíveis'

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[72px] rounded-2xl animate-pulse"
          style={{ backgroundColor: '#F0E8E3' }} />
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()

  const [gifts,      setGifts]      = useState<GiftType[]>([])
  const [claims,     setClaims]     = useState<Claims>({})
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [removing,   setRemoving]   = useState<string | null>(null)
  const [toast,      setToast]      = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [filter,     setFilter]     = useState<Filter>('todos')
  const [search,     setSearch]     = useState('')

  const showToast = useCallback((type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchAll = useCallback(async (spinner = false) => {
    if (spinner) setRefreshing(true)
    try {
      const [giftsRes, claimsRes] = await Promise.all([
        fetch('/api/gifts-catalog', { cache: 'no-store' }),
        fetch('/api/gifts',         { cache: 'no-store' }),
      ])
      if (giftsRes.ok)  setGifts(await giftsRes.json())
      if (claimsRes.ok) setClaims(await claimsRes.json() as Claims)
    } catch { /* ignore */ }
    finally {
      setLoading(false)
      if (spinner) setTimeout(() => setRefreshing(false), 500)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const handleUnclaim = async (giftId: number, claimedBy: string) => {
    const key = `${giftId}-${claimedBy}`
    setRemoving(key)
    try {
      const res = await fetch('/api/admin/unclaim', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId, claimedBy }),
      })
      if (res.ok) {
        showToast('ok', `Reserva de "${claimedBy}" removida.`)
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

  // ── CSV export (uses DB gifts) ─────────────────────────────────────────────
  const handleExportCSV = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const header = ['Presente', 'Marca', 'Categoria', 'Nome', 'Telefone', 'Data/Hora'].map(esc).join(',')
    const rows = gifts.flatMap(g =>
      (claims[String(g.id)] ?? []).map(c => [
        esc(g.name), esc(g.brand ?? ''), esc(g.category),
        esc(c.claimedBy), esc(c.phone), esc(fmt(c.claimedAt)),
      ].join(','))
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `presentes-antonia-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const regularGifts    = gifts.filter(g => g.category !== 'pix')
  const pixGifts        = gifts.filter(g => g.category === 'pix')
  const chosenRegular   = regularGifts.filter(g => {
    const c = claims[String(g.id)] ?? []
    return g.limit !== null ? c.length >= g.limit : c.length > 0
  })
  const totalReservations = regularGifts.reduce((s, g) => s + (claims[String(g.id)]?.length ?? 0), 0)
  const pixCount          = pixGifts.reduce((s, g) => s + (claims[String(g.id)]?.length ?? 0), 0)
  const pct               = regularGifts.length > 0
    ? Math.round((chosenRegular.length / regularGifts.length) * 100) : 0

  // ── Filtered list ─────────────────────────────────────────────────────────
  const visibleGifts = useMemo(() => {
    let list = gifts
    if (filter === 'escolhidos') {
      list = list.filter(g => {
        const c = claims[String(g.id)] ?? []
        return g.limit !== null ? c.length >= g.limit : c.length > 0
      })
    } else if (filter === 'disponíveis') {
      list = list.filter(g => {
        const c = claims[String(g.id)] ?? []
        return g.limit === null ? false : c.length < g.limit
      })
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(g => {
        const matchGift = g.name.toLowerCase().includes(q) || (g.brand ?? '').toLowerCase().includes(q)
        const matchPerson = (claims[String(g.id)] ?? []).some(c =>
          c.claimedBy.toLowerCase().includes(q) || c.phone.includes(q)
        )
        return matchGift || matchPerson
      })
    }
    return list
  }, [gifts, claims, filter, search])

  const filterCounts = {
    todos:       gifts.length,
    escolhidos:  chosenRegular.length,
    disponíveis: regularGifts.length - chosenRegular.length,
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#F5F0ED' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b shadow-sm" style={{ backgroundColor: 'white', borderColor: '#EDE0D8' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #C9846B, #C9A84C)' }}>
              <Gift size={15} color="white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold" style={{ color: '#3D2B1F' }}>Painel Admin</p>
              <p className="text-xs hidden sm:block" style={{ color: '#B08070' }}>Antônia Lucena — 80 Anos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ color: '#4CAF9A', border: '1px solid #A8DDD5', backgroundColor: 'white' }}>
              <Download size={13} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button onClick={() => fetchAll(true)} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ color: '#B08070', border: '1px solid #E5D5CF', backgroundColor: 'white' }}>
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-red-50"
              style={{ color: '#D45050', border: '1px solid #EDCFCF', backgroundColor: 'white' }}>
              <LogOut size={13} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Presentes',    value: regularGifts.length,    color: '#C9A84C', bg: '#FDFAED' },
            { label: 'Escolhidos',   value: chosenRegular.length,   color: '#4CAF9A', bg: '#EDF7F5' },
            { label: 'Reservas',     value: totalReservations,      color: '#C9846B', bg: '#FDF0EC' },
            { label: 'Pix',          value: pixCount,               color: '#8B7BA8', bg: '#F4F0FA' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 shadow-sm"
              style={{ backgroundColor: 'white', border: '1px solid #F0E4DE' }}>
              <p className="text-xs mb-1 font-medium" style={{ color: '#B08070' }}>{s.label}</p>
              <p className="text-2xl font-bold font-playfair" style={{ color: s.color }}>
                {loading ? '—' : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {!loading && regularGifts.length > 0 && (
          <div className="rounded-2xl p-4 mb-5 shadow-sm" style={{ backgroundColor: 'white', border: '1px solid #F0E4DE' }}>
            <div className="flex justify-between text-xs mb-2 font-medium" style={{ color: '#B08070' }}>
              <span>{chosenRegular.length} de {regularGifts.length} presentes escolhidos</span>
              <span style={{ color: '#C9846B' }}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F0E4DE' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #C9846B, #C9A84C)',
                }} />
            </div>
          </div>
        )}

        {/* Filter + Search row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Filter tabs */}
          <div className="flex rounded-xl p-1 gap-1 flex-shrink-0"
            style={{ backgroundColor: 'white', border: '1px solid #F0E4DE' }}>
            {(['todos', 'escolhidos', 'disponíveis'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  backgroundColor: filter === f ? '#FDF0EC' : 'transparent',
                  color:           filter === f ? '#C9846B' : '#B08070',
                  border:          filter === f ? '1px solid #E8C8BC' : '1px solid transparent',
                }}>
                {f}
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: filter === f ? '#C9846B' : '#F0E4DE',
                    color:           filter === f ? 'white' : '#B08070',
                  }}>
                  {loading ? '·' : filterCounts[f]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: '#C8A898' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar presente ou pessoa..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'white', border: '1px solid #F0E4DE', color: '#3D2B1F' }}
              onFocus={e  => (e.currentTarget.style.borderColor = '#C9846B')}
              onBlur={e   => (e.currentTarget.style.borderColor = '#F0E4DE')}
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-opacity hover:opacity-60"
                style={{ color: '#C8A898' }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Section title */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-playfair text-lg font-bold" style={{ color: '#3D2B1F' }}>
            {filter === 'todos' ? 'Todos os Presentes' : filter === 'escolhidos' ? 'Presentes Escolhidos' : 'Presentes Disponíveis'}
          </h2>
          {search && (
            <p className="text-xs" style={{ color: '#B08070' }}>
              {visibleGifts.length} resultado{visibleGifts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Gift list */}
        {loading ? (
          <Skeleton />
        ) : visibleGifts.length === 0 ? (
          <div className="rounded-2xl p-10 text-center shadow-sm"
            style={{ backgroundColor: 'white', border: '1px solid #F0E4DE' }}>
            <Gift size={32} style={{ color: '#E5D5CF', margin: '0 auto 12px' }} />
            <p className="text-sm font-semibold" style={{ color: '#C8A898' }}>
              {search ? 'Nenhum resultado encontrado' : 'Nenhum presente nesta categoria'}
            </p>
            {search && (
              <button onClick={() => setSearch('')}
                className="mt-3 text-xs font-semibold underline" style={{ color: '#C9846B' }}>
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleGifts.map(gift => {
              const cfg         = categoryConfig[gift.category]
              const Icon        = categoryIcons[gift.category]
              const giftClaims  = claims[String(gift.id)] ?? []
              const isUnlimited = gift.limit === null
              const isFull      = !isUnlimited && giftClaims.length >= (gift.limit ?? 1)
              const hasAny      = giftClaims.length > 0

              return (
                <div key={gift.id} className="rounded-2xl p-4 shadow-sm transition-all"
                  style={{
                    backgroundColor: 'white',
                    border: `1.5px solid ${isFull ? '#A8DDD5' : hasAny ? '#E8CFA0' : '#F0E4DE'}`,
                  }}>
                  {/* Gift header */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cfg.bgColor }}>
                      <Icon size={16} style={{ color: cfg.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug" style={{ color: '#3D2B1F' }}>
                            {gift.name}
                          </p>
                          {gift.brand && (
                            <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium"
                              style={{ backgroundColor: cfg.bgColor, color: cfg.color }}>
                              {gift.brand}
                            </span>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                          {isFull ? (
                            <CheckCircle2 size={13} style={{ color: '#4CAF9A' }} />
                          ) : (
                            <Circle size={13} style={{ color: '#D4B8A8' }} />
                          )}
                          <span className="text-xs font-semibold"
                            style={{ color: isFull ? '#2D8070' : hasAny ? '#C9A84C' : '#C8A898' }}>
                            {isUnlimited
                              ? giftClaims.length === 0 ? 'Sem reservas' : `${giftClaims.length} reserva${giftClaims.length > 1 ? 's' : ''}`
                              : isFull ? 'Escolhido'
                              : hasAny ? `${giftClaims.length}/${gift.limit}`
                              : 'Disponível'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Claimants */}
                  {giftClaims.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2 pl-12">
                      {giftClaims.map((claim, idx) => {
                        const rmKey = `${gift.id}-${claim.claimedBy}`
                        return (
                          <div key={`${rmKey}-${idx}`}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                            style={{ backgroundColor: '#F8F4F2' }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: '#3D2B1F' }}>{claim.claimedBy}</p>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {claim.phone && (
                                  <a href={`https://wa.me/55${claim.phone.replace(/\D/g, '')}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                                    style={{ color: '#4CAF9A' }}>
                                    <Phone size={10} /> {claim.phone}
                                  </a>
                                )}
                                <span className="text-xs" style={{ color: '#C8A898' }}>{fmt(claim.claimedAt)}</span>
                              </div>
                            </div>
                            <button onClick={() => handleUnclaim(gift.id, claim.claimedBy)} disabled={removing === rmKey}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-red-50 disabled:opacity-50 flex-shrink-0"
                              style={{ color: '#D45050', border: '1px solid #EDCFCF', backgroundColor: 'white' }}
                              aria-label={`Remover reserva de ${claim.claimedBy}`}>
                              {removing === rmKey
                                ? <span className="w-3 h-3 rounded-full border-2 border-red-300 border-t-transparent animate-spin" />
                                : <Trash2 size={12} />}
                              Remover
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
        <div role="alert" aria-live="polite"
          className="fixed bottom-5 right-4 left-4 sm:left-auto sm:w-80 z-50 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center gap-2"
          style={{
            backgroundColor: toast.type === 'ok' ? '#EDF7F2' : '#FDF2F2',
            border:          toast.type === 'ok' ? '1px solid #A8DDD5' : '1px solid #EDCFCF',
            color:           toast.type === 'ok' ? '#1A5A4A' : '#7A2020',
          }}>
          {toast.type === 'ok'
            ? <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            : <X            size={15} style={{ flexShrink: 0 }} />}
          {toast.msg}
        </div>
      )}
    </main>
  )
}
