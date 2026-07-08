'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, RefreshCw, Settings, MessageSquare, Gift,
  Users, CheckCircle2, XCircle, Clock, Wifi, WifiOff,
  QrCode, Send, Save, Trash2, Phone, AlertCircle,
} from 'lucide-react'
import { categoryConfig } from '@/lib/gifts-data'
import type { Gift as GiftType } from '@/lib/gifts-data'

// ── Types ─────────────────────────────────────────────────────────────────────
interface WaLog {
  id: string; gift_id: number; claimed_by: string; phone: string
  message: string; status: 'sent' | 'failed' | 'pending'; error: string | null; sent_at: string
}
interface WaStatus { connected: boolean; phone: string | null; hasQR: boolean }
interface ClaimRecord { claimedBy: string; phone: string; claimedAt: string }
type Claims     = Record<string, ClaimRecord[]>
type AppSettings = Record<string, string>

const TABS = [
  { id: 'reservas',  label: 'Reservas',  icon: Users         },
  { id: 'whatsapp',  label: 'WhatsApp',  icon: MessageSquare },
  { id: 'presentes', label: 'Presentes', icon: Gift          },
  { id: 'config',    label: 'Config',    icon: Settings      },
] as const
type TabId = typeof TABS[number]['id']

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// ── Shared components ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#4A90D9' }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4 flex-1" style={{ backgroundColor: '#162030', border: '1px solid #1E3045' }}>
      <p className="text-xs font-medium mb-1" style={{ color: '#5A7898' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#2A4060' }}>{sub}</p>}
    </div>
  )
}

