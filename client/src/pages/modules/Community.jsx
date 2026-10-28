import { useState, useEffect } from 'react'
import '../../styles/Modules.css'

const CAT_COLOR = { discussion: 'badge-blue', question: 'badge-orange', resource: 'badge-purple', opportunity: 'badge-green', general: 'badge-gray' }

function Community() {
  const [posts,    setPosts]    = useState([])
  const [catF,     setCatF]     = useState('')
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ title: '', content: '', category: 'general' })
  const [error,    setError]    = useState('')
  const [msg,      setMsg]      = useState('')
  const [saving,   setSaving]   = useState(false)
  const [openPost, setOpenPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commText, setCommText] = useState('')

  useEffect(() => { load() }, [])

  async function load(overrides = {}) {
    setLoading(true); setError('')
    try {
      const q = new URLSearchParams()
      const c = overrides.cat !== undefined ? overrides.cat : catF;    if (c) q.set('category', c)
      const s = overrides.q  !== undefined ? overrides.q  : search;   if (s) q.set('q', s)
      const res  = await fetch('/api/community?' + q)
      const data = await res.json()
      if (data.success) setPosts(data.posts)
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setLoading(false) }
  }

  async function createPost(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res  = await fetch('/api/community', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) { showMsg(data.message); setShowForm(false); setForm({ title: '', content: '', category: 'general' }); load() }
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setSaving(false) }
  }

  async function deletePost(id) {
    if (!confirm('Delete this post?')) return
    const res  = await fetch(`/api/community/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { showMsg(data.message); setPosts(ps => ps.filter(p => p.id !== id)); if (openPost?.id === id) setOpenPost(null) }
    else setError(data.message)
  }

  async function openComments(post) {
    setOpenPost(post); setCommText('')
    const res  = await fetch(`/api/community/${post.id}/comments`)
    const data = await res.json()
    if (data.success) setComments(data.comments)
  }

  async function addComment(e) {
    e.preventDefault()
    if (!commText.trim()) return
    const res  = await fetch(`/api/community/${openPost.id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: commText })
    })
    const data = await res.json()
    if (data.success) { setCommText(''); openComments(openPost) }
    else setError(data.message)
  }

  async function deleteComment(id) {
    const res  = await fetch(`/api/community/comments/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) setComments(cs => cs.filter(c => c.id !== id))
    else setError(data.message)
  }

  function showMsg(m) { setMsg(m); setTimeout(() => setMsg(''), 3500) }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Thread view ──────────────────────────────────────────────────────────────
  if (openPost) {
    return (
      <div>
        <button className="mod-btn mod-btn--ghost mod-btn--sm" style={{ marginBottom: '16px' }} onClick={() => setOpenPost(null)}>← Back to Posts</button>
        <div className="mod-card" style={{ marginBottom: '20px' }}>
          <div className="mod-card__header">
            <div className="mod-card__title">{openPost.title}</div>
            <span className={`badge ${CAT_COLOR[openPost.category] || 'badge-gray'}`}>{openPost.category}</span>
          </div>
          <div className="mod-card__body" style={{ whiteSpace: 'pre-wrap' }}>{openPost.content}</div>
          <div className="mod-card__meta">
            <span>👤 {openPost.student_name}</span>
            <span>📅 {new Date(openPost.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

        <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--navy-700)', marginBottom: '12px' }}>
          💬 {comments.length} Comment{comments.length !== 1 ? 's' : ''}
        </div>

        <div className="mod-list" style={{ marginBottom: '20px' }}>
          {comments.map(c => (
            <div key={c.id} className="mod-card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{c.student_name}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{c.content}</div>
              {c.is_mine && (
                <button className="mod-btn mod-btn--danger mod-btn--sm" style={{ marginTop: '8px' }} onClick={() => deleteComment(c.id)}>Delete</button>
              )}
            </div>
          ))}
          {comments.length === 0 && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '16px 0' }}>No comments yet. Be the first!</div>}
        </div>

        <form onSubmit={addComment} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <textarea className="form-input" style={{ flex: 1 }} rows={2} value={commText}
            onChange={e => setCommText(e.target.value)} placeholder="Write a comment…" />
          <button type="submit" className="mod-btn mod-btn--primary" disabled={!commText.trim()}>Post</button>
        </form>
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">💬 Student Community</div>
          <div className="mod-subtitle">Ask questions, share resources, and connect with your fellow students.</div>
        </div>
        <button className="mod-btn mod-btn--primary" onClick={() => setShowForm(f => !f)}>
          {showForm ? '× Cancel' : '+ New Post'}
        </button>
      </div>

      {msg   && <div className="mod-toast mod-toast--success">✓ {msg}</div>}
      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {showForm && (
        <form className="mod-form" onSubmit={createPost}>
          <div className="mod-form__title">Create a Post</div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e => fld('title', e.target.value)} placeholder="What's on your mind?" required />
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Content *</label>
            <textarea className="form-input" rows={4} value={form.content} onChange={e => fld('content', e.target.value)} placeholder="Share details, links, or questions…" required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e => fld('category', e.target.value)}>
              <option value="general">General</option>
              <option value="discussion">Discussion</option>
              <option value="question">Question</option>
              <option value="resource">Resource</option>
              <option value="opportunity">Opportunity</option>
            </select>
          </div>
          <div className="mod-form-actions">
            <button type="submit" className="mod-btn mod-btn--primary" disabled={saving}>{saving ? 'Posting…' : 'Create Post'}</button>
            <button type="button" className="mod-btn mod-btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="mod-toolbar">
        <div className="mod-search">
          <span>🔎</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts…"
            onKeyDown={e => e.key === 'Enter' && load({ q: search })} />
        </div>
        <select className="mod-select" value={catF} onChange={e => { setCatF(e.target.value); load({ cat: e.target.value }) }}>
          <option value="">All Categories</option>
          <option value="general">General</option>
          <option value="discussion">Discussion</option>
          <option value="question">Question</option>
          <option value="resource">Resource</option>
          <option value="opportunity">Opportunity</option>
        </select>
        <button className="mod-btn mod-btn--secondary" onClick={() => load({ q: search })}>Search</button>
      </div>

      {loading ? (
        <div className="mod-loading"><div className="mod-spinner" /><span>Loading…</span></div>
      ) : posts.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">💬</div>
          <div className="mod-empty__title">No posts yet</div>
          <div className="mod-empty__sub">Be the first to start a discussion!</div>
          <button className="mod-btn mod-btn--primary" style={{ marginTop: '12px' }} onClick={() => setShowForm(true)}>+ Create Post</button>
        </div>
      ) : (
        <div className="mod-list">
          {posts.map(p => (
            <div key={p.id} className="mod-card" style={{ cursor: 'pointer' }} onClick={() => openComments(p)}>
              <div className="mod-card__header">
                <div className="mod-card__title">{p.title}</div>
                <span className={`badge ${CAT_COLOR[p.category] || 'badge-gray'}`}>{p.category}</span>
              </div>
              <div className="mod-card__body" style={{ overflow: 'hidden', maxHeight: '48px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {p.content}
              </div>
              <div className="mod-card__meta">
                <span>👤 {p.student_name}</span>
                <span>📅 {new Date(p.created_at).toLocaleDateString()}</span>
                <span>💬 {p.comment_count} comment{p.comment_count !== 1 ? 's' : ''}</span>
                {p.is_mine && <span className="badge badge-blue">Mine</span>}
              </div>
              {p.is_mine && (
                <div className="mod-card__actions" onClick={e => e.stopPropagation()}>
                  <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={() => deletePost(p.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Community
