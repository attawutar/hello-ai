import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin)

let _socket = null
function getSocket() {
  if (!_socket || _socket.disconnected) _socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
  return _socket
}
function resetSocket() { if (_socket) { _socket.disconnect(); _socket = null } }

function getJoinCodeFromURL() { return new URLSearchParams(window.location.search).get('join') || '' }
function clearJoinCodeFromURL() {
  const url = new URL(window.location.href)
  url.searchParams.delete('join')
  window.history.replaceState({}, '', url.toString())
}

const GROUP_COLORS = [
  { bg: 'from-cyan-500/20 to-blue-600/20',    border: 'border-cyan-500/40',   label: 'text-cyan-300',   badge: 'from-cyan-500 to-blue-600',   glow: 'shadow-cyan-500/50'   },
  { bg: 'from-purple-500/20 to-indigo-600/20', border: 'border-purple-500/40', label: 'text-purple-300', badge: 'from-purple-500 to-indigo-600', glow: 'shadow-purple-500/50' },
  { bg: 'from-emerald-500/20 to-teal-600/20',  border: 'border-emerald-500/40',label: 'text-emerald-300',badge: 'from-emerald-500 to-teal-600',  glow: 'shadow-emerald-500/50'},
  { bg: 'from-orange-500/20 to-red-600/20',    border: 'border-orange-500/40', label: 'text-orange-300', badge: 'from-orange-500 to-red-600',   glow: 'shadow-orange-500/50' },
  { bg: 'from-pink-500/20 to-rose-600/20',     border: 'border-pink-500/40',   label: 'text-pink-300',   badge: 'from-pink-500 to-rose-600',   glow: 'shadow-pink-500/50'   },
  { bg: 'from-yellow-500/20 to-amber-600/20',  border: 'border-yellow-500/40', label: 'text-yellow-300', badge: 'from-yellow-500 to-amber-600', glow: 'shadow-yellow-500/50' },
]
const AVATAR_COLORS = [
  'from-cyan-500 to-blue-600',
  'from-purple-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-yellow-400 to-orange-500',
]

function AnimatedBg() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px),linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
    </div>
  )
}

function GlassCard({ children, className = '' }) {
  return <div className={`backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl ${className}`}>{children}</div>
}

function GlowButton({ children, onClick, disabled, variant = 'cyan', size = 'md', className = '' }) {
  const v = {
    cyan:   'from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30',
    purple: 'from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 shadow-purple-500/30',
    gold:   'from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 shadow-yellow-500/30',
    red:    'from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 shadow-red-500/30',
  }
  const s = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3', lg: 'px-8 py-4 text-lg' }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`relative font-semibold text-white rounded-xl ${s[size]} bg-gradient-to-r ${v[variant]} shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none ${className}`}>
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
        <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">AI</span>
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
      <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-400 animate-spin"
        style={{ animationDirection: 'reverse', animationDuration: '0.75s' }} />
    </div>
  )
}

