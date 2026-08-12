import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function MessagePanel({ requestId, otherName }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
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
  }, [messages])

  const mine = (m) => String(m.from?._id) === String(user?.id)

  const send = async (e) => {
    e.preventDefault()
    setError('')
    const value = text.trim()
    if (!value) return
    try {
      await api.post(`/requests/${requestId}/messages`, { text: value })
      setText('')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send message')
    }
  }

  return (
    <div className="chat-panel">
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
      <form className="chat-form" onSubmit={send}>
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
  )
}