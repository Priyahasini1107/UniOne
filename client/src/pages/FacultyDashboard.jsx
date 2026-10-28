/**
 * FacultyDashboard.jsx — Complete Faculty Dashboard
 *
 * Replaces the basic stub. Uses existing auth (/api/auth/me, /api/auth/logout)
 * and the new /api/faculty/* endpoints.
 *
 * Navigation is handled internally with `activePage` state — no router needed.
 * The sidebar and topbar are built inline using the existing Sidebar.css class
 * names (no shared component modified) so other dashboards are unaffected.
 *
 * Sub-page components are defined in this file:
 *   OverviewPage, ClassesPage, AttendancePage, AssignmentsPage,
 *   AnnouncementsPage, OpportunitiesPage
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import '../styles/Sidebar.css'
import '../styles/Dashboard.css'
import '../styles/FacultyDashboard.css'

// ─── Constants ───────────────────────────────────────────────────────────────

const FACULTY_NAV = [
  { id: 'overview',      icon: '🏠', label: 'Overview' },
  { id: 'classes',       icon: '📚', label: 'My Classes' },
  { id: 'attendance',    icon: '✅', label: 'Attendance' },
  { id: 'assignments',   icon: '📝', label: 'Assignments' },
  { id: 'announcements', icon: '📢', label: 'Announcements' },
  { id: 'opportunities', icon: '💼', label: 'Opportunities' },
]

const PAGE_TITLES = {
  overview:      'Faculty Overview',
  classes:       'My Classes',
  attendance:    'Attendance Management',
  assignments:   'Assignments',
  announcements: 'Announcements',
  opportunities: 'Internships & Scholarships',
}

const OPPORTUNITY_TYPES = [
  { value: 'internship',  label: 'Internship' },
  { value: 'job',         label: 'Job' },
  { value: 'scholarship', label: 'Scholarship' },
]

const REVIEW_TRANSITIONS = {
  interested: ['under_review', 'shortlisted', 'interview', 'selected', 'rejected'],
  applied: ['under_review', 'shortlisted', 'interview', 'selected', 'rejected'],
  submitted: ['under_review', 'rejected'],
  under_review: ['shortlisted', 'interview', 'rejected'],
  shortlisted: ['interview', 'selected', 'rejected'],
  interview: ['selected', 'rejected'],
  selected: [],
  rejected: [],
}

const EMPTY_OPPORTUNITY_FORM = {
  type: 'internship',
  title: '',
  company_or_org: '',
  description: '',
  eligibility: '',
  skills: '',
  location: '',
  work_mode: '',
  stipend: '',
  deadline: '',
  apply_url: '',
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'F'
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).formatToParts(new Date())
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`
}

// ─── Toast helper hook ────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState(null) // { type: 'success'|'error', msg }
  const timerRef = useRef(null)

  const show = useCallback((type, msg) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ type, msg })
    timerRef.current = setTimeout(() => setToast(null), 4500)
  }, [])

  return [toast, show]
}

// ─── Toast renderer ───────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null
  const icon = toast.type === 'success' ? '✅' : '❌'
  return (
    <div className={`fd-toast fd-toast--${toast.type}`} role="status" aria-live="polite">
      <span>{icon}</span>
      <span>{toast.msg}</span>
    </div>
  )
}

// ─── Loading / Empty / Error helpers ─────────────────────────────────────────

function Spinner() {
  return <div className="fd-loading-screen" aria-label="Loading"><div className="fd-spinner" /></div>
}

function PageLoading() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}>
      <div className="fd-spinner" />
    </div>
  )
}

function EmptyState({ icon, title, sub }) {
  return (
    <div className="fd-empty" role="status">
      <div className="fd-empty__icon" aria-hidden="true">{icon}</div>
      <div className="fd-empty__title">{title}</div>
      {sub && <div className="fd-empty__sub">{sub}</div>}
    </div>
  )
}

// ─── API helper: wraps fetch with credentials ─────────────────────────────────

async function apiFetch(url, opts = {}) {
  const res  = await fetch(url, { credentials: 'include', ...opts })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE — OVERVIEW
// ═════════════════════════════════════════════════════════════════════════════

function OverviewPage({ user }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/faculty/summary')
      .then(({ data }) => { if (data.success) setSummary(data.summary) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const STATS = [
    { label: 'My Classes',   key: 'classes',       icon: '📚', color: '#1a237e' },
    { label: 'Students',     key: 'students',      icon: '👥', color: '#2e7d32' },
    { label: 'Assignments',  key: 'assignments',   icon: '📝', color: '#b45309' },
    { label: 'Announcements',key: 'announcements', icon: '📢', color: '#6a1b9a' },
  ]

  return (
    <>
      {/* Welcome banner — reuses existing dashboard-welcome classes */}
      <div className="dashboard-welcome" role="banner">
        <div className="dashboard-welcome__text">
          <div className="dashboard-welcome__greeting">
            {greeting()}, {user?.fullName?.split(' ')[0] || 'Professor'} 👋
          </div>
          <div className="dashboard-welcome__sub">
            Here's a snapshot of your faculty workspace.
          </div>
        </div>
        <div className="dashboard-welcome__date">{dateStr}</div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <PageLoading />
      ) : (
        <div className="fd-stat-grid" aria-label="Summary statistics">
          {STATS.map(s => (
            <div
              key={s.key}
              className="fd-stat-card"
              style={{ '--stat-color': s.color }}
              aria-label={`${s.label}: ${summary?.[s.key] ?? 0}`}
            >
              <div className="fd-stat-card__icon" aria-hidden="true">{s.icon}</div>
              <div className="fd-stat-card__value">{summary?.[s.key] ?? 0}</div>
              <div className="fd-stat-card__label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick guide */}
      <div className="fd-toast fd-toast--info" role="note">
        <span>ℹ️</span>
        <span>
          Use the sidebar to navigate. Start by adding a class in <strong>My Classes</strong>,
          then enroll students, and mark attendance from the <strong>Attendance</strong> page.
        </span>
      </div>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE — MY CLASSES
// ═════════════════════════════════════════════════════════════════════════════

function ClassesPage() {
  const [classes,     setClasses]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [toast, showToast]            = useToast()

  // Add-class form state
  const [form, setForm] = useState({ subject_name:'', subject_code:'', semester:'', department:'' })

  // Enrollment view state (which class is expanded)
  const [enrollClassId,   setEnrollClassId]   = useState(null)
  const [enrollClassName, setEnrollClassName] = useState('')
  const [enrollments,     setEnrollments]     = useState([])
  const [enrollLoading,   setEnrollLoading]   = useState(false)

  // Student search state
  const [searchQ,       setSearchQ]       = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching]     = useState(false)
  const [rollNumber,    setRollNumber]    = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const searchTimer = useRef(null)

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const loadClasses = useCallback(() => {
    setLoading(true)
    apiFetch('/api/faculty/classes')
      .then(({ data }) => { if (data.success) setClasses(data.classes) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadClasses() }, [loadClasses])

  // ── Add class ──
  const handleAddClass = async (e) => {
    e.preventDefault()
    if (!form.subject_name.trim()) { showToast('error', 'Subject name is required.'); return }
    setSubmitting(true)
    try {
      const { ok, data } = await apiFetch('/api/faculty/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (ok && data.success) {
        showToast('success', data.message)
        setForm({ subject_name:'', subject_code:'', semester:'', department:'' })
        setShowForm(false)
        loadClasses()
      } else {
        showToast('error', data.message || 'Could not create class.')
      }
    } catch { showToast('error', 'Network error. Please try again.') }
    finally { setSubmitting(false) }
  }

  // ── Delete class ──
  const handleDeleteClass = async (classId) => {
    try {
      const { ok, data } = await apiFetch(`/api/faculty/classes/${classId}`, { method: 'DELETE' })
      if (ok && data.success) {
        showToast('success', data.message)
        if (enrollClassId === classId) setEnrollClassId(null)
        setConfirmDeleteId(null)
        loadClasses()
      } else {
        showToast('error', data.message || 'Delete failed.')
      }
    } catch { showToast('error', 'Network error.') }
  }

  // ── Open enrollment panel ──
  const openEnrollments = useCallback((cls) => {
    setEnrollClassId(cls.id)
    setEnrollClassName(cls.subject_name)
    setEnrollLoading(true)
    setSearchQ(''); setSearchResults([]); setSelectedStudent(null); setRollNumber('')
    apiFetch(`/api/faculty/classes/${cls.id}/enrollments`)
      .then(({ data }) => { if (data.success) setEnrollments(data.enrollments) })
      .catch(() => {})
      .finally(() => setEnrollLoading(false))
  }, [])

  // ── Student search with debounce ──
  const handleSearchChange = (val) => {
    setSearchQ(val)
    setSelectedStudent(null)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (val.trim().length < 2) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await apiFetch(`/api/faculty/students?q=${encodeURIComponent(val.trim())}`)
        if (data.success) setSearchResults(data.students)
      } catch {} finally { setSearching(false) }
    }, 350)
  }

  // ── Enroll a student ──
  const handleEnroll = async () => {
    if (!selectedStudent) { showToast('error', 'Please search and select a student first.'); return }
    try {
      const { ok, data } = await apiFetch(`/api/faculty/classes/${enrollClassId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_user_id: selectedStudent.id, roll_number: rollNumber }),
      })
      if (ok && data.success) {
        showToast('success', data.message)
        setSearchQ(''); setSearchResults([]); setSelectedStudent(null); setRollNumber('')
        // Reload enrollments
        const r = await apiFetch(`/api/faculty/classes/${enrollClassId}/enrollments`)
        if (r.data.success) setEnrollments(r.data.enrollments)
        loadClasses() // refresh student_count on cards
      } else {
        showToast('error', data.message || 'Could not enroll student.')
      }
    } catch { showToast('error', 'Network error.') }
  }

  // ── Remove a student from class ──
  const handleRemoveEnrollment = async (enrollmentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from this class?`)) return
    try {
      const { ok, data } = await apiFetch(`/api/faculty/enrollments/${enrollmentId}`, { method: 'DELETE' })
      if (ok && data.success) {
        showToast('success', data.message)
        setEnrollments(prev => prev.filter(e => e.id !== enrollmentId))
        loadClasses()
      } else {
        showToast('error', data.message || 'Could not remove student.')
      }
    } catch { showToast('error', 'Network error.') }
  }

  return (
    <>
      <Toast toast={toast} />

      {/* Section header */}
      <div className="fd-section-header">
        <div>
          <div className="fd-section-title">My Classes</div>
          <div className="fd-section-sub">{classes.length} class{classes.length !== 1 ? 'es' : ''} total</div>
        </div>
        <button
          className={`fd-btn ${showForm ? 'fd-btn--secondary' : 'fd-btn--primary'}`}
          onClick={() => setShowForm(p => !p)}
          id="fd-add-class-btn"
        >
          {showForm ? '✕ Cancel' : '+ Add Class'}
        </button>
      </div>

      {/* Add class form */}
      {showForm && (
        <div className="fd-form-panel">
          <div className="fd-form-panel__title">New Class</div>
          <form onSubmit={handleAddClass} noValidate>
            <div className="fd-form-row" style={{ marginBottom: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="fc-subject-name">Subject Name *</label>
                <input
                  id="fc-subject-name"
                  className="form-input"
                  placeholder="e.g. Data Structures"
                  value={form.subject_name}
                  onChange={e => setForm(p => ({ ...p, subject_name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="fc-subject-code">Subject Code</label>
                <input
                  id="fc-subject-code"
                  className="form-input"
                  placeholder="e.g. CS301"
                  value={form.subject_code}
                  onChange={e => setForm(p => ({ ...p, subject_code: e.target.value }))}
                />
              </div>
            </div>
            <div className="fd-form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="fc-semester">Semester</label>
                <input
                  id="fc-semester"
                  className="form-input"
                  placeholder="e.g. Semester 5"
                  value={form.semester}
                  onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="fc-dept">Department</label>
                <input
                  id="fc-dept"
                  className="form-input"
                  placeholder="e.g. Computer Science"
                  value={form.department}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                />
              </div>
            </div>
            <div className="fd-form-actions">
              <button type="submit" className="fd-btn fd-btn--primary" disabled={submitting} id="fc-submit-btn">
                {submitting ? 'Creating…' : 'Create Class'}
              </button>
              <button type="button" className="fd-btn fd-btn--secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classes grid */}
      {loading ? <PageLoading /> : classes.length === 0 ? (
        <EmptyState icon="📚" title="No classes yet" sub="Click 'Add Class' to create your first class." />
      ) : (
        <div className="fd-class-grid">
          {classes.map(cls => (
            <div key={cls.id} className="fd-class-card" id={`fd-class-card-${cls.id}`}>
              <div className="fd-class-card__header">
                <div className="fd-class-card__title">{cls.subject_name}</div>
                {cls.subject_code && <span className="fd-class-card__code">{cls.subject_code}</span>}
              </div>
              <div className="fd-class-card__meta">
                {cls.semester && <div>📅 {cls.semester}</div>}
                {cls.department && <div>🏫 {cls.department}</div>}
              </div>
              <div className="fd-class-card__count">
                👥 {cls.student_count} student{cls.student_count !== 1 ? 's' : ''} enrolled
              </div>

              {confirmDeleteId === cls.id && (
                <div className="fd-confirm">
                  <span>⚠️ Delete this class and all its data?</span>
                  <button className="fd-btn fd-btn--sm fd-btn--danger" onClick={() => handleDeleteClass(cls.id)}>Yes, delete</button>
                  <button className="fd-btn fd-btn--sm fd-btn--secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                </div>
              )}

              <div className="fd-class-card__actions">
                <button
                  className="fd-btn fd-btn--sm fd-btn--primary"
                  onClick={() => openEnrollments(cls)}
                  id={`fd-manage-students-${cls.id}`}
                >
                  👥 Students
                </button>
                <button
                  className="fd-btn fd-btn--sm fd-btn--danger"
                  onClick={() => setConfirmDeleteId(cls.id)}
                  id={`fd-delete-class-${cls.id}`}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enrollment panel — shown when a class's "Students" button is clicked */}
      {enrollClassId && (
        <div className="fd-section" style={{ marginTop: 28 }}>
          <div className="fd-enrollment-panel">
            {/* Header */}
            <div className="fd-enrollment-panel__header">
              <div className="fd-enrollment-panel__title">
                Students in: {enrollClassName}
              </div>
              <button
                className="fd-btn fd-btn--sm fd-btn--secondary"
                onClick={() => setEnrollClassId(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* Add student search */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--navy-700)', marginBottom: 12 }}>
                Enroll a Student
              </div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
                <div className="form-group fd-search-wrap" style={{ flex:2, minWidth: 200 }}>
                  <label className="form-label" htmlFor="fd-student-search">
                    Search by name or email
                    {searching && ' …'}
                  </label>
                  <input
                    id="fd-student-search"
                    className="form-input"
                    placeholder="Type at least 2 characters"
                    value={selectedStudent ? selectedStudent.full_name : searchQ}
                    onChange={e => { setSelectedStudent(null); handleSearchChange(e.target.value) }}
                    autoComplete="off"
                  />
                  {searchResults.length > 0 && !selectedStudent && (
                    <div className="fd-search-results">
                      {searchResults.map(s => (
                        <div
                          key={s.id}
                          className="fd-search-result-item"
                          role="button"
                          tabIndex={0}
                          onClick={() => { setSelectedStudent(s); setSearchQ(s.full_name); setSearchResults([]) }}
                          onKeyDown={e => e.key === 'Enter' && (setSelectedStudent(s), setSearchQ(s.full_name), setSearchResults([]))}
                        >
                          <div className="fd-search-result-item__name">{s.full_name}</div>
                          <div className="fd-search-result-item__email">{s.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ flex:1, minWidth: 130 }}>
                  <label className="form-label" htmlFor="fd-roll-number">Roll Number (optional)</label>
                  <input
                    id="fd-roll-number"
                    className="form-input"
                    placeholder="e.g. 2021CS001"
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value)}
                  />
                </div>
                <button
                  className="fd-btn fd-btn--primary"
                  onClick={handleEnroll}
                  id="fd-enroll-btn"
                  style={{ marginBottom: 1 }}
                >
                  Enroll
                </button>
              </div>
            </div>

            {/* Enrolled students table */}
            {enrollLoading ? <PageLoading /> : enrollments.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:'var(--text-sm)' }}>
                No students enrolled yet. Use the search above to add students.
              </div>
            ) : (
              <div className="fd-table-wrap" style={{ border:'none', borderRadius:0 }}>
                <table className="fd-table" aria-label="Enrolled students">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Roll No</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e, i) => (
                      <tr key={e.id}>
                        <td className="fd-cell-muted">{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{e.full_name}</td>
                        <td className="fd-cell-muted">{e.email}</td>
                        <td className="fd-cell-muted">{e.roll_number || '—'}</td>
                        <td>
                          <button
                            className="fd-btn fd-btn--sm fd-btn--danger"
                            onClick={() => handleRemoveEnrollment(e.id, e.full_name)}
                            id={`fd-remove-enrollment-${e.id}`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE — ATTENDANCE
// ═════════════════════════════════════════════════════════════════════════════

function AttendancePage() {
  const [classes,    setClasses]    = useState([])
  const [classId,    setClassId]    = useState('')
  const [date,       setDate]       = useState(today())
  const [records,    setRecords]    = useState([])  // { enrollment_id, full_name, email, roll_number, status }
  const [loaded,     setLoaded]     = useState(false)
  const [loadingAtt, setLoadingAtt] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [toast, showToast]          = useToast()

  // Load classes on mount
  useEffect(() => {
    apiFetch('/api/faculty/classes')
      .then(({ data }) => { if (data.success) setClasses(data.classes) })
      .catch(() => {})
  }, [])

  const loadAttendance = async () => {
    if (!classId) { showToast('error', 'Please select a class.'); return }
    if (!date)    { showToast('error', 'Please select a date.'); return }
    setLoadingAtt(true); setLoaded(false)
    try {
      const { ok, data } = await apiFetch(`/api/faculty/attendance/${classId}/${date}`)
      if (ok && data.success) {
        setRecords(data.records.map(r => ({ ...r })))  // mutable copy
        setLoaded(true)
      } else {
        showToast('error', data.message || 'Could not load attendance.')
      }
    } catch { showToast('error', 'Network error.') }
    finally { setLoadingAtt(false) }
  }

  const setStatus = (enrollmentId, status) => {
    setRecords(prev => prev.map(r => r.enrollment_id === enrollmentId ? { ...r, status } : r))
  }

  const markAll = (status) => {
    setRecords(prev => prev.map(r => ({ ...r, status })))
  }

  const handleSave = async () => {
    if (!loaded || records.length === 0) return
    setSaving(true)
    try {
      const body = {
        class_id: Number(classId),
        date,
        records: records.map(r => ({ enrollment_id: r.enrollment_id, status: r.status })),
      }
      const { ok, data } = await apiFetch('/api/faculty/attendance', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (ok && data.success) {
        showToast('success', data.message)
      } else {
        showToast('error', data.message || 'Could not save attendance.')
      }
    } catch { showToast('error', 'Network error.') }
    finally { setSaving(false) }
  }

  const countStatus = (s) => records.filter(r => r.status === s).length

  return (
    <>
      <Toast toast={toast} />

      {/* Controls */}
      <div className="fd-att-controls">
        <div className="form-group">
          <label className="form-label" htmlFor="att-class-select">Select Class</label>
          <select
            id="att-class-select"
            className="form-select"
            value={classId}
            onChange={e => { setClassId(e.target.value); setLoaded(false); setRecords([]) }}
          >
            <option value="">— Choose a class —</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.subject_name}{c.subject_code ? ` (${c.subject_code})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="att-date-input">Date</label>
          <input
            id="att-date-input"
            type="date"
            className="form-input"
            value={date}
            max={today()}
            onChange={e => { setDate(e.target.value); setLoaded(false); setRecords([]) }}
          />
        </div>
        <button
          className="fd-btn fd-btn--primary"
          onClick={loadAttendance}
          disabled={loadingAtt}
          id="att-load-btn"
          style={{ marginBottom: 1 }}
        >
          {loadingAtt ? 'Loading…' : 'Load Attendance'}
        </button>
      </div>

      {/* No class selected yet */}
      {!loaded && !loadingAtt && (
        <EmptyState icon="✅" title="Select a class and date" sub="Then click 'Load Attendance' to mark attendance." />
      )}

      {loadingAtt && <PageLoading />}

      {/* Attendance sheet */}
      {loaded && (
        <>
          {records.length === 0 ? (
            <div className="fd-toast fd-toast--info" role="note">
              <span>ℹ️</span>
              <span>No students are enrolled in this class yet. Go to <strong>My Classes</strong> to enroll students first.</span>
            </div>
          ) : (
            <>
              {/* Summary + quick actions */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:12 }}>
                <div style={{ display:'flex', gap:16, fontSize:'var(--text-sm)', color:'var(--text-muted)' }}>
                  <span>✅ Present: <strong>{countStatus('present')}</strong></span>
                  <span>❌ Absent: <strong>{countStatus('absent')}</strong></span>
                  <span>⏰ Late: <strong>{countStatus('late')}</strong></span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="fd-btn fd-btn--sm fd-btn--ghost" onClick={() => markAll('present')}>Mark All Present</button>
                  <button className="fd-btn fd-btn--sm fd-btn--ghost" onClick={() => markAll('absent')}>Mark All Absent</button>
                </div>
              </div>

              <div className="fd-table-wrap" style={{ marginBottom:16 }}>
                <table className="fd-table" aria-label="Attendance sheet">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th>Roll No</th>
                      <th style={{ textAlign:'center' }}>Present</th>
                      <th style={{ textAlign:'center' }}>Absent</th>
                      <th style={{ textAlign:'center' }}>Late</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={r.enrollment_id} className={`fd-att-row--${r.status}`}>
                        <td className="fd-cell-muted">{i + 1}</td>
                        <td style={{ fontWeight:500 }}>{r.full_name}</td>
                        <td className="fd-cell-muted">{r.roll_number || '—'}</td>
                        {(['present','absent','late']).map(s => (
                          <td key={s} style={{ textAlign:'center' }}>
                            <button
                              className={`fd-status-btn ${s} ${r.status !== s ? 'muted' : ''}`}
                              onClick={() => setStatus(r.enrollment_id, s)}
                              aria-pressed={r.status === s}
                              id={`att-${r.enrollment_id}-${s}`}
                            >
                              {s === 'present' ? 'P' : s === 'absent' ? 'A' : 'L'}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="fd-btn fd-btn--primary"
                onClick={handleSave}
                disabled={saving}
                id="att-save-btn"
              >
                {saving ? 'Saving…' : `💾 Save Attendance (${records.length} students)`}
              </button>
            </>
          )}
        </>
      )}
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE — ASSIGNMENTS
// ═════════════════════════════════════════════════════════════════════════════

function AssignmentsPage() {
  const [assignments, setAssignments] = useState([])
  const [classes,     setClasses]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [toast, showToast]            = useToast()

  const [form, setForm] = useState({ class_id:'', title:'', description:'', due_date:'' })

  const loadAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      apiFetch('/api/faculty/assignments'),
      apiFetch('/api/faculty/classes'),
    ]).then(([aRes, cRes]) => {
      if (aRes.data.success) setAssignments(aRes.data.assignments)
      if (cRes.data.success) setClasses(cRes.data.classes)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.class_id) { showToast('error', 'Please select a class.'); return }
    if (!form.title.trim()) { showToast('error', 'Assignment title is required.'); return }
    setSubmitting(true)
    try {
      const { ok, data } = await apiFetch('/api/faculty/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (ok && data.success) {
        showToast('success', data.message)
        setForm({ class_id:'', title:'', description:'', due_date:'' })
        setShowForm(false)
        loadAll()
      } else {
        showToast('error', data.message || 'Could not create assignment.')
      }
    } catch { showToast('error', 'Network error.') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment?')) return
    try {
      const { ok, data } = await apiFetch(`/api/faculty/assignments/${id}`, { method: 'DELETE' })
      if (ok && data.success) {
        showToast('success', data.message)
        setAssignments(prev => prev.filter(a => a.id !== id))
      } else {
        showToast('error', data.message || 'Delete failed.')
      }
    } catch { showToast('error', 'Network error.') }
  }

  return (
    <>
      <Toast toast={toast} />

      <div className="fd-section-header">
        <div>
          <div className="fd-section-title">Assignments</div>
          <div className="fd-section-sub">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''} total</div>
        </div>
        <button
          className={`fd-btn ${showForm ? 'fd-btn--secondary' : 'fd-btn--primary'}`}
          onClick={() => setShowForm(p => !p)}
          id="fd-add-assignment-btn"
        >
          {showForm ? '✕ Cancel' : '+ New Assignment'}
        </button>
      </div>

      {showForm && (
        <div className="fd-form-panel">
          <div className="fd-form-panel__title">New Assignment</div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="fd-form-row" style={{ marginBottom:14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="asgn-class">Class *</label>
                <select
                  id="asgn-class"
                  className="form-select"
                  value={form.class_id}
                  onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}
                  required
                >
                  <option value="">— Select class —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.subject_name}{c.subject_code ? ` (${c.subject_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="asgn-due">Due Date</label>
                <input
                  id="asgn-due"
                  type="date"
                  className="form-input"
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom:14 }}>
              <label className="form-label" htmlFor="asgn-title">Title *</label>
              <input
                id="asgn-title"
                className="form-input"
                placeholder="Assignment title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="asgn-desc">Description</label>
              <textarea
                id="asgn-desc"
                className="form-input"
                placeholder="Instructions, requirements, submission details…"
                rows={3}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                style={{ resize:'vertical' }}
              />
            </div>
            <div className="fd-form-actions">
              <button type="submit" className="fd-btn fd-btn--primary" disabled={submitting} id="asgn-submit-btn">
                {submitting ? 'Creating…' : 'Create Assignment'}
              </button>
              <button type="button" className="fd-btn fd-btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <PageLoading /> : assignments.length === 0 ? (
        <EmptyState icon="📝" title="No assignments yet" sub="Click 'New Assignment' to create one." />
      ) : (
        <div className="fd-item-list">
          {assignments.map(a => (
            <div key={a.id} className="fd-item-card" id={`fd-asgn-${a.id}`}>
              <div className="fd-item-card__icon" aria-hidden="true">📝</div>
              <div className="fd-item-card__body">
                <div className="fd-item-card__title">{a.title}</div>
                <div className="fd-item-card__meta">
                  <span className="fd-class-badge">📚 {a.subject_name}</span>
                  {a.due_date && (
                    <span className="fd-due-badge">📅 Due: {fmtDate(a.due_date)}</span>
                  )}
                  <span>Posted: {fmtDate(a.created_at)}</span>
                </div>
                {a.description && (
                  <div className="fd-item-card__content">{a.description}</div>
                )}
              </div>
              <div className="fd-item-card__actions">
                <button
                  className="fd-btn fd-btn--sm fd-btn--danger"
                  onClick={() => handleDelete(a.id)}
                  id={`fd-delete-asgn-${a.id}`}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE — ANNOUNCEMENTS
// ═════════════════════════════════════════════════════════════════════════════

function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [classes,       setClasses]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [toast, showToast]                = useToast()

  const [form, setForm] = useState({ title:'', content:'', class_id:'' })

  const loadAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      apiFetch('/api/faculty/announcements'),
      apiFetch('/api/faculty/classes'),
    ]).then(([aRes, cRes]) => {
      if (aRes.data.success) setAnnouncements(aRes.data.announcements)
      if (cRes.data.success) setClasses(cRes.data.classes)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim())   { showToast('error', 'Title is required.');   return }
    if (!form.content.trim()) { showToast('error', 'Content is required.'); return }
    setSubmitting(true)
    try {
      const body = { title: form.title, content: form.content }
      if (form.class_id) body.class_id = form.class_id
      const { ok, data } = await apiFetch('/api/faculty/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (ok && data.success) {
        showToast('success', data.message)
        setForm({ title:'', content:'', class_id:'' })
        setShowForm(false)
        loadAll()
      } else {
        showToast('error', data.message || 'Could not post announcement.')
      }
    } catch { showToast('error', 'Network error.') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      const { ok, data } = await apiFetch(`/api/faculty/announcements/${id}`, { method: 'DELETE' })
      if (ok && data.success) {
        showToast('success', data.message)
        setAnnouncements(prev => prev.filter(a => a.id !== id))
      } else {
        showToast('error', data.message || 'Delete failed.')
      }
    } catch { showToast('error', 'Network error.') }
  }

  return (
    <>
      <Toast toast={toast} />

      <div className="fd-section-header">
        <div>
          <div className="fd-section-title">Announcements</div>
          <div className="fd-section-sub">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</div>
        </div>
        <button
          className={`fd-btn ${showForm ? 'fd-btn--secondary' : 'fd-btn--primary'}`}
          onClick={() => setShowForm(p => !p)}
          id="fd-add-ann-btn"
        >
          {showForm ? '✕ Cancel' : '+ New Announcement'}
        </button>
      </div>

      {showForm && (
        <div className="fd-form-panel">
          <div className="fd-form-panel__title">New Announcement</div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="fd-form-row" style={{ marginBottom:14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="ann-title">Title *</label>
                <input
                  id="ann-title"
                  className="form-input"
                  placeholder="Announcement title"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ann-class">Target Class (optional)</label>
                <select
                  id="ann-class"
                  className="form-select"
                  value={form.class_id}
                  onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}
                >
                  <option value="">All students (general)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.subject_name}{c.subject_code ? ` (${c.subject_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ann-content">Content *</label>
              <textarea
                id="ann-content"
                className="form-input"
                placeholder="Write your announcement here…"
                rows={4}
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                style={{ resize:'vertical' }}
                required
              />
            </div>
            <div className="fd-form-actions">
              <button type="submit" className="fd-btn fd-btn--primary" disabled={submitting} id="ann-submit-btn">
                {submitting ? 'Posting…' : 'Post Announcement'}
              </button>
              <button type="button" className="fd-btn fd-btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <PageLoading /> : announcements.length === 0 ? (
        <EmptyState icon="📢" title="No announcements yet" sub="Click 'New Announcement' to post one." />
      ) : (
        <div className="fd-item-list">
          {announcements.map(a => (
            <div key={a.id} className="fd-item-card" id={`fd-ann-${a.id}`}>
              <div className="fd-item-card__icon" aria-hidden="true">📢</div>
              <div className="fd-item-card__body">
                <div className="fd-item-card__title">{a.title}</div>
                <div className="fd-item-card__meta">
                  {a.subject_name
                    ? <span className="fd-class-badge">📚 {a.subject_name}</span>
                    : <span style={{ color:'var(--text-muted)', fontSize:'var(--text-xs)' }}>🌐 General</span>
                  }
                  <span>Posted: {fmtDate(a.created_at)}</span>
                </div>
                <div className="fd-item-card__content">{a.content}</div>
              </div>
              <div className="fd-item-card__actions">
                <button
                  className="fd-btn fd-btn--sm fd-btn--danger"
                  onClick={() => handleDelete(a.id)}
                  id={`fd-delete-ann-${a.id}`}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FACULTY SIDEBAR — inline (uses existing Sidebar.css classes)
// Does NOT modify the shared Sidebar.jsx component used by other dashboards.
// ═════════════════════════════════════════════════════════════════════════════

function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_OPPORTUNITY_FORM)
  const [toast, showToast] = useToast()
  const [view, setView] = useState('postings')
  const [applications, setApplications] = useState([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewDrafts, setReviewDrafts] = useState({})

  const loadOpportunities = useCallback(() => {
    setLoading(true)
    apiFetch('/api/content/opportunities')
      .then(({ ok, data }) => {
        if (ok && data.success) setOpportunities(data.opportunities || [])
        else showToast('error', data.message || 'Could not load opportunities.')
      })
      .catch(() => showToast('error', 'Network error while loading opportunities.'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => { loadOpportunities() }, [loadOpportunities])

  const loadApplications = useCallback(async () => {
    setReviewLoading(true)
    try {
      const { ok, data } = await apiFetch('/api/opportunities/review')
      if (!ok || !data.success) throw new Error(data.message || 'Could not load applications.')
      setApplications(data.applications || [])
      setReviewDrafts(Object.fromEntries((data.applications || []).map(item => [item.id, { status: item.status, feedback: item.reviewer_feedback || '' }])))
    } catch (error) { showToast('error', error.message || 'Could not load applications.') }
    finally { setReviewLoading(false) }
  }, [showToast])

  async function saveReview(application) {
    const draft = reviewDrafts[application.id]
    try {
      const { ok, data } = await apiFetch(`/api/opportunities/review/${application.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      if (!ok || !data.success) throw new Error(data.message || 'Could not save review.')
      showToast('success', data.message)
      loadApplications()
    } catch (error) { showToast('error', error.message || 'Could not save review.') }
  }

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!form.title.trim()) { showToast('error', 'Title is required.'); return }
    if (form.deadline && (form.deadline < today() || Number.isNaN(new Date(`${form.deadline}T00:00:00`).getTime()))) {
      showToast('error', 'Enter a valid deadline that is today or later.'); return
    }
    if (form.apply_url.trim()) {
      try {
        const url = new URL(form.apply_url.trim())
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol')
      } catch { showToast('error', 'Enter a valid application link starting with http:// or https://.'); return }
    }

    setSubmitting(true)
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
      const { ok, data } = await apiFetch('/api/content/opportunities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!ok || !data.success) { showToast('error', data.message || 'Could not post opportunity.'); return }
      showToast('success', data.message || 'Opportunity posted.')
      setForm(EMPTY_OPPORTUNITY_FORM)
      setShowForm(false)
      loadOpportunities()
    } catch { showToast('error', 'Network error. Please try again.') }
    finally { setSubmitting(false) }
  }

  return (
    <>
      <Toast toast={toast} />
      <div className="fd-section-header">
        <div>
          <div className="fd-section-title">{view === 'postings' ? 'Internships, Jobs & Scholarships' : 'Opportunity Applications'}</div>
          <div className="fd-section-sub">{view === 'postings' ? `${opportunities.length} posted by you` : 'Applications for opportunities posted by you'}</div>
        </div>
        {view === 'postings' && <button className={`fd-btn ${showForm ? 'fd-btn--secondary' : 'fd-btn--primary'}`} onClick={() => setShowForm(value => !value)}>
          {showForm ? '✕ Cancel' : '+ Post Opportunity'}
        </button>}
      </div>

      <div className="fd-form-actions" style={{ marginBottom: 16 }}>
        <button className={`fd-btn ${view === 'postings' ? 'fd-btn--primary' : 'fd-btn--secondary'}`} onClick={() => setView('postings')}>My postings</button>
        <button className={`fd-btn ${view === 'applications' ? 'fd-btn--primary' : 'fd-btn--secondary'}`} onClick={() => { setView('applications'); loadApplications() }}>Review applications</button>
      </div>

      {view === 'postings' && showForm && <div className="fd-form-panel">
        <div className="fd-form-panel__title">New Opportunity</div>
        <p className="fd-opportunity-note">Enter verified details students can use to decide whether to apply.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="fd-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="opp-type">Opportunity type *</label>
              <select id="opp-type" className="form-input" value={form.type} onChange={e => update('type', e.target.value)} required>
                {OPPORTUNITY_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="opp-title">Title *</label>
              <input id="opp-title" className="form-input" maxLength={200} value={form.title} onChange={e => update('title', e.target.value)} placeholder="Opportunity title" required />
            </div>
          </div>
          <div className="fd-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="opp-org">Company or organisation</label>
              <input id="opp-org" className="form-input" maxLength={150} value={form.company_or_org} onChange={e => update('company_or_org', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="opp-deadline">Application deadline</label>
              <input id="opp-deadline" type="date" min={today()} className="form-input" value={form.deadline} onChange={e => update('deadline', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="opp-description">Description</label>
            <textarea id="opp-description" className="form-input fd-opportunity-textarea" value={form.description} onChange={e => update('description', e.target.value)} rows={4} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="opp-eligibility">Eligibility</label>
            <textarea id="opp-eligibility" className="form-input fd-opportunity-textarea" value={form.eligibility} onChange={e => update('eligibility', e.target.value)} rows={3} />
          </div>
          <div className="fd-form-row fd-form-row-3">
            <div className="form-group"><label className="form-label" htmlFor="opp-skills">Skills</label><input id="opp-skills" className="form-input" maxLength={300} value={form.skills} onChange={e => update('skills', e.target.value)} /></div>
            <div className="form-group"><label className="form-label" htmlFor="opp-location">Location</label><input id="opp-location" className="form-input" maxLength={150} value={form.location} onChange={e => update('location', e.target.value)} /></div>
            <div className="form-group"><label className="form-label" htmlFor="opp-mode">Work mode</label><select id="opp-mode" className="form-input" value={form.work_mode} onChange={e => update('work_mode', e.target.value)}><option value="">Not specified</option><option value="remote">Remote</option><option value="onsite">On-site</option><option value="hybrid">Hybrid</option></select></div>
          </div>
          <div className="fd-form-row">
            <div className="form-group"><label className="form-label" htmlFor="opp-stipend">Stipend or award</label><input id="opp-stipend" className="form-input" maxLength={100} value={form.stipend} onChange={e => update('stipend', e.target.value)} /></div>
            <div className="form-group"><label className="form-label" htmlFor="opp-url">Application link</label><input id="opp-url" type="url" className="form-input" maxLength={500} value={form.apply_url} onChange={e => update('apply_url', e.target.value)} placeholder="https://" /></div>
          </div>
          <div className="fd-form-actions">
            <button type="submit" className="fd-btn fd-btn--primary" disabled={submitting}>{submitting ? 'Posting…' : 'Post Opportunity'}</button>
            <button type="button" className="fd-btn fd-btn--secondary" disabled={submitting} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      </div>}

      {view === 'applications' ? (reviewLoading ? <PageLoading /> : applications.length === 0 ? <EmptyState icon="📨" title="No applications yet" sub="Applications for your posted opportunities will appear here." /> : <div className="fd-item-list">{applications.map(application => {
        const draft = reviewDrafts[application.id] || { status: application.status, feedback: application.reviewer_feedback || '' }
        return <article key={application.id} className="fd-item-card"><div className="fd-item-card__body">
          <div className="fd-item-card__title">{application.student_name} — {application.opportunity_title}</div>
          <div className="fd-item-card__meta"><span>{application.student_email}</span><span>{application.opportunity_type}</span><span>Received: {fmtDate(application.applied_at)}</span><span>Status: {application.status.replaceAll('_', ' ')}</span></div>
          <div className="fd-form-row">
            {application.resume_original_name && <a className="fd-btn fd-btn--secondary" href={`/api/opportunities/applications/${application.id}/resume`} target="_blank" rel="noreferrer">View resume: {application.resume_original_name}</a>}
            <select className="form-input" value={draft.status} onChange={event => setReviewDrafts(current => ({ ...current, [application.id]: { ...draft, status: event.target.value } }))}>
              {[...new Set([application.status, ...(REVIEW_TRANSITIONS[application.status] || [])])].map(status => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}
            </select>
            <textarea className="form-input" maxLength={5000} rows={2} value={draft.feedback} placeholder="Optional feedback for the student" onChange={event => setReviewDrafts(current => ({ ...current, [application.id]: { ...draft, feedback: event.target.value } }))} />
            <button className="fd-btn fd-btn--primary" onClick={() => saveReview(application)}>Save review</button>
          </div>
        </div></article>
      })}</div>) : loading ? <PageLoading /> : opportunities.length === 0 ? (
        <EmptyState icon="💼" title="No opportunities yet" sub="Post an internship, job or scholarship to share it with students." />
      ) : <div className="fd-item-list">{opportunities.map(item => (
        <article key={item.id} className="fd-item-card">
          <div className="fd-item-card__icon" aria-hidden="true">💼</div>
          <div className="fd-item-card__body">
            <div className="fd-item-card__title">{item.title}</div>
            <div className="fd-item-card__meta">
              <span className="fd-class-badge">{item.type}</span>
              {item.company_or_org && <span>{item.company_or_org}</span>}
              {item.location && <span>{item.location}</span>}
              {item.deadline && <span>Deadline: {fmtDate(item.deadline)}</span>}
            </div>
            {item.description && <div className="fd-item-card__content">{item.description}</div>}
          </div>
        </article>
      ))}</div>}
    </>
  )
}

function FacultySidebar({ activePage, onNavigate, onLogout, user, isOpen, onClose }) {
  const userInitials = initials(user?.fullName || '')

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}
        aria-label="Faculty navigation"
      >
        {/* Logo */}
        <div className="sidebar__header">
          <div className="sidebar__logo-icon" aria-hidden="true">U</div>
          <div>
            <div className="sidebar__logo-text">UniOne</div>
            <div className="sidebar__logo-tagline">Faculty Portal</div>
          </div>
        </div>

        {/* User */}
        <div className="sidebar__user">
          <div className="sidebar__user-avatar" aria-hidden="true">{userInitials}</div>
          <div>
            <div className="sidebar__user-name">{user?.fullName || 'Faculty'}</div>
            <div className="sidebar__user-role">Faculty</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav" aria-label="Faculty navigation">
          <div className="sidebar__nav-label">Menu</div>
          {FACULTY_NAV.map(item => (
            <button
              key={item.id}
              className={`sidebar__nav-item ${activePage === item.id ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => { onNavigate(item.id); onClose() }}
              aria-current={activePage === item.id ? 'page' : undefined}
              id={`fd-nav-${item.id}`}
            >
              <span className="sidebar__nav-item-icon" aria-hidden="true">{item.icon}</span>
              <span className="sidebar__nav-item-text">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <button
            className="sidebar__footer-btn"
            onClick={onLogout}
            id="fd-logout-btn"
            aria-label="Sign out"
          >
            <span aria-hidden="true">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FACULTY TOPBAR — inline (uses existing Sidebar.css topbar classes)
// ═════════════════════════════════════════════════════════════════════════════

function FacultyTopbar({ user, activePage, onMenuToggle }) {
  const userInitials = initials(user?.fullName || '')

  return (
    <header className="topbar" role="banner">
      <button
        className="topbar__menu-btn"
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
        id="fd-topbar-menu-btn"
      >
        ☰
      </button>

      <h1 className="topbar__title">{PAGE_TITLES[activePage] || 'Faculty Dashboard'}</h1>

      <div className="fd-topbar-user">
        <span className="fd-topbar-name">{user?.fullName}</span>
        <div
          className="fd-topbar-avatar"
          aria-label="Faculty user"
          id="fd-topbar-avatar"
        >
          {userInitials}
        </div>
      </div>
    </header>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

function FacultyDashboard({ navigate }) {
  const [user,        setUser]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [authError,   setAuthError]   = useState('')
  const [activePage,  setActivePage]  = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Verify the session on mount; redirect if not faculty
  useEffect(() => {
    const verify = async () => {
      try {
        const res  = await fetch('/api/auth/me', { credentials: 'include' })
        const data = await res.json()

        if (!res.ok || !data.success) { navigate('login'); return }

        if (data.user?.role === 'admin')   { navigate('admin');     return }
        if (data.user?.role === 'student') { navigate('dashboard'); return }
        if (data.user?.role !== 'faculty') { navigate('login');     return }

        setUser(data.user)
      } catch {
        setAuthError('Unable to connect to the server. Please check the backend is running.')
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [navigate])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      navigate('landing')
    }
  }

  // ── Full-screen loading ──
  if (loading) {
    return (
      <div className="fd-loading-screen" aria-label="Loading faculty dashboard">
        <div className="fd-spinner" />
        <span>Loading faculty dashboard…</span>
      </div>
    )
  }

  // ── Auth / network error ──
  if (authError || !user) {
    return (
      <div className="fd-loading-screen">
        <div style={{ textAlign:'center', maxWidth: 400, padding: '0 24px' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
          <div style={{ fontSize:'var(--text-lg)', fontWeight:600, color:'var(--navy-800)', marginBottom:8 }}>
            {authError || 'Access denied'}
          </div>
          <div style={{ fontSize:'var(--text-sm)', color:'var(--text-muted)', marginBottom:24 }}>
            {authError
              ? 'Make sure the backend server is running on port 5000.'
              : 'Please log in with a faculty account.'}
          </div>
          <button className="fd-btn fd-btn--primary" onClick={() => navigate('login')}>
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // ── Render active page ──
  const renderPage = () => {
    switch (activePage) {
      case 'overview':      return <OverviewPage      user={user} />
      case 'classes':       return <ClassesPage />
      case 'attendance':    return <AttendancePage />
      case 'assignments':   return <AssignmentsPage />
      case 'announcements': return <AnnouncementsPage />
      case 'opportunities': return <OpportunitiesPage />
      default:              return <OverviewPage user={user} />
    }
  }

  return (
    <div className="dashboard-layout">
      <FacultySidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="dashboard-main">
        <FacultyTopbar
          user={user}
          activePage={activePage}
          onMenuToggle={() => setSidebarOpen(p => !p)}
        />

        <main className="dashboard-content" id="fd-main-content">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default FacultyDashboard
