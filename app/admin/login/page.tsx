'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertCircle, Gift } from 'lucide-react'

export default function AdminLogin() {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [password,  setPassword]  = useState('')
  const [show,      setShow]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || loading) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Senha incorreta. Tente novamente.')
        setPassword('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #F2E0D8 0%, #FDF8F3 60%, #FBF0EA 100%)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl shadow-2xl p-8"
        style={{ backgroundColor: 'white', border: '1px solid #F0E4DE' }}
      >
        {/* Logo / icon */}
        <div className="text-center mb-7">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #C9846B, #C9A84C)' }}
          >
            <Gift size={26} color="white" />
          </div>
          <h1 className="font-playfair text-2xl font-bold" style={{ color: '#3D2B1F' }}>
            Painel Admin
          </h1>
          <p className="text-sm mt-1" style={{ color: '#B08070' }}>
            Lista de Presentes — Antônia 80 Anos
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="password" className="block text-sm font-semibold mb-2" style={{ color: '#3D2B1F' }}>
            Senha
          </label>

          <div className="relative mb-4">
            <input
              id="password"
              ref={inputRef}
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Digite a senha admin"
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none"
              style={{
                border:          `2px solid ${error ? '#E05050' : '#E5D5CF'}`,
                backgroundColor: error ? '#FDF2F2' : 'white',
                color:           '#3D2B1F',
                transition:      'border-color 150ms ease',
              }}
              onFocus={e  => { if (!error) e.currentTarget.style.borderColor = '#C9846B' }}
              onBlur={e   => { if (!error) e.currentTarget.style.borderColor = '#E5D5CF' }}
              aria-describedby={error ? 'login-error' : undefined}
              aria-invalid={!!error}
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity hover:opacity-60"
              style={{ color: '#B08070' }}
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              id="login-error"
              role="alert"
              className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm"
              style={{ backgroundColor: '#FDF2F2', border: '1px solid #EDCFCF', color: '#7A2020' }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:  'linear-gradient(135deg, #C9846B 0%, #C9A84C 100%)',
              boxShadow:   password.trim() && !loading ? '0 4px 14px rgba(201,132,107,0.35)' : 'none',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Verificando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Lock size={15} />
                Entrar
              </span>
            )}
          </button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: '#C8A898' }}>
          Acesso restrito ao administrador
        </p>
      </div>
    </main>
  )
}
