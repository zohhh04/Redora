import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const ELIGIBLE_MS = 60 * 24 * 60 * 60 * 1000

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function Donations() {
  const { user, updateUser } = useAuth()
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [newIds, setNewIds] = useState(new Set())
  const seenRef = useRef(new Set())
  const firstLoadRef = useRef(true)

  const load = async () => {
    try {
      const [{ data }, me] = await Promise.all([
        api.get('/donors/my-donations'),
        api.get('/auth/me'),
      ])
      const list = data.donations || []
      const fresh = new Set(list.map((d) => String(d.id)))
      if (firstLoadRef.current) {
        firstLoadRef.current = false
      } else {
        const newlyAdded = list.filter((d) => !seenRef.current.has(String(d.id)))
        if (newlyAdded.length > 0) {
          setNewIds(new Set(newlyAdded.map((d) => String(d.id))))
        }
      }
      seenRef.current = fresh
      setDonations(list)
      updateUser(me.user)
      setLastSync(new Date())
    } catch {
      // keep previous results if a refresh fails
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lives = donations.length * 3
  const totalUnits = donations.reduce((sum, d) => sum + (d.units || 1), 0)
  const eligible = user?.isEligible
  const lastDonation = user?.lastDonationDate
  const nextEligibleDate = lastDonation
    ? new Date(new Date(lastDonation).getTime() + ELIGIBLE_MS)
    : null

  return (
    <div className="page page-wide donations-page">
      <div className="donor-stats-hero">
        <div className="donor-stats-hero-head">
          <div>
            <h2>My Donation History</h2>
            <p className="hint">Every drop counts — here's your life-saving impact</p>
          </div>
          <span className="live-badge live-green">
            <span className="live-dot"></span>
            Live · synced {lastSync ? formatTime(lastSync) : '…'}
          </span>
        </div>

        <div className="donor-stats-grid">
          <div className="donor-stat-card">
            <span className="donor-stat-ico">🩸</span>
            <div className="donor-stat-body">
              <strong>{donations.length}</strong>
              <span>Total Donations</span>
            </div>
          </div>
          <div className="donor-stat-card">
            <span className="donor-stat-ico">🧬</span>
            <div className="donor-stat-body">
              <strong>{user?.bloodGroup || '—'}</strong>
              <span>Blood Group</span>
            </div>
          </div>
          <div className="donor-stat-card accent">
            <span className="donor-stat-ico">❤️</span>
            <div className="donor-stat-body">
              <strong>{lives}</strong>
              <span>Lives Impacted</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`eligibility-banner ${eligible ? 'ok' : 'wait'}`}>
        <span className="eligibility-ico">{eligible ? '✅' : '⏳'}</span>
        <div className="eligibility-body">
          <strong>
            {eligible
              ? 'You are eligible to donate again'
              : nextEligibleDate
                ? 'Next donation window coming up'
                : 'Donation eligibility'}
          </strong>
          <span>
            {eligible
              ? 'It has been more than 2 months since your last donation — you can save another life today.'
              : nextEligibleDate
                ? `You last donated on ${formatDate(lastDonation)}. You can donate again after ${formatDate(nextEligibleDate)}.`
                : 'A 2-month gap between donations keeps you healthy and safe.'}
          </span>
        </div>
        {eligible && (
          <Link to="/requests" className="btn primary btn-sm">
            Find a Request
          </Link>
        )}
      </div>

      {loading && <p className="hint">Loading your donation history…</p>}

      <div className="card">
        <div className="card-head">
          <span className="card-head-icon">🩸</span>
          <h3>Donation Timeline</h3>
          <span className="card-head-live">
            {donations.length} donation{donations.length === 1 ? '' : 's'} · {totalUnits} unit{totalUnits === 1 ? '' : 's'} donated
          </span>
        </div>

        {!loading && donations.length === 0 ? (
          <div className="empty-request-box">
            <div className="droplet-icon">🩸</div>
            <p>
              No donations yet. Your life-saving history will appear here as soon as you complete one.
            </p>
            <Link to="/requests" className="btn primary">
              Browse Requests
            </Link>
          </div>
        ) : (
          <div className="donation-timeline">
            {donations.map((d, i) => (
              <div
                key={d.id}
                className={`donation-item ${newIds.has(String(d.id)) ? 'donation-new' : ''}`}
              >
                <div className="donation-item-track">
                  <span className="donation-item-dot">🩸</span>
                  {i < donations.length - 1 && <span className="donation-item-line" />}
                </div>
                <div className="donation-item-body">
                  <div className="donation-item-top">
                    <span className="donation-item-date">
                      <strong>{formatDate(d.date)}</strong>
                      <small>{formatTime(d.date)}</small>
                    </span>
                    <span className="donation-blood">{d.bloodGroup}</span>
                    {d.urgency && (
                      <span className={`urgency-badge ${d.urgency}`}>
                        {d.urgency === 'emergency' ? '🚨' : '🕐'} {d.urgency}
                      </span>
                    )}
                    <span className="donation-item-status">✓ Completed</span>
                  </div>
                  <div className="donation-item-meta">
                    <span>🏥 {d.hospital || 'Hospital'}</span>
                    <span>
                      📍 {d.city || '—'}
                      {d.area ? `, ${d.area}` : ''}
                    </span>
                    <span>👤 {d.patientName || 'Patient'}</span>
                    <span>
                      🩸 {d.units || 1} unit{(d.units || 1) > 1 ? 's' : ''}
                    </span>
                  </div>
                  {d.certificateCode && (
                    <div className="donation-item-foot">
                      <Link to={`/certificate/${d.id}`} className="btn ghost btn-sm">
                        🏅 View Certificate · {d.certificateCode}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}