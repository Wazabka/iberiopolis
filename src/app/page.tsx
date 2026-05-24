'use client'
import { useState, useEffect } from 'react'
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
        router.push('/lobby')
      } else {
        await signUpWithEmail(email, password, username)
        setMessage('Revisa tu email para confirmar la cuenta.')
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Error con Google')
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
  <button onClick={() => router.push('/jugar')} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
    Jugar sin cuenta
  </button>
</div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '700', color: '#f59e0b', marginBottom: '0.25rem' }}>
            Iberiópolis
          </h1>
          <p style={{ color: '#71717a' }}>El Monopoly español online</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', marginBottom: '1.5rem', background: '#27272a', borderRadius: '0.5rem', padding: '4px' }}>
            <button
              onClick={() => setMode('login')}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', fontWeight: '500', fontSize: '0.875rem', border: 'none', cursor: 'pointer', background: mode === 'login' ? '#f59e0b' : 'transparent', color: mode === 'login' ? 'black' : '#a1a1aa' }}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setMode('register')}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', fontWeight: '500', fontSize: '0.875rem', border: 'none', cursor: 'pointer', background: mode === 'register' ? '#f59e0b' : 'transparent', color: mode === 'register' ? 'black' : '#a1a1aa' }}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'register' && (
              <div>
                <label style={{ fontSize: '0.875rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Nombre de usuario</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Tu nombre en el juego"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label style={{ fontSize: '0.875rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Email</label>
              <input
                className="input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Contraseña</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}
            {message && <p style={{ color: '#4ade80', fontSize: '0.875rem' }}>{message}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#3f3f46' }} />
            <span style={{ color: '#71717a', fontSize: '0.875rem' }}>o</span>
            <div style={{ flex: 1, height: '1px', background: '#3f3f46' }} />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
            </svg>
            Continuar con Google
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#52525b', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          Uso privado · Iberiópolis v1.0
        </p>
      </div>
    </main>
  )
}