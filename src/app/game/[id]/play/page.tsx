'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  PROPERTIES, SPECIAL_SQUARES, ROLES_DEF, PLAYER_COLORS,
  formatMoney, getSquareAtPosition, calculateRent, calculateNetWorth,
  TOTAL_SQUARES, ESCANDALO_CARDS, PROPERTY_GROUPS, PIECE_TYPES,
  hasMonopoly, getMonopolyBonus
} from '@/lib/gameData'
import { Player, Property, GameState, Role } from '@/types/game'
import { XP_REWARDS, calculateLevel } from '@/lib/xp'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const GROUP_COLORS: Record<string, { bg: string; band: string; text: string; dark: string }> = {
  startup:     { bg: '#dbeafe', band: '#2563eb', text: '#1e40af', dark: '#1e3a8a' },
  servicios:   { bg: '#dcfce7', band: '#16a34a', text: '#14532d', dark: '#052e16' },
  corporacion: { bg: '#fef3c7', band: '#d97706', text: '#92400e', dark: '#451a03' },
  monopolio:   { bg: '#fee2e2', band: '#dc2626', text: '#991b1b', dark: '#450a0a' },
}

const SPECIAL_STYLES: Record<string, { bg: string; border: string; icon: string; textColor: string; label: string }> = {
  escandalo:  { bg: '#1c1033', border: '#7c3aed', icon: '⚡', textColor: '#c4b5fd', label: 'ESCÁNDALO' },
  hacienda:   { bg: '#1a0a00', border: '#ea580c', icon: '💸', textColor: '#fed7aa', label: 'HACIENDA' },
  subvencion: { bg: '#052e16', border: '#22c55e', icon: '💶', textColor: '#86efac', label: 'SUBVENCIÓN' },
  inspeccion: { bg: '#0c1a33', border: '#3b82f6', icon: '🔍', textColor: '#93c5fd', label: 'INSPECCIÓN' },
  siesta:     { bg: '#1a1a2e', border: '#818cf8', icon: '😴', textColor: '#c7d2fe', label: 'SIESTA' },
  ere:        { bg: '#0f1a0f', border: '#4ade80', icon: '✈️', textColor: '#bbf7d0', label: 'ERE EXPRESS' },
  ipo:        { bg: '#1a1200', border: '#eab308', icon: '📈', textColor: '#fef08a', label: 'IPO BOLSA' },
  boom:       { bg: '#0a1a00', border: '#84cc16', icon: '🌟', textColor: '#d9f99d', label: 'BOOM' },
  crack:      { bg: '#1a0000', border: '#ef4444', icon: '📉', textColor: '#fca5a5', label: 'CRACK 29' },
  vacaciones: { bg: '#001a1a', border: '#06b6d4', icon: '🏖️', textColor: '#a5f3fc', label: 'VACACIONES' },
  libre:      { bg: '#111827', border: '#6b7280', icon: '☕', textColor: '#d1d5db', label: 'DESCANSO' },
  salida:     { bg: '#001a00', border: '#22c55e', icon: '🚀', textColor: '#86efac', label: 'SALIDA' },
  juzgado:    { bg: '#1a1000', border: '#f59e0b', icon: '⚖️', textColor: '#fcd34d', label: 'JUZGADO' },
}

const LEVEL_NAMES = ['Sin mejora', 'Oficina', 'Sede Regional', 'Holding Nacional']

// ─────────────────────────────────────────────
// AUDIO ENGINE — lazy init to avoid autoplay block
// ─────────────────────────────────────────────
function createAudio() {
  if (typeof window === 'undefined') return null
  let ctx: AudioContext | null = null

  function getCtx(): AudioContext {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  const play = (fn: (c: AudioContext) => void) => { try { fn(getCtx()) } catch {} }

  return {
    _getCtx: getCtx,
    diceRoll: () => play(c => {
      for (let i = 0; i < 5; i++) setTimeout(() => {
        const o = c.createOscillator(), g = c.createGain()
        o.connect(g); g.connect(c.destination)
        o.type = 'square'; o.frequency.value = 80 + Math.random() * 140
        g.gain.setValueAtTime(0.12, c.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.09)
        o.start(); o.stop(c.currentTime + 0.09)
      }, i * 100)
    }),
    diceLand: () => play(c => {
      const o = c.createOscillator(), g = c.createGain()
      o.connect(g); g.connect(c.destination); o.type = 'sine'
      o.frequency.setValueAtTime(350, c.currentTime)
      o.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.18)
      g.gain.setValueAtTime(0.28, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18)
      o.start(); o.stop(c.currentTime + 0.18)
    }),
    step: () => play(c => {
      const o = c.createOscillator(), g = c.createGain()
      o.connect(g); g.connect(c.destination); o.type = 'sine'
      o.frequency.value = 700 + Math.random() * 200
      g.gain.setValueAtTime(0.08, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05)
      o.start(); o.stop(c.currentTime + 0.05)
    }),
    land: () => play(c => {
      ;[523, 659, 784].forEach((f, i) => setTimeout(() => {
        const o = c.createOscillator(), g = c.createGain()
        o.connect(g); g.connect(c.destination); o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0.15, c.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22)
        o.start(); o.stop(c.currentTime + 0.22)
      }, i * 90))
    }),
    buy: () => play(c => {
      ;[392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => {
        const o = c.createOscillator(), g = c.createGain()
        o.connect(g); g.connect(c.destination); o.type = 'triangle'; o.frequency.value = f
        g.gain.setValueAtTime(0.18, c.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.28)
        o.start(); o.stop(c.currentTime + 0.28)
      }, i * 65))
    }),
    rent: () => play(c => {
      const o = c.createOscillator(), g = c.createGain()
      o.connect(g); g.connect(c.destination); o.type = 'sawtooth'
      o.frequency.setValueAtTime(220, c.currentTime)
      o.frequency.exponentialRampToValueAtTime(110, c.currentTime + 0.22)
      g.gain.setValueAtTime(0.14, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22)
      o.start(); o.stop(c.currentTime + 0.22)
    }),
    ability: () => play(c => {
      ;[880, 1100, 1320].forEach((f, i) => setTimeout(() => {
        const o = c.createOscillator(), g = c.createGain()
        o.connect(g); g.connect(c.destination); o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0.2, c.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15)
        o.start(); o.stop(c.currentTime + 0.15)
      }, i * 80))
    }),
  }
}

