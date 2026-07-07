'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, RefreshCw, Settings, MessageSquare, Gift,
  Users, CheckCircle2, XCircle, Clock, Wifi, WifiOff,
  QrCode, Send, Save, Trash2, Phone,
} from 'lucide-react'
import { gifts as staticGifts, categoryConfig } from '@/lib/gifts-data'

// ── Types ─────────────────────────────────────────────────────────────────────
interface WaLog {
  id: string; gift_id: number; claimed_by: string; phone: string
  message: string; status: 'sent' | 'failed' | 'pending'; error: string | null; sent_at: string
}
interface WaStatus { connected: boolean; phone: string | null; hasQR: boolean }
interface ClaimRecord { claimedBy: string; phone: string; claimedAt: string }
type Claims = Record<string, ClaimRecord[]>
type AppSettings = Record<string, string>

const TABS = [
  { id: 'whatsapp',  label: 'WhatsApp',    icon: MessageSquare },
  { id: 'reservas',  label: 'Reservas',    icon: Users         },
  { id: 'presentes', label: 'Presentes',   icon: Gift          },
  { id: 'config',    label: 'Configurações', icon: Settings    },
] as const
type TabId = typeof TABS[number]['id']

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OwnerPage() {
  const router = useRouter()
  const [tab,      setTab]      = useState<TabId>('whatsapp')
  const [toast,    setToast]    = useState<{ type: 'ok'|'err'; msg: string } | null>(null)

  const showToast = useCallback((type: 'ok'|'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/owner/logout', { method: 'POST' })
    router.push('/owner/login')
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#0F1923' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b" style={{ backgroundColor: '#162030', borderColor: '#2A3A4A' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4A90D9, #357ABD)' }}>
              <Settings size={15} color="white" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: '#E8F0FE' }}>Painel Owner</p>
              <p className="text-xs hidden sm:block" style={{ color: '#8AA0B8' }}>Antônia Lucena — 80 Anos</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ color: '#FF8080', border: '1px solid #5A2020', backgroundColor: '#1E1010' }}>
            <LogOut size={13} /><span className="hidden sm:inline">Sair</span>
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors"
              style={{
                borderColor:     tab === id ? '#4A90D9' : 'transparent',
                color:           tab === id ? '#4A90D9' : '#8AA0B8',
                backgroundColor: 'transparent',
              }}>
              <Icon size={13} /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'whatsapp'  && <WhatsAppTab showToast={showToast} />}
        {tab === 'reservas'  && <ReservasTab showToast={showToast} />}
        {tab === 'presentes' && <PresentesTab showToast={showToast} />}
        {tab === 'config'    && <ConfigTab   showToast={showToast} />}
      </div>

      {toast && (
        <div className="fixed bottom-5 right-4 left-4 sm:left-auto sm:w-80 z-50 p-4 rounded-2xl shadow-lg text-sm font-semibold"
          role="alert"
          style={{
            backgroundColor: toast.type === 'ok' ? '#0A2A1A' : '#2A0A0A',
            border:          toast.type === 'ok' ? '1px solid #2A6A4A' : '1px solid #6A2A2A',
            color:           toast.type === 'ok' ? '#80E0A0' : '#FF8080',
          }}>
          {toast.msg}
        </div>
      )}
    </main>
  )
}

