import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { startNotifLoop, stopNotifLoop } from '../utils/notifSound'

export default function NotificationPopup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [alert, setAlert] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const seenIds = useRef(new Set())
  const soundStarted = useRef(false)

  useEffect(() => {
    if (user?.role !== 'donor') return
    let active = true
    const load = () =>
      api
        .get('/notifications', { params: { unread: 'true' } })
        .then(({ data }) => {
          if (!active) return
          const list = data.notifications || []
          const open = list.find(
            (n) =>
              n.type === 'blood-request' &&
              n.request &&
              n.request.status === 'open' &&
              !seenIds.current.has(n._id),
          )
          if (open) {
            seenIds.current.add(open._id)
            setAlert(open)
          }
        })
        .catch(() => {})
    load()
    const timer = setInterval(load, 4000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [user?.role])

  useEffect(() => {
    if (alert && !soundStarted.current) {
      soundStarted.current = true
      startNotifLoop()
    }
    if (!alert && soundStarted.current) {
      soundStarted.current = false
      stopNotifLoop()
    }
  }, [alert])

  useEffect(() => () => stopNotifLoop(), [])

  if (!alert) return null

  const r = alert.request

  const respond = async (action) => {
    setBusy(true)
    setMsg('')
    try {
      await api.patch(`/requests/${r._id}/respond`, { action })
      setAlert(null)
      if (action === 'accept') navigate(`/tracking/donor/${r._id}`)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Action failed')
      if (err.response?.status === 400 || err.response?.status === 404) {
        setAlert(null)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="notif-popup-overlay">
      <div className="notif-popup">
        <div className="notif-popup-head">
          <span className="notif-popup-bell">🔔</span>
          <span className={`urgency-badge ${r.urgency}`}>
            {r.urgency === 'emergency' ? '🚨' : '🕐'} {r.urgency}
          </span>
        </div>
        <h3 className="notif-popup-title">{alert.title}</h3>
        <p className="notif-popup-body">{alert.body}</p>
        <div className="notif-popup-meta">
          <span>🏥 {r.hospital || 'Hospital'}</span>
          <span>
            📍 {r.city || '—'}
            {r.area ? `, ${r.area}` : ''}
          </span>
          <span>
            🩸 {r.units} unit{r.units > 1 ? 's' : ''}
          </span>
          <span>🩸 {r.bloodGroup}</span>
        </div>
        {msg && <p className="error">{msg}</p>}
        <div className="notif-popup-actions">
          <button className="btn primary" disabled={busy} onClick={() => respond('accept')}>
            Accept
          </button>
          <button className="btn ghost" disabled={busy} onClick={() => respond('decline')}>
            Decline
          </button>
          <button className="btn ghost" disabled={busy} onClick={() => respond('delay')}>
            ⏰ Delay 30 min
          </button>
        </div>
      </div>
    </div>
  )
}