// ─── Welcome ──────────────────────────────────────────────────────────────────
function WelcomeScreen({ onHost, onParticipant, onLuckyDraw }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <AnimatedBg />
      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-md">
        <div className="text-center space-y-4">
          <div className="text-7xl animate-bounce" style={{ animationDuration: '2s' }}>🤖</div>
          <Logo size="lg" />
          <p className="text-slate-400 text-base leading-relaxed">
            Real-time AI-powered tools<br />for events, workshops &amp; classrooms
          </p>
        </div>
        <div className="w-full space-y-3">
          <GlassCard className="p-1">
            <button onClick={onHost}
              className="w-full p-5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/20 hover:to-blue-600/20 border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-200 group">
              <div className="flex items-center gap-4">
                <div className="text-3xl">🎯</div>
                <div className="text-left flex-1">
                  <div className="text-white font-bold text-lg group-hover:text-cyan-300 transition-colors">Group Randomizer — Host</div>
                  <div className="text-slate-500 text-sm">Create a room &amp; manage groups</div>
                </div>
                <div className="text-cyan-500 group-hover:text-cyan-300 text-xl">→</div>
              </div>
            </button>
          </GlassCard>
          <GlassCard className="p-1">
            <button onClick={onParticipant}
              className="w-full p-5 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-600/10 hover:from-purple-500/20 hover:to-indigo-600/20 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-200 group">
              <div className="flex items-center gap-4">
                <div className="text-3xl">👥</div>
                <div className="text-left flex-1">
                  <div className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors">Group Randomizer — Participant</div>
                  <div className="text-slate-500 text-sm">Join a room by entering the room code</div>
                </div>
                <div className="text-purple-500 group-hover:text-purple-300 text-xl">→</div>
              </div>
            </button>
          </GlassCard>
          <GlassCard className="p-1">
            <button onClick={onLuckyDraw}
              className="w-full p-5 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-600/10 hover:from-yellow-500/20 hover:to-orange-600/20 border border-yellow-500/20 hover:border-yellow-400/40 transition-all duration-200 group">
              <div className="flex items-center gap-4">
                <div className="text-3xl">🎰</div>
                <div className="text-left flex-1">
                  <div className="text-white font-bold text-lg group-hover:text-yellow-300 transition-colors">Lucky Draw</div>
                  <div className="text-slate-500 text-sm">Add participants &amp; prizes, then draw!</div>
                </div>
                <div className="text-yellow-500 group-hover:text-yellow-300 text-xl">→</div>
              </div>
            </button>
          </GlassCard>
        </div>
        <p className="text-slate-700 text-xs">Powered by Socket.io · Real-time across all devices</p>
      </div>
    </div>
  )
}

