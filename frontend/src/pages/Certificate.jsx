import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

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

  useEffect(() => {
    let active = true
    api
      .get(`/requests/${id}/certificate`)
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
  }, [id])

  if (loading) return <p className="hint">Loading certificate…</p>

  if (error || !data) {
    return (
      <div className="page center">
        <p className="error">{error || 'Certificate not found'}</p>
        <Link to="/journey" className="btn ghost">Back to My Journey</Link>
      </div>
    )
  }

  const { certificate, request } = data
  const donorName = request.matchedDonor?.name || user?.name

  return (
    <div className="page certificate-page">
      <div className="cert-actions no-print">
        <Link to="/journey" className="btn ghost">← My Journey</Link>
        <button className="btn primary" onClick={() => window.print()}>
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div className="certificate-sheet">
        <div className="cert-header">
          <div className="cert-logo">🩸 Redora</div>
          <div className="cert-title">Certificate of Appreciation</div>
          <div className="cert-sub">Where Technology Meets Life</div>
        </div>

        <div className="cert-seal">🩸</div>

        <p className="cert-body">
          This certificate is proudly presented to
        </p>
        <h1 className="cert-donor">{donorName}</h1>
        <p className="cert-body">
          for donating <strong>{request.bloodGroup}</strong> blood
          {request.units > 1 ? ` (${request.units} units)` : ''} to a patient at
          <strong> {request.hospital || 'Hospital'}</strong>, thereby helping save a life through
          the Redora blood donation platform.
        </p>

        <div className="cert-details">
          <div className="cert-detail">
            <span className="cert-detail-label">Certificate No.</span>
            <span className="cert-detail-value">{certificate.code}</span>
          </div>
          <div className="cert-detail">
            <span className="cert-detail-label">Blood Group</span>
            <span className="cert-detail-value">{request.bloodGroup}</span>
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
          <span className="cert-sign">The Redora Team</span>
          <span className="cert-stamp">Thank you for saving a life 💙</span>
        </div>
      </div>
    </div>
  )
}