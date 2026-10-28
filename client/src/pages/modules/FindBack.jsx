import { useState, useEffect } from 'react'
import '../../styles/Modules.css'

const CAT_OPTS = ['electronics','clothing','accessories','books','id_cards','keys','bags','other']
const CAT_ICON = { electronics:'💻', clothing:'👕', accessories:'⌚', books:'📚', id_cards:'🪪', keys:'🔑', bags:'🎒', other:'📦' }

function FindBack() {
  const [items,    setItems]    = useState([])
  const [typeF,    setTypeF]    = useState('')
  const [categoryF, setCategoryF] = useState('')
  const [statusF,  setStatusF]  = useState('open')
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ type:'lost', title:'', description:'', category:'other', campus_location:'', item_date:'' })
  const [error,    setError]    = useState('')
  const [msg,      setMsg]      = useState('')
  const [saving,   setSaving]   = useState(false)
  const [claimText, setClaimText] = useState({})

  useEffect(() => { load() }, [])

  async function load(overrides = {}) {
    setLoading(true); setError('')
    try {
      const q = new URLSearchParams()
      const t = overrides.type   !== undefined ? overrides.type   : typeF;   if (t) q.set('type', t)
      const c = overrides.category !== undefined ? overrides.category : categoryF; if (c) q.set('category', c)
      const s = overrides.status !== undefined ? overrides.status : statusF; q.set('status', s || 'open')
      const sq= overrides.q     !== undefined ? overrides.q     : search;   if (sq) q.set('q', sq)
      const res  = await fetch('/api/findback?' + q)
      const data = await res.json()
      if (data.success) setItems(data.items)
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setLoading(false) }
  }

  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res  = await fetch('/api/findback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        showMsg('Report submitted!'); setShowForm(false)
        setForm({ type:'lost', title:'', description:'', category:'other', campus_location:'', item_date:'' })
        load()
      } else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setSaving(false) }
  }

  async function changeStatus(item, status) {
    const res  = await fetch(`/api/findback/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    const data = await res.json()
    if (data.success) { showMsg(data.message); load() }
  }

  async function sendClaim(item) {
    setError('')
    try {
      const res = await fetch(`/api/findback/${item.id}/claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: claimText[item.id] || '' }) })
      const data = await res.json()
      if (res.ok && data.success) { showMsg(data.message); setClaimText(t => ({ ...t, [item.id]: '' })) }
      else setError(data.message || 'Could not send claim note.')
    } catch { setError('Network error.') }
  }

  async function deleteItem(id) {
    if (!confirm('Delete this report?')) return
    const res  = await fetch(`/api/findback/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { showMsg(data.message); setItems(is => is.filter(i => i.id !== id)) }
    else setError(data.message)
  }

  function showMsg(m) { setMsg(m); setTimeout(() => setMsg(''), 3500) }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">🔍 FindBack — Lost & Found</div>
          <div className="mod-subtitle">Report or find lost items around campus. Help your fellow students.</div>
        </div>
        <button className="mod-btn mod-btn--primary" onClick={() => setShowForm(f => !f)}>
          {showForm ? '× Cancel' : '+ Report Item'}
        </button>
      </div>

      {msg   && <div className="mod-toast mod-toast--success">✓ {msg}</div>}
      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {showForm && (
        <form className="mod-form" onSubmit={submit}>
          <div className="mod-form__title">Report a Lost or Found Item</div>
          <div className="mod-form-row">
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-select" value={form.type} onChange={e => fld('type', e.target.value)}>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => fld('category', e.target.value)}>
                {CAT_OPTS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Item Title *</label>
            <input className="form-input" value={form.title} onChange={e => fld('title', e.target.value)} placeholder="e.g. Blue JBL earphones" required />
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description} onChange={e => fld('description', e.target.value)} placeholder="Colour, brand, identifying features…" />
          </div>
          <div className="mod-form-row">
            <div className="form-group">
              <label className="form-label">Location on Campus</label>
              <input className="form-input" value={form.campus_location} onChange={e => fld('campus_location', e.target.value)} placeholder="e.g. Library 2nd floor" />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.item_date} onChange={e => fld('item_date', e.target.value)} />
            </div>
          </div>
          <div className="mod-form-actions">
            <button type="submit" className="mod-btn mod-btn--primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit Report'}</button>
            <button type="button" className="mod-btn mod-btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="mod-toolbar">
        <div className="mod-search">
          <span>🔎</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
            onKeyDown={e => e.key === 'Enter' && load({ q: search })} />
        </div>
        <select className="mod-select" value={typeF} onChange={e => { setTypeF(e.target.value); load({ type: e.target.value }) }}>
          <option value="">All Types</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <select className="mod-select" value={statusF} onChange={e => { setStatusF(e.target.value); load({ status: e.target.value }) }}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
        <select className="mod-select" value={categoryF} onChange={e => { setCategoryF(e.target.value); load({ category: e.target.value }) }}>
          <option value="">All Categories</option>
          {CAT_OPTS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="mod-loading"><div className="mod-spinner" /><span>Loading…</span></div>
      ) : items.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">🔍</div>
          <div className="mod-empty__title">No items reported</div>
          <div className="mod-empty__sub">Be the first to report a lost or found item.</div>
        </div>
      ) : (
        <div className="mod-list">
          {items.map(item => (
            <div key={item.id} className="mod-card">
              <div className="mod-card__header">
                <div className="mod-card__title">{CAT_ICON[item.category] || '📦'} {item.title}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span className={`badge ${item.type === 'lost' ? 'badge-red' : 'badge-green'}`}>{item.type}</span>
                  <span className={`chip chip-${item.status}`}>{item.status}</span>
                  {item.is_demo && <span className="badge badge-orange">Sample</span>}
                </div>
              </div>
              {item.description && <div className="mod-card__body">{item.description}</div>}
              <div className="mod-card__meta">
                {item.campus_location && <span>📍 {item.campus_location}</span>}
                {item.item_date && <span>📅 {new Date(item.item_date).toLocaleDateString()}</span>}
                <span>👤 {item.is_mine ? 'Your report' : item.is_demo ? 'Demo listing' : 'Community report'}</span>
              </div>
              {item.is_mine && (
                <div className="mod-card__actions">
                  {item.status === 'open' && (
                    <button className="mod-btn mod-btn--secondary mod-btn--sm" onClick={() => changeStatus(item, 'resolved')}>Mark Resolved</button>
                  )}
                  <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={() => deleteItem(item.id)}>Delete</button>
                </div>
              )}
              {!item.is_mine && !item.is_demo && item.status === 'open' && (
                <form className="mod-form" style={{ marginTop: '12px', padding: '12px' }} onSubmit={e => { e.preventDefault(); sendClaim(item) }}>
                  <label className="form-label" htmlFor={`claim-${item.id}`}>Send a private claim note to the reporter</label>
                  <textarea id={`claim-${item.id}`} className="form-input" maxLength={1000} rows={2} value={claimText[item.id] || ''} onChange={e => setClaimText(t => ({ ...t, [item.id]: e.target.value }))} required placeholder="Describe identifying details to help verify ownership…" />
                  <button className="mod-btn mod-btn--secondary mod-btn--sm" type="submit">Send private note</button>
                </form>
              )}
              {item.is_demo && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '8px' }}>Sample only; no item was actually lost or found.</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FindBack
