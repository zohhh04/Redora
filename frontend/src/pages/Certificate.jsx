import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
]

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Certificate() {
  const { id } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lang, setLang] = useState('en')

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get(`/requests/${id}/certificate`, { params: { lang } })
      .then(({ data }) => {
        if (active) setData(data)
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load certificate')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, lang])

  if (loading) return <p className="hint">Loading certificate…</p>

  if (error || !data) {
    return (
      <div className="page center">
        <p className="error">{error || 'Certificate not found'}</p>
        <Link to="/journey" className="btn ghost">Back to My Journey</Link>
      </div>
    )
  }

  const { certificate, request, narrative } = data
  const donorName = request.matchedDonor?.name || user?.name

  return (
    <div className="page certificate-page">
      <div className="cert-actions no-print">
        <Link to="/journey" className="btn ghost">← My Journey</Link>
        <select
          className="cert-lang"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          title="Certificate language"
          aria-label="Certificate language"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              🌐 {l.label}
            </option>
          ))}
        </select>
        <button className="btn primary" onClick={() => window.print()}>
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div className="certificate-sheet">
        <span className="cert-corner tl" />
        <span className="cert-corner tr" />
        <span className="cert-corner bl" />
        <span className="cert-corner br" />

        <div className="cert-header">
          <div className="cert-org">
            <span className="cert-org-ico">🩸</span>
            Redora
          </div>
          <span className="cert-kicker">Official Recognition</span>
          <h1 className="cert-title">Certificate of Appreciation</h1>
          <span className="cert-rule" />
        </div>

        <div className="cert-seal">🩸</div>

        <p className="cert-body">This certificate is proudly presented to</p>
        <h2 className="cert-donor">{donorName}</h2>
        {narrative ? (
          <p className="cert-body cert-narrative">{narrative}</p>
        ) : (
          <p className="cert-body">
            in recognition of your generous blood donation of
            <strong> {request.bloodGroup}</strong>
            {request.units > 1 ? ` (${request.units} units)` : ''} at
            <strong> {request.hospital || 'Hospital'}</strong>, helping save a life through the Redora
            blood donation platform.
          </p>
        )}

        <div className="cert-details">
          <div className="cert-detail">
            <span className="cert-detail-label">Blood Group</span>
            <span className="cert-detail-value">{request.bloodGroup}</span>
          </div>
          <div className="cert-detail">
            <span className="cert-detail-label">Units Donated</span>
            <span className="cert-detail-value">{request.units || 1}</span>
          </div>
          <div className="cert-detail">
            <span className="cert-detail-label">Patient</span>
            <span className="cert-detail-value">{request.patientName || request.patient?.name || 'Patient'}</span>
          </div>
          <div className="cert-detail">
            <span className="cert-detail-label">Issued On</span>
            <span className="cert-detail-value">{formatDate(certificate.issuedAt)}</span>
          </div>
        </div>

        <div className="cert-footer">
          <div className="cert-sign-block">
            <span className="cert-sign">The Redora Team</span>
            <span className="cert-sign-label">Authorized Signature</span>
          </div>
          <div className="cert-footer-right">
            <span className="cert-stamp">♥ Thank you for saving a life</span>
            <span className="cert-verify">Verify · {certificate.code}</span>
          </div>
        </div>
      </div>
    </div>
  )
}