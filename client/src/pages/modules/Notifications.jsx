import { useState, useEffect } from 'react'
import '../../styles/Modules.css'

const MOD_ICON = { findback: '🔍', campus: '🏫', community: '💬', default: '🔔' }

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [unread,        setUnread]        = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [msg,           setMsg]           = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/notifications')
      const data = await res.json()
      if (data.success) { setNotifications(data.notifications); setUnread(data.unread) }
      else setError(data.message || 'Failed.')
    } catch { setError('Network error.') } finally { setLoading(false) }
  }

  async function markRead(id) {
    try {
      const res  = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      const data = await res.json()
      if (data.success) {
        setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: 1 } : n))
        setUnread(u => Math.max(0, u - 1))
      }
    } catch { /* silent */ }
  }

  async function markAllRead() {
    try {
      const res  = await fetch('/api/notifications/read-all', { method: 'PATCH' })
      const data = await res.json()
      if (data.success) {
        setNotifications(ns => ns.map(n => ({ ...n, is_read: 1 })))
        setUnread(0)
        setMsg('All marked as read.'); setTimeout(() => setMsg(''), 2000)
      }
    } catch { /* silent */ }
  }

  function timeAgo(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000)
    if (s < 60)    return 'just now'
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
  }

  return (
    <div>
      <div className="mod-header">
        <div>
          <div className="mod-title">🔔 Notifications</div>
          <div className="mod-subtitle">
            {unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up!'}
          </div>
        </div>
        {unread > 0 && (
          <button className="mod-btn mod-btn--secondary" onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      {msg   && <div className="mod-toast mod-toast--success">✓ {msg}</div>}
      {error && <div className="mod-toast mod-toast--error">⚠️ {error}</div>}

      {loading ? (
        <div className="mod-loading"><div className="mod-spinner" /><span>Loading…</span></div>
      ) : notifications.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">🔔</div>
          <div className="mod-empty__title">No notifications yet</div>
          <div className="mod-empty__sub">Notifications from campus services, community, and FindBack will appear here.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {notifications.map(n => (
            <div key={n.id}
              className={`notif-item ${!n.is_read ? 'unread' : ''}`}
              onClick={() => !n.is_read && markRead(n.id)}
              style={{ cursor: n.is_read ? 'default' : 'pointer' }}
            >
              <div className={`notif-item__dot ${n.is_read ? 'read' : ''}`} />
              <div className="notif-item__body">
                <div className="notif-item__title">{MOD_ICON[n.module] || MOD_ICON.default} {n.title}</div>
                {n.message && <div className="notif-item__msg">{n.message}</div>}
              </div>
              <div className="notif-item__time">{timeAgo(n.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications
