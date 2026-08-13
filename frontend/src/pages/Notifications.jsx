import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTimeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return formatDate(date)
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.notifications || [])
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [load])

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
    } catch {}
  }

  const markAllRead = async () => {
    setMsg('')
    setError('')
    try {
      await api.patch('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setMsg('All notifications marked as read')
    } catch {
      setError('Could not update notifications')
    }
  }

  const respond = async (id, action) => {
    setMsg('')
    setError('')
    setBusyId(id)
    try {
      const { data } = await api.patch(`/requests/${id}/respond`, { action })
      if (action === 'accept') {
        navigate(`/tracking/donor/${id}`)
      } else {
        setMsg(data.message)
        load()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  const unread = notifications.filter((n) => !n.read)

  return (
    <div className="page page-wide">
      <div className="dashboard-head">
        <div>
          <h2>Notifications</h2>
          <p className="hint">
            {unread.length > 0 ? `${unread.length} unread notification${unread.length > 1 ? 's' : ''}` : 'You are all caught up'}
          </p>
        </div>
        <button type="button" className="btn ghost btn-sm" onClick={markAllRead} disabled={unread.length === 0}>
          Mark all read
        </button>
      </div>

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="hint">Loading notifications…</p>
      ) : notifications.length === 0 ? (
        <div className="card empty-request-box">
          <span className="droplet-icon">🔔</span>
          <p>No notifications yet. You'll be notified here when a blood request needs your help.</p>
          <Link to="/dashboard" className="btn ghost">
            Back to Dashboard
          </Link>
        </div>
      ) : (
        <div className="card">
          <div className="notif-list">
            {notifications.map((n) => {
              const r = n.request
              const open = r && r.status === 'open'
              return (
                <div
                  key={n._id}
                  className={`notif-row ${n.read ? '' : 'notif-unread'}`}
                  onClick={() => !n.read && markRead(n._id)}
                >
                  <div className="notif-row-left">
                    <span className="notif-row-icon">{n.type === 'blood-request' ? '🩸' : '🔔'}</span>
                  </div>
                  <div className="notif-row-body">
                    <p className="notif-row-title">{n.title}</p>
                    <p className="notif-row-text">{n.body}</p>
                    <div className="notif-row-meta">
                      <span className={`notif-read ${n.read ? 'read' : ''}`}>{n.read ? 'Read' : 'New'}</span>
                      <span className="notif-row-time">{formatTimeAgo(n.createdAt)}</span>
                    </div>

                    {n.type === 'blood-request' && open && (
                      <div className="request-actions notif-actions">
                        <button
                          className="btn primary btn-sm"
                          disabled={busyId === r._id}
                          onClick={(e) => {
                            e.stopPropagation()
                            respond(r._id, 'accept')
                          }}
                        >
                          Accept
                        </button>
                        <button
                          className="btn ghost btn-sm"
                          disabled={busyId === r._id}
                          onClick={(e) => {
                            e.stopPropagation()
                            respond(r._id, 'decline')
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {n.type === 'blood-request' && r && !open && (
                      <div className="request-actions notif-actions">
                        <Link
                          to={`/tracking/donor/${r._id}`}
                          className="btn ghost btn-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Journey
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}