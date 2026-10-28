import { useState, useEffect } from 'react'
import '../../styles/Modules.css'

const TYPE_LABELS = { notes: 'Notes', textbook: 'Textbook', question_paper: 'Question Paper', reference: 'Reference', other: 'Other' }
const TYPE_COLORS = { notes: 'badge-blue', textbook: 'badge-purple', question_paper: 'badge-orange', reference: 'badge-green', other: 'badge-gray' }

function AcademicResources() {
  const [resources, setResources] = useState([])
  const [filters,   setFilters]   = useState({ departments: [], subjects: [], semesters: [], academic_years: [], resource_types: [] })
  const [search,    setSearch]    = useState('')
  const [dept,      setDept]      = useState('')
  const [subject,   setSubject]   = useState('')
  const [sem,       setSem]       = useState('')
  const [rtype,     setRtype]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  useEffect(() => {
    fetch('/api/resources/filters').then(r => r.json()).then(d => { if (d.success) setFilters(d) }).catch(() => {})
    load()
  }, [])

  async function load(overrides = {}) {
    setLoading(true); setError('')
    try {
      const q = new URLSearchParams()
      const s = overrides.q     !== undefined ? overrides.q     : search; if (s)     q.set('q', s)
      const d = overrides.dept  !== undefined ? overrides.dept  : dept;   if (d)     q.set('department', d)
      const sb= overrides.subject !== undefined ? overrides.subject : subject; if (sb) q.set('subject', sb)
      const sm= overrides.sem   !== undefined ? overrides.sem   : sem;    if (sm)    q.set('semester', sm)
      const rt= overrides.rt    !== undefined ? overrides.rt    : rtype;  if (rt)    q.set('resource_type', rt)
      const res  = await fetch('/api/resources?' + q)
      const data = await res.json()
      if (data.success) setResources(data.resources)
      else setError(data.message || 'Failed to load.')
    } catch { setError('Network error.') } finally { setLoading(false) }
  }

  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">📚 Academic Resources</div>
          <div className="mod-subtitle">Browse notes, textbooks, question papers, and references shared by faculty.</div>
        </div>
      </div>

      <form className="mod-toolbar" onSubmit={e => { e.preventDefault(); load() }}>
        <div className="mod-search">
          <span>🔎</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or subject…" />
        </div>
        <select className="mod-select" value={dept} onChange={e => { setDept(e.target.value); load({ dept: e.target.value }) }}>
          <option value="">All Departments</option>
          {filters.departments?.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="mod-select" value={subject} onChange={e => { setSubject(e.target.value); load({ subject: e.target.value }) }}>
          <option value="">All Subjects</option>
          {filters.subjects?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="mod-select" value={sem} onChange={e => { setSem(e.target.value); load({ sem: e.target.value }) }}>
          <option value="">All Semesters</option>
          {filters.semesters?.map(s => <option key={s} value={s}>Sem {s}</option>)}
        </select>
        <select className="mod-select" value={rtype} onChange={e => { setRtype(e.target.value); load({ rt: e.target.value }) }}>
          <option value="">All Types</option>
          {filters.resource_types?.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
        </select>
        <button type="submit" className="mod-btn mod-btn--primary">Search</button>
      </form>

      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {loading ? (
        <div className="mod-loading"><div className="mod-spinner" /><span>Loading resources…</span></div>
      ) : resources.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">📂</div>
          <div className="mod-empty__title">No resources found</div>
          <div className="mod-empty__sub">Try adjusting your filters or search term. Resources are uploaded by faculty.</div>
        </div>
      ) : (
        <div className="mod-list">
          {resources.map(r => (
            <div key={r.id} className="mod-card">
              <div className="mod-card__header">
                <div className="mod-card__title">{r.title.replace(/^\[DEMO\]\s*/, '')}</div>
                <span className={`badge ${TYPE_COLORS[r.resource_type] || 'badge-gray'}`}>{TYPE_LABELS[r.resource_type] || r.resource_type}</span>
                {r.title.startsWith('[DEMO]') && <span className="badge badge-orange">Sample</span>}
              </div>
              {r.description && <div className="mod-card__body">{r.description}</div>}
              <div className="mod-card__meta">
                {r.subject      && <span>📖 {r.subject}</span>}
                {r.department   && <span>🏛️ {r.department}</span>}
                {r.semester     && <span>📅 Sem {r.semester}</span>}
                {r.academic_year && <span>🗓️ {r.academic_year}</span>}
                <span>👤 {r.title.startsWith('[DEMO]') ? 'Demo content' : r.uploaded_by_name}</span>
              </div>
              <div className="mod-card__actions">
                {r.file_url && r.file_url !== '#' ? (
                  <a href={r.file_url} target="_blank" rel="noreferrer" className="mod-btn mod-btn--primary mod-btn--sm">⬇ Download</a>
                ) : (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{r.title.startsWith('[DEMO]') ? 'Demo text only; no download is attached.' : 'No file attached'}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AcademicResources
