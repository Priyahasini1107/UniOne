/**
 * AdminDashboard.jsx — Admin Dashboard Page
 *
 * Features:
 * - Existing admin sidebar and topbar
 * - Management overview cards
 * - Create faculty and admin accounts
 * - Backend-authorized account creation
 * - Logout
 */

import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import '../styles/Dashboard.css'
import '../styles/Modules.css'

const ADMIN_CARDS = [
  {
    id: 'users',
    icon: '👤',
    title: 'User Management',
    desc: 'View, add, edit, and deactivate student, faculty, and admin accounts.',
    color: '#1a237e',
  },
  {
    id: 'content',
    icon: '📝',
    title: 'Content Management',
    desc: 'Manage academic resources, internship posts, and announcements.',
    color: '#283593',
  },
  {
    id: 'reports',
    icon: '📊',
    title: 'Reports & Analytics',
    desc: 'View platform usage statistics and generate activity reports.',
    color: '#1565c0',
  },
  {
    id: 'events-a',
    icon: '📅',
    title: 'Manage Events',
    desc: 'Create, edit, and publish college events on the Events Calendar.',
    color: '#00838f',
  },
  {
    id: 'scholars-a',
    icon: '🎓',
    title: 'Manage Scholarships',
    desc: 'Add and update scholarship listings and deadlines.',
    color: '#2e7d32',
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'System Settings',
    desc: 'Configure platform options, permissions, and email settings.',
    color: '#6a1b9a',
  },
]

