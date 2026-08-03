import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function formatDate(date) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Donations() {
  const { user } = useAuth()
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get('/donors/my-donations')
      .then(({ data }) => {
        if (active) setDonations(data.donations || [])
      })
      .catch(() => {
        if (active) setDonations([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="page page-wide">
      <div className="dashboard-head">
        <div>
          <h2>Donation History</h2>
          <p className="hint">Your completed donations with Redora</p>
        </div>
      </div>

      <div className="card">
        <h3>Lifetime Summary</h3>
        <div className="stat-tiles">
          <div className="stat-tile">
            <span className="stat-tile-label">Total Donations</span>
            <span className="stat-tile-value">{user?.donationCount ?? 0}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile-label">Blood Group</span>
            <span className="stat-tile-value">{user?.bloodGroup || '—'}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile-label">Lives Impacted</span>
            <span className="stat-tile-value">{(user?.donationCount ?? 0) * 3}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Donations</h3>
        {loading ? (
          <p className="hint">Loading your donation history...</p>
        ) : donations.length ? (
          <div className="donation-list">
            {donations.map((d, i) => (
              <div key={i} className="donation-row">
                <span className="donation-date">{formatDate(d.date)}</span>
                <span className="donation-blood">{d.bloodGroup}</span>
                <span className="donation-hospital">{d.hospital || '—'}</span>
                <span className="donation-status">{d.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="hint">No donations yet. Your history will appear here.</p>
        )}
      </div>
    </div>
  )
}
