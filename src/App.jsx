import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

// ─── Socket singleton ────────────────────────────────────────────────────────
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin)

let _socket = null
function getSocket() {
  if (!_socket || _socket.disconnected) {
    _socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
  }
  return _socket
}
function resetSocket() {
  if (_socket) { _socket.disconnect(); _socket = null }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const GROUP_COLORS = [
  { ring: 'ring-cyan-500',   bg: 'from-cyan-500/20 to-blue-600/20',    border: 'border-cyan-500/40',   label: 'text-cyan-300',   badge: 'from-cyan-500 to-blue-600',   glow: 'shadow-cyan-500/50'   },
  { ring: 'ring-purple-500', bg: 'from-purple-500/20 to-indigo-600/20', border: 'border-purple-500/40', label: 'text-purple-300', badge: 'from-purple-500 to-indigo-600', glow: 'shadow-purple-500/50' },
  { ring: 'ring-emerald-500',bg: 'from-emerald-500/20 to-teal-600/20',  border: 'border-emerald-500/40',label: 'text-emerald-300',badge: 'from-emerald-500 to-teal-600',  glow: 'shadow-emerald-500/50'},
  { ring: 'ring-orange-500', bg: 'from-orange-500/20 to-red-600/20',    border: 'border-orange-500/40', label: 'text-orange-300', badge: 'from-orange-500 to-red-600',   glow: 'shadow-orange-500/50' },
  { ring: 'ring-pink-500',   bg: 'from-pink-500/20 to-rose-600/20',     border: 'border-pink-500/40',   label: 'text-pink-300',   badge: 'from-pink-500 to-rose-600',   glow: 'shadow-pink-500/50'   },
  { ring: 'ring-yellow-500', bg: 'from-yellow-500/20 to-amber-600/20',  border: 'border-yellow-500/40', label: 'text-yellow-300', badge: 'from-yellow-500 to-amber-600', glow: 'shadow-yellow-500/50' },
]

const AVATAR_COLORS = [
  'from-cyan-500 to-blue-600',
  'from-purple-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-yellow-400 to-orange-500',
]

// ─── Primitive UI ─────────────────────────────────────────────────────────────
function AnimatedBg() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  )
}

function GlassCard({ children, className = '' }) {
  return (
    <div className={`backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

function GlowButton({ children, onClick, disabled, variant = 'cyan', size = 'md', className = '' }) {
  const v = {
    cyan:   'from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30 hover:shadow-cyan-500/50',
    purple: 'from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 shadow-purple-500/30 hover:shadow-purple-500/50',
    green:  'from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/30 hover:shadow-emerald-500/50',
    ghost:  'border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10',
  }
  const s = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3', lg: 'px-8 py-4 text-lg' }
  const isGhost = variant === 'ghost'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative font-semibold text-white rounded-xl
        ${s[size]}
        ${isGhost ? v.ghost : `bg-gradient-to-r ${v[variant]} shadow-lg hover:shadow-xl`}
        transform hover:-translate-y-0.5 active:translate-y-0
        transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none
        ${className}
      `}
    >
      {children}
    </button>
  )
}

function Logo({ size = 'md' }) {
  const s = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-6xl' }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`font-black tracking-tight ${s[size]}`}>
        <span className="text-white">Hello </span>
        <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          AI
        </span>
      </div>
      <div className="h-0.5 w-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full" />
    </div>
  )
}

function Spinner({ size = 'md' }) {
  const s = { sm: 'w-8 h-8', md: 'w-16 h-16', lg: 'w-24 h-24' }
  return (
    <div className={`relative ${s[size]}`}>
      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
      <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.75s' }} />
    </div>
  )
}

function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      Live
    </div>
  )
}

// ─── SCREEN 1: Welcome ────────────────────────────────────────────────────────
function WelcomeScreen({ onHost, onParticipant }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <AnimatedBg />
      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-md">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="text-7xl animate-bounce" style={{ animationDuration: '2s' }}>🤖</div>
          <Logo size="lg" />
          <p className="text-slate-400 text-base leading-relaxed">
            Real-time AI-powered group randomizer<br />for events, workshops &amp; classrooms
          </p>
        </div>

        {/* Role cards */}
        <div className="w-full space-y-3">
          <GlassCard className="p-1">
            <button
              onClick={onHost}
              className="w-full p-5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-600/10
                hover:from-cyan-500/20 hover:to-blue-600/20
                border border-cyan-500/20 hover:border-cyan-400/40
                transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">🎯</div>
                <div className="text-left flex-1">
                  <div className="text-white font-bold text-lg group-hover:text-cyan-300 transition-colors">
                    I am a Host
                  </div>
                  <div className="text-slate-500 text-sm">Create a room &amp; manage groups</div>
                </div>
                <div className="text-cyan-500 group-hover:text-cyan-300 text-xl transition-colors">→</div>
              </div>
            </button>
          </GlassCard>

          <GlassCard className="p-1">
            <button
              onClick={onParticipant}
              className="w-full p-5 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-600/10
                hover:from-purple-500/20 hover:to-indigo-600/20
                border border-purple-500/20 hover:border-purple-400/40
                transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">👥</div>
                <div className="text-left flex-1">
                  <div className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors">
                    I am a Participant
                  </div>
                  <div className="text-slate-500 text-sm">Join a room with a code or QR scan</div>
                </div>
                <div className="text-purple-500 group-hover:text-purple-300 text-xl transition-colors">→</div>
              </div>
            </button>
          </GlassCard>
        </div>

        <p className="text-slate-700 text-xs">Powered by Socket.io · Real-time across all devices</p>
      </div>
    </div>
  )
}

