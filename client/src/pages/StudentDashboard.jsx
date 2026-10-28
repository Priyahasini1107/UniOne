/**
 * StudentDashboard.jsx — Student Dashboard Page (Stage 2)
 *
 * Layout:
 *   - Fixed left Sidebar with all module navigation links
 *   - Fixed Topbar with dynamic notification count and global search
 *   - Scrollable main content area with real module components
 *
 * Each module now loads its own data via /api/* endpoints.
 * The dashboard overview shows real summary stats from /api/student/dashboard.
 */

import { useState, useEffect, useRef } from 'react'
import Sidebar    from '../components/Sidebar'
import Topbar     from '../components/Topbar'
import ModuleCard from '../components/ModuleCard'
import '../styles/Dashboard.css'
import '../styles/Modules.css'

// ─── Lazy module imports ──────────────────────────────────────────────────────
import AcademicResources from './modules/AcademicResources'
import InterviewPrep     from './modules/InterviewPrep'
import Opportunities     from './modules/Opportunities'
import Scholarships      from './modules/Scholarships'
import EventsCalendar    from './modules/EventsCalendar'
import CareerRoadmaps    from './modules/CareerRoadmaps'
import FindBack          from './modules/FindBack'
import ProjectVault      from './modules/ProjectVault'
import CampusServices    from './modules/CampusServices'
import Community         from './modules/Community'
import Portfolio         from './modules/Portfolio'
import Notifications     from './modules/Notifications'
import Settings          from './modules/Settings'

/* ─── Module registry ────────────────────────────────────────────────────── */
const MODULES = [
  { id: 'academic',       icon: '📚', color: '#1a237e', name: 'Academic Resources',        description: 'Notes, textbooks, question papers, and study materials.',          Component: AcademicResources },
  { id: 'interview',      icon: '🎯', color: '#283593', name: 'Interview Preparation',      description: 'DSA, aptitude, technical, and HR topics with progress tracking.',   Component: InterviewPrep },
  { id: 'internships',    icon: '💼', color: '#1565c0', name: 'Internships & Opportunities',description: 'Browse internships, scholarships, jobs, and competitions.',         Component: Opportunities },
  { id: 'scholarships',   icon: '🏅', color: '#2e7d32', name: 'Scholarships',               description: 'Find scholarships and track your application deadlines.',            Component: Scholarships },
  { id: 'roadmaps',       icon: '🗺️', color: '#0277bd', name: 'Career Roadmaps',            description: 'Step-by-step career guides for tech and non-tech fields.',         Component: CareerRoadmaps },
  { id: 'events',         icon: '🗓️', color: '#00838f', name: 'Events Calendar',            description: 'College fests, workshops, hackathons, webinars, and seminars.',    Component: EventsCalendar },
  { id: 'findback',       icon: '🔍', color: '#6a1b9a', name: 'FindBack',                   description: 'Post and find lost items across the campus.',                      Component: FindBack },
  { id: 'projectvault',   icon: '💡', color: '#ad1457', name: 'ProjectVault',               description: 'Showcase your projects and explore work from your peers.',         Component: ProjectVault },
  { id: 'campus',         icon: '🏫', color: '#c62828', name: 'Smart Campus Services',      description: 'Raise maintenance, IT, and facility service requests.',            Component: CampusServices },
  { id: 'community',      icon: '💬', color: '#e65100', name: 'Student Community',          description: 'Post discussions, ask questions, and collaborate with peers.',     Component: Community },
  { id: 'portfolio',      icon: '📄', color: '#4527a0', name: 'My Portfolio',               description: 'Build and share your personal academic and project portfolio.',    Component: Portfolio },
  { id: 'notifications',  icon: '🔔', color: '#558b2f', name: 'Notifications',              description: 'Stay updated with campus announcements and activity alerts.',      Component: Notifications },
]

