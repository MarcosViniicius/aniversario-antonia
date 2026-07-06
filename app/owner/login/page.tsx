'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertCircle, Settings } from 'lucide-react'

export default function OwnerLogin() {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || loading) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) { router.push('/owner'); router.refresh() }
      else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Senha incorreta.')
        setPassword(''); inputRef.current?.focus()
      }
    } catch { setError('Erro de conexão.') }
    finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 60%, #0F3460 100%)' }}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl p-8"
        style={{ backgroundColor: '#1E2A3A', border: '1px solid #2A3A4A' }}>

        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #4A90D9, #357ABD)' }}>
            <Settings size={26} color="white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#E8F0FE' }}>Painel Owner</h1>
          <p className="text-sm mt-1" style={{ color: '#8AA0B8' }}>Acesso restrito ao proprietário</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="pw" className="block text-sm font-semibold mb-2" style={{ color: '#C0D0E0' }}>
            Senha
          </label>
          <div className="relative mb-4">
            <input id="pw" ref={inputRef}
              type={show ? 'text' : 'password'}
              value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Senha do owner"
              autoComplete="current-password" required
              className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none"
              style={{ border: `2px solid ${error ? '#E05050' : '#2A3A4A'}`, backgroundColor: '#162030', color: '#E8F0FE' }}
              onFocus={e  => { if (!error) e.currentTarget.style.borderColor = '#4A90D9' }}
              onBlur={e   => { if (!error) e.currentTarget.style.borderColor = '#2A3A4A' }}
            />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
              style={{ color: '#8AA0B8' }} aria-label={show ? 'Ocultar' : 'Mostrar'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm"
              style={{ backgroundColor: '#2A1515', border: '1px solid #5A2020', color: '#FF8080' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={!password.trim() || loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #4A90D9, #357ABD)' }}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Verificando...
                </span>
              : <span className="flex items-center justify-center gap-2"><Lock size={15} /> Entrar</span>}
          </button>
        </form>
      </div>
    </main>
  )
}
