import { useState, useEffect } from 'react'
import '../../styles/Modules.css'

const CAT_LABEL = { maintenance: '🔧 Maintenance', cleanliness: '🧹 Cleanliness', facilities: '🏫 Facilities', it_support: '💻 IT Support', safety: '🚨 Safety', other: '📋 Other' }
const CAT_DESCRIPTION = {
  maintenance: 'Electrical, classroom, plumbing, water supply, and lab equipment issues.',
  cleanliness: 'Classroom, washroom, and shared-area cleaning concerns.',
  facilities: 'Library help, room access, and campus facility assistance.',
  it_support: 'Wi-Fi, network access, and campus technology support.',
  safety: 'Campus safety concerns that need administrator attention.',
  other: 'General student support requests that do not fit another category.'
}

function CampusServices() {
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ category: 'maintenance', description: '', location: '' })
  const [error,    setError]    = useState('')
  const [msg,      setMsg]      = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/campus-services')
      const data = await res.json()
      if (data.success) setRequests(data.requests)
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setLoading(false) }
  }

  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res  = await fetch('/api/campus-services', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        showMsg('Request submitted!'); setShowForm(false)
        setForm({ category: 'maintenance', description: '', location: '' })
        load()
      } else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setSaving(false) }
  }

  function showMsg(m) { setMsg(m); setTimeout(() => setMsg(''), 3500) }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const openCount = requests.filter(r => r.status === 'submitted' || r.status === 'in_progress').length

  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">🏫 Smart Campus Services</div>
          <div className="mod-subtitle">Report maintenance issues, IT problems, or other campus service requests.</div>
        </div>
        <button className="mod-btn mod-btn--primary" onClick={() => setShowForm(f => !f)}>
          {showForm ? '× Cancel' : '+ New Request'}
        </button>
      </div>

      <div className="mod-grid-2" aria-label="Available campus service categories" style={{ marginBottom: '16px' }}>
        {Object.entries(CAT_LABEL).map(([key, label]) => <div className="mod-card" key={key} style={{ padding: '12px 16px' }}>
          <strong>{label}</strong><div className="mod-card__body" style={{ marginTop: '4px' }}>{CAT_DESCRIPTION[key]}</div>
        </div>)}
      </div>

      {openCount > 0 && (
        <div className="mod-toast mod-toast--info" style={{ marginBottom: '16px' }}>
          📋 You have {openCount} active request{openCount !== 1 ? 's' : ''}. The administration will respond soon.
        </div>
      )}

      {msg   && <div className="mod-toast mod-toast--success">✓ {msg}</div>}
      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {showForm && (
        <form className="mod-form" onSubmit={submit}>
          <div className="mod-form__title">Submit a Campus Service Request</div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Category *</label>
            <select className="form-select" value={form.category} onChange={e => fld('category', e.target.value)}>
              {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Description *</label>
            <textarea className="form-input" rows={4} value={form.description} onChange={e => fld('description', e.target.value)}
              placeholder="Describe the issue in detail…" required />
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Location</label>
            <input className="form-input" value={form.location} onChange={e => fld('location', e.target.value)} placeholder="e.g. Block A, Lab 203" />
          </div>
          <div className="mod-form-actions">
            <button type="submit" className="mod-btn mod-btn--primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
            <button type="button" className="mod-btn mod-btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="mod-loading"><div className="mod-spinner" /><span>Loading…</span></div>
      ) : requests.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">🏫</div>
          <div className="mod-empty__title">No requests yet</div>
          <div className="mod-empty__sub">Submit a request for maintenance, IT support, or other campus services.</div>
        </div>
      ) : (
        <div className="mod-list">
          {requests.map(r => (
            <div key={r.id} className="mod-card">
              <div className="mod-card__header">
                <div className="mod-card__title">{CAT_LABEL[r.category] || r.category}</div>
                <span className={`chip chip-${r.status}`}>{r.status.replace('_', ' ')}</span>
              </div>
              <div className="mod-card__body">{r.description}</div>
              <div className="mod-card__meta">
                {r.location && <span>📍 {r.location}</span>}
                <span>📅 {new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.admin_note && (
                <div className="mod-toast mod-toast--info" style={{ marginTop: '8px', padding: '8px 12px' }}>
                  💬 Admin note: {r.admin_note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CampusServices