// ── WhatsApp Tab ──────────────────────────────────────────────────────────────
function WhatsAppTab({ showToast }: { showToast: (t:'ok'|'err', m:string) => void }) {
  const [status,       setStatus]       = useState<WaStatus | null>(null)
  const [serviceDown,  setServiceDown]  = useState(false)
  const [qr,           setQr]           = useState<string | null>(null)
  const [logs,         setLogs]         = useState<WaLog[]>([])
  const [loading,      setLoading]      = useState(true)
  const [polling,      setPolling]      = useState(false)
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

  // Detect disconnect: when connected transitions true → false, clear old QR immediately
  useEffect(() => {
    const connected = status?.connected ?? null
    if (prevConnectedRef.current === true && connected === false) {
      setQr(null)
    }
    prevConnectedRef.current = connected
  }, [status?.connected])

  useEffect(() => {
    fetchStatus(); fetchQR(); fetchLogs()
    const iv = setInterval(() => { fetchStatus(); fetchQR() }, 5_000)
    return () => clearInterval(iv)
  }, [fetchStatus, fetchQR, fetchLogs])

  const handleLogout = async () => {
    await fetch('/api/owner/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    showToast('ok', 'WhatsApp desconectado.')
    setStatus(null); setQr(null); fetchStatus()
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Connection card */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#162030', border: '1px solid #2A3A4A' }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: '#E8F0FE' }}>Conexão WhatsApp</h2>

        {/* Status pill */}
        <div className="flex items-center gap-2 mb-4">
          {status?.connected
            ? <><Wifi    size={14} style={{ color: '#4CAF9A' }} /><span className="text-sm font-semibold" style={{ color: '#4CAF9A' }}>Conectado — {status.phone}</span></>
            : <><WifiOff size={14} style={{ color: '#FF8080' }} /><span className="text-sm"               style={{ color: '#FF8080' }}>Desconectado</span></>}
        </div>

        {/* Microservice unreachable */}
        {serviceDown && (
          <p className="text-xs mb-4 p-3 rounded-xl" style={{ backgroundColor: '#2A1515', color: '#FF8080', border: '1px solid #5A2020' }}>
            Microserviço inacessível. Verifique se o container Docker está rodando e se WHATSAPP_SERVICE_URL está correto na Vercel.
          </p>
        )}

        {/* QR code */}
        {!status?.connected && qr && (
          <div className="text-center mb-4">
            <p className="text-xs mb-3" style={{ color: '#8AA0B8' }}>Escaneie com seu WhatsApp</p>
            <img src={qr} alt="QR Code WhatsApp" className="mx-auto rounded-xl"
              style={{ width: 200, height: 200, border: '2px solid #2A3A4A' }} />
          </div>
        )}

        {/* Waiting for QR (service online, Chromium initializing) */}
        {!serviceDown && !status?.connected && !qr && (
          <div className="text-center py-6">
            <QrCode size={40} style={{ color: '#4A90D9', margin: '0 auto 12px' }} />
            <p className="text-xs font-semibold" style={{ color: '#8AA0B8' }}>Aguardando QR code...</p>
            <p className="text-xs mt-1" style={{ color: '#4A6080' }}>O Chromium pode levar até 30s para iniciar.</p>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <button onClick={() => { fetchStatus(); fetchQR() }} disabled={polling}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: '#1E3050', color: '#4A90D9', border: '1px solid #2A4060' }}>
            <RefreshCw size={12} className={polling ? 'animate-spin' : ''} />
            Atualizar
          </button>
          {status?.connected && (
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: '#1E1010', color: '#FF8080', border: '1px solid #5A2020' }}>
              <LogOut size={12} /> Desconectar
            </button>
          )}
        </div>
      </div>

      {/* Logs */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#162030', border: '1px solid #2A3A4A' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: '#E8F0FE' }}>Log de Mensagens</h2>
          <button onClick={fetchLogs} className="text-xs" style={{ color: '#4A90D9' }}>
            <RefreshCw size={12} />
          </button>
        </div>

        {loading ? (
          <p className="text-xs" style={{ color: '#8AA0B8' }}>Carregando...</p>
        ) : logs.length === 0 ? (
          <p className="text-xs" style={{ color: '#8AA0B8' }}>Nenhuma mensagem enviada ainda.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="rounded-xl p-3" style={{ backgroundColor: '#0F1923', border: '1px solid #2A3A4A' }}>
                <div className="flex items-center gap-2 mb-1">
                  {log.status === 'sent'
                    ? <CheckCircle2 size={12} style={{ color: '#4CAF9A' }} />
                    : log.status === 'failed'
                    ? <XCircle size={12} style={{ color: '#FF8080' }} />
                    : <Clock size={12} style={{ color: '#C9A84C' }} />}
                  <span className="text-xs font-semibold" style={{ color: '#E8F0FE' }}>{log.claimed_by}</span>
                  <span className="text-xs ml-auto" style={{ color: '#8AA0B8' }}>{fmt(log.sent_at)}</span>
                </div>
                <p className="text-xs" style={{ color: '#8AA0B8' }}>{log.phone}</p>
                {log.error && <p className="text-xs mt-1" style={{ color: '#FF8080' }}>{log.error}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Reservas Tab ──────────────────────────────────────────────────────────────
function ReservasTab({ showToast }: { showToast: (t:'ok'|'err', m:string) => void }) {
  const [claims,   setClaims]   = useState<Claims>({})
  const [logs,     setLogs]     = useState<WaLog[]>([])
  const [loading,  setLoading]  = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const [claimsRes, logsRes] = await Promise.all([
      fetch('/api/gifts').catch(() => null),
      fetch('/api/owner/whatsapp?action=logs').catch(() => null),
    ])
    if (claimsRes?.ok) setClaims(await claimsRes.json())
    if (logsRes?.ok)   setLogs(await logsRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Latest log per claim: key = `${gift_id}-${claimed_by}`
  const logMap = logs.reduce<Record<string, WaLog>>((acc, log) => {
    const k = `${log.gift_id}-${log.claimed_by}`
    if (!acc[k] || log.sent_at > acc[k].sent_at) acc[k] = log
    return acc
  }, {})

  const handleRemove = async (giftId: number, claimedBy: string) => {
    const key = `${giftId}-${claimedBy}`
    setRemoving(key)
    const res = await fetch('/api/owner/unclaim', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giftId, claimedBy }),
    })
    if (res.ok) {
      showToast('ok', `Reserva de "${claimedBy}" removida.`)
      setClaims(prev => ({ ...prev, [String(giftId)]: (prev[String(giftId)] ?? []).filter(c => c.claimedBy !== claimedBy) }))
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
      // Refresh logs to show updated status
      const logsRes = await fetch('/api/owner/whatsapp?action=logs').catch(() => null)
      if (logsRes?.ok) setLogs(await logsRes.json())
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      showToast('err', `Falha ao reenviar: ${d.error ?? 'erro desconhecido'}`)
    }
    setResending(null)
  }

  const allClaims = staticGifts.flatMap(g =>
    (claims[String(g.id)] ?? []).map(c => ({ gift: g, claim: c }))
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold" style={{ color: '#E8F0FE' }}>
          {allClaims.length} reserva{allClaims.length !== 1 ? 's' : ''}
        </h2>
        <button onClick={fetchAll} className="flex items-center gap-1 text-xs" style={{ color: '#4A90D9' }}>
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      {loading ? (
        <p className="text-xs" style={{ color: '#8AA0B8' }}>Carregando...</p>
      ) : allClaims.length === 0 ? (
        <p className="text-xs" style={{ color: '#8AA0B8' }}>Nenhuma reserva ainda.</p>
      ) : (
        <div className="grid gap-3">
          {allClaims.map(({ gift, claim }) => {
            const cfg = categoryConfig[gift.category]
            const key = `${gift.id}-${claim.claimedBy}`
            const log = logMap[key]

            const statusBadge = log
              ? log.status === 'sent'
                ? { label: 'Enviado',  color: '#4CAF9A', bg: '#0D2820' }
                : log.status === 'failed'
                ? { label: 'Falhou',   color: '#FF6B6B', bg: '#2A1010' }
                : { label: 'Pendente', color: '#F0B429', bg: '#2A2010' }
              : { label: 'Não enviado', color: '#6A8098', bg: '#1A2530' }

            const canResend = !log || log.status !== 'sent'

            return (
              <div key={key} className="rounded-2xl p-4"
                style={{ backgroundColor: '#162030', border: '1px solid #2A3A4A' }}>
                {/* Top row */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#E8F0FE' }}>{claim.claimedBy}</p>
                    <p className="text-xs mt-0.5" style={{ color: cfg.color }}>{gift.name}</p>
                    <a href={`https://wa.me/55${claim.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs mt-1 hover:underline" style={{ color: '#4CAF9A' }}>
                      <Phone size={10} /> {claim.phone}
                    </a>
                    <p className="text-xs mt-0.5" style={{ color: '#4A6080' }}>{fmt(claim.claimedAt)}</p>
                  </div>
                  <button onClick={() => handleRemove(gift.id, claim.claimedBy)} disabled={removing === key}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ backgroundColor: '#1E1010', color: '#FF8080', border: '1px solid #5A2020' }}>
                    {removing === key
                      ? <span className="w-3 h-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                      : <Trash2 size={12} />}
                  </button>
                </div>

                {/* WhatsApp status row */}
                <div className="flex items-center justify-between gap-2 pt-2.5"
                  style={{ borderTop: '1px solid #1E2D3D' }}>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={11} style={{ color: statusBadge.color }} />
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: statusBadge.color, backgroundColor: statusBadge.bg }}
                    >
                      {statusBadge.label}
                    </span>
                    {log && (
                      <span className="text-xs" style={{ color: '#4A6080' }}>
                        {fmt(log.sent_at)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleResend(gift.id, claim.claimedBy)}
                    disabled={resending === key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: canResend ? '#0D2A1E' : '#0D2010',
                      color:           canResend ? '#4CAF9A' : '#2D7A5A',
                      border:          `1px solid ${canResend ? '#1A4A30' : '#1A3A28'}`,
                    }}
                  >
                    {resending === key
                      ? <span className="w-3 h-3 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
                      : <Send size={11} />}
                    {log?.status === 'sent' ? 'Reenviar' : 'Enviar'}
                  </button>
                </div>

                {/* Error detail */}
                {log?.status === 'failed' && log.error && (
                  <p className="text-xs mt-2 px-2 py-1.5 rounded-lg break-all"
                    style={{ backgroundColor: '#2A1010', color: '#FF8080' }}>
                    {log.error}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Presentes Tab ─────────────────────────────────────────────────────────────
function PresentesTab({ showToast }: { showToast: (t:'ok'|'err', m:string) => void }) {
  // Uses static gifts — future: migrate to Supabase for full CRUD
  void showToast
  return (
    <div>
      <p className="text-xs mb-4" style={{ color: '#8AA0B8' }}>
        Os presentes são carregados da tabela <code style={{ color: '#4A90D9' }}>gifts</code> no Supabase. Para editar, acesse o banco de dados diretamente.
      </p>
      <div className="grid gap-2">
        {staticGifts.map(g => {
          const cfg = categoryConfig[g.category]
          return (
            <div key={g.id} className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: '#162030', border: '1px solid #2A3A4A' }}>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: cfg.bgColor + '33', color: cfg.color }}>
                {cfg.label}
              </span>
              <span className="text-sm flex-1" style={{ color: '#E8F0FE' }}>{g.name}</span>
              {g.brand && <span className="text-xs" style={{ color: '#4A6080' }}>{g.brand}</span>}
              <span className="text-xs" style={{ color: '#4A6080' }}>
                {g.limit === null ? 'Ilimitado' : `Limite: ${g.limit}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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

// ── Config Tab ────────────────────────────────────────────────────────────────
function ConfigTab({ showToast }: { showToast: (t:'ok'|'err', m:string) => void }) {
  const [settings, setSettings] = useState<AppSettings>({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    fetch('/api/owner/settings').then(r => r.ok ? r.json() : {})
      .then(d => { setSettings(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/owner/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) showToast('ok', 'Configurações salvas.')
    else showToast('err', 'Erro ao salvar.')
    setSaving(false)
  }

  const fields: { key: string; label: string; placeholder: string; multiline?: boolean; section?: string }[] = [
    { key: 'pix_key',           label: 'Chave Pix',                          placeholder: 'ex: (85) 99999-9999, CPF ou email', section: 'Configurações Pix' },
    { key: 'pix_owner_name',    label: 'Nome do titular da chave',           placeholder: 'ex: Antônia Lucena' },
    { key: 'pix_receipt_phone', label: 'Telefone para receber comprovante',  placeholder: 'ex: (85) 98765-4321' },
    { key: 'event_date',        label: 'Data do evento',                     placeholder: '16 de Agosto de 2026', section: 'Evento' },
    { key: 'event_time',        label: 'Horário',                            placeholder: '18h30' },
    { key: 'event_place',       label: 'Local',                              placeholder: 'Buffet Diferentes Sabores' },
    { key: 'rsvp_deadline',     label: 'Prazo de confirmação',               placeholder: '20 de julho de 2026' },
    { key: 'whatsapp_template', label: 'Template da mensagem WhatsApp',
      placeholder: '🎊 *{name}, sua reserva está confirmada!* ✅\n\n🎁 *Presente:* {gift}\n\n📅 {date} · ⏰ {time}\n📍 {place}\n\n💛', multiline: true, section: 'WhatsApp' },
  ]

  if (loading) return <p className="text-xs" style={{ color: '#8AA0B8' }}>Carregando...</p>

  return (
    <div>
      <p className="text-xs mb-5" style={{ color: '#8AA0B8' }}>
        Variáveis disponíveis no template: <code style={{ color: '#4A90D9' }}>{'{name}'}</code>, <code style={{ color: '#4A90D9' }}>{'{gift}'}</code>, <code style={{ color: '#4A90D9' }}>{'{date}'}</code>, <code style={{ color: '#4A90D9' }}>{'{time}'}</code>, <code style={{ color: '#4A90D9' }}>{'{place}'}</code>, <code style={{ color: '#4A90D9' }}>{'{pix_key}'}</code>, <code style={{ color: '#4A90D9' }}>{'{pix_owner}'}</code>, <code style={{ color: '#4A90D9' }}>{'{pix_receipt}'}</code>
      </p>

      <div className="grid gap-4 mb-6">
        {fields.map(({ key, label, placeholder, multiline, section }) => (
          <div key={key}>
            {section && (
              <p className="text-xs font-bold uppercase tracking-widest mb-3 mt-2 pt-2" style={{ color: '#4A90D9', borderTop: '1px solid #2A3A4A' }}>
                {section}
              </p>
            )}
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={{ color: '#C0D0E0' }}>{label}</label>
              {key === 'whatsapp_template' && (
                <button
                  type="button"
                  onClick={() => set('whatsapp_template', DEFAULT_WA_TEMPLATE)}
                  className="text-xs px-2 py-0.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ color: '#4A90D9', border: '1px solid #2A3A4A', backgroundColor: '#0F1923' }}
                >
                  ↺ Restaurar padrão
                </button>
              )}
            </div>
            {multiline ? (
              <textarea rows={key === 'whatsapp_template' ? 12 : 3} value={settings[key] ?? ''} onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none font-mono"
                style={{ backgroundColor: '#0F1923', border: '1px solid #2A3A4A', color: '#E8F0FE', resize: 'vertical' }}
              />
            ) : (
              <input type="text" value={settings[key] ?? ''} onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: '#0F1923', border: '1px solid #2A3A4A', color: '#E8F0FE' }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4A90D9, #357ABD)' }}>
          {saving
            ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Salvando...</>
            : <><Save size={14} /> Salvar configurações</>}
        </button>
      </div>
    </div>
  )
}