// ─── Dashboard Overview (home screen) ────────────────────────────────────────
function DashboardOverview({ navigate, onModuleClick, currentUser }) {
  const [summary, setSummary]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [summaryError, setSummaryError] = useState('')

  useEffect(() => {
    fetch('/api/student/dashboard', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) setSummary(d)
        else setSummaryError(d.message || 'Could not load dashboard summary.')
      })
      .catch(() => setSummaryError('Could not load dashboard summary.'))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const firstName = currentUser?.fullName ? currentUser.fullName.trim().split(' ')[0] : null

  return (
    <>
      {/* Welcome banner */}
      <div className="dashboard-welcome" role="banner">
        <div className="dashboard-welcome__text">
          <div className="dashboard-welcome__greeting">
            {firstName ? `Welcome back, ${firstName} 👋` : 'Welcome to UniOne 👋'}
          </div>
          <div className="dashboard-welcome__sub">Your all-in-one student platform. Explore modules below.</div>
        </div>
        <div className="dashboard-welcome__date" aria-label="Today's date">{today}</div>
      </div>

      {summaryError && (
        <div className="mod-toast mod-toast--error" style={{ marginBottom: '16px' }}>⚠️ {summaryError}</div>
      )}

      {/* Stats row */}
      {!loading && summary && (
        <div className="dashboard-stat-grid">
          {[
            { icon: '📚', label: 'Resources', value: summary.summary?.total_resources || 0,         id: 'academic',       module: 'academic' },
            { icon: '🗓️', label: 'Upcoming Events', value: summary.summary?.upcoming_events || 0,   id: 'events',         module: 'events' },
            { icon: '💼', label: 'Opportunities', value: summary.summary?.active_opportunities || 0, id: 'opportunities', module: 'internships' },
            { icon: '🔖', label: 'Saved Listings', value: summary.summary?.saved_opportunities || 0, id: 'saved',         module: 'internships' },
            { icon: '📝', label: 'Applications', value: summary.summary?.my_applications || 0,      id: 'applications',  module: 'internships' },
            { icon: '🔔', label: 'Unread Alerts', value: summary.summary?.unread_notifications || 0, id: 'notifications', module: 'notifications' },
            { icon: '💡', label: 'My Projects', value: summary.summary?.my_projects || 0,            id: 'projectvault',  module: 'projectvault' },
            { icon: '🏫', label: 'My Requests', value: summary.summary?.my_requests || 0,            id: 'campus',        module: 'campus' },
          ].map(s => (
            <div key={s.id} className="dashboard-stat" onClick={() => onModuleClick(s.module)}>
              <div className="dashboard-stat__icon">{s.icon}</div>
              <div className="dashboard-stat__value">{s.value}</div>
              <div className="dashboard-stat__label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick widgets */}
      {!loading && summary && (
        <div className="widget-grid">
          {/* Upcoming events */}
          <div className="widget">
            <div className="widget__header">
              <div className="widget__title">🗓️ Upcoming Events</div>
              <button className="mod-btn mod-btn--ghost mod-btn--sm" onClick={() => onModuleClick('events')}>See all</button>
            </div>
            <div className="widget__body">
              {summary.upcomingEvents?.length > 0 ? summary.upcomingEvents.map(e => (
                <div key={e.id} className="widget-row">
                  <div className="widget-row__icon">🗓️</div>
                  <div className="widget-row__text">
                    <div className="widget-row__title">{e.title}</div>
                    <div className="widget-row__sub">{new Date(e.event_date).toLocaleDateString()} {e.venue ? `· ${e.venue}` : ''}</div>
                  </div>
                </div>
              )) : <div className="widget-empty">No upcoming events.</div>}
            </div>
          </div>

          {/* Upcoming deadlines */}
          <div className="widget">
            <div className="widget__header">
              <div className="widget__title">⏰ Upcoming Deadlines</div>
              <button className="mod-btn mod-btn--ghost mod-btn--sm" onClick={() => onModuleClick('internships')}>See all</button>
            </div>
            <div className="widget__body">
              {summary.deadlines?.length > 0 ? summary.deadlines.map(d => {
                const days = Math.ceil((new Date(d.deadline) - new Date()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={d.id} className="widget-row">
                    <div className="widget-row__icon">{days <= 7 ? '🔴' : '🟡'}</div>
                    <div className="widget-row__text">
                      <div className="widget-row__title">{d.title}</div>
                      <div className="widget-row__sub">{d.company_or_org} · {days}d left</div>
                    </div>
                    <span className={`badge ${days <= 7 ? 'badge-red' : 'badge-yellow'}`}>{d.type}</span>
                  </div>
                )
              }) : <div className="widget-empty">No upcoming deadlines in next 30 days.</div>}
            </div>
          </div>

          {/* Recent resources */}
          <div className="widget">
            <div className="widget__header">
              <div className="widget__title">📚 Recent Resources</div>
              <button className="mod-btn mod-btn--ghost mod-btn--sm" onClick={() => onModuleClick('academic')}>See all</button>
            </div>
            <div className="widget__body">
              {summary.recentResources?.length > 0 ? summary.recentResources.map(r => (
                <div key={r.id} className="widget-row">
                  <div className="widget-row__icon">📖</div>
                  <div className="widget-row__text">
                    <div className="widget-row__title">{r.title}</div>
                    <div className="widget-row__sub">{r.subject} {r.department ? `· ${r.department}` : ''}</div>
                  </div>
                  <span className="badge badge-gray">{r.resource_type}</span>
                </div>
              )) : <div className="widget-empty">No resources uploaded yet.</div>}
            </div>
          </div>

          {/* Notifications */}
          <div className="widget">
            <div className="widget__header">
              <div className="widget__title">🔔 Recent Notifications</div>
              <button className="mod-btn mod-btn--ghost mod-btn--sm" onClick={() => onModuleClick('notifications')}>See all</button>
            </div>
            <div className="widget__body">
              {summary.notifications?.length > 0 ? summary.notifications.map(n => (
                <div key={n.id} className={`widget-row ${!n.is_read ? 'unread' : ''}`}>
                  <div className="widget-row__icon">{n.is_read ? '🔕' : '🔔'}</div>
                  <div className="widget-row__text">
                    <div className="widget-row__title">{n.title}</div>
                    <div className="widget-row__sub">{n.message}</div>
                  </div>
                </div>
              )) : <div className="widget-empty">No notifications yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Module grid */}
      <section className="dashboard-section" aria-label="Platform modules" style={{ marginTop: '32px' }}>
        <div className="dashboard-section__header">
          <div>
            <h2 className="dashboard-section__title">All Modules</h2>
            <p className="dashboard-section__subtitle">Click a module to open it</p>
          </div>
        </div>
        <div className="module-grid">
          {MODULES.map(mod => (
            <ModuleCard
              key={mod.id}
              id={mod.id}
              icon={mod.icon}
              name={mod.name}
              description={mod.description}
              color={mod.color}
              onClick={() => onModuleClick(mod.id)}
            />
          ))}
        </div>
      </section>
    </>
  )
}

// ─── Global search hook for Topbar ───────────────────────────────────────────
function GlobalSearch({ onNavigate }) {
  const [q,       setQ]       = useState('')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function search(val) {
    setQ(val)
    if (val.length < 2) { setResults([]); setOpen(false); return }
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(val)}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) { setResults(data.results || []); setOpen(true) }
    } catch { /* silent */ }
  }

  const TYPE_ICON = { resource: '📖', internship: '💼', scholarship: '🎓', competition: '🏆', job: '💼', event: '🗓️', project: '💡', community: '💬' }

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }} ref={ref}>
      <div className="topbar__search" role="search">
        <span className="topbar__search-icon" aria-hidden="true">🔎</span>
        <input
          type="search"
          className="topbar__search-input"
          placeholder="Search resources, events, projects…"
          aria-label="Global search"
          id="topbar-search-input"
          value={q}
          onChange={e => search(e.target.value)}
          autoComplete="off"
        />
      </div>
      {open && (
        <div className="search-results-panel">
          {results.length === 0 ? (
            <div className="search-result-item" style={{ cursor: 'default' }}>
              <span style={{ fontSize: '18px' }}>🔎</span>
              <div>
                <div className="search-result-item__title">No matching records</div>
                <div className="search-result-item__sub">Try a different search term.</div>
              </div>
            </div>
          ) : results.map((r, i) => (
            <div key={i} className="search-result-item"
              onClick={() => { setOpen(false); setQ(''); onNavigate(r.module) }}>
              <span style={{ fontSize: '18px' }}>{TYPE_ICON[r.type] || '🔎'}</span>
              <div>
                <div className="search-result-item__title">{r.title}</div>
                {r.subtitle && <div className="search-result-item__sub">{r.subtitle}</div>}
              </div>
              <span className="badge badge-gray search-result-item__badge">{r.module}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────
function StudentDashboard({ navigate }) {
  const [activeModule, setActiveModule] = useState(null)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [unreadCount,  setUnreadCount]  = useState(0)
  const [currentUser,  setCurrentUser]  = useState(null)
  const [authState,    setAuthState]    = useState('loading')

  // Load authenticated user info + unread count in a single pass
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.user && d.user.role === 'student') {
          setCurrentUser(d.user)
          setAuthState('ready')
        } else if (d.success && d.user) {
          setAuthState('wrong-role')
        } else {
          setAuthState('unauthenticated')
        }
      })
      .catch(() => setAuthState('unavailable'))

    fetch('/api/notifications', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setUnreadCount(d.unread) })
      .catch(() => {})
  }, [])

  const selectedModule = MODULES.find(m => m.id === activeModule)
  const settingsOpen = activeModule === 'settings'
  const ModuleComponent = selectedModule?.Component

  const handleModuleClick = (moduleId) => {
    setActiveModule(moduleId)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    navigate('landing')
  }

  return (
    <div className="dashboard-layout">

      {/* ── Fixed Left Sidebar ── */}
      <Sidebar
        role="student"
        userName={currentUser?.fullName || null}
        activeModule={activeModule}
        onModuleClick={handleModuleClick}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main Content ── */}
      <div className="dashboard-main">

        {/* ── Fixed Top Bar ── */}
        <header className="topbar" role="banner">
          <button className="topbar__menu-btn" onClick={() => setSidebarOpen(p => !p)} aria-label="Toggle navigation menu" id="topbar-menu-btn">☰</button>
          <h1 className="topbar__title">{selectedModule ? selectedModule.name : settingsOpen ? 'Settings' : 'Student Dashboard'}</h1>
          <GlobalSearch onNavigate={handleModuleClick} />
          <div className="topbar__actions">
            <button className="topbar__icon-btn" aria-label="View notifications" id="topbar-notifications-btn"
              onClick={() => handleModuleClick('notifications')}>
              🔔
              {unreadCount > 0 && (
                <span className="topbar__badge" aria-label={`${unreadCount} unread notifications`}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            <div
              className="topbar__avatar"
              role="button"
              tabIndex={0}
              aria-label="Student profile"
              id="topbar-user-avatar"
              title={currentUser?.fullName || 'Student'}
              onClick={() => handleModuleClick('portfolio')}
            >
              {currentUser?.fullName
                ? currentUser.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                : 'ST'}
            </div>
          </div>
        </header>

        {/* ── Scrollable Content ── */}
        <div className="dashboard-content">
          {authState === 'loading' && (
            <div className="mod-loading"><div className="mod-spinner" /><span>Checking your session…</span></div>
          )}
          {authState === 'unauthenticated' && (
            <div className="mod-empty">
              <div className="mod-empty__icon">🔒</div>
              <div className="mod-empty__title">Please log in</div>
              <div className="mod-empty__sub">Your session is missing or has expired.</div>
              <button className="mod-btn mod-btn--primary" style={{ marginTop: '12px' }} onClick={() => navigate('login')}>
                Go to Login
              </button>
            </div>
          )}
          {authState === 'wrong-role' && (
            <div className="mod-empty">
              <div className="mod-empty__icon">🚫</div>
              <div className="mod-empty__title">Student dashboard only</div>
              <div className="mod-empty__sub">This page is for student accounts.</div>
              <button className="mod-btn mod-btn--primary" style={{ marginTop: '12px' }} onClick={() => navigate('landing')}>
                Back to Home
              </button>
            </div>
          )}
          {authState === 'unavailable' && (
            <div className="mod-empty">
              <div className="mod-empty__icon">⚠️</div>
              <div className="mod-empty__title">Could not verify your account</div>
              <div className="mod-empty__sub">The server may be unavailable. Try again in a moment.</div>
            </div>
          )}
          {authState === 'ready' && activeModule && (selectedModule || settingsOpen) ? (
            <section aria-label={settingsOpen ? 'Settings' : `${selectedModule.name} module`}>
              {/* Breadcrumb */}
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="mod-btn mod-btn--ghost mod-btn--sm" onClick={() => setActiveModule(null)}>
                  ← Dashboard
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>/ {settingsOpen ? 'Settings' : selectedModule.name}</span>
              </div>
              {settingsOpen
                ? <Settings onUserUpdated={updated => setCurrentUser(user => ({ ...user, ...updated }))} navigate={navigate} />
                : <ModuleComponent />}
            </section>
          ) : null}
          {authState === 'ready' && !activeModule ? (
            <DashboardOverview navigate={navigate} onModuleClick={handleModuleClick} currentUser={currentUser} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
