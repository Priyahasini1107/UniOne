import { useState, useEffect } from 'react'
import '../../styles/Modules.css'

function ProjectVault() {
  const [projects, setProjects] = useState([])
  const [tab,      setTab]      = useState('all')
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('')
  const [technology, setTechnology] = useState('')
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [form,     setForm]     = useState({ title:'', description:'', technologies:'', category:'', github_url:'', demo_url:'' })
  const [error,    setError]    = useState('')
  const [msg,      setMsg]      = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { load() }, [tab])

  async function load(overrides = {}) {
    setLoading(true); setError('')
    const currentTab = overrides.tab !== undefined ? overrides.tab : tab
    try {
      let url
      if (currentTab === 'mine') {
        const q = new URLSearchParams()
        const s = overrides.q !== undefined ? overrides.q : search; if (s) q.set('q', s)
        const c = overrides.category !== undefined ? overrides.category : category; if (c) q.set('category', c)
        const t = overrides.technology !== undefined ? overrides.technology : technology; if (t) q.set('technology', t)
        url = '/api/projects/mine?' + q
      } else {
        const q = new URLSearchParams()
        const s = overrides.q !== undefined ? overrides.q : search; if (s) q.set('q', s)
        const c = overrides.category !== undefined ? overrides.category : category; if (c) q.set('category', c)
        const t = overrides.technology !== undefined ? overrides.technology : technology; if (t) q.set('technology', t)
        url = '/api/projects?' + q
      }
      const res  = await fetch(url)
      const data = await res.json()
      if (data.success) setProjects(data.projects)
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setLoading(false) }
  }

  function startEdit(p) {
    setEditId(p.id)
    setForm({ title: p.title||'', description: p.description||'', technologies: p.technologies||'', category: p.category||'', github_url: p.github_url||'', demo_url: p.demo_url||'' })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() { setEditId(null); setForm({ title:'', description:'', technologies:'', category:'', github_url:'', demo_url:'' }); setShowForm(false) }

  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const url    = editId ? `/api/projects/${editId}` : '/api/projects'
      const method = editId ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data   = await res.json()
      if (data.success) { showMsg(data.message); resetForm(); load() }
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setSaving(false) }
  }

  async function deleteProject(id) {
    if (!confirm('Delete this project?')) return
    const res  = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { showMsg(data.message); setProjects(ps => ps.filter(p => p.id !== id)) }
    else setError(data.message)
  }

  function showMsg(m) { setMsg(m); setTimeout(() => setMsg(''), 3500) }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">💡 ProjectVault</div>
          <div className="mod-subtitle">Showcase your projects and explore what other students are building.</div>
        </div>
        <button className="mod-btn mod-btn--primary" onClick={() => { resetForm(); setShowForm(s => !s) }}>
          {showForm && !editId ? '× Cancel' : '+ Add Project'}
        </button>
      </div>

      {msg   && <div className="mod-toast mod-toast--success">✓ {msg}</div>}
      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {showForm && (
        <form className="mod-form" onSubmit={submit}>
          <div className="mod-form__title">{editId ? 'Edit Project' : 'Add Project'}</div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Project Title *</label>
            <input className="form-input" maxLength={200} value={form.title} onChange={e => fld('title', e.target.value)} placeholder="Your project name" required />
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} maxLength={20000} value={form.description} onChange={e => fld('description', e.target.value)} placeholder="What does your project do?" />
          </div>
          <div className="mod-form-row">
            <div className="form-group">
              <label className="form-label">Technologies</label>
              <input className="form-input" maxLength={400} value={form.technologies} onChange={e => fld('technologies', e.target.value)} placeholder="React, Node.js, MySQL…" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="form-input" maxLength={100} value={form.category} onChange={e => fld('category', e.target.value)} placeholder="Web App, ML, Mobile…" />
            </div>
          </div>
          <div className="mod-form-row">
            <div className="form-group">
              <label className="form-label">GitHub URL</label>
              <input type="url" className="form-input" value={form.github_url} onChange={e => fld('github_url', e.target.value)} placeholder="https://github.com/…" />
            </div>
            <div className="form-group">
              <label className="form-label">Demo URL</label>
              <input type="url" className="form-input" value={form.demo_url} onChange={e => fld('demo_url', e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div className="mod-form-actions">
            <button type="submit" className="mod-btn mod-btn--primary" disabled={saving}>{saving ? 'Saving…' : editId ? 'Update Project' : 'Add Project'}</button>
            <button type="button" className="mod-btn mod-btn--secondary" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="mod-tabs">
        {[['all','All Projects'],['mine','My Projects']].map(([v, l]) => (
          <button key={v} className={`mod-tab ${tab === v ? 'active' : ''}`}
            onClick={() => { setTab(v); load({ tab: v }) }}>{l}</button>
        ))}
      </div>

      <div className="mod-toolbar">
        <div className="mod-search">
          <span>🔎</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…"
            onKeyDown={e => e.key === 'Enter' && load({ q: search })} />
        </div>
        <select className="mod-select" value={category} onChange={e => { setCategory(e.target.value); load({ category: e.target.value }) }}>
          <option value="">All Categories</option>
          {['AI & Data Science','Web Development','Full Stack Development','Career Tools','Data Visualization','Campus Services'].map(c => <option key={c}>{c}</option>)}
        </select>
        <input className="mod-select" value={technology} onChange={e => setTechnology(e.target.value)} onKeyDown={e => e.key === 'Enter' && load({ technology: e.target.value })} placeholder="Filter by technology" aria-label="Filter by technology" />
        <button className="mod-btn mod-btn--secondary" onClick={() => load({ q: search, technology })}>Search</button>
      </div>

      {loading ? (
        <div className="mod-loading"><div className="mod-spinner" /><span>Loading…</span></div>
      ) : projects.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">💡</div>
          <div className="mod-empty__title">{tab === 'mine' ? 'No projects yet' : 'No projects found'}</div>
          <div className="mod-empty__sub">{tab === 'mine' ? 'Add your first project to showcase your work.' : 'Try searching or adjusting filters.'}</div>
          {tab === 'mine' && <button className="mod-btn mod-btn--primary" style={{ marginTop: '12px' }} onClick={() => setShowForm(true)}>+ Add Project</button>}
        </div>
      ) : (
        <div className="mod-grid-2">
          {projects.map(p => (
            <div key={p.id} className="mod-card">
              <div className="mod-card__header">
                <div className="mod-card__title">{p.title.replace(/^\[DEMO\]\s*/, '')}</div>
                {p.is_mine ? <span className="badge badge-blue">Mine</span> : null}
                {p.is_demo && <span className="badge badge-orange">Sample</span>}
              </div>
              {!p.is_mine && p.student_name && !p.is_demo && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '6px' }}>By {p.student_name}</div>}
              {p.is_demo && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '6px' }}>Sample record—not a student submission.</div>}
              {p.description && <div className="mod-card__body">{p.description.replace(/^\[DEMO:UNIONE-PROJECT\]\s*/, '')}</div>}
              {p.technologies && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {p.technologies.split(',').map((t, i) => <span key={i} className="badge badge-gray">{t.trim()}</span>)}
                </div>
              )}
              {p.category && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '10px' }}>📂 {p.category}</div>}
              <div className="mod-card__actions">
                {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="mod-btn mod-btn--ghost mod-btn--sm">GitHub</a>}
                {p.demo_url   && <a href={p.demo_url}   target="_blank" rel="noreferrer" className="mod-btn mod-btn--primary mod-btn--sm">Live Demo</a>}
                {p.is_mine && <button className="mod-btn mod-btn--secondary mod-btn--sm" onClick={() => startEdit(p)}>Edit</button>}
                {p.is_mine && <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={() => deleteProject(p.id)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProjectVault
