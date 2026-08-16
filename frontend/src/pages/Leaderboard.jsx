import { useEffect, useState } from 'react'
import api from '../api/axios'

function medal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export default function Leaderboard() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    api
      .get('/leaderboard')
      .then(({ data }) => setRows(data.leaderboard || []))
      .catch(() => {})
  }, [])

  return (
    <div className="page page-wide">
      <div className="donor-stats-hero overview-hero">
        <div className="donor-stats-hero-head">
          <div>
            <h2>🏆 Leaderboard</h2>
            <p className="hint">Our most generous donors — every drop of blood counts.</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-head-icon">🏆</span>
          <h3>Top Donors</h3>
          <span className="card-head-live">{rows.length} ranked</span>
        </div>
        <div className="lb-list">
          {rows.map((r) => (
            <div className={`lb-row ${r.rank <= 3 ? 'podium' : ''}`} key={r.rank}>
              <span className="lb-rank">{medal(r.rank)}</span>
              <div className="lb-info">
                <strong className="lb-name">{r.name}</strong>
                <span className="lb-sub">
                  {r.city} · {r.bloodGroup}
                  {r.availableForEmergencies ? ' · 🚨 on-call' : ''}
                </span>
              </div>
              <span className="lb-count">
                <strong>{r.donationCount}</strong> donations
              </span>
            </div>
          ))}
        </div>
        {rows.length === 0 && <p className="hint">No donations recorded yet.</p>}
      </div>
    </div>
  )
}