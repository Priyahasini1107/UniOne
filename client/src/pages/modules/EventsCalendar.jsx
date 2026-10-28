import { useState, useEffect } from 'react'
import '../../styles/Modules.css'

const TYPE_ICON  = { fest: '🎉', workshop: '🛠️', seminar: '🎙️', hackathon: '💻', competition: '🏆', webinar: '🌐', other: '📅' }
const TYPE_COLOR = { fest: 'badge-orange', workshop: 'badge-blue', seminar: 'badge-purple', hackathon: 'badge-green', competition: 'badge-yellow', webinar: 'badge-gray', other: 'badge-gray' }

function EventsCalendar() {
  const [events,  setEvents]  = useState([])
  const [filter,  setFilter]  = useState('upcoming')
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [msg,     setMsg]     = useState('')

  useEffect(() => { load() }, [filter])

  async function load(overrides = {}) {
    setLoading(true); setError('')
    try {
      const q = new URLSearchParams()
      q.set('filter', overrides.filter !== undefined ? overrides.filter : filter)
      const s = overrides.q !== undefined ? overrides.q : search; if (s) q.set('q', s)
      const res  = await fetch('/api/events?' + q)
      const data = await res.json()
      if (data.success) setEvents(data.events)
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setLoading(false) }
  }

  async function toggleInterest(ev) {
    try {
      const res  = await fetch(`/api/events/${ev.id}/interest`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showMsg(data.message)
        setEvents(es => es.map(e => e.id === ev.id ? { ...e, is_interested: data.interested ? 1 : 0 } : e))
      }
    } catch { /* silent */ }
  }

  function showMsg(m) { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  const isPast = d => new Date(d) <= new Date()

  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">🗓️ Events Calendar</div>
          <div className="mod-subtitle">Discover campus events, workshops, hackathons, and competitions.</div>
        </div>
      </div>

      {msg && <div className="mod-toast mod-toast--success">✓ {msg}</div>}

      <div className="mod-tabs">
        {[['upcoming', 'Upcoming'], ['all', 'All Events'], ['past', 'Past']].map(([v, l]) => (
          <button key={v} className={`mod-tab ${filter === v ? 'active' : ''}`}
            onClick={() => { setFilter(v); load({ filter: v }) }}>{l}</button>
        ))}
      </div>

      <div className="mod-toolbar">
        <div className="mod-search">
          <span>🔎</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…"
            onKeyDown={e => e.key === 'Enter' && load({ q: search })} />
        </div>
        <button className="mod-btn mod-btn--secondary" onClick={() => load({ q: search })}>Search</button>
      </div>

      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {loading ? (
        <div className="mod-loading"><div className="mod-spinner" /><span>Loading events…</span></div>
      ) : events.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">🗓️</div>
          <div className="mod-empty__title">No events found</div>
          <div className="mod-empty__sub">Check back later or switch filters.</div>
        </div>
      ) : (
        <div className="mod-list">
          {events.map(ev => (
            <div key={ev.id} className="mod-card">
              {!ev.is_verified && (
                <div className="mod-toast mod-toast--warn" style={{ marginBottom: '8px', padding: '8px 12px', fontSize: 'var(--text-xs)' }}>
                  ⚠️ Sample data — not an actual event
                </div>
              )}
              <div className="mod-card__header">
                <div className="mod-card__title">{TYPE_ICON[ev.event_type] || '📅'} {ev.title}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span className={`badge ${TYPE_COLOR[ev.event_type] || 'badge-gray'}`}>{ev.event_type}</span>
                  {ev.is_online && <span className="badge badge-blue">Online</span>}
                  {isPast(ev.event_date) && <span className="badge badge-gray">Past</span>}
                </div>
              </div>
              {ev.description && <div className="mod-card__body">{ev.description}</div>}
              <div className="mod-card__meta">
                <span>📅 {new Date(ev.event_date).toLocaleString()}</span>
                {ev.venue && <span>📍 {ev.venue}</span>}
                {ev.registration_deadline && <span>⏰ Register by {new Date(ev.registration_deadline).toLocaleDateString()}</span>}
                <span>By {ev.posted_by_name}</span>
              </div>
              <div className="mod-card__actions">
                <button
                  className={`mod-btn mod-btn--sm ${ev.is_interested ? 'mod-btn--secondary' : 'mod-btn--ghost'}`}
                  onClick={() => toggleInterest(ev)}
                  disabled={isPast(ev.event_date)}
                >
                  {ev.is_interested ? '⭐ Interested' : '☆ Mark Interested'}
                </button>
                {ev.registration_url && ev.registration_url !== '#' && !isPast(ev.event_date) && (
                  <a href={ev.registration_url} target="_blank" rel="noreferrer" className="mod-btn mod-btn--primary mod-btn--sm">Register →</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EventsCalendar
