import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function MessagePanel({ requestId, otherName }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const panelRef = useRef(null)
  const modalRef = useRef(null)
  const boxRef = useRef(null)

  const load = async () => {
    try {
      const { data } = await api.get(`/requests/${requestId}/messages`)
      setMessages(data.messages)
    } catch {}
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 4000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [messages, open])

  const openChat = () => {
    if (panelRef.current) {
      const r = panelRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const above = r.bottom + 480 > vh
      const x = Math.max(12, vw - r.right)
      setPos(above ? { bottom: vh - r.top + 12, right: x } : { top: r.bottom + 12, right: x })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target) &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const mine = (m) => String(m.from?._id) === String(user?.id)

  const lastMsg = messages[messages.length - 1]

  const send = async (e) => {
    e.preventDefault()
    setError('')
    const value = text.trim()
    if (!value) return
    try {
      await api.post(`/requests/${requestId}/messages`, { text: value })
      setText('')
      openChat()
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send message')
    }
  }

  return (
    <div className="chat-panel" ref={panelRef}>
      <div className="chat-mini">
        <div className="chat-mini-meta">
          {lastMsg ? (
            <>
              <span className="chat-mini-from">{mine(lastMsg) ? 'You' : lastMsg.from?.name || otherName}</span>
              <span className="chat-mini-preview">{lastMsg.text}</span>
            </>
          ) : (
            <span className="chat-mini-preview">No messages yet</span>
          )}
        </div>
        <form className="chat-mini-form" onSubmit={send}>
          <input
            placeholder={`Message ${otherName}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength="500"
          />
          <button className="btn primary btn-sm" type="submit">
            Send
          </button>
          <button
            type="button"
            className="btn ghost btn-sm"
            onClick={openChat}
            aria-label="Open chat"
          >
            💬
          </button>
        </form>
      </div>

      {open && pos && (
        <div className="chat-modal-wrap" ref={modalRef} style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}>
          <div className="chat-modal">
            <div className="chat-modal-head">
              <span className="chat-modal-title">💬 {otherName}</span>
              <button type="button" className="chat-modal-close" onClick={() => setOpen(false)} aria-label="Close chat">
                ✕
              </button>
            </div>
            <div className="chat-modal-body">
              <div className="chat-box" ref={boxRef}>
                {messages.length === 0 && (
                  <p className="chat-empty">No messages yet. Say hi to {otherName}.</p>
                )}
                {messages.map((m) => (
                  <div key={m._id} className={`chat-msg ${mine(m) ? 'mine' : 'theirs'}`}>
                    <span className="chat-name">{mine(m) ? 'You' : m.from?.name || otherName}</span>
                    <span className="chat-bubble">{m.text}</span>
                    <span className="chat-time">
                      {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <form className="chat-form chat-modal-foot" onSubmit={send}>
              <input
                placeholder={`Message ${otherName}…`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength="500"
              />
              <button className="btn primary btn-sm" type="submit">
                Send
              </button>
            </form>
            {error && <p className="call-error">{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}