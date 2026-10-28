/**
 * Sidebar.jsx — Navigation Sidebar Component
 *
 * Renders the fixed left sidebar with the UniOne logo, user info,
 * module navigation links, and footer actions.
 *
 * Props:
 *   activeModule  {string}   — ID of the currently selected module
 *   onModuleClick {function} — Called with the module ID when a link is clicked
 *   onLogout      {function} — Called when the Logout button is clicked
 *   role          {string}   — 'student' or 'admin'
 *   isOpen        {boolean}  — Whether the sidebar is visible on mobile
 *   onClose       {function} — Closes the sidebar (mobile overlay click)
 */

import '../styles/Sidebar.css'

/* ─── Module definitions for the Student sidebar ─── */
const STUDENT_MODULES = [
  { id: 'academic',      icon: '📚', label: 'Academic Resources' },
  { id: 'interview',     icon: '💼', label: 'Interview Preparation' },
  { id: 'internships',   icon: '🌐', label: 'Internships & Opportunities' },
  { id: 'roadmaps',      icon: '🗺️',  label: 'Career Roadmaps' },
  { id: 'events',        icon: '📅', label: 'Events Calendar' },
  { id: 'scholarships',  icon: '🏅', label: 'Scholarships' },
  { id: 'findback',      icon: '🔍', label: 'FindBack' },
  { id: 'projectvault',  icon: '🗂️',  label: 'ProjectVault' },
  { id: 'campus',        icon: '🏫', label: 'Smart Campus Services' },
  { id: 'community',     icon: '👥', label: 'Student Community' },
  { id: 'portfolio',     icon: '📋', label: 'My Portfolio' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
]

/* ─── Module definitions for the Admin sidebar ─── */
const ADMIN_MODULES = [
  { id: 'users',      icon: '👤', label: 'User Management' },
  { id: 'content',    icon: '📝', label: 'Content Management' },
  { id: 'reports',    icon: '📊', label: 'Reports & Analytics' },
  { id: 'events-a',   icon: '📅', label: 'Manage Events' },
  { id: 'scholars-a', icon: '🎓', label: 'Manage Scholarships' },
  { id: 'settings',   icon: '⚙️', label: 'System Settings' },
  { id: 'audit',      icon: '🔍', label: 'Audit Logs' },
]

function Sidebar({ activeModule, onModuleClick, onLogout, role = 'student', isOpen, onClose, userName = null }) {
  // Pick the right module list based on user role
  const modules    = role === 'admin' ? ADMIN_MODULES : STUDENT_MODULES
  const initials   = userName
    ? userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (role === 'admin' ? 'AD' : 'ST')
  const displayName = userName || (role === 'admin' ? 'Admin User' : 'Student')

  return (
    <>
      {/*
       * Dark overlay — appears behind the sidebar on mobile when it is open.
       * Clicking it closes the sidebar.
       */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}
        aria-label="Main navigation"
      >

        {/* ── Logo & App Name ── */}
        <div className="sidebar__header">
          <div className="sidebar__logo-icon" aria-hidden="true">U</div>
          <div>
            <div className="sidebar__logo-text">UniOne</div>
            <div className="sidebar__logo-tagline">Student Platform</div>
          </div>
        </div>

        {/* ── Logged-in User Info ── */}
        <div className="sidebar__user">
          <div className="sidebar__user-avatar" aria-hidden="true">{initials}</div>
          <div>
            <div className="sidebar__user-name">{displayName}</div>
            <div className="sidebar__user-role">{role}</div>
          </div>
        </div>

        {/* ── Navigation Links ── */}
        <nav className="sidebar__nav" aria-label="Module navigation">
          <div className="sidebar__nav-label">Modules</div>

          {modules.map((mod) => (
            <button
              key={mod.id}
              className={`sidebar__nav-item ${activeModule === mod.id ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => {
                onModuleClick(mod.id)
                onClose() // Close sidebar on mobile after clicking a link
              }}
              aria-current={activeModule === mod.id ? 'page' : undefined}
              id={`sidebar-nav-${mod.id}`}
            >
              <span className="sidebar__nav-item-icon" aria-hidden="true">{mod.icon}</span>
              <span className="sidebar__nav-item-text">{mod.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Footer: Settings & Logout ── */}
        <div className="sidebar__footer">
          <button
            className={`sidebar__footer-btn ${activeModule === 'settings' ? 'sidebar__footer-btn--active' : ''}`}
            id="sidebar-settings-btn"
            aria-label="Settings"
            aria-current={activeModule === 'settings' ? 'page' : undefined}
            onClick={() => { onModuleClick('settings'); onClose() }}
          >
            <span aria-hidden="true">⚙️</span>
            <span>Settings</span>
          </button>

          <button
            className="sidebar__footer-btn"
            onClick={onLogout}
            id="sidebar-logout-btn"
            aria-label="Log out"
          >
            <span aria-hidden="true">🚪</span>
            <span>Log Out</span>
          </button>
        </div>

      </aside>
    </>
  )
}

export default Sidebar