// ─── SCREEN 2: Host Dashboard ─────────────────────────────────────────────────
function HostScreen({ onBack }) {
  const [phase, setPhase] = useState('creating')  // creating | dashboard
  const [roomCode, setRoomCode] = useState('')
  const [participants, setParticipants] = useState([])
  const [numGroups, setNumGroups] = useState(2)
  const [groups, setGroups] = useState(null)
  const [randomizing, setRandomizing] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    const s = getSocket()
    socketRef.current = s

    s.emit('create-room', (res) => {
      if (res.success) {
        setRoomCode(res.roomCode)
        setPhase('dashboard')
      }
    })

    const onRoomUpdate = ({ participants, groups }) => {
      setParticipants(participants)
      setGroups(groups)
    }
    const onGroupsRandomized = ({ groups }) => setGroups(groups)

    s.on('room-update', onRoomUpdate)
    s.on('groups-randomized', onGroupsRandomized)

    return () => {
      s.off('room-update', onRoomUpdate)
      s.off('groups-randomized', onGroupsRandomized)
    }
  }, [])

  const handleRandomize = () => {
    const s = socketRef.current
    if (!s) return
    setRandomizing(true)
    s.emit('set-num-groups', { numGroups })
    s.emit('randomize-groups', (res) => {
      setRandomizing(false)
      if (!res?.success) alert(res?.error || 'Randomization failed')
    })
  }

  const handleReset = () => {
    setGroups(null)
    socketRef.current?.emit('reset-groups')
  }

  // QR via free qrserver.com API
  const qrUrl = roomCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(roomCode)}&color=06b6d4&bgcolor=0f172a&margin=10`
    : null

  if (phase === 'creating') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBg />
        <div className="relative z-10 text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-slate-400 animate-pulse">Creating your room…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <AnimatedBg />
      <div className="relative z-10 max-w-5xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1.5">
            ← Exit room
          </button>
          <Logo size="sm" />
          <LiveBadge />
        </div>

        <div className="grid md:grid-cols-5 gap-5">

          {/* ── Left column (2/5) ── */}
          <div className="md:col-span-2 space-y-4">

            {/* Room code + QR */}
            <GlassCard className="p-6 text-center">
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">Room Code</p>
              <div className="text-5xl font-black tracking-[0.25em] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4 text-glow-cyan">
                {roomCode}
              </div>
              {qrUrl && (
                <div className="inline-block p-3 bg-white rounded-2xl shadow-xl shadow-cyan-500/20">
                  <img src={qrUrl} alt="QR Code" className="w-44 h-44 rounded-lg" />
                </div>
              )}
              <p className="text-slate-600 text-xs mt-3">Share code or scan QR to join</p>
            </GlassCard>

            {/* Group controls */}
            <GlassCard className="p-6">
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">Group Settings</p>

              <div className="mb-5">
                <p className="text-slate-300 text-sm mb-2.5">Number of groups</p>
                <div className="flex gap-2 flex-wrap">
                  {[2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      onClick={() => setNumGroups(n)}
                      className={`w-11 h-11 rounded-xl font-bold text-sm transition-all duration-150 ${
                        numGroups === n
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-white/5 border border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {!groups ? (
                <>
                  <GlowButton
                    onClick={handleRandomize}
                    disabled={participants.length < 2 || randomizing}
                    variant="cyan"
                    size="lg"
                    className="w-full"
                  >
                    {randomizing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner size="sm" /> Randomizing…
                      </span>
                    ) : (
                      '🎲 Randomize Groups'
                    )}
                  </GlowButton>
                  {participants.length < 2 && (
                    <p className="text-slate-600 text-xs text-center mt-2">
                      Need at least 2 participants
                    </p>
                  )}
                </>
              ) : (
                <GlowButton onClick={handleReset} variant="purple" size="lg" className="w-full">
                  🔄 Re-randomize
                </GlowButton>
              )}
            </GlassCard>
          </div>

          {/* ── Right column (3/5) ── */}
          <div className="md:col-span-3 space-y-4">

            {/* Participant list (shown when no groups yet) */}
            {!groups && (
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-500 text-xs uppercase tracking-widest">Participants</p>
                  <span className="bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 text-xs px-2.5 py-1 rounded-full font-medium">
                    {participants.length} joined
                  </span>
                </div>

                {participants.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="text-5xl opacity-30">👥</div>
                    <p className="text-slate-500 text-sm">Waiting for participants…</p>
                    <div className="flex justify-center gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {participants.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-white text-sm font-medium">{p.name}</span>
                        <span className="ml-auto text-slate-700 text-xs font-mono">#{i + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            {/* Groups result */}
            {groups && (
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-500 text-xs uppercase tracking-widest">Groups</p>
                  <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    Sent to participants
                  </span>
                </div>
                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                  {groups.map((group, gi) => {
                    const c = GROUP_COLORS[gi % GROUP_COLORS.length]
                    return (
                      <div key={gi} className={`p-4 rounded-xl bg-gradient-to-r ${c.bg} border ${c.border}`}>
                        <div className={`font-bold text-sm mb-2.5 flex items-center gap-2 ${c.label}`}>
                          <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${c.badge}`} />
                          {group.name}
                          <span className="text-slate-500 font-normal ml-auto">
                            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.members.map(m => (
                            <span key={m.id} className="text-xs bg-white/10 border border-white/10 px-2.5 py-1 rounded-full text-white">
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN 3: Participant Join Form ──────────────────────────────────────────
function ParticipantJoinScreen({ onBack, onJoined }) {
  const [roomCode, setRoomCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = () => {
    if (!roomCode.trim()) return setError('Please enter a room code.')
    if (!name.trim()) return setError('Please enter your name.')
    setError('')
    setLoading(true)
    const s = getSocket()
    s.emit('join-room', { roomCode: roomCode.toUpperCase().trim(), name: name.trim() }, (res) => {
      setLoading(false)
      if (res.success) {
        onJoined({
          name: name.trim(),
          roomCode: roomCode.toUpperCase().trim(),
          socketId: s.id,
          initialGroups: res.groups ?? null,
          myGroupIndex: res.myGroupIndex ?? -1,
        })
      } else {
        setError(res.error || 'Could not join room.')
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <AnimatedBg />
      <div className="relative z-10 w-full max-w-sm">
        <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1.5 mb-6">
          ← Back
        </button>

        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🚀</div>
            <Logo size="md" />
            <p className="text-slate-500 text-sm mt-2">Join a room</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                placeholder="AB3X"
                maxLength={4}
                className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-white placeholder-slate-700 text-center text-3xl font-black tracking-[0.5em] uppercase transition-all"
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Alice"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 text-white placeholder-slate-700 transition-all"
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                ⚠️ {error}
              </div>
            )}

            <GlowButton onClick={handleJoin} disabled={loading} variant="purple" size="lg" className="w-full">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" /> Joining…
                </span>
              ) : '🚀 Join Room'}
            </GlowButton>

            <GlowButton variant="ghost" size="md" className="w-full text-slate-400">
              📷 Scan QR Code
            </GlowButton>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// ─── SCREEN 4: Participant Waiting ────────────────────────────────────────────
function ParticipantWaitingScreen({ name, roomCode, socketId, onGroupsAssigned }) {
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const s = getSocket()

    const onGroupsRandomized = ({ groups }) => {
      const myGroupIndex = groups.findIndex(g =>
        g.members.some(m => m.id === socketId || m.name === name)
      )
      onGroupsAssigned({ groups, myGroupIndex: myGroupIndex >= 0 ? myGroupIndex : 0 })
    }

    s.on('groups-randomized', onGroupsRandomized)
    s.on('host-left', () => alert('The host has ended the session.'))

    const timer = setInterval(() => setDots(d => (d + 1) % 4), 600)

    return () => {
      s.off('groups-randomized', onGroupsRandomized)
      clearInterval(timer)
    }
  }, [name, socketId, onGroupsAssigned])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <AnimatedBg />
      <div className="relative z-10 w-full max-w-sm text-center">
        <GlassCard className="p-10">
          {/* Animated AI brain */}
          <div className="relative mx-auto w-28 h-28 mb-8">
            {/* Outer glow rings */}
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-2 rounded-full border border-purple-500/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400" />
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-400" />
              <div className="absolute top-1/2 right-0 translate-x-1.5 -translate-y-1/2 w-2 h-2 bg-indigo-400 rounded-full" />
            </div>
            {/* Center */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
              <span className="text-4xl">🧠</span>
            </div>
          </div>

          <Logo size="md" />

          <div className="mt-6 space-y-2">
            <p className="text-white text-xl font-semibold">
              Hey{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {name}
              </span>
              !
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Waiting for the host to randomize groups
              {'.'.repeat(dots + 1)}
            </p>
          </div>

          {/* Animated dots */}
          <div className="mt-8 flex justify-center gap-2">
            {[0,1,2,3,4].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 animate-bounce"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="text-slate-700 text-xs">Room:</span>
            <span className="text-slate-500 font-mono text-xs tracking-widest">{roomCode}</span>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// ─── SCREEN 5: Participant Result ─────────────────────────────────────────────
function ParticipantResultScreen({ name, groups, myGroupIndex, onBack }) {
  const myGroup = groups?.[myGroupIndex]
  const c = GROUP_COLORS[myGroupIndex % GROUP_COLORS.length]
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <AnimatedBg />

      {/* Confetti-ish particles */}
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-bounce"
            style={{
              left: `${(i / 16) * 100}%`,
              top: `-${Math.random() * 10 + 5}%`,
              backgroundColor: ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ec4899','#6366f1'][i % 6],
              animationDelay: `${i * 0.08}s`,
              animationDuration: `${0.7 + (i % 3) * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-20 w-full max-w-sm text-center">
        <GlassCard className={`p-8 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-5xl mb-2 animate-bounce" style={{ animationDuration: '1s' }}>🎉</div>

          <Logo size="md" />

          <div className="mt-5 space-y-1">
            <p className="text-slate-400 text-sm">
              Results are in,{' '}
              <span className="text-white font-semibold">{name}</span>!
            </p>
            <p className="text-slate-300">You've been placed in</p>
          </div>

          {/* Big group badge */}
          <div className={`
            my-7 inline-flex items-center justify-center w-full py-6 px-8 rounded-2xl
            bg-gradient-to-r ${c.badge}
            shadow-2xl ${c.glow}
            transition-transform duration-500 hover:scale-105
          `}>
            <span className="text-white text-4xl font-black">
              {myGroup?.name || `Group ${myGroupIndex + 1}`}
            </span>
          </div>

          {/* Team members */}
          {myGroup && myGroup.members.length > 0 && (
            <div className={`p-4 rounded-xl bg-gradient-to-r ${c.bg} border ${c.border} mb-6`}>
              <p className={`text-xs ${c.label} font-medium mb-3 uppercase tracking-widest`}>
                Your teammates
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {myGroup.members.map((m, idx) => (
                  <span
                    key={m.id}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      m.name === name
                        ? 'bg-white text-slate-900 ring-2 ring-white/50'
                        : 'bg-white/10 border border-white/10 text-white'
                    }`}
                  >
                    {m.name === name ? '⭐ ' : ''}{m.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-300 text-sm transition-colors"
          >
            ← Back to home
          </button>
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [participantData, setParticipantData] = useState(null)
  const [groupData, setGroupData] = useState(null)

  const goHome = useCallback(() => {
    resetSocket()
    setScreen('welcome')
    setParticipantData(null)
    setGroupData(null)
  }, [])

  const handleParticipantJoined = useCallback((data) => {
    setParticipantData(data)
    if (data.initialGroups && data.myGroupIndex >= 0) {
      setGroupData({ groups: data.initialGroups, myGroupIndex: data.myGroupIndex })
      setScreen('participant-result')
    } else {
      setScreen('participant-waiting')
    }
  }, [])

  const handleGroupsAssigned = useCallback((data) => {
    setGroupData(data)
    setScreen('participant-result')
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {screen === 'welcome' && (
        <WelcomeScreen
          onHost={() => setScreen('host')}
          onParticipant={() => setScreen('participant-join')}
        />
      )}

      {screen === 'host' && (
        <HostScreen onBack={goHome} />
      )}

      {screen === 'participant-join' && (
        <ParticipantJoinScreen
          onBack={goHome}
          onJoined={handleParticipantJoined}
        />
      )}

      {screen === 'participant-waiting' && participantData && (
        <ParticipantWaitingScreen
          name={participantData.name}
          roomCode={participantData.roomCode}
          socketId={participantData.socketId}
          onGroupsAssigned={handleGroupsAssigned}
        />
      )}

      {screen === 'participant-result' && participantData && groupData && (
        <ParticipantResultScreen
          name={participantData.name}
          groups={groupData.groups}
          myGroupIndex={groupData.myGroupIndex}
          onBack={goHome}
        />
      )}
    </div>
  )
}