// ─── Host ─────────────────────────────────────────────────────────────────────
function HostScreen({ onBack }) {
  const [phase, setPhase] = useState('creating')
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
      if (res.success) { setRoomCode(res.roomCode); setPhase('dashboard') }
    })
    const onRoomUpdate = ({ participants, groups }) => { setParticipants(participants); setGroups(groups) }
    const onGroupsRandomized = ({ groups }) => setGroups(groups)
    s.on('room-update', onRoomUpdate)
    s.on('groups-randomized', onGroupsRandomized)
    return () => { s.off('room-update', onRoomUpdate); s.off('groups-randomized', onGroupsRandomized) }
  }, [])

  const handleRandomize = () => {
    const s = socketRef.current; if (!s) return
    setRandomizing(true)
    s.emit('set-num-groups', { numGroups })
    s.emit('randomize-groups', (res) => {
      setRandomizing(false)
      if (!res?.success) alert(res?.error || 'Failed to randomize')
    })
  }
  const handleReset = () => { setGroups(null); socketRef.current?.emit('reset-groups') }

  if (phase === 'creating') {
    return (
      <div className="min-h-screen flex items-center justify-center"><AnimatedBg />
        <div className="relative z-10 text-center space-y-4"><Spinner size="lg" /><p className="text-slate-400 animate-pulse">Creating your room…</p></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6"><AnimatedBg />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm">← Exit room</button>
          <Logo size="sm" />
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />Live
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-5">
          <div className="md:col-span-2 space-y-4">
            <GlassCard className="p-6 text-center">
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">Room Code</p>
              <div className="text-6xl font-black tracking-[0.3em] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent py-4">
                {roomCode}
              </div>
              <p className="text-slate-500 text-xs mt-1">Share this code with participants</p>
            </GlassCard>

            <GlassCard className="p-6">
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">Group Settings</p>
              <div className="mb-5">
                <p className="text-slate-300 text-sm mb-2.5">Number of groups</p>
                <div className="flex gap-2 flex-wrap">
                  {[2,3,4,5,6].map(n => (
                    <button key={n} onClick={() => setNumGroups(n)}
                      className={`w-11 h-11 rounded-xl font-bold text-sm transition-all ${numGroups === n ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30' : 'bg-white/5 border border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-white'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {!groups ? (
                <>
                  <GlowButton onClick={handleRandomize} disabled={participants.length < 2 || randomizing} variant="cyan" size="lg" className="w-full">
                    {randomizing
                      ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" />Randomizing…</span>
                      : '🎲 Randomize Groups'}
                  </GlowButton>
                  {participants.length < 2 && <p className="text-slate-600 text-xs text-center mt-2">Need at least 2 participants</p>}
                </>
              ) : (
                <GlowButton onClick={handleReset} variant="purple" size="lg" className="w-full">🔄 Re-randomize</GlowButton>
              )}
            </GlassCard>
          </div>

          <div className="md:col-span-3 space-y-4">
            {!groups && (
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-500 text-xs uppercase tracking-widest">Participants</p>
                  <span className="bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 text-xs px-2.5 py-1 rounded-full">{participants.length} joined</span>
                </div>
                {participants.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="text-5xl opacity-30">👥</div>
                    <p className="text-slate-500 text-sm">Waiting for participants…</p>
                    <div className="flex justify-center gap-1">
                      {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {participants.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-white text-sm font-medium">{p.name}</span>
                        <span className="ml-auto text-slate-700 text-xs font-mono">#{i+1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}
            {groups && (
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-500 text-xs uppercase tracking-widest">Groups</p>
                  <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />Sent to participants
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
                          <span className="text-slate-500 font-normal ml-auto">{group.members.length} members</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.members.map(m => (
                            <span key={m.id} className="text-xs bg-white/10 border border-white/10 px-2.5 py-1 rounded-full text-white">{m.name}</span>
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

// ─── Participant Join ──────────────────────────────────────────────────────────
function ParticipantJoinScreen({ onBack, onJoined, initialCode = '' }) {
  const [roomCode, setRoomCode] = useState(initialCode)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = () => {
    if (!roomCode.trim()) return setError('Please enter a room code.')
    if (!name.trim()) return setError('Please enter your name.')
    setError(''); setLoading(true)
    const s = getSocket()
    s.emit('join-room', { roomCode: roomCode.toUpperCase().trim(), name: name.trim() }, (res) => {
      setLoading(false)
      if (res.success) {
        onJoined({ name: name.trim(), roomCode: roomCode.toUpperCase().trim(), socketId: s.id, initialGroups: res.groups ?? null, myGroupIndex: res.myGroupIndex ?? -1 })
      } else {
        setError(res.error || 'Could not join room.')
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"><AnimatedBg />
      <div className="relative z-10 w-full max-w-sm">
        <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1.5 mb-6">← Back</button>
        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🚀</div>
            <Logo size="md" />
            <p className="text-slate-500 text-sm mt-2">Join a room</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Room Code</label>
              <input type="text" value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                placeholder="AB3X" maxLength={4}
                className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-white placeholder-slate-700 text-center text-3xl font-black tracking-[0.5em] uppercase transition-all"
                onKeyDown={e => e.key === 'Enter' && handleJoin()} />
            </div>
            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Your Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 text-white placeholder-slate-700 transition-all"
                onKeyDown={e => e.key === 'Enter' && handleJoin()} />
            </div>
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">⚠️ {error}</div>}
            <GlowButton onClick={handleJoin} disabled={loading} variant="purple" size="lg" className="w-full">
              {loading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" />Joining…</span> : '🚀 Join Room'}
            </GlowButton>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Participant Waiting ───────────────────────────────────────────────────────
function ParticipantWaitingScreen({ name, roomCode, socketId, onGroupsAssigned }) {
  const [dots, setDots] = useState(0)
  useEffect(() => {
    const s = getSocket()
    const onGroupsRandomized = ({ groups }) => {
      const myGroupIndex = groups.findIndex(g => g.members.some(m => m.id === socketId || m.name === name))
      onGroupsAssigned({ groups, myGroupIndex: myGroupIndex >= 0 ? myGroupIndex : 0 })
    }
    s.on('groups-randomized', onGroupsRandomized)
    s.on('host-left', () => alert('The host has ended the session.'))
    const timer = setInterval(() => setDots(d => (d + 1) % 4), 600)
    return () => { s.off('groups-randomized', onGroupsRandomized); clearInterval(timer) }
  }, [name, socketId, onGroupsAssigned])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"><AnimatedBg />
      <div className="relative z-10 w-full max-w-sm text-center">
        <GlassCard className="p-10">
          <div className="relative mx-auto w-28 h-28 mb-8">
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-2 rounded-full border border-purple-500/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 w-3 h-3 bg-cyan-400 rounded-full" />
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 w-2 h-2 bg-purple-400 rounded-full" />
            </div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
              <span className="text-4xl">🧠</span>
            </div>
          </div>
          <Logo size="md" />
          <div className="mt-6 space-y-2">
            <p className="text-white text-xl font-semibold">
              Hey <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{name}</span>!
            </p>
            <p className="text-slate-400 text-sm">Waiting for the host to randomize groups{'.'.repeat(dots + 1)}</p>
          </div>
          <div className="mt-8 flex justify-center gap-2">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <div className="mt-6">
            <span className="text-slate-700 text-xs">Room: </span>
            <span className="text-slate-500 font-mono text-xs tracking-widest">{roomCode}</span>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Participant Result ────────────────────────────────────────────────────────
function ParticipantResultScreen({ name, groups, myGroupIndex, onBack }) {
  const myGroup = groups?.[myGroupIndex]
  const c = GROUP_COLORS[myGroupIndex % GROUP_COLORS.length]
  const [revealed, setRevealed] = useState(false)
  useEffect(() => { const t = setTimeout(() => setRevealed(true), 300); return () => clearTimeout(t) }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden"><AnimatedBg />
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="absolute w-2 h-2 rounded-full animate-bounce" style={{
            left: `${(i/16)*100}%`, top: `-${Math.random()*10+5}%`,
            backgroundColor: ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ec4899','#6366f1'][i%6],
            animationDelay: `${i*0.08}s`, animationDuration: `${0.7+(i%3)*0.2}s`,
          }} />
        ))}
      </div>
      <div className="relative z-20 w-full max-w-sm text-center">
        <GlassCard className={`p-8 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-5xl mb-2 animate-bounce" style={{ animationDuration: '1s' }}>🎉</div>
          <Logo size="md" />
          <div className="mt-5 space-y-1">
            <p className="text-slate-400 text-sm">Results are in, <span className="text-white font-semibold">{name}</span>!</p>
            <p className="text-slate-300">You've been placed in</p>
          </div>
          <div className={`my-7 inline-flex items-center justify-center w-full py-6 px-8 rounded-2xl bg-gradient-to-r ${c.badge} shadow-2xl ${c.glow}`}>
            <span className="text-white text-4xl font-black">{myGroup?.name || `Group ${myGroupIndex + 1}`}</span>
          </div>
          {myGroup && myGroup.members.length > 0 && (
            <div className={`p-4 rounded-xl bg-gradient-to-r ${c.bg} border ${c.border} mb-6`}>
              <p className={`text-xs ${c.label} font-medium mb-3 uppercase tracking-widest`}>Your teammates</p>
              <div className="flex flex-wrap justify-center gap-2">
                {myGroup.members.map(m => (
                  <span key={m.id} className={`px-3 py-1.5 rounded-full text-sm font-medium ${m.name === name ? 'bg-white text-slate-900 ring-2 ring-white/50' : 'bg-white/10 border border-white/10 text-white'}`}>
                    {m.name === name ? '⭐ ' : ''}{m.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <button onClick={onBack} className="text-slate-600 hover:text-slate-300 text-sm transition-colors">← Back to home</button>
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Lucky Draw ───────────────────────────────────────────────────────────────
const PRIZE_EMOJIS = ['🏆','🥇','🎁','💎','🎀','🌟','🎊','🏅','💰','🎯']

function LuckyDrawScreen({ onBack }) {
  const [phase, setPhase] = useState('setup') // setup | drawing | result
  const [participants, setParticipants] = useState([])
  const [prizes, setPrizes] = useState([{ name: '', amount: 1 }])
  const [nameInput, setNameInput] = useState('')
  const [drawingName, setDrawingName] = useState('')
  const [currentPrizeIdx, setCurrentPrizeIdx] = useState(0)
  const [results, setResults] = useState([]) // [{winner, prize}]
  const [remainingPool, setRemainingPool] = useState([])
  const intervalRef = useRef(null)

  // Build full prize list (each prize repeated by amount)
  const buildPrizeQueue = (prizeList) => {
    const queue = []
    prizeList.forEach((p, i) => {
      if (p.name.trim()) {
        for (let j = 0; j < Math.max(1, Number(p.amount) || 1); j++) {
          queue.push({ name: p.name.trim(), emoji: PRIZE_EMOJIS[i % PRIZE_EMOJIS.length], index: i })
        }
      }
    })
    return queue
  }

  const totalPrizes = buildPrizeQueue(prizes).length
  const canDraw = participants.length > 0 && prizes.some(p => p.name.trim()) && remainingPool.length === 0
    ? results.length === 0
    : true

  const addParticipant = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    if (participants.includes(trimmed)) { setNameInput(''); return }
    setParticipants(prev => [...prev, trimmed])
    setNameInput('')
  }

  const removeParticipant = (name) => setParticipants(prev => prev.filter(p => p !== name))

  const updatePrize = (i, field, value) => {
    setPrizes(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }
  const addPrize = () => setPrizes(prev => [...prev, { name: '', amount: 1 }])
  const removePrize = (i) => setPrizes(prev => prev.filter((_, idx) => idx !== i))

  const startDraw = () => {
    const prizeQueue = buildPrizeQueue(prizes)
    if (prizeQueue.length === 0 || participants.length === 0) return
    setResults([])
    setRemainingPool([...participants])
    setCurrentPrizeIdx(0)
    doDraw([...participants], prizeQueue, 0, [])
  }

  const doDraw = (pool, prizeQueue, prizeIdx, existingResults) => {
    if (prizeIdx >= prizeQueue.length || pool.length === 0) {
      setPhase('result')
      return
    }
    const currentPrize = prizeQueue[prizeIdx]
    setPhase('drawing')
    setCurrentPrizeIdx(prizeIdx)

    // Slot machine animation — cycle through names fast for 1s
    let tick = 0
    const totalTicks = 20
    intervalRef.current = setInterval(() => {
      const randomName = pool[Math.floor(Math.random() * pool.length)]
      setDrawingName(randomName)
      tick++
      if (tick >= totalTicks) {
        clearInterval(intervalRef.current)
        // Pick actual winner
        const winnerIdx = Math.floor(Math.random() * pool.length)
        const winner = pool[winnerIdx]
        const newPool = pool.filter((_, i) => i !== winnerIdx)
        const newResults = [...existingResults, { winner, prize: currentPrize }]
        setDrawingName(winner)
        setRemainingPool(newPool)
        setResults(newResults)
        // Pause 1.5s on winner before next draw
        setTimeout(() => {
          doDraw(newPool, prizeQueue, prizeIdx + 1, newResults)
        }, 1500)
      }
    }, 50)
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  const currentPrize = buildPrizeQueue(prizes)[currentPrizeIdx]

  // ── Setup phase ──
  if (phase === 'setup') {
    return (
      <div className="min-h-screen p-4 md:p-6"><AnimatedBg />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm">← Back</button>
            <Logo size="sm" />
            <div className="text-2xl">🎰</div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-1">Lucky Draw</h1>
            <p className="text-slate-500 text-sm">Add participants &amp; prizes, then start the draw!</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Participants */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400 text-xs uppercase tracking-widest">Participants</p>
                <span className="text-cyan-400 text-xs bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">{participants.length} added</span>
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text" value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addParticipant()}
                  placeholder="Enter name…"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500/40 focus:outline-none text-white placeholder-slate-700 text-sm transition-all"
                />
                <button onClick={addParticipant}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all text-sm font-semibold">
                  + Add
                </button>
              </div>
              {participants.length === 0 ? (
                <div className="text-center py-8 text-slate-700 text-sm">No participants yet</div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {participants.map((name, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] group">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                        {name[0]?.toUpperCase()}
                      </div>
                      <span className="text-white text-sm flex-1">{name}</span>
                      <button onClick={() => removeParticipant(name)}
                        className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Prizes */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400 text-xs uppercase tracking-widest">Prizes</p>
                <span className="text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full">{totalPrizes} total</span>
              </div>
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 mb-4">
                {prizes.map((prize, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xl w-7 text-center">{PRIZE_EMOJIS[i % PRIZE_EMOJIS.length]}</span>
                    <input
                      type="text" value={prize.name}
                      onChange={e => updatePrize(i, 'name', e.target.value)}
                      placeholder="Prize name…"
                      className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/40 focus:outline-none text-white placeholder-slate-700 text-sm transition-all"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-slate-600 text-xs">×</span>
                      <input
                        type="number" value={prize.amount} min={1} max={99}
                        onChange={e => updatePrize(i, 'amount', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 px-2 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/40 focus:outline-none text-white text-sm text-center transition-all"
                      />
                    </div>
                    {prizes.length > 1 && (
                      <button onClick={() => removePrize(i)} className="text-slate-700 hover:text-red-400 transition-colors text-xs">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addPrize}
                className="w-full py-2 rounded-xl border border-dashed border-white/10 text-slate-600 hover:border-yellow-500/30 hover:text-yellow-400 transition-all text-sm">
                + Add prize
              </button>
            </GlassCard>
          </div>

          {/* Start button */}
          <div className="mt-6 text-center">
            <GlowButton
              onClick={startDraw}
              disabled={participants.length === 0 || !prizes.some(p => p.name.trim())}
              variant="gold" size="lg" className="px-16">
              🎰 Start Lucky Draw
            </GlowButton>
            {participants.length === 0 && <p className="text-slate-600 text-xs mt-2">Add at least 1 participant</p>}
          </div>
        </div>
      </div>
    )
  }

  // ── Drawing phase ──
  if (phase === 'drawing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
        <AnimatedBg />
        {/* Spinning rings */}
        <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full border border-yellow-500/5 animate-spin" style={{ animationDuration: '8s' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full border border-orange-500/8 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }} />
          <div className="absolute w-[300px] h-[300px] rounded-full border border-yellow-400/10 animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        <div className="relative z-10 w-full max-w-sm text-center space-y-8">
          {/* Prize being drawn */}
          {currentPrize && (
            <div className="space-y-1">
              <p className="text-slate-500 text-xs uppercase tracking-widest">Drawing for</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl">{currentPrize.emoji}</span>
                <span className="text-white text-2xl font-bold">{currentPrize.name}</span>
              </div>
              <p className="text-slate-600 text-xs">Prize {currentPrizeIdx + 1} of {buildPrizeQueue(prizes).length}</p>
            </div>
          )}

          {/* Slot machine display */}
          <GlassCard className="p-8 border-yellow-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 animate-pulse" />
            {/* Top/bottom fade masks */}
            <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-slate-950/80 to-transparent z-10" />
            <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-slate-950/80 to-transparent z-10" />

            <div className="relative z-20">
              <div className="text-6xl font-black tracking-tight py-4 min-h-[5rem] flex items-center justify-center">
                <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent" style={{ filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.5))' }}>
                  {drawingName || '…'}
                </span>
              </div>
            </div>

            {/* Scan line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent z-30" />
          </GlassCard>

          {/* Previous results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-slate-600 text-xs uppercase tracking-widest">Previous winners</p>
              {results.slice(-3).map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <span className="text-slate-400 text-sm">{r.winner}</span>
                  <span className="text-yellow-400 text-sm font-medium flex items-center gap-1.5"><span>{r.prize.emoji}</span>{r.prize.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Result phase ──
  return (
    <div className="min-h-screen p-4 md:p-6 overflow-hidden"><AnimatedBg />
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="absolute w-2 h-2 rounded-sm animate-bounce" style={{
            left: `${(i/30)*100}%`, top: `${-5 - (i%5)*3}%`,
            backgroundColor: ['#fbbf24','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#10b981'][i%6],
            animationDelay: `${(i*0.07) % 1}s`, animationDuration: `${0.6+(i%4)*0.15}s`,
            transform: `rotate(${i*15}deg)`,
          }} />
        ))}
      </div>

      <div className="relative z-20 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setPhase('setup')} className="text-slate-500 hover:text-white transition-colors text-sm">← Draw again</button>
          <Logo size="sm" />
          <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm">Home</button>
        </div>

        <div className="text-center mb-8 space-y-2">
          <div className="text-5xl animate-bounce" style={{ animationDuration: '1.5s' }}>🎉</div>
          <h2 className="text-3xl font-black text-white">Draw Complete!</h2>
          <p className="text-slate-500 text-sm">{results.length} winner{results.length !== 1 ? 's' : ''} selected</p>
        </div>

        <div className="space-y-3">
          {results.map((r, i) => (
            <GlassCard key={i} className="p-5 border-yellow-500/10">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{r.prize.emoji}</div>
                <div className="flex-1">
                  <div className="text-yellow-300 font-bold text-lg">{r.prize.name}</div>
                  <div className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5">
                    <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-xs font-bold text-white`}>{r.winner[0]?.toUpperCase()}</span>
                    {r.winner}
                  </div>
                </div>
                <div className="text-slate-700 font-mono text-sm">#{i+1}</div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <GlowButton onClick={() => { setPhase('setup'); setResults([]); setRemainingPool([]) }} variant="gold">🎰 Draw Again</GlowButton>
          <GlowButton onClick={onBack} variant="purple">🏠 Home</GlowButton>
        </div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [participantData, setParticipantData] = useState(null)
  const [groupData, setGroupData] = useState(null)
  const [initialJoinCode, setInitialJoinCode] = useState('')

  useEffect(() => {
    const code = getJoinCodeFromURL()
    if (code) { setInitialJoinCode(code.toUpperCase()); setScreen('participant-join'); clearJoinCodeFromURL() }
  }, [])

  const goHome = useCallback(() => { resetSocket(); setScreen('welcome'); setParticipantData(null); setGroupData(null); setInitialJoinCode('') }, [])
  const handleParticipantJoined = useCallback((data) => {
    setParticipantData(data)
    if (data.initialGroups && data.myGroupIndex >= 0) { setGroupData({ groups: data.initialGroups, myGroupIndex: data.myGroupIndex }); setScreen('participant-result') }
    else setScreen('participant-waiting')
  }, [])
  const handleGroupsAssigned = useCallback((data) => { setGroupData(data); setScreen('participant-result') }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {screen === 'welcome' && <WelcomeScreen onHost={() => setScreen('host')} onParticipant={() => setScreen('participant-join')} onLuckyDraw={() => setScreen('lucky-draw')} />}
      {screen === 'host' && <HostScreen onBack={goHome} />}
      {screen === 'participant-join' && <ParticipantJoinScreen onBack={goHome} onJoined={handleParticipantJoined} initialCode={initialJoinCode} />}
      {screen === 'participant-waiting' && participantData && <ParticipantWaitingScreen name={participantData.name} roomCode={participantData.roomCode} socketId={participantData.socketId} onGroupsAssigned={handleGroupsAssigned} />}
      {screen === 'participant-result' && participantData && groupData && <ParticipantResultScreen name={participantData.name} groups={groupData.groups} myGroupIndex={groupData.myGroupIndex} onBack={goHome} />}
      {screen === 'lucky-draw' && <LuckyDrawScreen onBack={goHome} />}
    </div>
  )
}
