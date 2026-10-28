/**
 * Scholarships.jsx — Scholarships module
 *
 * A focused view of the opportunities table filtered to type='scholarship'.
 * Students can browse scholarships, save them, and track application status.
 * Deadline urgency is colour-coded.
 */
import { useState, useEffect } from 'react'
import '../../styles/Modules.css'

const STATUS_CHIP = { interested: 'chip-interested', applied: 'chip-applied', submitted: 'chip-applied', under_review: 'chip-applied', shortlisted: 'chip-shortlisted', interview: 'chip-shortlisted', rejected: 'chip-rejected', selected: 'chip-selected' }

function deadlineBadge(dl) {
  if (!dl) return null
  const days = Math.ceil((new Date(dl) - new Date()) / (1000 * 60 * 60 * 24))
  if (days < 0)   return <span className="badge badge-gray">Expired</span>
  if (days <= 7)  return <span className="badge badge-red">🔴 {days}d left</span>
  if (days <= 30) return <span className="badge badge-yellow">🟡 {days}d left</span>
  return <span className="badge badge-green">{new Date(dl).toLocaleDateString()}</span>
}

function Scholarships() {
  const [scholarships, setScholarships] = useState([])
  const [tab,          setTab]          = useState('all')   // 'all' | 'saved'
  const [search,       setSearch]       = useState('')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [msg,          setMsg]          = useState('')
  const [msgType, setMsgType] = useState('success')
  const [resume, setResume] = useState(null)
  const [submitting, setSubmitting] = useState(null)
  const [applications, setApplications] = useState([])

  useEffect(() => { load() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load(overrides = {}) {
    setLoading(true)
    setError('')
    const currentTab = overrides.tab !== undefined ? overrides.tab : tab
    try {
      let url
      if (currentTab === 'saved') {
        // Saved list — filter client-side for scholarships only
        url = '/api/opportunities/saved'
      } else if (currentTab === 'applications') {
        url = '/api/opportunities/applications'
      } else {
        const q = new URLSearchParams()
        q.set('type', 'scholarship')
        const s = overrides.q !== undefined ? overrides.q : search
        if (s) q.set('q', s)
        url = '/api/opportunities?' + q
      }
      const res  = await fetch(url)
      const data = await res.json()
      if (!data.success) { setError(data.message || 'Failed to load.'); return }
      let list = data.opportunities || data.saved || data.applications || []
      // When fetching saved, filter to scholarship type only
      if (currentTab === 'saved') list = list.filter(o => o.type === 'scholarship')
      if (currentTab === 'applications') setApplications(list.filter(item => item.type === 'scholarship'))
      else setScholarships(list)
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }

  async function toggleSave(item) {
    try {
      const res  = await fetch(`/api/opportunities/${item.id}/save`, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not update saved scholarship.')
      flash(data.message)
      setScholarships(prev => tab === 'saved'
        ? prev.filter(o => o.id !== item.id)
        : prev.map(o => o.id === item.id ? { ...o, is_saved: data.saved ? 1 : 0 } : o))
    } catch (error) { flash(error.message || 'Could not update saved scholarship.', 'error') }
  }

  async function submitApplication(item) {
    if (!resume) { flash('Choose a PDF resume first.', 'error'); return }
    if (resume.type !== 'application/pdf' || !resume.name.toLowerCase().endsWith('.pdf')) { flash('Resume must be a PDF file.', 'error'); return }
    if (!resume.size || resume.size > 5 * 1024 * 1024) { flash('Resume must be between 1 byte and 5 MB.', 'error'); return }
    setSubmitting(item.id)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
        reader.onerror = () => reject(new Error('Could not read the selected resume.'))
        reader.readAsDataURL(resume)
      })
      const res  = await fetch(`/api/opportunities/${item.id}/apply`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: { fileName: resume.name, mimeType: resume.type, base64 } }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not submit your application.')
      flash(data.message)
      setScholarships(prev => prev.map(o => o.id === item.id ? { ...o, application_status: data.status } : o))
      setResume(null)
    } catch (error) { flash(error.message || 'Network error while submitting.', 'error') }
    finally { setSubmitting(null) }
  }

  function flash(m, type = 'success') { setMsgType(type); setMsg(m); setTimeout(() => setMsg(''), 3000) }

  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">🎓 Scholarships</div>
          <div className="mod-subtitle">
            Find scholarships, track deadlines, and manage your applications.
          </div>
        </div>
      </div>

      {msg && <div className={`mod-toast mod-toast--${msgType}`} role={msgType === 'error' ? 'alert' : 'status'}>{msgType === 'success' ? '✓ ' : '⚠️ '}{msg}</div>}

      {/* Tabs */}
      <div className="mod-tabs">
        {[['all', 'All Scholarships'], ['saved', 'Saved'], ['applications', 'My Applications']].map(([v, l]) => (
          <button
            key={v}
            className={`mod-tab ${tab === v ? 'active' : ''}`}
            onClick={() => { setTab(v); load({ tab: v }) }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Search bar (all tab only) */}
      {tab === 'all' && (
        <form
          className="mod-toolbar"
          onSubmit={e => { e.preventDefault(); load({ q: search }) }}
        >
          <div className="mod-search">
            <span>🔎</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search scholarships, organisations…"
            />
          </div>
          <button type="submit" className="mod-btn mod-btn--primary">Search</button>
        </form>
      )}

      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {loading ? (
        <div className="mod-loading"><div className="mod-spinner" /><span>Loading scholarships…</span></div>
      ) : tab === 'applications' ? applications.length === 0 ? (
        <div className="mod-empty"><div className="mod-empty__icon">🎓</div><div className="mod-empty__title">No scholarship applications</div><div className="mod-empty__sub">Your submitted scholarship applications will appear here.</div></div>
      ) : <div className="mod-list">{applications.map(application => <article className="mod-card" key={application.id}>
        <div className="mod-card__title">{application.title}</div><div className="mod-card__meta"><span className="chip chip-applied">{application.status.replaceAll('_', ' ')}</span><span>Submitted {application.applied_at ? new Date(application.applied_at).toLocaleString() : '—'}</span><span>{application.resume_original_name || 'No resume'}</span></div>
        {application.resume_original_name && <a className="mod-btn mod-btn--secondary mod-btn--sm" href={`/api/opportunities/applications/${application.id}/resume`} target="_blank" rel="noreferrer">View my resume</a>}
        {application.reviewer_feedback && <div className="mod-card__body"><strong>Reviewer feedback:</strong> {application.reviewer_feedback}</div>}
      </article>)}</div> : scholarships.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">🎓</div>
          <div className="mod-empty__title">
            {tab === 'saved' ? 'No saved scholarships' : 'No scholarships found'}
          </div>
          <div className="mod-empty__sub">
            {tab === 'saved'
              ? 'Save a scholarship to track it here quickly.'
              : 'Scholarships are posted by faculty or admin. Check back later.'}
          </div>
        </div>
      ) : (
        <div className="mod-list">
          {scholarships.map(o => (
            <div key={o.id} className="mod-card">
              {!o.is_verified && (
                <div
                  className="mod-toast mod-toast--warn"
                  style={{ marginBottom: '8px', padding: '8px 12px', fontSize: 'var(--text-xs)' }}
                >
                  ⚠️ Sample data — not a verified listing
                </div>
              )}

              <div className="mod-card__header">
                <div>
                  <div className="mod-card__title">{o.title}</div>
                  {o.company_or_org && (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {o.company_or_org}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span className="badge badge-green">scholarship</span>
                  {o.application_status && (
                    <span className={`chip ${STATUS_CHIP[o.application_status] || ''}`}>
                      {o.application_status}
                    </span>
                  )}
                </div>
              </div>

              {o.description && <div className="mod-card__body">{o.description}</div>}

              <div className="mod-card__meta">
                {o.eligibility && <span>📋 {o.eligibility}</span>}
                {o.location && <span>📍 {o.location}{o.work_mode && ` (${o.work_mode})`}</span>}
                {o.skills && <span>🛠 {o.skills}</span>}
                {o.stipend     && <span>💰 {o.stipend}</span>}
                {deadlineBadge(o.deadline)}
              </div>

              <div className="mod-card__actions">
                <button
                  className={`mod-btn mod-btn--save mod-btn--sm ${o.is_saved ? 'saved' : ''}`}
                  onClick={() => toggleSave(o)}
                >
                  {o.is_saved ? '🔖 Saved' : '🔖 Save'}
                </button>

                {o.application_status && (o.application_resume_name || !['interested', 'applied'].includes(o.application_status)) ? <span className="chip chip-applied">{o.application_status.replaceAll('_', ' ')}</span> : <>
                  <label className="mod-btn mod-btn--secondary mod-btn--sm">Choose PDF resume<input type="file" accept="application/pdf,.pdf" hidden onChange={event => setResume(event.target.files?.[0] || null)} /></label>
                  {resume && <span className="mod-card__meta">{resume.name}</span>}
                  <button className="mod-btn mod-btn--primary mod-btn--sm" disabled={submitting === o.id} onClick={() => submitApplication(o)}>{submitting === o.id ? 'Submitting…' : 'Submit application'}</button>
                </>}

                {o.apply_url && o.apply_url !== '#' && (
                  <a
                    href={o.apply_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mod-btn mod-btn--primary mod-btn--sm"
                  >
                    Apply →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Scholarships
