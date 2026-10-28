import { useState, useEffect, useCallback } from 'react'
import '../../styles/Modules.css'

const TYPE_COLOR  = { internship: 'badge-blue', job: 'badge-purple', scholarship: 'badge-green', competition: 'badge-orange', other: 'badge-gray' }
const STATUS_CHIP = { interested: 'chip-interested', applied: 'chip-applied', submitted: 'chip-applied', under_review: 'chip-applied', shortlisted: 'chip-shortlisted', interview: 'chip-shortlisted', rejected: 'chip-rejected', selected: 'chip-selected' }

function deadlineBadge(dl) {
  if (!dl) return null
  const days = Math.ceil((new Date(dl) - new Date()) / (1000 * 60 * 60 * 24))
  if (days < 0)   return <span className="badge badge-gray">Expired</span>
  if (days <= 7)  return <span className="badge badge-red">{days}d left</span>
  if (days <= 30) return <span className="badge badge-yellow">{days}d left</span>
  return <span className="badge badge-green">{new Date(dl).toLocaleDateString()}</span>
}

function Opportunities() {
  const [opps,    setOpps]    = useState([])
  const [tab,     setTab]     = useState('all')
  const [typeF,   setTypeF]   = useState('')
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [msg,     setMsg]     = useState('')
  const [msgType, setMsgType] = useState('success')
  const [files, setFiles] = useState({})
  const [submitting, setSubmitting] = useState({})

  const load = useCallback(async (overrides = {}) => {
    setLoading(true); setError('')
    const currentTab = overrides.tab !== undefined ? overrides.tab : tab
    try {
      let url
      if (currentTab === 'saved') {
        url = '/api/opportunities/saved'
      } else if (currentTab === 'applications') {
        url = '/api/opportunities/applications'
      } else {
        const q = new URLSearchParams()
        const t = overrides.type !== undefined ? overrides.type : typeF; if (t) q.set('type', t)
        const s = overrides.q   !== undefined ? overrides.q   : search; if (s) q.set('q', s)
        url = '/api/opportunities?' + q
      }
      const res  = await fetch(url)
      const data = await res.json()
      if (data.success) setOpps(data.opportunities || data.saved || data.applications || [])
      else setError(data.message || 'Failed to load.')
    } catch { setError('Network error.') } finally { setLoading(false) }
  }, [tab, typeF, search])

  useEffect(() => { load() }, [load])

  async function toggleSave(opp) {
    try {
      const res  = await fetch(`/api/opportunities/${opp.id}/save`, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not update saved opportunity.')
      showMsg(data.message)
      setOpps(os => tab === 'saved'
        ? os.filter(o => o.id !== opp.id)
        : os.map(o => o.id === opp.id ? { ...o, is_saved: data.saved ? 1 : 0 } : o))
    } catch (err) { showMsg(err.message || 'Could not update saved opportunity.', 'error') }
  }

  async function apply(opp) {
    const file = files[opp.id]
    if (!file) { showMsg('Choose a PDF resume first.', 'error'); return }
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) { showMsg('Resume must be a PDF file.', 'error'); return }
    if (file.size > 5 * 1024 * 1024 || file.size === 0) { showMsg('Resume must be between 1 byte and 5 MB.', 'error'); return }
    setSubmitting(value => ({ ...value, [opp.id]: true }))
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
        reader.onerror = () => reject(new Error('Could not read the selected resume.'))
        reader.readAsDataURL(file)
      })
      const res  = await fetch(`/api/opportunities/${opp.id}/apply`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: { fileName: file.name, mimeType: file.type, base64 } })
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not submit your application.')
      showMsg(data.message)
      setOpps(os => os.map(o => o.id === opp.id ? { ...o, application_status: data.status } : o))
      setFiles(value => ({ ...value, [opp.id]: null }))
    } catch (err) { showMsg(err.message || 'Network error while submitting.', 'error') }
    finally { setSubmitting(value => ({ ...value, [opp.id]: false })) }
  }

  function showMsg(m, type = 'success') { setMsgType(type); setMsg(m); setTimeout(() => setMsg(''), 3000) }

  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">💼 Internships & Opportunities</div>
          <div className="mod-subtitle">Browse internships, jobs, scholarships, and competitions. Track your applications.</div>
        </div>
      </div>

      {msg && <div className={`mod-toast mod-toast--${msgType}`} role={msgType === 'error' ? 'alert' : 'status'}>{msgType === 'success' ? '✓ ' : '⚠️ '}{msg}</div>}

      <div className="mod-tabs">
        {[['all', 'All Listings'], ['saved', 'Saved'], ['applications', 'My Applications']].map(([v, l]) => (
          <button key={v} className={`mod-tab ${tab === v ? 'active' : ''}`} onClick={() => { setTab(v); load({ tab: v }) }}>{l}</button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="mod-toolbar">
          <div className="mod-search">
            <span>🔎</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities…"
              onKeyDown={e => e.key === 'Enter' && load({ q: search, type: typeF })} />
          </div>
          <select className="mod-select" value={typeF} onChange={e => { setTypeF(e.target.value); load({ type: e.target.value }) }}>
            <option value="">All Types</option>
            <option value="internship">Internship</option>
            <option value="job">Job</option>
            <option value="scholarship">Scholarship</option>
            <option value="competition">Competition</option>
            <option value="other">Other</option>
          </select>
          <button className="mod-btn mod-btn--secondary" onClick={() => load({ q: search, type: typeF })}>Search</button>
        </div>
      )}

      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {loading ? (
        <div className="mod-loading"><div className="mod-spinner" /><span>Loading…</span></div>
      ) : opps.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">💼</div>
          <div className="mod-empty__title">{tab === 'saved' ? 'No saved opportunities' : tab === 'applications' ? 'No applications yet' : 'No opportunities found'}</div>
          <div className="mod-empty__sub">{tab === 'saved' ? 'Save listings to find them here quickly.' : tab === 'applications' ? 'Applications you submit will appear here.' : 'Try adjusting your filters.'}</div>
        </div>
      ) : (
        <div className="mod-list">
          {opps.map(o => (
            <div key={o.id} className="mod-card">
              {!o.is_verified && (
                <div className="mod-toast mod-toast--warn" style={{ marginBottom: '8px', padding: '8px 12px', fontSize: 'var(--text-xs)' }}>
                  ⚠️ Sample data — not a verified listing
                </div>
              )}
              <div className="mod-card__header">
                <div>
                  <div className="mod-card__title">{o.title}</div>
                  {o.company_or_org && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>{o.company_or_org}</div>}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span className={`badge ${TYPE_COLOR[o.type] || 'badge-gray'}`}>{o.type}</span>
                  {(o.application_status || o.status) && <span className={`chip ${STATUS_CHIP[o.application_status || o.status] || ''}`}>{(o.application_status || o.status).replaceAll('_', ' ')}</span>}
                </div>
              </div>
              {o.description && <div className="mod-card__body">{o.description}</div>}
              {o.eligibility && <div className="mod-card__body"><strong>Eligibility:</strong> {o.eligibility}</div>}
              <div className="mod-card__meta">
                {o.location  && <span>📍 {o.location} {o.work_mode && `(${o.work_mode})`}</span>}
                {o.stipend   && <span>💰 {o.stipend}</span>}
                {o.skills    && <span>🛠 {o.skills}</span>}
                {deadlineBadge(o.deadline)}
              </div>
              {tab === 'applications' ? <div className="mod-card__body">
                <div><strong>Submitted:</strong> {o.applied_at ? new Date(o.applied_at).toLocaleString() : '—'} · <strong>Resume:</strong> {o.resume_original_name || 'Not attached'}</div>
                {o.resume_original_name && <a className="mod-btn mod-btn--secondary mod-btn--sm" href={`/api/opportunities/applications/${o.id}/resume`} target="_blank" rel="noreferrer">View my resume</a>}
                {o.reviewer_feedback && <div style={{ marginTop: 8 }}><strong>Reviewer feedback:</strong> {o.reviewer_feedback}</div>}
              </div> : <div className="mod-card__actions">
                <button className={`mod-btn mod-btn--save mod-btn--sm ${o.is_saved ? 'saved' : ''}`} onClick={() => toggleSave(o)}>
                  {o.is_saved ? '🔖 Saved' : '🔖 Save'}
                </button>
                {o.application_status && (o.application_resume_name || !['interested', 'applied'].includes(o.application_status)) ? <span className="chip chip-applied">{o.application_status.replaceAll('_', ' ')}</span> : <>
                  <label className="mod-btn mod-btn--secondary mod-btn--sm">Choose PDF resume<input type="file" accept="application/pdf,.pdf" hidden onChange={event => setFiles(value => ({ ...value, [o.id]: event.target.files?.[0] || null }))} /></label>
                  {files[o.id] && <span className="mod-card__meta">{files[o.id].name}</span>}
                  <button className="mod-btn mod-btn--primary mod-btn--sm" disabled={!!submitting[o.id]} onClick={() => apply(o)}>{submitting[o.id] ? 'Submitting…' : 'Submit application'}</button>
                </>}
                {o.apply_url && o.apply_url !== '#' && (
                  <a href={o.apply_url} target="_blank" rel="noreferrer" className="mod-btn mod-btn--primary mod-btn--sm">Apply →</a>
                )}
              </div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Opportunities
