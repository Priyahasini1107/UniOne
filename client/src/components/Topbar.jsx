/**
 * Topbar.jsx — Top Navigation Bar Component
 *
 * Displays the horizontal bar fixed to the top of the dashboard. Contains:
 *   - Hamburger menu button (mobile only, shown via CSS)
 *   - Current page/section title
 *   - Search input field
 *   - Notification button with badge
 *   - User avatar with initials
 *
 * Props:
 *   title        {string}   — Text to show as the page title
 *   onMenuToggle {function} — Toggles the sidebar open/closed (mobile)
 *   role         {string}   — 'student' or 'admin'
 */

import '../styles/Sidebar.css'

function Topbar({ title = 'Dashboard', onMenuToggle, role = 'student' }) {
  const initials = role === 'admin' ? 'AD' : 'ST'

  return (
    <header className="topbar" role="banner">

      {/* Hamburger — only visible on mobile (controlled via CSS) */}
      <button
        className="topbar__menu-btn"
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
        id="topbar-menu-btn"
      >
        ☰
      </button>

      {/* Current section title */}
      <h1 className="topbar__title">{title}</h1>

      {/* Search bar */}
      <div className="topbar__search" role="search">
        <span className="topbar__search-icon" aria-hidden="true">🔎</span>
        <input
          type="search"
          className="topbar__search-input"
          placeholder="Search modules, resources..."
          aria-label="Search UniOne"
          id="topbar-search-input"
        />
      </div>

      {/* Right-side actions */}
      <div className="topbar__actions">

        {/* Notifications button */}
        <button
          className="topbar__icon-btn"
          aria-label="View notifications"
          id="topbar-notifications-btn"
        >
          🔔
          {/* Badge shows a static count — will be dynamic in Stage 2 */}
          <span className="topbar__badge" aria-label="3 notifications">3</span>
        </button>

        {/* User avatar */}
        <div
          className="topbar__avatar"
          role="button"
          tabIndex={0}
          aria-label={`${role} profile menu`}
          id="topbar-user-avatar"
        >
          {initials}
        </div>

      </div>
    </header>
  )
}

export default Topbar