function SectionDivider({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-xs font-bold uppercase tracking-widest flex-shrink-0" style={{ color: '#4A90D9' }}>{title}</p>
      <div className="flex-1 h-px" style={{ backgroundColor: '#1E3045' }} />
      {action}
    </div>
  )
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: '#162030' }} />
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OwnerPage() {
  const router = useRouter()
  const [tab,   setTab]   = useState<TabId>('reservas')
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const showToast = useCallback((type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/owner/logout', { method: 'POST' })
    router.push('/owner/login')
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#0A1520' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b" style={{ backgroundColor: '#0F1D2B', borderColor: '#1E3045' }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4A90D9, #2563EB)' }}>
                <Settings size={14} color="white" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none" style={{ color: '#E2EEFF' }}>Painel Admin</p>
                <p className="text-xs mt-0.5" style={{ color: '#4A6080' }}>Antônia · 80 Anos</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ color: '#F87171', border: '1px solid #3D1515', backgroundColor: '#1A0A0A' }}>
              <LogOut size={12} /> Sair
            </button>
          </div>

          {/* Tab bar — scrollable on mobile */}
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id
              return (
                <button key={id} onClick={() => setTab(id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0"
                  style={{
                    borderColor:     active ? '#4A90D9' : 'transparent',
                    color:           active ? '#4A90D9' : '#4A6080',
                    backgroundColor: 'transparent',
                  }}>
                  <Icon size={12} /> {label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {tab === 'reservas'  && <ReservasTab  showToast={showToast} />}
        {tab === 'whatsapp'  && <WhatsAppTab  showToast={showToast} />}
        {tab === 'presentes' && <PresentesTab showToast={showToast} />}
        {tab === 'config'    && <ConfigTab    showToast={showToast} />}
      </div>

      {/* Toast */}
      {toast && (
        <div role="alert" aria-live="polite"
          className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-5 sm:w-72 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2"
          style={{
            backgroundColor: toast.type === 'ok' ? '#072A18' : '#2A0808',
            border:          toast.type === 'ok' ? '1px solid #1A5A34' : '1px solid #5A1A1A',
            color:           toast.type === 'ok' ? '#6EE7A0' : '#FCA5A5',
          }}>
          {toast.type === 'ok'
            ? <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            : <XCircle      size={15} style={{ flexShrink: 0 }} />}
          {toast.msg}
        </div>
      )}
    </main>
  )
}

// ── Reservas Tab ──────────────────────────────────────────────────────────────
function ReservasTab({ showToast }: { showToast: (t: 'ok' | 'err', m: string) => void }) {
  const [gifts,     setGifts]     = useState<GiftType[]>([])
  const [claims,    setClaims]    = useState<Claims>({})
  const [logs,      setLogs]      = useState<WaLog[]>([])
  const [loading,   setLoading]   = useState(true)
  const [removing,  setRemoving]  = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const [giftsRes, claimsRes, logsRes] = await Promise.all([
      fetch('/api/gifts-catalog').catch(() => null),
      fetch('/api/gifts').catch(() => null),
      fetch('/api/owner/whatsapp?action=logs').catch(() => null),
    ])
    if (giftsRes?.ok)  setGifts(await giftsRes.json())
    if (claimsRes?.ok) setClaims(await claimsRes.json())
    if (logsRes?.ok)   setLogs(await logsRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const logMap = logs.reduce<Record<string, WaLog>>((acc, log) => {
    const k = `${log.gift_id}-${log.claimed_by}`
    if (!acc[k] || log.sent_at > acc[k].sent_at) acc[k] = log
    return acc
  }, {})

  const allClaims = gifts.flatMap(g =>
    (claims[String(g.id)] ?? []).map(c => ({ gift: g, claim: c }))
  )

  const sentCount   = allClaims.filter(({ gift, claim }) => logMap[`${gift.id}-${claim.claimedBy}`]?.status === 'sent').length
  const failedCount = allClaims.filter(({ gift, claim }) => logMap[`${gift.id}-${claim.claimedBy}`]?.status === 'failed').length

  const handleRemove = async (giftId: number, claimedBy: string) => {
    const key = `${giftId}-${claimedBy}`
    setRemoving(key)
    const res = await fetch('/api/owner/unclaim', {
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
      showToast('err', 'Erro ao remover reserva.')
    }
    setRemoving(null)
  }

  const handleResend = async (giftId: number, claimedBy: string) => {
    const key = `${giftId}-${claimedBy}`
    setResending(key)
    const res = await fetch('/api/owner/resend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giftId, claimedBy }),
    })
    if (res.ok) {
      showToast('ok', `Mensagem reenviada para ${claimedBy}.`)
      const logsRes = await fetch('/api/owner/whatsapp?action=logs').catch(() => null)
      if (logsRes?.ok) setLogs(await logsRes.json())
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      showToast('err', `Falha ao reenviar: ${d.error ?? 'erro desconhecido'}`)
    }
    setResending(null)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Reservas"  value={allClaims.length} color="#4A90D9" />
        <StatCard label="Enviados"  value={sentCount}        color="#4CAF9A" />
        <StatCard label="Falharam"  value={failedCount}      color={failedCount > 0 ? '#F87171' : '#2A4060'} />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold" style={{ color: '#E2EEFF' }}>
          Todas as reservas
        </h2>
        <button onClick={fetchAll}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ color: '#4A90D9', backgroundColor: '#0F2035', border: '1px solid #1E3045' }}>
          <RefreshCw size={11} /> Atualizar
        </button>
      </div>

      {loading ? (
        <Skeleton rows={4} />
      ) : allClaims.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: '#162030', border: '1px solid #1E3045' }}>
          <Users size={32} style={{ color: '#1E3045', margin: '0 auto 12px' }} />
          <p className="text-sm font-semibold" style={{ color: '#4A6080' }}>Nenhuma reserva ainda</p>
          <p className="text-xs mt-1" style={{ color: '#2A4060' }}>As reservas aparecem aqui assim que alguém escolher um presente.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {allClaims.map(({ gift, claim }) => {
            const cfg = categoryConfig[gift.category]
            const key = `${gift.id}-${claim.claimedBy}`
            const log = logMap[key]

            const badge = log
              ? log.status === 'sent'
                ? { label: 'Enviado',     Icon: CheckCircle2, color: '#4CAF9A', bg: '#072A18', bd: '#1A5A34' }
                : log.status === 'failed'
                ? { label: 'Falhou',      Icon: XCircle,      color: '#F87171', bg: '#2A0808', bd: '#5A1A1A' }
                : { label: 'Pendente',    Icon: Clock,        color: '#F0B429', bg: '#2A1A08', bd: '#5A3A18' }
              : { label: 'Não enviado',   Icon: Clock,        color: '#4A6080', bg: '#0F1D2B', bd: '#1E3045' }

            return (
              <div key={key} className="rounded-2xl p-4" style={{ backgroundColor: '#162030', border: '1px solid #1E3045' }}>
                {/* Top: name + gift + remove */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold" style={{ color: '#E2EEFF' }}>{claim.claimedBy}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: cfg.bgColor + '28', color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs leading-snug mb-2" style={{ color: '#8AAAC0' }}>{gift.name}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <a href={`https://wa.me/55${claim.phone.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                        style={{ color: '#4CAF9A' }}>
                        <Phone size={10} /> {claim.phone}
                      </a>
                      <span className="text-xs" style={{ color: '#2A4060' }}>{fmt(claim.claimedAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(gift.id, claim.claimedBy)} disabled={removing === key}
                    aria-label="Remover reserva"
                    className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ backgroundColor: '#1A0A0A', border: '1px solid #3D1515' }}>
                    {removing === key
                      ? <span className="w-3 h-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                      : <Trash2 size={13} style={{ color: '#F87171' }} />}
                  </button>
                </div>

                {/* Bottom: WA status + resend */}
                <div className="flex items-center justify-between gap-2 pt-3" style={{ borderTop: '1px solid #1A2D40' }}>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: badge.bg, border: `1px solid ${badge.bd}` }}>
                    <badge.Icon size={11} style={{ color: badge.color }} />
                    <span className="text-xs font-semibold" style={{ color: badge.color }}>{badge.label}</span>
                    {log && <span className="text-xs ml-1" style={{ color: badge.color, opacity: 0.55 }}>{fmt(log.sent_at)}</span>}
                  </div>
                  <button onClick={() => handleResend(gift.id, claim.claimedBy)} disabled={resending === key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: '#0A2A1A', color: '#4CAF9A', border: '1px solid #1A5A34' }}>
                    {resending === key
                      ? <span className="w-3 h-3 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
                      : <Send size={11} />}
                    {log?.status === 'sent' ? 'Reenviar' : 'Enviar'}
                  </button>
                </div>

                {log?.status === 'failed' && log.error && (
                  <div className="mt-2 px-3 py-2 rounded-lg flex items-start gap-2"
                    style={{ backgroundColor: '#2A0808', border: '1px solid #5A1A1A' }}>
                    <AlertCircle size={12} style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }} />
                    <p className="text-xs break-all" style={{ color: '#FCA5A5' }}>{log.error}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── WhatsApp Tab ──────────────────────────────────────────────────────────────
function WhatsAppTab({ showToast }: { showToast: (t: 'ok' | 'err', m: string) => void }) {
  const [status,      setStatus]      = useState<WaStatus | null>(null)
  const [serviceDown, setServiceDown] = useState(false)
  const [qr,          setQr]          = useState<string | null>(null)
  const [logs,        setLogs]        = useState<WaLog[]>([])
  const [loading,     setLoading]     = useState(true)
  const [polling,     setPolling]     = useState(false)
  const prevConnectedRef = useRef<boolean | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/owner/whatsapp?action=status')
      if (res.ok) { setStatus(await res.json()); setServiceDown(false) }
      else        { setServiceDown(true) }
    } catch { setServiceDown(true) }
  }, [])

  const fetchQR = useCallback(async () => {
    setPolling(true)
    try {
      const res = await fetch('/api/owner/whatsapp?action=qr')
      if (!res.ok) return
      const data = await res.json()
      if (data.qr)             { setQr(data.qr) }
      else if (data.connected) { setQr(null); fetchStatus() }
    } catch {}
    finally { setPolling(false) }
  }, [fetchStatus])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/owner/whatsapp?action=logs')
      if (res.ok) setLogs(await res.json())
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const connected = status?.connected ?? null
    if (prevConnectedRef.current === true && connected === false) setQr(null)
    prevConnectedRef.current = connected
  }, [status?.connected])

  useEffect(() => {
    fetchStatus(); fetchQR(); fetchLogs()
    const iv = setInterval(() => { fetchStatus(); fetchQR() }, 5_000)
    return () => clearInterval(iv)
  }, [fetchStatus, fetchQR, fetchLogs])

  const handleLogout = async () => {
    await fetch('/api/owner/whatsapp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    showToast('ok', 'WhatsApp desconectado.')
    setStatus(null); setQr(null); fetchStatus()
  }

  const sentCount    = logs.filter(l => l.status === 'sent').length
  const failedCount  = logs.filter(l => l.status === 'failed').length
  const pendingCount = logs.filter(l => l.status === 'pending').length

  return (
    <div className="flex flex-col gap-5">
      {/* Connection card */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#162030', border: '1px solid #1E3045' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: '#E2EEFF' }}>Conexão WhatsApp</h2>
          {status?.connected ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ color: '#4CAF9A', backgroundColor: '#072A18', border: '1px solid #1A5A34' }}>
              <Wifi size={11} /> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ color: '#F87171', backgroundColor: '#2A0808', border: '1px solid #5A1A1A' }}>
              <WifiOff size={11} /> Desconectado
            </span>
          )}
        </div>

        {status?.phone && (
          <p className="text-xs mb-4" style={{ color: '#4A6080' }}>
            Número: <span style={{ color: '#8AAAC0' }}>{status.phone}</span>
          </p>
        )}

        {serviceDown && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-xl"
            style={{ backgroundColor: '#2A0808', border: '1px solid #5A1A1A' }}>
            <AlertCircle size={14} style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs leading-relaxed" style={{ color: '#FCA5A5' }}>
              Microserviço inacessível. Verifique se o container Docker está rodando e se <code className="text-xs">WHATSAPP_SERVICE_URL</code> está correto na Vercel.
            </p>
          </div>
        )}

        {!status?.connected && qr && (
          <div className="text-center mb-4">
            <p className="text-xs font-semibold mb-3" style={{ color: '#8AAAC0' }}>Escaneie com seu WhatsApp</p>
            <img src={qr} alt="QR Code WhatsApp" className="mx-auto rounded-2xl"
              style={{ width: 200, height: 200, border: '2px solid #1E3045' }} />
            <p className="text-xs mt-3" style={{ color: '#4A6080' }}>
              WhatsApp → Aparelhos Conectados → Conectar aparelho
            </p>
          </div>
        )}

        {!serviceDown && !status?.connected && !qr && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: '#0F2035' }}>
              <QrCode size={22} style={{ color: '#4A90D9' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#8AAAC0' }}>Aguardando QR code...</p>
            <p className="text-xs mt-1" style={{ color: '#4A6080' }}>O Chromium pode levar até 30s para iniciar.</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={() => { fetchStatus(); fetchQR() }} disabled={polling}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: '#0F2035', color: '#4A90D9', border: '1px solid #1E3045' }}>
            <RefreshCw size={12} className={polling ? 'animate-spin' : ''} /> Atualizar
          </button>
          {status?.connected && (
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#1A0A0A', color: '#F87171', border: '1px solid #3D1515' }}>
              <LogOut size={12} /> Desconectar
            </button>
          )}
        </div>
      </div>

      {/* Message stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Enviadas"  value={sentCount}    color="#4CAF9A" />
        <StatCard label="Falharam"  value={failedCount}  color={failedCount  > 0 ? '#F87171' : '#2A4060'} />
        <StatCard label="Pendentes" value={pendingCount} color={pendingCount > 0 ? '#F0B429' : '#2A4060'} />
      </div>

      {/* Logs */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#162030', border: '1px solid #1E3045' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: '#E2EEFF' }}>Log de mensagens</h2>
          <button onClick={fetchLogs}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ color: '#4A90D9', backgroundColor: '#0F2035', border: '1px solid #1E3045' }}>
            <RefreshCw size={11} /> Atualizar
          </button>
        </div>

        {loading ? (
          <Skeleton rows={3} />
        ) : logs.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare size={28} style={{ color: '#1E3045', margin: '0 auto 8px' }} />
            <p className="text-xs" style={{ color: '#4A6080' }}>Nenhuma mensagem enviada ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {logs.map(log => {
              const icon = log.status === 'sent'
                ? <CheckCircle2 size={12} style={{ color: '#4CAF9A', flexShrink: 0 }} />
                : log.status === 'failed'
                ? <XCircle size={12} style={{ color: '#F87171', flexShrink: 0 }} />
                : <Clock   size={12} style={{ color: '#F0B429', flexShrink: 0 }} />
              return (
                <div key={log.id} className="rounded-xl p-3 flex items-start gap-2.5"
                  style={{ backgroundColor: '#0A1520', border: '1px solid #1E3045' }}>
                  <div className="mt-0.5">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold" style={{ color: '#E2EEFF' }}>{log.claimed_by}</p>
                      <p className="text-xs flex-shrink-0" style={{ color: '#2A4060' }}>{fmt(log.sent_at)}</p>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#4A6080' }}>{log.phone}</p>
                    {log.error && (
                      <p className="text-xs mt-1 break-all" style={{ color: '#F87171' }}>{log.error}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Presentes Tab ─────────────────────────────────────────────────────────────
function PresentesTab({ showToast }: { showToast: (t: 'ok' | 'err', m: string) => void }) {
  void showToast
  const [gifts,   setGifts]   = useState<GiftType[]>([])
  const [claims,  setClaims]  = useState<Claims>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/gifts-catalog').then(r => r.ok ? r.json() : []),
      fetch('/api/gifts').then(r => r.ok ? r.json() : {}),
    ]).then(([g, c]) => { setGifts(g); setClaims(c) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton rows={6} />

  const regularGifts = gifts.filter(g => g.category !== 'pix')
  const pixGifts     = gifts.filter(g => g.category === 'pix')
  const totalClaims  = regularGifts.reduce((s, g) => s + (claims[String(g.id)]?.length ?? 0), 0)
  const totalSlots   = regularGifts.reduce((s, g) => s + (g.limit ?? 0), 0)
  const pixCount     = pixGifts.reduce((s, g) => s + (claims[String(g.id)]?.length ?? 0), 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Presentes"  value={regularGifts.length} color="#4A90D9" />
        <StatCard label="Reservados" value={totalClaims}         color="#4CAF9A" sub={`de ${totalSlots}`} />
        <StatCard label="Pix"        value={pixCount}            color="#F0B429" />
      </div>

      {/* Regular gifts */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E3045' }}>
        <div className="px-4 py-3" style={{ backgroundColor: '#0F2035', borderBottom: '1px solid #1E3045' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4A6080' }}>Presentes</p>
        </div>
        {regularGifts.map((g, i) => {
          const cfg    = categoryConfig[g.category]
          const count  = claims[String(g.id)]?.length ?? 0
          const limit  = g.limit ?? 0
          const pct    = limit > 0 ? count / limit : 0
          const isFull = limit > 0 && count >= limit
          return (
            <div key={g.id} className="px-4 py-3 flex items-center gap-3"
              style={{
                backgroundColor: '#162030',
                borderBottom: i < regularGifts.length - 1 ? '1px solid #1A2D40' : undefined,
              }}>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 hidden sm:inline-block"
                style={{ backgroundColor: cfg.bgColor + '28', color: cfg.color }}>
                {cfg.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-tight" style={{ color: '#E2EEFF' }}>{g.name}</p>
                {g.brand && <p className="text-xs mt-0.5" style={{ color: '#4A6080' }}>{g.brand}</p>}
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                {limit > 0 && (
                  <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#0A1520' }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${Math.min(pct * 100, 100)}%`,
                        backgroundColor: isFull ? '#F87171' : pct >= 0.5 ? '#F0B429' : '#4CAF9A',
                      }} />
                  </div>
                )}
                <span className="text-xs font-mono font-semibold w-8 text-right"
                  style={{ color: isFull ? '#F87171' : '#8AAAC0' }}>
                  {limit === 0 ? '∞' : `${count}/${limit}`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pix */}
      {pixGifts.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E3045' }}>
          <div className="px-4 py-3" style={{ backgroundColor: '#0F2035', borderBottom: '1px solid #1E3045' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4A6080' }}>Pix</p>
          </div>
          {pixGifts.map((g, i) => {
            const count = claims[String(g.id)]?.length ?? 0
            return (
              <div key={g.id} className="px-4 py-3 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: '#162030',
                  borderBottom: i < pixGifts.length - 1 ? '1px solid #1A2D40' : undefined,
                }}>
                <p className="text-sm" style={{ color: '#E2EEFF' }}>{g.name}</p>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: '#F0B429' }}>
                  {count} {count === 1 ? 'contribuição' : 'contribuições'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs" style={{ color: '#2A4060' }}>
        Para editar presentes, acesse a tabela <code style={{ color: '#4A90D9' }}>gifts</code> no Supabase.
      </p>
    </div>
  )
}

// ── Config Tab ────────────────────────────────────────────────────────────────
const DEFAULT_WA_TEMPLATE = `🎊 *{name}, sua reserva está confirmada!* ✅

Que alegria contar com sua presença na celebração dos *80 anos de Antônia Lucena*! 🎂

🎁 *Presente escolhido*
└ {gift}

━━━━━━━━━━━━━━━━━━
📋 *Detalhes do evento*
📅  {date}
⏰  {time}
📍  {place}
🗺️  https://maps.app.goo.gl/1SQhCcoGbJZSMuaM6
━━━━━━━━━━━━━━━━━━

Te esperamos com muito carinho! 💛`

function InputField({ label, value, onChange, placeholder, multiline, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; multiline?: boolean; rows?: number
}) {
  const base = {
    backgroundColor: '#0A1520',
    border: '1px solid #1E3045',
    color: '#E2EEFF',
    outline: 'none',
  }
  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#8AAAC0' }}>{label}</label>
      )}
      {multiline ? (
        <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-mono resize-vertical"
          style={{ ...base, lineHeight: 1.6 }} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={base} />
      )}
    </div>
  )
}

function ConfigTab({ showToast }: { showToast: (t: 'ok' | 'err', m: string) => void }) {
  const [settings, setSettings] = useState<AppSettings>({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    fetch('/api/owner/settings').then(r => r.ok ? r.json() : {})
      .then(d => { setSettings(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }))
  const get = (key: string) => settings[key] ?? ''

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/owner/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) showToast('ok', 'Configurações salvas.')
    else        showToast('err', 'Erro ao salvar.')
    setSaving(false)
  }

  if (loading) return <Skeleton rows={4} />

  return (
    <div className="flex flex-col gap-5">
      {/* PIX */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#162030', border: '1px solid #1E3045' }}>
        <SectionDivider title="Pix" />
        <div className="flex flex-col gap-4">
          <InputField label="Chave Pix"               value={get('pix_key')}           onChange={v => set('pix_key', v)}           placeholder="(85) 99999-9999, CPF ou e-mail" />
          <InputField label="Nome do titular"         value={get('pix_owner_name')}    onChange={v => set('pix_owner_name', v)}    placeholder="Antônia Lucena" />
          <InputField label="Telefone p/ comprovante" value={get('pix_receipt_phone')} onChange={v => set('pix_receipt_phone', v)} placeholder="(85) 98765-4321" />
        </div>
      </div>

      {/* Evento */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#162030', border: '1px solid #1E3045' }}>
        <SectionDivider title="Evento" />
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField label="Data"              value={get('event_date')}    onChange={v => set('event_date', v)}    placeholder="16 de Agosto de 2026" />
          <InputField label="Horário"           value={get('event_time')}    onChange={v => set('event_time', v)}    placeholder="18h30" />
          <InputField label="Prazo confirmação" value={get('rsvp_deadline')} onChange={v => set('rsvp_deadline', v)} placeholder="20 de julho de 2026" />
          <div className="sm:col-span-2">
            <InputField label="Local" value={get('event_place')} onChange={v => set('event_place', v)} placeholder="Buffet Diferentes Sabores" />
          </div>
        </div>
      </div>

      {/* WhatsApp template */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#162030', border: '1px solid #1E3045' }}>
        <SectionDivider title="Template WhatsApp"
          action={
            <button type="button" onClick={() => set('whatsapp_template', DEFAULT_WA_TEMPLATE)}
              className="text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80 flex-shrink-0"
              style={{ color: '#4A90D9', border: '1px solid #1E3045', backgroundColor: '#0A1520' }}>
              ↺ Restaurar
            </button>
          }
        />
        <p className="text-xs mb-4" style={{ color: '#4A6080' }}>
          Variáveis disponíveis:{' '}
          {['{name}', '{gift}', '{date}', '{time}', '{place}', '{pix_key}', '{pix_owner}', '{pix_receipt}'].map(v => (
            <code key={v} className="text-xs mx-0.5 px-1 py-0.5 rounded"
              style={{ backgroundColor: '#0A1520', color: '#8AAAC0' }}>{v}</code>
          ))}
        </p>
        <InputField label="" value={get('whatsapp_template')} onChange={v => set('whatsapp_template', v)}
          placeholder="Template da mensagem..." multiline rows={12} />
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
        {saving
          ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Salvando...</>
          : <><Save size={14} /> Salvar configurações</>}
      </button>
    </div>
  )
}