// ─────────────────────────────────────────────
// 3D PIECE SVG FIGURES
// ─────────────────────────────────────────────
function Piece3D({ type, color, size = 20 }: { type: string; color: string; size?: number }) {
  const uid = `${type}_${color.replace('#', '')}_${size}`

const shapes: Record<string, React.ReactElement> = {    
    corona: (
      <svg width={size} height={size} viewBox="0 0 40 40" overflow="visible">
        <defs>
          <radialGradient id={`cg${uid}`} cx="40%" cy="30%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.7"/>
            <stop offset="100%" stopColor={color}/>
          </radialGradient>
        </defs>
        <ellipse cx="20" cy="34" rx="13" ry="3.5" fill="rgba(0,0,0,0.35)"/>
        <path d="M7 28 L7 16 L13 23 L20 7 L27 23 L33 16 L33 28 Z" fill={`url(#cg${uid})`} stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
        <rect x="7" y="28" width="26" height="5" rx="2" fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
        <circle cx="20" cy="7" r="2.5" fill="#fff" opacity="0.9"/>
        <circle cx="7" cy="16" r="2" fill="#fff" opacity="0.7"/>
        <circle cx="33" cy="16" r="2" fill="#fff" opacity="0.7"/>
      </svg>
    ),
    cohete: (
      <svg width={size} height={size} viewBox="0 0 40 40" overflow="visible">
        <defs>
          <radialGradient id={`rg${uid}`} cx="35%" cy="25%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.5"/>
            <stop offset="100%" stopColor={color}/>
          </radialGradient>
        </defs>
        <ellipse cx="20" cy="36" rx="9" ry="2.5" fill="rgba(0,0,0,0.3)"/>
        <path d="M20 3 C14 9 12 18 12 27 L20 31 L28 27 C28 18 26 9 20 3Z" fill={`url(#rg${uid})`} stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
        <path d="M12 27 L6 33 L12 30 Z" fill={color} opacity="0.85"/>
        <path d="M28 27 L34 33 L28 30 Z" fill={color} opacity="0.85"/>
        <ellipse cx="20" cy="16" rx="4" ry="5.5" fill="rgba(150,220,255,0.45)"/>
        <circle cx="17" cy="13" r="1.5" fill="rgba(255,255,255,0.55)"/>
        <path d="M16 31 L20 39 L24 31" fill="#f97316" opacity="0.9"/>
      </svg>
    ),
    maletin: (
      <svg width={size} height={size} viewBox="0 0 40 40" overflow="visible">
        <defs>
          <linearGradient id={`mg${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.3"/>
            <stop offset="100%" stopColor={color}/>
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="36" rx="13" ry="3" fill="rgba(0,0,0,0.25)"/>
        <rect x="7" y="17" width="26" height="17" rx="3" fill={`url(#mg${uid})`} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"/>
        <rect x="14" y="11" width="12" height="8" rx="3" fill="none" stroke={color} strokeWidth="2.5"/>
        <rect x="6" y="24" width="28" height="2.5" rx="1" fill="rgba(255,255,255,0.18)"/>
        <rect x="18" y="21" width="4" height="7" rx="1.5" fill="rgba(255,255,255,0.35)"/>
      </svg>
    ),
    sombrero: (
      <svg width={size} height={size} viewBox="0 0 40 40" overflow="visible">
        <defs>
          <radialGradient id={`sg${uid}`} cx="35%" cy="25%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35"/>
            <stop offset="100%" stopColor={color}/>
          </radialGradient>
        </defs>
        <ellipse cx="20" cy="36" rx="16" ry="4" fill="rgba(0,0,0,0.25)"/>
        <ellipse cx="20" cy="28" rx="16" ry="5" fill={`url(#sg${uid})`} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"/>
        <rect x="13" y="10" width="14" height="19" rx="4" fill={color} stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
        <ellipse cx="20" cy="10" rx="7" ry="3" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
        <path d="M14 26 Q20 24 26 26" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    barco: (
      <svg width={size} height={size} viewBox="0 0 40 40" overflow="visible">
        <defs>
          <linearGradient id={`bg${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.3"/>
            <stop offset="100%" stopColor={color}/>
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="36" rx="13" ry="3" fill="rgba(0,0,150,0.2)"/>
        <path d="M6 24 Q8 33 20 35 Q32 33 34 24 L30 18 L10 18 Z" fill={`url(#bg${uid})`} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"/>
        <rect x="19" y="5" width="2" height="14" fill="rgba(255,255,255,0.6)"/>
        <path d="M21 6 L31 14 L21 14 Z" fill="rgba(255,255,255,0.7)"/>
        <path d="M6 24 Q20 20 34 24" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none"/>
      </svg>
    ),
    trofeo: (
      <svg width={size} height={size} viewBox="0 0 40 40" overflow="visible">
        <defs>
          <radialGradient id={`tg${uid}`} cx="35%" cy="25%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.5"/>
            <stop offset="100%" stopColor={color}/>
          </radialGradient>
        </defs>
        <ellipse cx="20" cy="36" rx="10" ry="3" fill="rgba(0,0,0,0.25)"/>
        <rect x="15" y="29" width="10" height="4" rx="1" fill={color}/>
        <rect x="12" y="32" width="16" height="3" rx="1.5" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
        <path d="M13 10 Q13 27 20 29 Q27 27 27 10 Z" fill={`url(#tg${uid})`} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"/>
        <path d="M13 13 Q7 13 7 19 Q7 24 13 23" fill="none" stroke={color} strokeWidth="3"/>
        <path d="M27 13 Q33 13 33 19 Q33 24 27 23" fill="none" stroke={color} strokeWidth="3"/>
        <path d="M20 13 L21.5 16.5 L25 17 L22.5 19.5 L23 23 L20 21 L17 23 L17.5 19.5 L15 17 L18.5 16.5 Z" fill="rgba(255,255,255,0.35)"/>
      </svg>
    ),
    diamante: (
      <svg width={size} height={size} viewBox="0 0 40 40" overflow="visible">
        <defs>
          <linearGradient id={`dg${uid}`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.65"/>
            <stop offset="50%" stopColor={color}/>
            <stop offset="100%" stopColor={color} stopOpacity="0.7"/>
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="36" rx="11" ry="3" fill="rgba(0,0,0,0.2)"/>
        <path d="M20 5 L33 16 L20 35 L7 16 Z" fill={`url(#dg${uid})`} stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
        <path d="M7 16 L20 5 L33 16 Z" fill="rgba(255,255,255,0.18)"/>
        <path d="M13 16 L20 5 L27 16 L20 35 Z" fill="rgba(255,255,255,0.08)"/>
        <path d="M9 14 L20 7" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      </svg>
    ),
    rayo: (
      <svg width={size} height={size} viewBox="0 0 40 40" overflow="visible">
        <defs>
          <linearGradient id={`lg${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.5"/>
            <stop offset="100%" stopColor={color}/>
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="36" rx="10" ry="2.5" fill="rgba(0,0,0,0.2)"/>
        <path d="M25 4 L12 22 L20 22 L15 36 L29 18 L21 18 Z" fill={`url(#lg${uid})`} stroke="rgba(255,255,255,0.35)" strokeWidth="0.8"/>
        <path d="M25 4 L18 14 L22 14" fill="rgba(255,255,255,0.22)"/>
      </svg>
    ),
  }

  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      filter: `drop-shadow(0 ${Math.round(size * 0.05)}px ${Math.round(size * 0.15)}px rgba(0,0,0,0.7)) drop-shadow(0 0 ${Math.round(size * 0.1)}px ${color}88)`,
    }}>
      {shapes[type] || shapes['corona']}
    </div>
  )
}

// ─────────────────────────────────────────────
// DIE COMPONENT
// ─────────────────────────────────────────────
function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const DOTS: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 20], [72, 20], [28, 50], [72, 50], [28, 80], [72, 80]],
  }
  const dots = DOTS[value] || DOTS[1]
  return (
    <div style={{
      width: 64, height: 64, borderRadius: 14, position: 'relative', flexShrink: 0,
      background: rolling ? 'linear-gradient(145deg,#fffbeb,#fef3c7)' : 'linear-gradient(145deg,#ffffff,#f0f0f0)',
      boxShadow: rolling
        ? '0 0 0 3px #f59e0b, 0 0 32px rgba(245,158,11,1), 0 8px 20px rgba(0,0,0,0.6)'
        : '0 8px 20px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.9), inset 0 -3px 0 rgba(0,0,0,0.15)',
      border: rolling ? '3px solid #f59e0b' : '2px solid #c0c0c0',
      animation: rolling ? 'diceShake 0.09s infinite' : 'none',
      transition: 'all 0.08s',
    }}>
      {dots.map(([cx, cy], i) => (
        <div key={i} style={{
          position: 'absolute', width: 11, height: 11, borderRadius: '50%',
          background: rolling
            ? 'radial-gradient(circle at 40% 40%,#dc2626,#7f1d1d)'
            : 'radial-gradient(circle at 40% 40%,#1e293b,#0f172a)',
          top: `${cy}%`, left: `${cx}%`,
          transform: 'translate(-50%,-50%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
        }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// BOARD SQUARE
// ─────────────────────────────────────────────
function BoardSq({ sq, propState, players, myPlayer, isMyTurn, onBuild, dir, onInfo }: {
  sq: any; propState?: Property; players: Player[]; myPlayer: Player | null
  isMyTurn: boolean; onBuild?: (key: string) => void
  dir: 'top' | 'bottom' | 'left' | 'right'
  onInfo: (sq: any, ps?: Property) => void
}) {
  const isProp = 'price' in sq
  const owner = propState?.owner_id ? players.find(p => p.id === propState.owner_id) : null
  const ownerIdx = owner ? players.findIndex(p => p.id === owner.id) : -1
  const here = players.filter(p => p.position === sq.position)
  const gc = isProp ? GROUP_COLORS[sq.group] : null
  const ss = !isProp ? (SPECIAL_STYLES[sq.type] || SPECIAL_STYLES.libre) : null
  const myProp = propState?.owner_id === myPlayer?.id

  const baseBg = gc ? gc.bg : (ss?.bg || '#252545')
  const tintBg = here.length === 1
    ? `color-mix(in srgb, ${baseBg} 60%, ${PLAYER_COLORS[players.findIndex(p => p.id === here[0].id)]} 40%)`
    : here.length > 1 ? `color-mix(in srgb, ${baseBg} 85%, #fff 15%)` : baseBg

  const ttPos: Record<string, React.CSSProperties> = {
    top:    { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    left:   { left: 'calc(100% + 6px)', top: 0 },
    right:  { right: 'calc(100% + 6px)', top: 0 },
  }

  return (
    <div className="bsq" onClick={() => onInfo(sq, propState)} style={{
      background: tintBg, borderRadius: 8, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start', padding: 3,
      position: 'relative', overflow: 'visible', cursor: 'pointer', height: '100%',
      border: ss ? `1px solid ${ss.border}55` : myProp ? '1px solid rgba(245,158,11,0.5)' : '1px solid transparent',
      transition: 'filter 0.1s',
    }}>
      {/* Color band for properties */}
      {gc && <div style={{
        position: 'absolute', zIndex: 1, background: gc.band,
        ...(dir === 'bottom' ? { bottom:0, left:0, right:0, height:7, borderRadius:'0 0 8px 8px' }
          : dir === 'left'   ? { top:0, left:0, bottom:0, width:7, borderRadius:'8px 0 0 8px' }
          : dir === 'right'  ? { top:0, right:0, bottom:0, width:7, borderRadius:'0 8px 8px 0' }
          : { top:0, left:0, right:0, height:7, borderRadius:'8px 8px 0 0' }),
      }} />}

      {/* Special square top accent */}
      {ss && <div style={{
        position: 'absolute', top:0, left:0, right:0, height:5,
        background: ss.border, borderRadius:'8px 8px 0 0', opacity: 0.8,
      }} />}

      {/* Special icon */}
      {ss && (
        <div style={{ fontSize: 13, marginTop: 8, zIndex: 1, lineHeight: 1 }}>{ss.icon}</div>
      )}

      {/* Name */}
      <div style={{
        fontSize: 9.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.3, zIndex: 1,
        color: gc ? gc.text : (ss?.textColor || '#e8e8f5'),
        marginTop: gc && dir === 'top' ? 10 : ss ? 2 : 4,
        marginBottom: 1,
        ...(dir === 'left'  ? { marginLeft: 8 } : {}),
        ...(dir === 'right' ? { marginRight: 8 } : {}),
      }}>{sq.name}</div>

      {/* Price */}
      {isProp && (
        <div style={{ fontSize: 9, color: gc?.text, opacity: 0.7, textAlign: 'center', zIndex: 1 }}>
          {formatMoney(sq.price)}
        </div>
      )}

      {/* Owner dot */}
      {owner && (
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: PLAYER_COLORS[ownerIdx], marginTop: 2, zIndex: 1, boxShadow: `0 0 4px ${PLAYER_COLORS[ownerIdx]}` }} />
      )}

      {/* Player figures */}
      {here.length > 0 && (
        <div style={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', marginTop: 2, zIndex: 2 }}>
          {here.map(p => {
            const idx = players.findIndex(x => x.id === p.id)
            return <Piece3D key={p.id} type={(p as any).piece_type || 'corona'} color={PLAYER_COLORS[idx]} size={16} />
          })}
        </div>
      )}

      {/* Build button */}
      {isMyTurn && isProp && myProp && (propState?.level || 0) < 3 && (
        <button onClick={e => { e.stopPropagation(); onBuild?.(sq.key) }} style={{
          marginTop: 2, fontSize: 8, color: '#f59e0b',
          background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 4, padding: '1px 4px', cursor: 'pointer', zIndex: 2, fontWeight: 700,
        }}>+mejorar</button>
      )}

      {/* Tooltip */}
      <div className="bsq-tt" style={{
        display: 'none', position: 'absolute',
        background: '#08081f', border: `1px solid ${gc?.band || ss?.border || '#3a3a60'}`,
        borderRadius: 10, padding: '10px 12px', minWidth: 160, maxWidth: 195,
        zIndex: 100, pointerEvents: 'none',
        boxShadow: `0 12px 40px rgba(0,0,0,0.9)`,
        ...ttPos[dir],
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6, borderBottom: '0.5px solid #2a2a4a', paddingBottom: 6 }}>{sq.name}</div>
        {isProp && gc ? (
          <>
            <div style={{ display: 'inline-block', fontSize: 9, padding: '2px 7px', borderRadius: 4, background: gc.bg, color: gc.text, fontWeight: 700, marginBottom: 6 }}>
              {sq.group.charAt(0).toUpperCase() + sq.group.slice(1)}
            </div>
            {[['Precio', formatMoney(sq.price)], ['Renta', formatMoney(sq.rents[0])], ['Holding', formatMoney(sq.rents[3])]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 3 }}>
                <span style={{ color: '#888' }}>{k}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            {owner ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7, paddingTop: 6, borderTop: '0.5px solid #2a2a4a' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAYER_COLORS[ownerIdx] }} />
                <span style={{ fontSize: 11, color: '#d0d0f0' }}>{(owner as any).profiles?.username}</span>
                {(propState?.level || 0) > 0 && <span style={{ fontSize: 9, color: gc.text, marginLeft: 'auto' }}>{LEVEL_NAMES[propState!.level]}</span>}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#4ade80', marginTop: 7, paddingTop: 6, borderTop: '0.5px solid #2a2a4a' }}>✅ Libre</div>
            )}
          </>
        ) : (
          <>
            {ss && <div style={{ fontSize: 18, textAlign: 'center', marginBottom: 6 }}>{ss.icon}</div>}
            <div style={{ fontSize: 11, color: ss?.textColor || '#a0a0c0', lineHeight: 1.6 }}>
              {sq.type === 'hacienda'   ? 'Pagas el 15% de tu efectivo al banco.' :
               sq.type === 'escandalo'  ? 'Roba una carta de Escándalo.' :
               sq.type === 'subvencion' ? 'Cobras dinero del banco.' :
               sq.type === 'inspeccion' ? 'El que más propiedades tiene paga €15.000.' :
               sq.type === 'siesta'     ? '-1 turno y cobras €5.000.' :
               sq.type === 'ere'        ? 'Muévete gratis a Startup o Servicio.' :
               sq.type === 'ipo'        ? 'Una propiedad tuya +40% valor.' :
               sq.type === 'boom'       ? 'Boom turístico: cobras €35.000.' :
               sq.type === 'crack'      ? 'El líder pierde el 25% de su efectivo.' :
               sq.type === 'juzgado'    ? 'Paga €50.000 o saca dobles.' :
               sq.type === 'salida'     ? '+€20.000 al cruzarla.' :
               'No pasa nada. Solo mirando.'}
            </div>
          </>
        )}
        {here.length > 0 && (
          <div style={{ marginTop: 7, paddingTop: 6, borderTop: '0.5px solid #2a2a4a' }}>
            {here.map(p => (
              <div key={p.id} style={{ fontSize: 11, color: '#c0c0e0', marginTop: 2 }}>
                📍 {(p as any).profiles?.username || 'Jugador'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CORNER SQUARE
// ─────────────────────────────────────────────
function Corner({ type, players }: { type: string; players: Player[] }) {
  const cfg: Record<string, { icon: string; name: string; sub: string; pos: number; bg: string; border: string }> = {
    salida:     { icon: '🚀', name: 'SALIDA',    sub: '+€20.000',         pos: 0,  bg: '#001a00', border: '#22c55e' },
    juzgado:    { icon: '⚖️', name: 'JUZGADO',   sub: '€50k o dobles',    pos: 12, bg: '#1a1000', border: '#f59e0b' },
    libre:      { icon: '☕', name: 'DESCANSO',   sub: 'Solo mirando',     pos: 24, bg: '#0f0f1f', border: '#6366f1' },
    vacaciones: { icon: '🏖️', name: 'VACACIONES', sub: '+€10k -1 turno',  pos: 36, bg: '#001a1a', border: '#06b6d4' },
  }
  const c = cfg[type]
  const here = players.filter(p => p.position === c.pos)
  return (
    <div style={{ background: c.bg, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8, height: '100%', border: `1px solid ${c.border}55` }}>
      <div style={{ fontSize: 26, marginBottom: 2 }}>{c.icon}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', textAlign: 'center', letterSpacing: '0.04em' }}>{c.name}</div>
      <div style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' }}>{c.sub}</div>
      {here.length > 0 && (
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
          {here.map(p => {
            const idx = players.findIndex(x => x.id === p.id)
            return <Piece3D key={p.id} type={(p as any).piece_type || 'corona'} color={PLAYER_COLORS[idx]} size={18} />
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function GamePlay() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [rolling, setRolling] = useState(false)
  const [diceVals, setDiceVals] = useState([1, 1])
  const [log, setLog] = useState<string[]>([])
  const [modal, setModal] = useState<any>(null)
  const [popup, setPopup] = useState<any>(null)
  const [infoModal, setInfoModal] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [xpToast, setXpToast] = useState<number | null>(null)
  const [highlight, setHighlight] = useState<number | null>(null)
  const [abilityUsed, setAbilityUsed] = useState(false)
  const [uniqueUsed, setUniqueUsed] = useState(false)
  const [showTrade, setShowTrade] = useState(false)
  const [tradeTarget, setTradeTarget] = useState<string | null>(null)
  const [tradeProp, setTradeProp] = useState<string | null>(null)
  const [tradePrice, setTradePrice] = useState('')
  const [sabotageTokens, setSabotageTokens] = useState(3)
  const [lapsCompleted, setLapsCompleted] = useState(0)
  const audioRef = useRef<any>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    audioRef.current = createAudio()
    init()
    const iv = setInterval(loadAll, 2000)
    return () => clearInterval(iv)
  }, [mounted])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    await loadAll(user.id)
  }

  async function loadAll(userId?: string) {
    const { data: { user: u } } = await supabase.auth.getUser()
    const uid = userId || u?.id
    const [{ data: pData }, { data: prData }, { data: gsData }] = await Promise.all([
      supabase.from('game_players').select('*, profiles(username, avatar_url)').eq('room_id', roomId).order('turn_order'),
      supabase.from('game_properties').select('*').eq('room_id', roomId),
      supabase.from('game_state').select('*').eq('room_id', roomId).single(),
    ])
    setPlayers(pData || [])
    setProperties(prData || [])
    setGameState(gsData)
    if (uid && pData) {
      const me = pData.find((p: any) => p.user_id === uid)
      setMyPlayer(me || null)
      if (me?.sabotage_tokens !== undefined) setSabotageTokens(me.sabotage_tokens)
    }
    if (gsData?.log) setLog((gsData.log as any[]).slice(-25).map((l: any) => l.action).reverse())
    setLoading(false)
  }

  async function awardXP(uid: string, xp: number, stats: Record<string, number> = {}) {
    const { data } = await supabase.from('player_stats').select('*').eq('user_id', uid).single()
    if (!data) { await supabase.from('player_stats').insert({ user_id: uid, xp, ...stats }); return }
    const newXp = data.xp + xp
    const { level } = calculateLevel(newXp)
    const upd: Record<string, any> = { xp: newXp, level }
    for (const [k, v] of Object.entries(stats)) upd[k] = (data[k] || 0) + v
    await supabase.from('player_stats').update(upd).eq('user_id', uid)
    if (xp > 0) { setXpToast(xp); setTimeout(() => setXpToast(null), 2200) }
  }

  const isMyTurn = !!(myPlayer && gameState && gameState.current_player_id === myPlayer.id)
  const canTrade = lapsCompleted >= 5

  function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }
  function addLog(msg: string) { setLog(p => [msg, ...p].slice(0, 30)) }
  function nm(p: any): string { return p?.profiles?.username || 'Jugador' }

  // ── ROLL DICE ──
  async function rollDice() {
    if (!isMyTurn || rolling || gameState?.phase !== 'roll') return
    // Resume audio context on user gesture
    try { audioRef.current?._getCtx() } catch {}
    setRolling(true)
    audioRef.current?.diceRoll()
    const anim = setInterval(() => setDiceVals([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]), 80)
    await sleep(720)
    clearInterval(anim)
    const d1 = Math.ceil(Math.random() * 6), d2 = Math.ceil(Math.random() * 6)
    setDiceVals([d1, d2])
    audioRef.current?.diceLand()
    const total = d1 + d2
    const start = myPlayer!.position
    for (let s = 1; s <= total; s++) {
      await sleep(110)
      const sp = (start + s) % TOTAL_SQUARES
      await supabase.from('game_players').update({ position: sp }).eq('id', myPlayer!.id)
      audioRef.current?.step()
    }
    const newPos = (start + total) % TOTAL_SQUARES
    const passedGo = start + total >= TOTAL_SQUARES
    let money = myPlayer!.money
    if (passedGo) {
      money += 20000
      setLapsCompleted(l => l + 1)
      addLog(`${nm(myPlayer!)} pasa por Salida +€20.000`)
    }
    await supabase.from('game_players').update({ position: newPos, money }).eq('id', myPlayer!.id)
    await supabase.from('game_state').update({ dice_result: [d1, d2], phase: 'action' }).eq('room_id', roomId)
    addLog(`${nm(myPlayer!)} saca ${d1}+${d2}=${total}`)
    audioRef.current?.land()
    setHighlight(newPos)
    setTimeout(() => setHighlight(null), 1500)
    await handleSquare(newPos, money)
    setRolling(false)
  }

  // ── HANDLE SQUARE ──
  async function handleSquare(pos: number, money: number) {
    const sq = getSquareAtPosition(pos)
    if (!sq) { await endTurn(); return }
    if ('price' in sq) {
      const prop = properties.find(p => p.property_key === sq.key)
      if (!prop || !prop.owner_id) {
        setPopup({ type: 'buy_prompt', sq, icon: '🏢', color: GROUP_COLORS[sq.group].band })
        await sleep(1600); setPopup(null)
        setModal({ type: 'buy', square: sq })
      } else if (prop.owner_id !== myPlayer!.id) {
        const owner = players.find(p => p.id === prop.owner_id)!
        const ownerProps = properties.filter(p => p.owner_id === owner.id).map(p => p.property_key)
        let rent = calculateRent(sq, prop.level, ownerProps, prop.bubble_active, gameState?.ipc_bonus || false, owner.role)
        if (myPlayer!.role === 'sindicalista') rent = Math.floor(rent * 0.7)
        setPopup({ type: 'rent', sq, rent, ownerName: nm(owner), icon: '💸', color: '#dc2626' })
        audioRef.current?.rent()
        await supabase.from('game_players').update({ money: money - rent }).eq('id', myPlayer!.id)
        await supabase.from('game_players').update({ money: owner.money + rent }).eq('id', owner.id)
        addLog(`${nm(myPlayer!)} paga ${formatMoney(rent)} a ${nm(owner)}`)
        if (user) await awardXP(owner.user_id, XP_REWARDS.rent_collected, { rents_collected: 1 })
        await sleep(2200); setPopup(null); await endTurn()
      } else {
        setPopup({ type: 'own', sq, icon: '✅', color: '#22c55e' })
        await sleep(1400); setPopup(null); await endTurn()
      }
    } else {
      const ss = SPECIAL_STYLES[sq.type] || SPECIAL_STYLES.libre
      setPopup({ type: 'special', sq, icon: ss.icon, color: ss.border })
      await sleep(1400); setPopup(null)
      await handleSpecial(sq, money)
    }
  }

  async function handleSpecial(sq: any, money: number) {
    switch (sq.type) {
      case 'hacienda': {
        const t = Math.floor(money * (myPlayer!.role === 'asesor' ? 0.098 : 0.15))
        await supabase.from('game_players').update({ money: money - t }).eq('id', myPlayer!.id)
        addLog(`${nm(myPlayer!)} paga ${formatMoney(t)} a Hacienda`); await endTurn(); break
      }
      case 'juzgado': {
        await supabase.from('game_players').update({ in_jail: true }).eq('id', myPlayer!.id)
        addLog(`${nm(myPlayer!)} va al Juzgado`); await endTurn(); break
      }
      case 'siesta': {
        await supabase.from('game_players').update({ money: money + 5000 }).eq('id', myPlayer!.id)
        addLog(`${nm(myPlayer!)} Siesta +€5.000`); await endTurn(); break
      }
      case 'vacaciones': {
        await supabase.from('game_players').update({ money: money + 10000 }).eq('id', myPlayer!.id)
        addLog(`${nm(myPlayer!)} Vacaciones +€10.000`); await endTurn(); break
      }
      case 'subvencion': {
        const amt = sq.key === 'subvencion3' ? 30000 : 40000
        await supabase.from('game_players').update({ money: money + amt }).eq('id', myPlayer!.id)
        addLog(`${nm(myPlayer!)} Subvención +${formatMoney(amt)}`); await endTurn(); break
      }
      case 'boom': {
        await supabase.from('game_players').update({ money: money + 35000 }).eq('id', myPlayer!.id)
        addLog(`${nm(myPlayer!)} Boom Turístico +€35.000`); await endTurn(); break
      }
      case 'inspeccion': {
        const r = [...players].sort((a, b) => b.money - a.money)[0]
        await supabase.from('game_players').update({ money: r.money - 15000 }).eq('id', r.id)
        addLog(`Inspección: ${nm(r)} paga €15.000`); await endTurn(); break
      }
      case 'escandalo':
      case 'crack': {
        const card = ESCANDALO_CARDS[Math.floor(Math.random() * ESCANDALO_CARDS.length)]
        if (user) await awardXP(user.id, XP_REWARDS.card_played, { cards_played: 1 })
        setModal({ type: 'card', card }); break
      }
      case 'ere': setModal({ type: 'ere' }); break
      case 'ipo': setModal({ type: 'ipo' }); break
      default: await endTurn()
    }
  }

  async function buyProperty(sq: any) {
    if (!myPlayer || myPlayer.money < sq.price) { setModal(null); await endTurn(); return }
    const existing = properties.find(p => p.property_key === sq.key)
    if (existing) await supabase.from('game_properties').update({ owner_id: myPlayer.id }).eq('id', existing.id)
    else await supabase.from('game_properties').insert({ room_id: roomId, property_key: sq.key, owner_id: myPlayer.id, level: 0 })
    let price = sq.price
    if (myPlayer.role === 'asesor') price = Math.floor(price * 0.8)
    await supabase.from('game_players').update({ money: myPlayer.money - price }).eq('id', myPlayer.id)
    if (user) await awardXP(user.id, XP_REWARDS.property_bought, { properties_bought: 1 })
    audioRef.current?.buy()
    addLog(`${nm(myPlayer)} compra ${sq.name} por ${formatMoney(price)}`)
    const influencer = players.find(p => p.role === 'influencer' && p.id !== myPlayer.id)
    if (influencer) {
      await supabase.from('game_players').update({ money: influencer.money + 5000 }).eq('id', influencer.id)
      addLog(`${nm(influencer)} cobra €5.000 (Influencer)`)
    }
    const myProps = [...properties.filter(p => p.owner_id === myPlayer.id).map(p => p.property_key), sq.key]
    if (hasMonopoly(myProps, sq.group)) {
      addLog(`🏆 ${nm(myPlayer)} completa MONOPOLIO ${sq.group.toUpperCase()}! +50% rentas`)
      setPopup({ type: 'monopoly', group: sq.group, icon: '🏆', color: GROUP_COLORS[sq.group].band })
      await sleep(2500); setPopup(null)
    }
    setModal(null); await endTurn()
  }

  async function buildImprovement(key: string) {
    const prop = properties.find(p => p.property_key === key)
    const def = PROPERTIES.find(p => p.key === key)
    if (!prop || !def || !myPlayer || prop.level >= 3) return
    const myProps = properties.filter(p => p.owner_id === myPlayer.id).map(p => p.property_key)
    if (PROPERTY_GROUPS[def.group].filter(k => myProps.includes(k)).length < 2 && !hasMonopoly(myProps, def.group)) {
      setModal({ type: 'error', msg: 'Necesitas al menos 2 propiedades del mismo grupo.' }); return
    }
    const cost = def.buildCosts[prop.level]
    if (myPlayer.money < cost) { setModal({ type: 'error', msg: `Necesitas ${formatMoney(cost)}.` }); return }
    await supabase.from('game_properties').update({ level: prop.level + 1 }).eq('id', prop.id)
    await supabase.from('game_players').update({ money: myPlayer.money - cost }).eq('id', myPlayer.id)
    addLog(`${nm(myPlayer)} construye ${LEVEL_NAMES[prop.level + 1]} en ${def.name}`)
    await loadAll()
  }

  async function useActiveAbility() {
    if (!myPlayer || !isMyTurn || abilityUsed) return
    audioRef.current?.ability()
    const role = myPlayer.role as keyof typeof ROLES_DEF
    switch (role) {
      case 'saboteador': if (sabotageTokens <= 0) { setModal({ type: 'error', msg: 'Sin fichas de sabotaje.' }); return }; setModal({ type: 'ability_sabotaje' }); break
      case 'negociador': setModal({ type: 'ability_fusion' }); break
      case 'especulador': setModal({ type: 'ability_burbuja' }); break
      case 'asesor': {
        const amount = Math.min(100000, myPlayer.money)
        await supabase.from('game_players').update({ money: myPlayer.money - amount, offshore_money: (myPlayer.offshore_money || 0) + amount }).eq('id', myPlayer.id)
        addLog(`${nm(myPlayer)} mueve ${formatMoney(amount)} a Offshore 🔒`)
        setPopup({ type: 'ability', label: 'OFFSHORE ACTIVADO', icon: '🔒', color: '#22c55e' })
        await sleep(2000); setPopup(null); setAbilityUsed(true); break
      }
      case 'sindicalista': setModal({ type: 'ability_huelga' }); break
      case 'influencer': {
        let total = 0
        for (const p of players) {
          if (p.id !== myPlayer.id && p.money >= 15000) {
            await supabase.from('game_players').update({ money: p.money - 15000 }).eq('id', p.id)
            total += 15000
          }
        }
        await supabase.from('game_players').update({ money: myPlayer.money + total }).eq('id', myPlayer.id)
        addLog(`${nm(myPlayer)} activa VIRAL 📣 +${formatMoney(total)}`)
        setPopup({ type: 'ability', label: `VIRAL! +${formatMoney(total)}`, icon: '📣', color: '#ec4899' })
        await sleep(2000); setPopup(null); setAbilityUsed(true); break
      }
    }
  }

  async function useUniqueAbility() {
    if (!myPlayer || !isMyTurn || uniqueUsed) return
    audioRef.current?.ability()
    const role = myPlayer.role as keyof typeof ROLES_DEF
    switch (role) {
      case 'saboteador': setModal({ type: 'unique_viral' }); break
      case 'negociador': {
        const myProps = properties.filter(p => p.owner_id === myPlayer.id && p.level < 3)
        if (myProps.length === 0) { setModal({ type: 'error', msg: 'Sin propiedades para mejorar.' }); return }
        setModal({ type: 'unique_mejora', props: myProps }); break
      }
      case 'especulador': {
        const myProps = properties.filter(p => p.owner_id === myPlayer.id)
        if (myProps.length === 0) { setModal({ type: 'error', msg: 'Sin propiedades.' }); return }
        setModal({ type: 'unique_pelotazo', props: myProps }); break
      }
      case 'asesor': {
        addLog(`${nm(myPlayer)} activa Evasión Total 🛡️`)
        setPopup({ type: 'ability', label: 'EVASIÓN TOTAL', icon: '🛡️', color: '#22c55e' })
        await sleep(2000); setPopup(null); setUniqueUsed(true); break
      }
      case 'sindicalista': setModal({ type: 'unique_huelga_general' }); break
      case 'influencer': setModal({ type: 'unique_patrocinio' }); break
    }
  }

  async function proposeTrade() {
    if (!tradeTarget || !tradeProp || !tradePrice) return
    const price = parseInt(tradePrice)
    if (isNaN(price) || price <= 0) return
    const buyer = players.find(p => p.id === tradeTarget)
    if (!buyer || buyer.money < price) { setModal({ type: 'error', msg: 'El rival no tiene suficiente dinero.' }); return }
    const prop = properties.find(p => p.property_key === tradeProp)
    if (!prop) return
    const def = PROPERTIES.find(d => d.key === tradeProp)
    await supabase.from('game_properties').update({ owner_id: tradeTarget }).eq('id', prop.id)
    await supabase.from('game_players').update({ money: myPlayer!.money + price }).eq('id', myPlayer!.id)
    await supabase.from('game_players').update({ money: buyer.money - price }).eq('id', tradeTarget)
    addLog(`💱 ${nm(myPlayer!)} vende ${def?.name} a ${nm(buyer)} por ${formatMoney(price)}`)
    setShowTrade(false); setTradeTarget(null); setTradeProp(null); setTradePrice('')
    await loadAll()
  }

  async function endTurn() {
    const active = players.filter(p => !p.is_bankrupt)
    const ci = active.findIndex(p => p.id === gameState?.current_player_id)
    const next = active[(ci + 1) % active.length]
    const newRound = (ci + 1) % active.length === 0 ? (gameState!.current_round || 1) + 1 : gameState!.current_round || 1
    for (const p of players) {
      if (calculateNetWorth(p, properties) >= 1000000) {
        if (user) await awardXP(user.id, XP_REWARDS.game_won, { games_won: 1, games_played: 1 })
        setModal({ type: 'winner', player: p })
        await supabase.from('game_rooms').update({ status: 'finished' }).eq('id', roomId); return
      }
    }
    setAbilityUsed(false)
    await supabase.from('game_state').update({
      current_player_id: next.id,
      current_turn: (gameState!.current_turn || 1) + 1,
      current_round: newRound, phase: 'roll',
      log: [...(gameState!.log as any[] || []), ...log.map(l => ({ action: l, timestamp: new Date().toISOString() }))].slice(-50),
    }).eq('room_id', roomId)
  }

  // Board layout for 48 squares
  // Corners: 0=Salida, 12=Juzgado, 24=Libre, 36=Vacaciones
  // Bottom: 1-11, Right: 13-23, Top: 25-35, Left: 37-47
  const allSq = [...PROPERTIES, ...SPECIAL_SQUARES].sort((a, b) => a.position - b.position)
  const bottomRow = allSq.filter(s => s.position >= 1  && s.position <= 11).sort((a, b) => a.position - b.position)
  const rightCol  = allSq.filter(s => s.position >= 13 && s.position <= 23).sort((a, b) => b.position - a.position)
  const topRow    = allSq.filter(s => s.position >= 25 && s.position <= 35).sort((a, b) => b.position - a.position)
  const leftCol   = allSq.filter(s => s.position >= 37 && s.position <= 47).sort((a, b) => a.position - b.position)

  const myProps = properties.filter(p => p.owner_id === myPlayer?.id)
  const myPropsKeys = myProps.map(p => p.property_key)
  const currentPlayer = players.find(p => p.id === gameState?.current_player_id)
  const roleDef = myPlayer?.role ? ROLES_DEF[myPlayer.role as Role] : null

  const monopolyStatus = Object.keys(PROPERTY_GROUPS).map(g => ({
    group: g,
    has: hasMonopoly(myPropsKeys, g),
    count: PROPERTY_GROUPS[g].filter(k => myPropsKeys.includes(k)).length,
    total: PROPERTY_GROUPS[g].length,
  }))

  if (!mounted || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030712' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎲</div>
        <p style={{ color: '#6366f1', fontSize: 16, fontWeight: 600 }}>Cargando partida...</p>
      </div>
    </div>
  )

  return (
    <main style={{ background: '#030712', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes diceShake { 0%,100%{transform:rotate(-12deg) scale(1.08)} 50%{transform:rotate(12deg) scale(1.08)} }
        @keyframes xpFloat { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-60px) scale(1.4)} }
        @keyframes popIn { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.5)} 60%{transform:translate(-50%,-50%) scale(1.08)} 100%{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideIn { 0%{transform:translateX(100%);opacity:0} 100%{transform:translateX(0);opacity:1} }
        .bsq:hover { filter: brightness(1.15) !important; }
        .bsq:hover .bsq-tt { display: block !important; }
        .bsq { transition: filter 0.12s; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f0f1f; }
        ::-webkit-scrollbar-thumb { background: #3a3a6a; border-radius: 2px; }
      `}</style>

      {/* XP Toast */}
      {xpToast && (
        <div style={{ position: 'fixed', top: 70, right: 20, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'black', borderRadius: 12, padding: '8px 18px', fontWeight: 800, fontSize: 16, zIndex: 300, animation: 'xpFloat 2.2s forwards', pointerEvents: 'none', boxShadow: '0 4px 20px rgba(245,158,11,0.6)' }}>
          ⭐ +{xpToast} XP
        </div>
      )}

      {/* Landing popup */}
      {popup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            animation: 'popIn 0.35s ease forwards',
            background: popup.type === 'rent' ? '#1a0000' : popup.type === 'monopoly' ? '#1a1000' : popup.type === 'ability' ? '#001a00' : '#0a0a1a',
            border: `2px solid ${popup.color}`,
            borderRadius: 20, padding: '24px 36px', minWidth: 240, textAlign: 'center',
            boxShadow: `0 0 40px ${popup.color}88, 0 20px 60px rgba(0,0,0,0.9)`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{popup.icon}</div>
            {popup.type === 'rent' && <>
              <div style={{ fontSize: 14, color: '#fca5a5', fontWeight: 600, marginBottom: 4 }}>Caes en {popup.sq.name}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>−{formatMoney(popup.rent)}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Renta a {popup.ownerName}</div>
            </>}
            {popup.type === 'buy_prompt' && <>
              <div style={{ fontSize: 14, color: '#e8e8f5', fontWeight: 600, marginBottom: 4 }}>Caes en {popup.sq.name}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: popup.color }}>Propiedad libre</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 4 }}>{formatMoney(popup.sq.price)}</div>
            </>}
            {popup.type === 'own' && <>
              <div style={{ fontSize: 14, color: '#86efac', fontWeight: 600 }}>Caes en {popup.sq.name}</div>
              <div style={{ fontSize: 16, color: '#4ade80', marginTop: 4 }}>Tu propiedad 🏠</div>
            </>}
            {popup.type === 'special' && <>
              <div style={{ fontSize: 18, color: popup.color, fontWeight: 700 }}>{popup.sq.name}</div>
            </>}
            {popup.type === 'monopoly' && <>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>¡MONOPOLIO!</div>
              <div style={{ fontSize: 14, color: '#fcd34d', marginTop: 4 }}>{popup.group?.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Rentas base +50%</div>
            </>}
            {popup.type === 'ability' && <>
              <div style={{ fontSize: 20, fontWeight: 800, color: popup.color }}>{popup.label}</div>
            </>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100vh' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: 205, background: '#080818', borderRight: '1px solid #1a1a3a', display: 'flex', flexDirection: 'column', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🎲</span>
            <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 15 }}>Iberiópolis</span>
          </div>
          <div style={{ fontSize: 11, color: '#4444aa', marginBottom: 12, fontWeight: 600 }}>RONDA {gameState?.current_round} · TURNO {gameState?.current_turn}</div>

          {players.map((p, i) => {
            const nw = calculateNetWorth(p, properties)
            const pct = Math.min((nw / 1000000) * 100, 100)
            const isCurr = p.id === gameState?.current_player_id
            return (
              <div key={p.id} style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: isCurr ? '#0f0f2a' : '#0a0a18', border: isCurr ? `2px solid ${PLAYER_COLORS[i]}` : '1px solid #1a1a3a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <Piece3D type={(p as any).piece_type || PIECE_TYPES[i % PIECE_TYPES.length].key} color={PLAYER_COLORS[i]} size={24} />
                  <span style={{ fontSize: 12, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nm(p)}</span>
                  {isCurr && <span style={{ color: PLAYER_COLORS[i], fontSize: 12, animation: 'pulse 1s infinite' }}>▶</span>}
                </div>
                <div style={{ fontSize: 10, color: ROLES_DEF[p.role as Role]?.textColor || '#888', marginBottom: 3 }}>{ROLES_DEF[p.role as Role]?.name}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{formatMoney(p.money)}</div>
                <div style={{ fontSize: 10, color: '#4a4a8a' }}>Pat: {formatMoney(nw)}</div>
                <div style={{ height: 4, background: '#1a1a3a', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${PLAYER_COLORS[i]}88,${PLAYER_COLORS[i]})`, borderRadius: 2, transition: 'width 0.6s', boxShadow: `0 0 6px ${PLAYER_COLORS[i]}` }} />
                </div>
                <div style={{ fontSize: 9, color: '#333366', textAlign: 'right', marginTop: 2 }}>{Math.round(pct)}% meta</div>
              </div>
            )
          })}

          {/* Role panel */}
          {roleDef && (
            <div style={{ marginTop: 12, borderTop: '1px solid #1a1a3a', paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: roleDef.textColor, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: roleDef.textColor, boxShadow: `0 0 6px ${roleDef.textColor}` }} />
                {roleDef.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 10, color: '#4a4a8a', lineHeight: 1.5, marginBottom: 10, padding: '6px 8px', background: '#0a0a18', borderRadius: 6, borderLeft: `2px solid ${roleDef.textColor}44` }}>
                {(ROLES_DEF[myPlayer!.role as Role] as any).passiveDesc || roleDef.passive}
              </div>
              {isMyTurn && (
                <>
                  <button onClick={useActiveAbility} disabled={abilityUsed} style={{ width: '100%', background: abilityUsed ? '#1a1a2a' : `linear-gradient(135deg,${roleDef.color},${roleDef.color}dd)`, border: `1px solid ${abilityUsed ? '#333' : roleDef.textColor}`, borderRadius: 8, padding: '8px 10px', cursor: abilityUsed ? 'not-allowed' : 'pointer', marginBottom: 6, textAlign: 'left', opacity: abilityUsed ? 0.4 : 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: abilityUsed ? '#555' : roleDef.textColor, marginBottom: 2 }}>⚡ ACTIVA</div>
                    <div style={{ fontSize: 10, color: abilityUsed ? '#444' : roleDef.textColor, opacity: 0.85, lineHeight: 1.4 }}>{roleDef.active}</div>
                    {abilityUsed && <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>Usada este turno</div>}
                  </button>
                  <button onClick={useUniqueAbility} disabled={uniqueUsed} style={{ width: '100%', background: uniqueUsed ? '#1a1a2a' : '#0f0f20', border: `1px solid ${uniqueUsed ? '#333' : roleDef.textColor}88`, borderRadius: 8, padding: '8px 10px', cursor: uniqueUsed ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: uniqueUsed ? 0.3 : 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: uniqueUsed ? '#555' : '#f59e0b', marginBottom: 2 }}>✦ ÚNICA</div>
                    <div style={{ fontSize: 10, color: uniqueUsed ? '#444' : '#aaa', lineHeight: 1.4 }}>{roleDef.unique}</div>
                    {uniqueUsed && <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>Usada esta partida</div>}
                  </button>
                </>
              )}
              {!isMyTurn && (
                <div style={{ fontSize: 10, color: '#4a4a8a', textAlign: 'center', padding: 6, background: '#0a0a18', borderRadius: 6 }}>Habilidades disponibles en tu turno</div>
              )}
            </div>
          )}
        </div>

        {/* ── CENTER BOARD ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 'min(calc(100vh - 80px), calc(100vw - 430px))',
              aspectRatio: '1',
              display: 'grid',
              gridTemplateColumns: '96px repeat(11,1fr) 96px',
              gridTemplateRows: '96px repeat(11,1fr) 96px',
              gap: 2,
              background: 'linear-gradient(135deg,#0a0a1f,#050518,#0a0a1f)',
              borderRadius: 16, padding: 6,
              border: '1px solid #1a1a4a',
              boxShadow: '0 0 60px rgba(99,102,241,0.15)',
            }}>
              {/* TL: vacaciones pos=36 */}
              <div style={{ gridColumn: 1, gridRow: 1 }}><Corner type="vacaciones" players={players} /></div>

              {/* Top row: pos 35→25 */}
              {topRow.map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return (
                  <div key={sq.key} style={{ gridColumn: i + 2, gridRow: 1, outline: highlight === sq.position ? '2px solid #f59e0b' : 'none', borderRadius: 8 }}>
                    <BoardSq sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={isMyTurn} onBuild={buildImprovement} dir="top" onInfo={(s, ps) => setInfoModal({ sq: s, propState: ps, owner: ps?.owner_id ? players.find(p => p.id === ps.owner_id) : null })} />
                  </div>
                )
              })}

              {/* TR: libre pos=24 */}
              <div style={{ gridColumn: 13, gridRow: 1 }}><Corner type="libre" players={players} /></div>

              {/* Right col: pos 23→13 */}
              {rightCol.map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return (
                  <div key={sq.key} style={{ gridColumn: 13, gridRow: i + 2, outline: highlight === sq.position ? '2px solid #f59e0b' : 'none', borderRadius: 8 }}>
                    <BoardSq sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={isMyTurn} onBuild={buildImprovement} dir="right" onInfo={(s, ps) => setInfoModal({ sq: s, propState: ps, owner: ps?.owner_id ? players.find(p => p.id === ps.owner_id) : null })} />
                  </div>
                )
              })}

              {/* Center */}
              <div style={{ gridColumn: '2/13', gridRow: '2/13', background: 'linear-gradient(135deg,#08081a,#0d0d22,#08081a)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, border: '1px solid #1a1a4a', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: '80%', height: '80%', borderRadius: '50%', border: '1px solid #1a1a4a', opacity: 0.3 }} />
                <div style={{ position: 'absolute', width: '55%', height: '55%', borderRadius: '50%', border: '1px solid #2a2a6a', opacity: 0.3 }} />
                <div style={{ fontSize: 26, fontWeight: 800, color: '#f59e0b', textShadow: '0 0 30px rgba(245,158,11,0.5)' }}>Iberiópolis</div>
                <div style={{ fontSize: 11, color: '#4a4a8a' }}>Objetivo: €1.000.000</div>
                {/* Dice center */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Die value={diceVals[0]} rolling={rolling} />
                  {isMyTurn && gameState?.phase === 'roll' ? (
                    <button onClick={rollDice} disabled={rolling} style={{ background: rolling ? '#1a1a2a' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: rolling ? '#666' : 'black', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 800, cursor: rolling ? 'not-allowed' : 'pointer', fontSize: 15, boxShadow: rolling ? 'none' : '0 0 20px rgba(245,158,11,0.6)' }}>
                      {rolling ? '🎲 Lanzando...' : '🎲 TIRAR'}
                    </button>
                  ) : (
                    <div style={{ fontSize: 11, color: '#333366', textAlign: 'center', padding: '0 8px' }}>
                      {currentPlayer ? <>Turno de<br /><strong style={{ color: '#6366f1' }}>{nm(currentPlayer)}</strong></> : '—'}
                    </div>
                  )}
                  <Die value={diceVals[1]} rolling={rolling} />
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {Object.entries(GROUP_COLORS).map(([g, c]) => (
                    <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#6666aa' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: c.band }} />
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </div>
                  ))}
                </div>
                {/* Player pieces */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {players.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Piece3D type={(p as any).piece_type || PIECE_TYPES[i % PIECE_TYPES.length].key} color={PLAYER_COLORS[i]} size={24} />
                      <span style={{ fontSize: 9, color: '#4a4a8a' }}>{nm(p)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* BR: juzgado pos=12 */}
              <div style={{ gridColumn: 13, gridRow: 13 }}><Corner type="juzgado" players={players} /></div>

              {/* Bottom row: pos 8→1 reversed so col 12→2 */}
              {[...bottomRow].reverse().map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return (
                  <div key={sq.key} style={{ gridColumn: 12 - i, gridRow: 13, outline: highlight === sq.position ? '2px solid #f59e0b' : 'none', borderRadius: 8 }}>
                    <BoardSq sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={isMyTurn} onBuild={buildImprovement} dir="bottom" onInfo={(s, ps) => setInfoModal({ sq: s, propState: ps, owner: ps?.owner_id ? players.find(p => p.id === ps.owner_id) : null })} />
                  </div>
                )
              })}

              {/* BL: salida pos=0 */}
              <div style={{ gridColumn: 1, gridRow: 13 }}><Corner type="salida" players={players} /></div>

              {/* Left col: pos 37→47, rows 12→2 */}
              {leftCol.map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return (
                  <div key={sq.key} style={{ gridColumn: 1, gridRow: 12 - i, outline: highlight === sq.position ? '2px solid #f59e0b' : 'none', borderRadius: 8 }}>
                    <BoardSq sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={isMyTurn} onBuild={buildImprovement} dir="left" onInfo={(s, ps) => setInfoModal({ sq: s, propState: ps, owner: ps?.owner_id ? players.find(p => p.id === ps.owner_id) : null })} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid #1a1a3a', padding: '8px 16px', background: '#080818', flexShrink: 0 }}>
            {myPlayer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#4a4a8a', fontWeight: 600 }}>TU DINERO</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{formatMoney(myPlayer.money)}</div>
                </div>
                {(myPlayer.offshore_money || 0) > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>OFFSHORE 🔒</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{formatMoney(myPlayer.offshore_money || 0)}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10, color: '#4a4a8a', fontWeight: 600 }}>CASILLA</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{myPlayer.position}</div>
                </div>
                <div style={{ fontSize: 10, color: '#4a4a8a' }}>
                  Vueltas: <strong style={{ color: canTrade ? '#22c55e' : '#f59e0b' }}>{lapsCompleted}</strong>/5
                  {canTrade && <span style={{ color: '#22c55e', marginLeft: 6 }}>✅ Mercado abierto</span>}
                </div>
                {canTrade && isMyTurn && (
                  <button onClick={() => setShowTrade(true)} style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    💱 Mercado
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ width: 215, background: '#080818', borderLeft: '1px solid #1a1a3a', padding: 12, overflowY: 'auto', flexShrink: 0, animation: 'slideIn 0.4s ease' }}>

          {/* Monopoly status */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 8, letterSpacing: '0.05em' }}>MONOPOLIOS</div>
            {monopolyStatus.map(({ group, has, count, total }) => {
              const gc = GROUP_COLORS[group]
              return (
                <div key={group} style={{ marginBottom: 6, padding: '6px 8px', background: has ? gc.dark : '#0a0a18', borderRadius: 8, border: `1px solid ${has ? gc.band : '#1a1a3a'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: has ? gc.band : '#4a4a8a' }}>{has && '🏆 '}{group.charAt(0).toUpperCase() + group.slice(1)}</span>
                    <span style={{ fontSize: 11, color: has ? gc.band : '#333366', fontWeight: 700 }}>{count}/{total}</span>
                  </div>
                  <div style={{ height: 3, background: '#1a1a3a', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / total) * 100}%`, background: gc.band, borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                  {has && <div style={{ fontSize: 9, color: gc.text, marginTop: 2 }}>{getMonopolyBonus(group)}</div>}
                </div>
              )
            })}
          </div>

          {/* My properties */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 8, letterSpacing: '0.05em' }}>MIS PROPIEDADES ({myProps.length})</div>
            {myProps.length === 0 ? (
              <div style={{ fontSize: 11, color: '#333366', textAlign: 'center', padding: '12px 0' }}>Sin propiedades aún</div>
            ) : myProps.map(p => {
              const def = PROPERTIES.find(d => d.key === p.property_key)
              if (!def) return null
              const gc = GROUP_COLORS[def.group]
              const inMono = hasMonopoly(myPropsKeys, def.group)
              return (
                <div key={p.id} style={{ marginBottom: 6, padding: '7px 9px', background: '#0a0a18', borderRadius: 8, borderLeft: `3px solid ${gc.band}`, border: `1px solid ${inMono ? gc.band + '55' : '#1a1a3a'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#e0e0ff' }}>{def.name}</span>
                    {inMono && <span style={{ fontSize: 9 }}>🏆</span>}
                  </div>
                  <div style={{ fontSize: 10, color: gc.text, marginTop: 1 }}>{LEVEL_NAMES[p.level]}</div>
                  <div style={{ fontSize: 10, color: '#4a4a8a', marginTop: 1 }}>
                    Renta: <span style={{ color: '#22c55e', fontWeight: 700 }}>{formatMoney(def.rents[p.level])}</span>
                  </div>
                  {p.level < 3 && isMyTurn && (
                    <button onClick={() => buildImprovement(p.property_key)} style={{ width: '100%', marginTop: 4, fontSize: 9, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4, padding: '2px 0', cursor: 'pointer', fontWeight: 600 }}>
                      + {LEVEL_NAMES[p.level + 1]} ({formatMoney(def.buildCosts[p.level])})
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Log */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 8, letterSpacing: '0.05em' }}>LOG</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {log.map((e, i) => (
                <div key={i} style={{ fontSize: 10, color: i === 0 ? '#a0a0ff' : '#333366', lineHeight: 1.4, padding: '3px 0', borderBottom: '0.5px solid #0f0f2a' }}>{e}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TRADE MODAL ── */}
      {showTrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#080818', border: '1px solid #2563eb', borderRadius: 16, padding: '1.5rem', maxWidth: 420, width: '90%', boxShadow: '0 0 40px rgba(37,99,235,0.3)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa', marginBottom: 16 }}>💱 Mercado de Traspasos</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#4a4a8a', display: 'block', marginBottom: 5 }}>Vender a:</label>
              <select value={tradeTarget || ''} onChange={e => setTradeTarget(e.target.value)} style={{ width: '100%', background: '#0f0f20', border: '1px solid #2a2a5a', color: 'white', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                <option value="">Selecciona jugador...</option>
                {players.filter(p => p.id !== myPlayer?.id).map(p => (
                  <option key={p.id} value={p.id}>{nm(p)} — {formatMoney(p.money)}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#4a4a8a', display: 'block', marginBottom: 5 }}>Propiedad a vender:</label>
              <select value={tradeProp || ''} onChange={e => setTradeProp(e.target.value)} style={{ width: '100%', background: '#0f0f20', border: '1px solid #2a2a5a', color: 'white', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                <option value="">Selecciona propiedad...</option>
                {myProps.map(p => {
                  const def = PROPERTIES.find(d => d.key === p.property_key)
                  return <option key={p.id} value={p.property_key}>{def?.name} (val. {formatMoney(def?.price || 0)})</option>
                })}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#4a4a8a', display: 'block', marginBottom: 5 }}>Precio de venta:</label>
              <input type="number" value={tradePrice} onChange={e => setTradePrice(e.target.value)} placeholder="€0" style={{ width: '100%', background: '#0f0f20', border: '1px solid #2a2a5a', color: 'white', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={proposeTrade} style={{ flex: 1, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: 8, padding: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Vender</button>
              <button onClick={() => setShowTrade(false)} style={{ flex: 1, background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── INFO MODAL (click on square) ── */}
      {infoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 55 }} onClick={() => setInfoModal(null)}>
          <div style={{ background: '#08081a', border: `2px solid ${'price' in infoModal.sq ? GROUP_COLORS[infoModal.sq.group]?.band : SPECIAL_STYLES[infoModal.sq.type]?.border || '#3a3a6a'}`, borderRadius: 18, padding: '22px 26px', maxWidth: 340, width: '90%' }} onClick={e => e.stopPropagation()}>
            {'price' in infoModal.sq ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: GROUP_COLORS[infoModal.sq.group]?.band, boxShadow: `0 0 8px ${GROUP_COLORS[infoModal.sq.group]?.band}` }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: GROUP_COLORS[infoModal.sq.group]?.band, margin: 0 }}>{infoModal.sq.name}</h3>
                </div>
                <div style={{ background: GROUP_COLORS[infoModal.sq.group]?.bg, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  {[['Precio', formatMoney(infoModal.sq.price)], ['Renta base', formatMoney(infoModal.sq.rents[0])], ['Oficina', formatMoney(infoModal.sq.rents[1])], ['Sede Regional', formatMoney(infoModal.sq.rents[2])], ['Holding Nacional', formatMoney(infoModal.sq.rents[3])]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                      <span style={{ color: GROUP_COLORS[infoModal.sq.group]?.text, opacity: 0.7 }}>{k}</span>
                      <span style={{ color: GROUP_COLORS[infoModal.sq.group]?.text, fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
                {infoModal.propState?.level > 0 && <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Nivel: <strong style={{ color: '#fff' }}>{LEVEL_NAMES[infoModal.propState.level]}</strong></div>}
                {infoModal.owner ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f0f20', borderRadius: 8, padding: '9px 12px', marginBottom: 12 }}>
                    <Piece3D type={(infoModal.owner as any).piece_type || 'corona'} color={PLAYER_COLORS[players.findIndex(p => p.id === infoModal.owner.id)]} size={22} />
                    <span style={{ fontSize: 13 }}>Dueño: <strong>{nm(infoModal.owner)}</strong></span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#22c55e', background: '#052e1633', borderRadius: 8, padding: '9px 12px', textAlign: 'center', marginBottom: 12 }}>✅ Libre — disponible para comprar</div>
                )}
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 40 }}>{SPECIAL_STYLES[infoModal.sq.type]?.icon || '⭐'}</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '8px 0 0' }}>{infoModal.sq.name}</h3>
                  <div style={{ display: 'inline-block', fontSize: 10, padding: '2px 10px', borderRadius: 20, background: SPECIAL_STYLES[infoModal.sq.type]?.bg, color: SPECIAL_STYLES[infoModal.sq.type]?.textColor, border: `1px solid ${SPECIAL_STYLES[infoModal.sq.type]?.border}`, marginTop: 6 }}>
                    {SPECIAL_STYLES[infoModal.sq.type]?.label}
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#7070a0', lineHeight: 1.7, textAlign: 'center' }}>
                  {infoModal.sq.type === 'hacienda'   ? 'Pagas el 15% de tu efectivo al banco. El Asesor Fiscal solo paga el 9,8%.' :
                   infoModal.sq.type === 'escandalo'  ? 'Roba una carta del mazo rojo de Escándalo Nacional.' :
                   infoModal.sq.type === 'subvencion' ? 'Cobras dinero del banco sin condiciones.' :
                   infoModal.sq.type === 'inspeccion' ? 'El jugador con más propiedades paga €15.000 al banco.' :
                   infoModal.sq.type === 'siesta'     ? 'Pierdes un turno pero cobras €5.000 del banco.' :
                   infoModal.sq.type === 'vacaciones' ? 'Pierdes un turno pero cobras €10.000 del banco.' :
                   infoModal.sq.type === 'ere'        ? 'Muévete gratis a cualquier Startup o Servicio del tablero.' :
                   infoModal.sq.type === 'ipo'        ? 'Elige una propiedad: sube un 40% su valor de venta.' :
                   infoModal.sq.type === 'boom'       ? 'Boom turístico: cobras €35.000 del banco.' :
                   infoModal.sq.type === 'crack'      ? 'El jugador con más patrimonio pierde el 25% de su efectivo.' :
                   infoModal.sq.type === 'juzgado'    ? 'Quedas retenido. Sal pagando €50.000, sacando dobles o con carta Indulto.' :
                   infoModal.sq.type === 'salida'     ? 'Cobras €20.000 cada vez que cruzas esta casilla.' : 'No pasa nada. Solo mirando.'}
                </p>
              </>
            )}
            <button onClick={() => setInfoModal(null)} style={{ width: '100%', marginTop: 14, background: '#0f0f20', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13 }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#08081a', border: '1px solid #2a2a5a', borderRadius: 16, padding: '1.5rem', maxWidth: 400, width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>

            {modal.type === 'buy' && <>
              <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🏢</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8, textAlign: 'center', color: GROUP_COLORS[modal.square.group]?.band }}>¿Comprar {modal.square.name}?</h3>
              <div style={{ background: GROUP_COLORS[modal.square.group]?.bg, borderRadius: 10, padding: 12, marginBottom: 14 }}>
                {[['Precio', formatMoney(modal.square.price)], ['Renta base', formatMoney(modal.square.rents[0])], ['Holding', formatMoney(modal.square.rents[3])]].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                    <span style={{ color: GROUP_COLORS[modal.square.group]?.text, opacity: 0.7 }}>{k}</span>
                    <span style={{ color: GROUP_COLORS[modal.square.group]?.text, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#4a4a8a', marginBottom: 14, textAlign: 'center' }}>Tu dinero: <strong style={{ color: '#f59e0b' }}>{formatMoney(myPlayer?.money || 0)}</strong></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => buyProperty(modal.square)} style={{ flex: 1, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'black', border: 'none', borderRadius: 10, padding: 10, fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>Comprar</button>
                <button onClick={async () => { setModal(null); await endTurn() }} style={{ flex: 1, background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 10, padding: 10, cursor: 'pointer' }}>Pasar</button>
              </div>
            </>}

            {modal.type === 'card' && <>
              <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 5, display: 'inline-block', marginBottom: 10, background: modal.card.subtype === 'ofensiva' ? '#450a0a' : modal.card.subtype === 'beneficiosa' ? '#14532d' : modal.card.subtype === 'caos' ? '#2e1065' : '#27272a', color: modal.card.subtype === 'ofensiva' ? '#fca5a5' : modal.card.subtype === 'beneficiosa' ? '#86efac' : modal.card.subtype === 'caos' ? '#d8b4fe' : '#d4d4d8' }}>{modal.card.subtype?.toUpperCase()}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>{modal.card.name}</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>{modal.card.description}</p>
              {modal.card.storable ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={async () => { await supabase.from('game_cards').insert({ room_id: roomId, player_id: myPlayer?.id, card_key: modal.card.key, card_type: 'escandalo' }); addLog(`${nm(myPlayer)} guarda "${modal.card.name}"`); setModal(null); await endTurn() }} style={{ flex: 1, background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 10, padding: 10, cursor: 'pointer' }}>Guardar ✦</button>
                  <button onClick={async () => { setModal(null); await endTurn() }} style={{ flex: 1, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'black', border: 'none', borderRadius: 10, padding: 10, fontWeight: 700, cursor: 'pointer' }}>Aplicar</button>
                </div>
              ) : (
                <button onClick={async () => { setModal(null); await endTurn() }} style={{ width: '100%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'black', border: 'none', borderRadius: 10, padding: 10, fontWeight: 700, cursor: 'pointer' }}>Continuar</button>
              )}
            </>}

            {modal.type === 'winner' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 52 }}>🏆</div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', margin: '8px 0' }}>¡{nm(modal.player)} gana!</h3>
                <p style={{ color: '#7070a0', marginBottom: 20 }}>Ha alcanzado €1.000.000 de patrimonio neto</p>
                <button onClick={() => { window.location.href = '/lobby' }} style={{ width: '100%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'black', border: 'none', borderRadius: 10, padding: 12, fontWeight: 800, cursor: 'pointer', fontSize: 15 }}>Volver al lobby</button>
              </div>
            )}

            {modal.type === 'ere' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>✈️ ERE Express</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 14 }}>Muévete gratis a cualquier empresa</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => { const t = PROPERTIES.filter(p => p.group === 'startup')[Math.floor(Math.random() * 6)]; await supabase.from('game_players').update({ position: t.position }).eq('id', myPlayer?.id); addLog(`${nm(myPlayer)} →ERE→ ${t.name}`); setModal(null); await handleSquare(t.position, myPlayer?.money || 0) }} style={{ flex: 1, background: '#0a1a0a', color: '#4ade80', border: '1px solid #16a34a', borderRadius: 10, padding: 10, cursor: 'pointer', fontWeight: 600 }}>Startup</button>
                <button onClick={async () => { const t = PROPERTIES.filter(p => p.group === 'servicios')[Math.floor(Math.random() * 6)]; await supabase.from('game_players').update({ position: t.position }).eq('id', myPlayer?.id); addLog(`${nm(myPlayer)} →ERE→ ${t.name}`); setModal(null); await handleSquare(t.position, myPlayer?.money || 0) }} style={{ flex: 1, background: '#0a1a0a', color: '#86efac', border: '1px solid #22c55e', borderRadius: 10, padding: 10, cursor: 'pointer', fontWeight: 600 }}>Servicios</button>
              </div>
            </>}

            {modal.type === 'ipo' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>📈 IPO en Bolsa</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 12 }}>+40% valor de venta permanente</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {myProps.map(p => { const def = PROPERTIES.find(d => d.key === p.property_key); if (!def) return null; return <button key={p.id} onClick={async () => { await supabase.from('game_properties').update({ ipo_active: true }).eq('id', p.id); addLog(`${nm(myPlayer)} IPO: ${def.name}`); setModal(null); await endTurn() }} style={{ textAlign: 'left', background: '#0f0f20', color: 'white', border: `1px solid ${GROUP_COLORS[def.group].band}44`, borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13 }}>{def.name} → {formatMoney(def.price)}</button> })}
              </div>
              <button onClick={async () => { setModal(null); await endTurn() }} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Pasar</button>
            </>}

            {modal.type === 'ability_burbuja' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>🫧 Burbuja</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 12 }}>Elige una propiedad para renta ×2 durante 3 rondas</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {myProps.map(p => { const def = PROPERTIES.find(d => d.key === p.property_key); if (!def) return null; return <button key={p.id} onClick={async () => { await supabase.from('game_properties').update({ bubble_active: true }).eq('id', p.id); addLog(`${nm(myPlayer)} Burbuja en ${def.name} 🫧`); setModal(null); setAbilityUsed(true) }} style={{ textAlign: 'left', background: '#1a0f00', color: '#fcd34d', border: '1px solid #d9770644', borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13 }}>{def.name} — Renta: {formatMoney(def.rents[p.level])}</button> })}
              </div>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Cancelar</button>
            </>}

            {modal.type === 'ability_huelga' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>✊ Huelga</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 12 }}>Bloquea una propiedad rival (sin renta 1 ronda)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 200, overflowY: 'auto' }}>
                {properties.filter(p => p.owner_id && p.owner_id !== myPlayer?.id).map(p => { const def = PROPERTIES.find(d => d.key === p.property_key); const ow = players.find(pl => pl.id === p.owner_id); if (!def || !ow) return null; return <button key={p.id} onClick={async () => { await supabase.from('game_properties').update({ is_blocked: true }).eq('id', p.id); addLog(`${nm(myPlayer)} Huelga en ${def.name} (${nm(ow)}) ✊`); setModal(null); setAbilityUsed(true) }} style={{ textAlign: 'left', background: '#0f0820', color: '#c4b5fd', border: '1px solid #7c3aed44', borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13 }}>{def.name} de {nm(ow)}</button> })}
              </div>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Cancelar</button>
            </>}

            {modal.type === 'ability_fusion' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>🤝 Fusión Forzada</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 12 }}>Compra una propiedad rival sin mejoras al precio original</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 200, overflowY: 'auto' }}>
                {properties.filter(p => p.owner_id && p.owner_id !== myPlayer?.id && p.level === 0).map(p => { const def = PROPERTIES.find(d => d.key === p.property_key); const ow = players.find(pl => pl.id === p.owner_id); if (!def || !ow || !myPlayer || myPlayer.money < def.price) return null; return <button key={p.id} onClick={async () => { await supabase.from('game_properties').update({ owner_id: myPlayer.id }).eq('id', p.id); await supabase.from('game_players').update({ money: myPlayer.money - def.price }).eq('id', myPlayer.id); await supabase.from('game_players').update({ money: ow.money + def.price }).eq('id', ow.id); addLog(`${nm(myPlayer)} Fusión Forzada: ${def.name}`); setModal(null); setAbilityUsed(true) }} style={{ textAlign: 'left', background: '#001022', color: '#93c5fd', border: '1px solid #2563eb44', borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13 }}>{def.name} de {nm(ow)} — {formatMoney(def.price)}</button> })}
              </div>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Cancelar</button>
            </>}

            {modal.type === 'ability_sabotaje' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>⚡ Sabotaje ({sabotageTokens} fichas)</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 12 }}>Intercepta la próxima renta de un rival. Te quedas la mitad.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {players.filter(p => p.id !== myPlayer?.id).map(p => { const idx = players.findIndex(x => x.id === p.id); return <button key={p.id} onClick={async () => { await supabase.from('game_players').update({ sabotage_tokens: sabotageTokens - 1 }).eq('id', myPlayer?.id); setSabotageTokens(t => t - 1); addLog(`${nm(myPlayer)} ⚡ Sabotaje contra ${nm(p)}`); setModal(null); setAbilityUsed(true) }} style={{ textAlign: 'left', background: '#100010', color: '#fca5a5', border: '1px solid #dc262644', borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><Piece3D type={(p as any).piece_type || 'corona'} color={PLAYER_COLORS[idx]} size={18} />{nm(p)} — {formatMoney(p.money)}</button> })}
              </div>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Cancelar</button>
            </>}

            {modal.type === 'unique_huelga_general' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>✊✊ Huelga General</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 12 }}>Bloquea TODAS las propiedades de un rival durante 2 rondas</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {players.filter(p => p.id !== myPlayer?.id).map(p => { const idx = players.findIndex(x => x.id === p.id); const theirProps = properties.filter(pr => pr.owner_id === p.id); return <button key={p.id} onClick={async () => { for (const pr of theirProps) await supabase.from('game_properties').update({ is_blocked: true }).eq('id', pr.id); addLog(`${nm(myPlayer)} HUELGA GENERAL contra ${nm(p)}`); setModal(null); setUniqueUsed(true) }} style={{ textAlign: 'left', background: '#100820', color: '#c4b5fd', border: '1px solid #7c3aed44', borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><Piece3D type={(p as any).piece_type || 'corona'} color={PLAYER_COLORS[idx]} size={18} />{nm(p)} — {theirProps.length} props</button> })}
              </div>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Cancelar</button>
            </>}

            {modal.type === 'unique_patrocinio' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>📣 Patrocinio</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 12 }}>Cobras el 20% de la renta de un rival durante 3 rondas</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {players.filter(p => p.id !== myPlayer?.id).map(p => { const idx = players.findIndex(x => x.id === p.id); return <button key={p.id} onClick={async () => { addLog(`${nm(myPlayer)} Patrocinio sobre ${nm(p)} 📣`); setModal(null); setUniqueUsed(true) }} style={{ textAlign: 'left', background: '#001a0a', color: '#86efac', border: '1px solid #22c55e44', borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><Piece3D type={(p as any).piece_type || 'corona'} color={PLAYER_COLORS[idx]} size={18} />{nm(p)}</button> })}
              </div>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Cancelar</button>
            </>}

            {modal.type === 'unique_pelotazo' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>💥 Pelotazo</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 12 }}>Vende una propiedad al banco por el DOBLE</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 200, overflowY: 'auto' }}>
                {modal.props.map((p: Property) => { const def = PROPERTIES.find(d => d.key === p.property_key); if (!def) return null; return <button key={p.id} onClick={async () => { await supabase.from('game_properties').update({ owner_id: null }).eq('id', p.id); await supabase.from('game_players').update({ money: (myPlayer?.money || 0) + def.price * 2 }).eq('id', myPlayer?.id); addLog(`${nm(myPlayer)} PELOTAZO: ${def.name} x2 💥`); setModal(null); setUniqueUsed(true) }} style={{ textAlign: 'left', background: '#1a0f00', color: '#fcd34d', border: '1px solid #d9770644', borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13 }}>{def.name} → {formatMoney(def.price * 2)}</button> })}
              </div>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Cancelar</button>
            </>}

            {modal.type === 'unique_mejora' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>🏗️ Mejora Gratis</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 12 }}>Construye una mejora gratis en cualquier propiedad tuya</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {modal.props.map((p: Property) => { const def = PROPERTIES.find(d => d.key === p.property_key); if (!def) return null; return <button key={p.id} onClick={async () => { await supabase.from('game_properties').update({ level: p.level + 1 }).eq('id', p.id); addLog(`${nm(myPlayer)} mejora gratis: ${LEVEL_NAMES[p.level + 1]} en ${def.name}`); setModal(null); setUniqueUsed(true) }} style={{ textAlign: 'left', background: '#001022', color: '#93c5fd', border: '1px solid #2563eb44', borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13 }}>{def.name}: {LEVEL_NAMES[p.level]} → {LEVEL_NAMES[p.level + 1]}</button> })}
              </div>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Cancelar</button>
            </>}

            {modal.type === 'unique_viral' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>📣 Escándalo Viral</h3>
              <p style={{ color: '#7070a0', fontSize: 13, marginBottom: 12 }}>Un rival no puede comprar ni vender durante 2 rondas</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {players.filter(p => p.id !== myPlayer?.id).map(p => { const idx = players.findIndex(x => x.id === p.id); return <button key={p.id} onClick={async () => { addLog(`${nm(myPlayer)} Viral contra ${nm(p)} — bloqueado 2 rondas`); setModal(null); setUniqueUsed(true) }} style={{ textAlign: 'left', background: '#100010', color: '#fca5a5', border: '1px solid #dc262644', borderRadius: 8, padding: 9, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><Piece3D type={(p as any).piece_type || 'corona'} color={PLAYER_COLORS[idx]} size={18} />{nm(p)}</button> })}
              </div>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Cancelar</button>
            </>}

            {modal.type === 'error' && <>
              <div style={{ textAlign: 'center', marginBottom: 8 }}><span style={{ fontSize: 32 }}>⚠️</span></div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fca5a5', marginBottom: 8, textAlign: 'center' }}>{modal.msg}</h3>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#1a1a2a', color: 'white', border: '1px solid #2a2a5a', borderRadius: 8, padding: 9, cursor: 'pointer' }}>Cerrar</button>
            </>}
          </div>
        </div>
      )}
    </main>
  )
}