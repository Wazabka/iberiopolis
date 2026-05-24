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
    setLoading(true); setError(''); setMessage('')
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
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setLoading(true); setError('')
    try { await signInWithGoogle() }
    catch (err: any) { setError(err.message || 'Error con Google'); setLoading(false) }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#09090b' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>Iberiópolis</h1>
          <p style={{ color: '#71717a', fontSize: '14px' }}>El Monopoly español online</p>
        </div>

        <div className="card" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', marginBottom: '1.5rem', background: '#27272a', borderRadius: '8px', padding: '4px' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontWeight: 500, fontSize: '14px', border: 'none', cursor: 'pointer', background: mode === m ? '#f59e0b' : 'transparent', color: mode === m ? 'black' : '#a1a1aa', transition: 'all 0.15s' }}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'register' && (
              <div>
                <label style={{ fontSize: '13px', color: '#a1a1aa', display: 'block', marginBottom: '5px' }}>Nombre de usuario</label>
                <input className="input" type="text" placeholder="Tu nombre en el juego" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
            )}
            <div>
              <label style={{ fontSize: '13px', color: '#a1a1aa', display: 'block', marginBottom: '5px' }}>Email</label>
              <input className="input" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#a1a1aa', display: 'block', marginBottom: '5px' }}>Contraseña</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && <p style={{ color: '#fca5a5', fontSize: '13px', background: '#450a0a', padding: '8px 10px', borderRadius: '6px', margin: 0 }}>{error}</p>}
            {message && <p style={{ color: '#86efac', fontSize: '13px', background: '#14532d', padding: '8px 10px', borderRadius: '6px', margin: 0 }}>{message}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#3f3f46' }} />
            <span style={{ color: '#71717a', fontSize: '13px' }}>o</span>
            <div style={{ flex: 1, height: '1px', background: '#3f3f46' }} />
          </div>

          <button onClick={handleGoogle} disabled={loading} className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
            </svg>
            Continuar con Google
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <button onClick={() => router.push('/jugar')} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            Jugar sin cuenta →
          </button>
          <button onClick={() => router.push('/reglas')} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
            Ver las reglas
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#52525b', fontSize: '11px', marginTop: '1.5rem' }}>
          Uso privado · Iberiópolis v1.0
        </p>
      </div>
    </main>
  )
}
