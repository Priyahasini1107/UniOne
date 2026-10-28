import { useEffect, useState } from 'react'
import '../../styles/Modules.css'

const EMPTY_PROFILE = { full_name: '', department: '', study_year: '', phone: '', bio: '' }

function Settings({ onUserUpdated, navigate }) {
  const [account, setAccount] = useState(null)
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [password, setPassword] = useState({ current_password: '', new_password: '', confirm: '' })

  useEffect(() => {
    fetch('/api/student/settings', { credentials: 'include' })
      .then(async res => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (!ok || !data.success) throw new Error(data.message || 'Could not load settings.')
        const settings = data.settings
        setAccount(settings)
        setProfile({
          full_name: settings.full_name || '', department: settings.department || '',
          study_year: settings.study_year == null ? '' : String(settings.study_year),
          phone: settings.phone || '', bio: settings.bio || '',
        })
      })
      .catch(err => setMessage({ type: 'error', text: err.message || 'Could not load settings.' }))
      .finally(() => setLoading(false))
  }, [])

  const updateProfile = async (event) => {
    event.preventDefault()
    setMessage(null)
    if (profile.full_name.trim().length < 2) { setMessage({ type: 'error', text: 'Enter your name (at least 2 characters).' }); return }
    if (profile.study_year && (!/^\d+$/.test(profile.study_year) || Number(profile.study_year) < 1 || Number(profile.study_year) > 8)) {
      setMessage({ type: 'error', text: 'Study year must be between 1 and 8.' }); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/student/settings', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not save profile.')
      const nextAccount = { ...account, full_name: data.user.fullName }
      setAccount(nextAccount)
      onUserUpdated?.({ fullName: data.user.fullName })
      setMessage({ type: 'success', text: data.message })
    } catch (err) { setMessage({ type: 'error', text: err.message || 'Network error. Please try again.' }) }
    finally { setSaving(false) }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setMessage(null)
    if (password.new_password.length < 8) { setMessage({ type: 'error', text: 'New password must contain at least 8 characters.' }); return }
    if (password.new_password !== password.confirm) { setMessage({ type: 'error', text: 'The new passwords do not match.' }); return }
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: password.current_password, new_password: password.new_password }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not change password.')
      setPassword({ current_password: '', new_password: '', confirm: '' })
      setMessage({ type: 'success', text: `${data.message} Returning to login…` })
      setTimeout(() => navigate('login'), 1400)
    } catch (err) { setMessage({ type: 'error', text: err.message || 'Network error. Please try again.' }) }
  }

  if (loading) return <div className="mod-loading"><div className="mod-spinner" /><span>Loading account settings…</span></div>

  return (
    <div>
      <div className="mod-header"><div><div className="mod-title">⚙️ Settings</div><div className="mod-subtitle">Manage your account details and profile.</div></div></div>
      {message && <div className={`mod-toast mod-toast--${message.type}`} role="status">{message.type === 'success' ? '✓' : '⚠️'} {message.text}</div>}
      {account && <section className="mod-card settings-account" aria-label="Account information">
        <h2 className="mod-card__title">Account information</h2>
        <dl className="settings-account__grid">
          <div><dt>Name</dt><dd>{account.full_name}</dd></div>
          <div><dt>Email</dt><dd>{account.email}</dd></div>
          <div><dt>Role</dt><dd>{account.role}</dd></div>
          <div><dt>Account status</dt><dd>{account.account_status}</dd></div>
        </dl>
        <p className="mod-subtitle">Email, role, and account status are managed by your institution.</p>
      </section>}

      <section className="mod-form settings-section">
        <h2 className="mod-form__title">Profile</h2>
        <form onSubmit={updateProfile}>
          <div className="mod-form-row">
            <div className="form-group"><label className="form-label" htmlFor="settings-name">Full name *</label><input id="settings-name" className="form-input" maxLength={100} value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label" htmlFor="settings-department">Department</label><input id="settings-department" className="form-input" maxLength={100} value={profile.department} onChange={e => setProfile(p => ({ ...p, department: e.target.value }))} /></div>
          </div>
          <div className="mod-form-row-3">
            <div className="form-group"><label className="form-label" htmlFor="settings-year">Study year</label><select id="settings-year" className="form-select" value={profile.study_year} onChange={e => setProfile(p => ({ ...p, study_year: e.target.value }))}><option value="">Not set</option>{[1,2,3,4,5,6,7,8].map(year => <option key={year} value={year}>{year}</option>)}</select></div>
            <div className="form-group"><label className="form-label" htmlFor="settings-phone">Phone</label><input id="settings-phone" className="form-input" maxLength={20} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label" htmlFor="settings-bio">About me</label><textarea id="settings-bio" className="form-input" rows={4} maxLength={1000} value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} /></div>
          <div className="mod-form-actions"><button className="mod-btn mod-btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div>
        </form>
      </section>

      <section className="mod-form settings-section">
        <h2 className="mod-form__title">Change password</h2>
        <p className="mod-subtitle" style={{ marginBottom: 16 }}>Your current password is checked securely and never displayed. Changing it signs out all sessions.</p>
        <form onSubmit={changePassword}>
          <div className="mod-form-row">
            <div className="form-group"><label className="form-label" htmlFor="settings-current-password">Current password</label><input id="settings-current-password" className="form-input" type="password" autoComplete="current-password" value={password.current_password} onChange={e => setPassword(p => ({ ...p, current_password: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label" htmlFor="settings-new-password">New password</label><input id="settings-new-password" className="form-input" type="password" autoComplete="new-password" minLength={8} value={password.new_password} onChange={e => setPassword(p => ({ ...p, new_password: e.target.value }))} required /></div>
          </div>
          <div className="form-group"><label className="form-label" htmlFor="settings-confirm-password">Confirm new password</label><input id="settings-confirm-password" className="form-input" type="password" autoComplete="new-password" value={password.confirm} onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))} required /></div>
          <div className="mod-form-actions"><button className="mod-btn mod-btn--secondary">Change password</button></div>
        </form>
      </section>
    </div>
  )
}

export default Settings
