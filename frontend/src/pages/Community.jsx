import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const TYPE_META = {
  post: { icon: '💬', label: 'Post' },
  need: { icon: '🆘', label: 'Need' },
  success: { icon: '🎉', label: 'Success' },
  appreciation: { icon: '❤️', label: 'Thanks' },
}

export default function Community() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [text, setText] = useState('')
  const [type, setType] = useState('post')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const load = () =>
    api
      .get('/community')
      .then(({ data }) => setPosts(data.posts || []))
      .catch(() => {})

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    if (!text.trim()) return
    try {
      await api.post('/community', { text: text.trim(), type })
      setText('')
      setMsg('Posted to the community!')
      load()
    } catch (err) {
      setErr(err.response?.data?.message || 'Could not post')
    }
  }

  const like = async (id) => {
    try {
      const { data } = await api.patch(`/community/${id}/like`)
      setPosts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, likes: data.likes, likedByMe: data.liked } : p)),
      )
    } catch {}
  }

  return (
    <div className="page page-wide">
      <div className="donor-stats-hero overview-hero">
        <div className="donor-stats-hero-head">
          <div>
            <h2>Community Feed</h2>
            <p className="hint">Share successes, ask for help, and appreciate your fellow lifesavers.</p>
          </div>
        </div>
      </div>

      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <form className="card" onSubmit={submit}>
        <div className="card-head">
          <span className="card-head-icon">✍️</span>
          <h3>Share an update</h3>
        </div>
        <div className="cm-type-row">
          {Object.entries(TYPE_META).map(([k, v]) => (
            <button
              key={k}
              type="button"
              className={`cm-type-btn ${type === k ? 'active' : ''}`}
              onClick={() => setType(k)}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
        <textarea
          className="field cm-textarea"
          placeholder="Tell the community something…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength="1000"
        />
        <div className="dashboard-actions">
          <button className="btn primary" type="submit">
            Post
          </button>
        </div>
      </form>

      <div className="cm-list">
        {posts.map((p) => {
          const meta = TYPE_META[p.type] || TYPE_META.post
          const liked = p.likedByMe || p.likes?.some((l) => String(l) === String(user?.id))
          return (
            <div className="cm-post" key={p._id}>
              <div className="cm-post-head">
                <span className="cm-avatar">
                  {p.author?.name?.charAt(0) || '?'}
                </span>
                <div className="cm-post-info">
                  <strong className="cm-author">{p.author?.name || 'Anonymous'}</strong>
                  <span className="cm-sub">
                    {p.author?.bloodGroup || '—'} · {p.author?.city || '—'}
                  </span>
                </div>
                <span className="cm-type-pill">{meta.icon} {meta.label}</span>
              </div>
              <p className="cm-text">{p.text}</p>
              <div className="cm-post-foot">
                <button
                  type="button"
                  className={`cm-like ${liked ? 'liked' : ''}`}
                  onClick={() => like(p._id)}
                >
                  {liked ? '❤️' : '🤍'} {p.likes?.length || 0}
                </button>
                <span className="cm-time">
                  {new Date(p.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )
        })}
        {posts.length === 0 && <p className="hint">No posts yet — be the first to share.</p>}
      </div>
    </div>
  )
}