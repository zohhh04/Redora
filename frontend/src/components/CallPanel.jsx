import { useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'

function peerId(requestId, userId) {
  return `tracking-${requestId}-${userId}`
}

function ringTone() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const ring = { ctx, interval: null }
  const beep = (start, dur) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 440
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.09, start + 0.03)
    gain.gain.setValueAtTime(0.09, start + dur - 0.03)
    gain.gain.linearRampToValueAtTime(0, start + dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + dur + 0.02)
  }
  ring.interval = setInterval(() => {
    const now = ctx.currentTime
    beep(now, 0.55)
    beep(now + 1.0, 0.55)
  }, 3000)
  return ring
}

function stopRing(ring) {
  if (!ring) return
  clearInterval(ring.interval)
  try {
    ring.ctx.close()
  } catch {}
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function CallPanel({ requestId, myId, otherId, otherName }) {
  const peerRef = useRef(null)
  const callRef = useRef(null)
  const localStreamRef = useRef(null)
  const ringRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const timerRef = useRef(null)

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)

  const endCall = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    stopRing(ringRef.current)
    ringRef.current = null
    try {
      if (callRef.current) callRef.current.close()
    } catch {}
    callRef.current = null
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    setMuted(false)
    setDuration(0)
    if (status !== 'inCall' && status !== 'incoming') {
      setStatus('idle')
      setError('')
    } else {
      setStatus('ended')
    }
  }

  useEffect(() => {
    if (!requestId || !myId) return

    const peer = new Peer(peerId(requestId, myId))
    peerRef.current = peer

    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        setError(`${otherName} is not online right now. Both of you need to be on this page to call.`)
        setStatus('idle')
      }
    })

    peer.on('call', (call) => {
      callRef.current = call
      ringRef.current = ringTone()
      setStatus('incoming')
      call.on('close', () => endCall())
      call.on('error', () => {
        stopRing(ringRef.current)
        ringRef.current = null
        setStatus('idle')
        setError('Call was interrupted')
      })
    })

    return () => {
      endCall()
      try {
        if (peerRef.current) peerRef.current.destroy()
      } catch {}
      peerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, myId])

  const startCall = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      setStatus('ringing')
      const call = peerRef.current.call(peerId(requestId, otherId), stream)
      callRef.current = call
      call.on('stream', (remoteStream) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream
        setStatus('inCall')
        setDuration(0)
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
      })
      call.on('close', () => endCall())
      call.on('error', () => {
        setError('Could not reach the other user')
        endCall()
      })
    } catch {
      setError('Microphone access is required to make a call')
      setStatus('idle')
    }
  }

  const acceptCall = async () => {
    stopRing(ringRef.current)
    ringRef.current = null
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      callRef.current.answer(stream)
      setStatus('inCall')
      setDuration(0)
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch {
      setError('Microphone access is required to answer')
      endCall()
    }
  }

  const declineCall = () => {
    stopRing(ringRef.current)
    ringRef.current = null
    setStatus('idle')
    if (callRef.current) {
      callRef.current.close()
      callRef.current = null
    }
  }

  const toggleMute = () => {
    if (!localStreamRef.current) return
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = muted
    })
    setMuted(!muted)
  }

  return (
    <div className="call-panel">
      <audio ref={remoteAudioRef} autoPlay />

      {status === 'inCall' && (
        <div className="call-bar">
          <span className="call-bar-info">
            <span className="call-live-dot"></span> On call with {otherName} · {formatDuration(duration)}
          </span>
          <div className="call-bar-actions">
            <button className={`call-ctl ${muted ? 'call-ctl-on' : ''}`} onClick={toggleMute}>
              {muted ? '🔇 Muted' : '🎙️ Mute'}
            </button>
            <button className="call-ctl call-end" onClick={endCall}>
              📵 End
            </button>
          </div>
        </div>
      )}

      {status === 'ringing' && (
        <div className="call-bar">
          <span className="call-bar-info">🔔 Calling {otherName}…</span>
          <button className="call-ctl call-end" onClick={endCall}>Cancel</button>
        </div>
      )}

      {status === 'idle' && (
        <button className="call-btn" onClick={startCall}>
          📞 Call {otherName}
        </button>
      )}

      {status === 'ended' && (
        <div className="call-bar">
          <span className="call-bar-info">Call ended</span>
          <button className="call-ctl" onClick={() => setStatus('idle')}>Call again</button>
        </div>
      )}

      {status === 'incoming' && (
        <div className="incoming-call">
          <p className="incoming-text">📞 Incoming call from {otherName}</p>
          <div className="incoming-actions">
            <button className="call-ctl call-accept" onClick={acceptCall}>Accept</button>
            <button className="call-ctl call-end" onClick={declineCall}>Decline</button>
          </div>
        </div>
      )}

      {error && <p className="call-error">{error}</p>}
    </div>
  )
}