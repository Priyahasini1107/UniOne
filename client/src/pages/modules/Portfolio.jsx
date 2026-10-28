import { useState, useEffect } from 'react'
import '../../styles/Modules.css'

function parseArr(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function Portfolio() {
  const [portfolio, setPortfolio] = useState(null)
  const [loading,   setLoading]  = useState(true)
  const [editing,   setEditing]  = useState(false)
  const [form,      setForm]     = useState({})
  const [error,     setError]    = useState('')
  const [msg,       setMsg]      = useState('')
  const [saving,    setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/portfolio')
      const data = await res.json()
      if (data.success) { setPortfolio(data.portfolio); setForm(toForm(data.portfolio)) }
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setLoading(false) }
  }

  function toForm(p) {
    return {
      bio:            p?.bio || '',
      linkedin_url:   p?.linkedin_url || '',
      github_url:     p?.github_url || '',
      department:     p?.department || '',
      study_year:     p?.study_year || '',
      phone:          p?.phone || '',
      skills:         parseArr(p?.skills_json).join(', '),
      certifications: parseArr(p?.certifications_json).join('\n'),
      achievements:   parseArr(p?.achievements_json).join('\n'),
    }
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const body = {
        bio:          form.bio,
        linkedin_url: form.linkedin_url,
        github_url:   form.github_url,
        department:   form.department,
        study_year:   form.study_year ? Number(form.study_year) : null,
        phone:        form.phone,
        skills:        form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        certifications: form.certifications ? form.certifications.split('\n').map(s => s.trim()).filter(Boolean) : [],
        achievements:  form.achievements ? form.achievements.split('\n').map(s => s.trim()).filter(Boolean) : [],
      }
      const res  = await fetch('/api/portfolio', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.success) { showMsg(data.message); setEditing(false); load() }
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setSaving(false) }
  }

  function showMsg(m) { setMsg(m); setTimeout(() => setMsg(''), 3500) }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const p = portfolio

  const skills = parseArr(p?.skills_json)
  const certs  = parseArr(p?.certifications_json)
  const achiev = parseArr(p?.achievements_json)

  if (loading) return <div className="mod-loading"><div className="mod-spinner" /><span>Loading portfolio…</span></div>

  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">🎓 My Portfolio</div>
          <div className="mod-subtitle">Showcase your academic profile, skills, and achievements.</div>
        </div>
        <button className="mod-btn mod-btn--primary" onClick={() => setEditing(e => !e)}>
          {editing ? '× Cancel' : '✏️ Edit Portfolio'}
        </button>
      </div>

      {msg   && <div className="mod-toast mod-toast--success">✓ {msg}</div>}
      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {editing ? (
        <form className="mod-form" onSubmit={save}>
          <div className="mod-form__title">Edit Your Portfolio</div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Bio / About Me</label>
            <textarea className="form-input" rows={4} value={form.bio} onChange={e => fld('bio', e.target.value)}
              placeholder="Tell people about yourself, your interests, and career goals…" />
          </div>
          <div className="mod-form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-input" value={form.department} onChange={e => fld('department', e.target.value)} placeholder="e.g. Computer Science" />
            </div>
            <div className="form-group">
              <label className="form-label">Year of Study</label>
              <input type="number" min={1} max={5} className="form-input" value={form.study_year}
                onChange={e => fld('study_year', e.target.value)} placeholder="1–5" />
            </div>
          </div>
          <div className="mod-form-row">
            <div className="form-group">
              <label className="form-label">LinkedIn URL</label>
              <input type="url" className="form-input" value={form.linkedin_url} onChange={e => fld('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/…" />
            </div>
            <div className="form-group">
              <label className="form-label">GitHub URL</label>
              <input type="url" className="form-input" value={form.github_url} onChange={e => fld('github_url', e.target.value)}
                placeholder="https://github.com/…" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Skills (comma separated)</label>
            <input className="form-input" value={form.skills} onChange={e => fld('skills', e.target.value)}
              placeholder="React, Node.js, Python, MySQL…" />
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Certifications (one per line)</label>
            <textarea className="form-input" rows={3} value={form.certifications} onChange={e => fld('certifications', e.target.value)}
              placeholder={'AWS Certified Cloud Practitioner\nGoogle Data Analytics Certificate'} />
          </div>
          <div className="form-group">
            <label className="form-label">Achievements (one per line)</label>
            <textarea className="form-input" rows={3} value={form.achievements} onChange={e => fld('achievements', e.target.value)}
              placeholder={'Hackathon winner 2025\nTop 5 in department'} />
          </div>
          <div className="mod-form-actions">
            <button type="submit" className="mod-btn mod-btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save Portfolio'}</button>
            <button type="button" className="mod-btn mod-btn--secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div>
          {/* Profile card */}
          <div className="mod-card" style={{ marginBottom: '20px', padding: '28px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--navy-500)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'var(--weight-bold)', flexShrink: 0 }}>
                {p?.full_name?.charAt(0) || 'S'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--navy-800)', marginBottom: '4px' }}>{p?.full_name || 'Student'}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '6px' }}>{p?.email}</div>
                {p?.department && <div style={{ fontSize: 'var(--text-sm)' }}>🏛️ {p.department}{p?.study_year ? ` — Year ${p.study_year}` : ''}</div>}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {p?.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="mod-btn mod-btn--ghost mod-btn--sm">LinkedIn</a>}
                  {p?.github_url   && <a href={p.github_url}   target="_blank" rel="noreferrer" className="mod-btn mod-btn--ghost mod-btn--sm">GitHub</a>}
                </div>
              </div>
            </div>
            {p?.bio && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', marginTop: '16px', lineHeight: '1.7', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                {p.bio}
              </p>
            )}
          </div>

          <div className="mod-grid-2">
            <div className="mod-card">
              <div className="mod-card__title" style={{ marginBottom: '12px' }}>🛠️ Skills</div>
              {skills.length > 0
                ? skills.map((s, i) => <span key={i} className="badge badge-blue" style={{ marginRight: '4px', marginBottom: '4px' }}>{s}</span>)
                : <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No skills added yet.</span>}
            </div>
            <div className="mod-card">
              <div className="mod-card__title" style={{ marginBottom: '12px' }}>🏆 Achievements</div>
              {achiev.length > 0
                ? achiev.map((a, i) => <div key={i} style={{ fontSize: 'var(--text-sm)', marginBottom: '4px' }}>🥇 {a}</div>)
                : <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No achievements added yet.</span>}
            </div>
            <div className="mod-card">
              <div className="mod-card__title" style={{ marginBottom: '12px' }}>📜 Certifications</div>
              {certs.length > 0
                ? certs.map((c, i) => <div key={i} style={{ fontSize: 'var(--text-sm)', marginBottom: '4px' }}>✅ {c}</div>)
                : <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No certifications added yet.</span>}
            </div>
            <div className="mod-card">
              <div className="mod-card__title" style={{ marginBottom: '12px' }}>💡 Projects ({p?.projects?.length || 0})</div>
              {p?.projects?.length > 0 ? (
                p.projects.slice(0, 3).map(pr => (
                  <div key={pr.id} style={{ fontSize: 'var(--text-sm)', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 'var(--weight-medium)' }}>{pr.title}</div>
                    {pr.technologies && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{pr.technologies}</div>}
                  </div>
                ))
              ) : <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No projects added yet. Add them in ProjectVault.</span>}
              {p?.projects?.length > 3 && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>+{p.projects.length - 3} more in ProjectVault</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Portfolio