function AdminDashboard({ navigate }) {
  const [activeModule, setActiveModule] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Create-account form state
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('faculty')
  const [creatingUser, setCreatingUser] = useState(false)
  const [userMessage, setUserMessage] = useState('')
  const [userMessageType, setUserMessageType] = useState('')
  const [campusRequests, setCampusRequests] = useState([])
  const [campusLoading, setCampusLoading] = useState(true)
  const [campusError, setCampusError] = useState('')
  const [campusFeedback, setCampusFeedback] = useState('')

  async function loadCampusRequests() {
    setCampusLoading(true); setCampusError('')
    try {
      const response = await fetch('/api/campus-services/manage')
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Could not load campus requests.')
      setCampusRequests(data.requests)
    } catch (error) { setCampusError(error.message) } finally { setCampusLoading(false) }
  }

  useEffect(() => { loadCampusRequests() }, [])

  async function updateCampusRequest(request, status, admin_note) {
    setCampusFeedback('')
    try {
      const response = await fetch(`/api/campus-services/manage/${request.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_note })
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Could not update request.')
      setCampusFeedback('Campus request updated.')
      loadCampusRequests()
    } catch (error) { setCampusError(error.message) }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setUserMessage('')
    setUserMessageType('')

    if (
      !newUserName.trim() ||
      !newUserEmail.trim() ||
      !newUserPassword
    ) {
      setUserMessage('Please fill in all fields.')
      setUserMessageType('error')
      return
    }

    if (newUserPassword.length < 8) {
      setUserMessage('The password must contain at least 8 characters.')
      setUserMessageType('error')
      return
    }

    try {
      setCreatingUser(true)

      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fullName: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to create the account.'
        )
      }

      setUserMessage(
        data.message ||
          `${newUserRole === 'faculty' ? 'Faculty' : 'Admin'} account created successfully.`
      )
      setUserMessageType('success')

      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserRole('faculty')
    } catch (error) {
      setUserMessage(
        error.message === 'Failed to fetch'
          ? 'Cannot connect to the server. Please check that the backend is running.'
          : error.message
      )
      setUserMessageType('error')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      navigate('landing')
    }
  }

  return (
    <div className="dashboard-layout">
      {/* Fixed Left Sidebar */}
      <Sidebar
        role="admin"
        activeModule={activeModule}
        onModuleClick={setActiveModule}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Top Bar */}
        <Topbar
          title="Admin Dashboard"
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          role="admin"
        />

        {/* Scrollable Page Content */}
        <div className="dashboard-content">
          {/* Welcome Banner */}
          <div className="dashboard-welcome" role="banner">
            <div className="dashboard-welcome__text">
              <div className="dashboard-welcome__greeting">
                Admin Control Panel 🛡️
              </div>
              <div className="dashboard-welcome__sub">
                Manage platform content, users, and settings from here.
              </div>
            </div>

            <div className="dashboard-welcome__date">
              {today}
            </div>
          </div>

          {/* Create Faculty / Admin Account */}
          <section
            className="dashboard-section"
            aria-label="Create user account"
            style={{ marginBottom: '24px' }}
          >
            <div className="dashboard-section__header">
              <div>
                <h2 className="dashboard-section__title">
                  Create Faculty / Admin Account
                </h2>
                <p className="dashboard-section__subtitle">
                  Create accounts for authorized faculty members and administrators.
                </p>
              </div>
            </div>

            <form
              className="auth-form"
              onSubmit={handleCreateUser}
              style={{ maxWidth: '600px' }}
            >
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="new-user-name"
                >
                  Full Name
                </label>
                <input
                  id="new-user-name"
                  type="text"
                  className="form-input"
                  placeholder="Enter full name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="new-user-email"
                >
                  Email Address
                </label>
                <input
                  id="new-user-email"
                  type="email"
                  className="form-input"
                  placeholder="Enter email address"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="new-user-password"
                >
                  Initial Password
                </label>
                <input
                  id="new-user-password"
                  type="password"
                  className="form-input"
                  placeholder="Create an initial password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="new-user-role"
                >
                  Account Role
                </label>
                <select
                  id="new-user-role"
                  className="form-select"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                >
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {userMessage && (
                <p
                  role="status"
                  aria-live="polite"
                  style={{
                    color:
                      userMessageType === 'success'
                        ? 'green'
                        : 'crimson',
                    marginBottom: '12px',
                  }}
                >
                  {userMessage}
                </p>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={creatingUser}
              >
                {creatingUser
                  ? 'Creating Account...'
                  : 'Create Account'}
              </button>
            </form>
          </section>

          <section className="dashboard-section" aria-label="Campus service request queue" style={{ marginBottom: '24px' }}>
            <div className="dashboard-section__header"><div><h2 className="dashboard-section__title">Campus Service Requests</h2><p className="dashboard-section__subtitle">Review and update requests as an active administrator.</p></div><button className="mod-btn mod-btn--secondary" onClick={loadCampusRequests}>Refresh</button></div>
            {campusFeedback && <p role="status">{campusFeedback}</p>}
            {campusError && <p role="alert" style={{ color: 'crimson' }}>{campusError}</p>}
            {campusLoading ? <p>Loading campus requests…</p> : campusRequests.length === 0 ? <p>No campus service requests yet.</p> : <div className="mod-list">
              {campusRequests.map(request => <article className="mod-card" key={request.id}>
                <div className="mod-card__header"><h3 className="mod-card__title">{request.description.replace(/^\[DEMO:UNIONE-CAMPUS\]\s*/, '')}</h3>{request.is_demo && <span className="badge badge-orange">Sample</span>}</div>
                <div className="mod-card__meta"><span>{request.category.replace('_', ' ')}</span><span>{request.location || 'No location'}</span><span>{request.student_name}</span><span>{new Date(request.created_at).toLocaleDateString()}</span></div>
                {!request.is_demo && <div className="mod-form-row" style={{ marginTop: '12px' }}>
                  <select className="form-select" aria-label="Request status" value={request.status} onChange={e => setCampusRequests(rows => rows.map(row => row.id === request.id ? { ...row, status: e.target.value } : row))}><option value="submitted">Submitted</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option></select>
                  <input className="form-input" aria-label="Admin note" value={request.admin_note || ''} placeholder="Optional private note" onChange={e => setCampusRequests(rows => rows.map(row => row.id === request.id ? { ...row, admin_note: e.target.value } : row))} />
                  <button className="mod-btn mod-btn--primary" onClick={() => updateCampusRequest(request, request.status, request.admin_note || '')}>Save update</button>
                </div>}
              </article>)}
            </div>}
          </section>

          {/* Stage Notice */}
          <div className="stage-notice" role="note">
            <span aria-hidden="true">🚧</span>
            <span>
              <strong>Stage 1 Foundation.</strong> Other management
              features, including content moderation, events, scholarships,
              and analytics, will be connected to the backend in later stages.
            </span>
          </div>

          {/* Existing Admin Overview Cards */}
          <section
            className="dashboard-section"
            aria-label="Admin management areas"
          >
            <div className="dashboard-section__header">
              <div>
                <h2 className="dashboard-section__title">
                  Management Areas
                </h2>
                <p className="dashboard-section__subtitle">
                  Manage your UniOne platform.
                </p>
              </div>
            </div>

            <div className="admin-grid">
              {ADMIN_CARDS.map((card) => (
                <article
                  key={card.id}
                  className="admin-card"
                  style={{ '--card-color': card.color }}
                  aria-label={card.title}
                  id={`admin-card-${card.id}`}
                >
                  <div
                    className="admin-card__icon"
                    aria-hidden="true"
                  >
                    {card.icon}
                  </div>
                  <h3 className="admin-card__title">
                    {card.title}
                  </h3>
                  <p className="admin-card__desc">
                    {card.desc}
                  </p>
                  <span className="badge badge-stage2">
                    Stage 2
                  </span>
                </article>
              ))}
            </div>
          </section>

          {/* Existing Student Dashboard Preview */}
          <div
            style={{
              marginTop: '8px',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
            }}
          >
            Previewing admin layout?{' '}
            <button
              onClick={() => navigate('dashboard')}
              style={{
                color: 'var(--navy-500)',
                fontWeight: '600',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit',
              }}
              id="admin-switch-to-student-btn"
            >
              Switch to Student Dashboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
