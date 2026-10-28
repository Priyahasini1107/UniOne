
import { useState } from 'react'
import '../styles/Auth.css'

function RegisterPage({ navigate }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [role, setRole] = useState('student')
  const [facultyCode, setFacultyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setMessageType('')

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPw
    ) {
      setMessage('Please fill in all fields.')
      setMessageType('error')
      return
    }

    if (password !== confirmPw) {
      setMessage('Passwords do not match.')
      setMessageType('error')
      return
    }

    if (role === 'faculty' && !facultyCode.trim()) {
      setMessage('Please enter the faculty registration code.')
      setMessageType('error')
      return
    }

    try {
      setLoading(true)

      const endpoint =
        role === 'faculty'
          ? '/api/auth/faculty-register'
          : '/api/auth/register'

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        ...(role === 'faculty'
          ? { facultyCode: facultyCode.trim() }
          : {}),
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.')
      }

      setMessage(
        data.message ||
          `${role === 'faculty' ? 'Faculty' : 'Student'} account created successfully.`
      )
      setMessageType('success')

      setFirstName('')
      setLastName('')
      setEmail('')
      setPassword('')
      setConfirmPw('')
      setFacultyCode('')
    } catch (error) {
      setMessage(
        error.message === 'Failed to fetch'
          ? 'Cannot reach the server. Please check that UniOne backend is running.'
          : error.message
      )
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <button
        type="button"
        className="auth-back"
        onClick={() => navigate('landing')}
        id="register-back-btn"
      >
        ← Home
      </button>

      <div
        className="auth-card"
        role="main"
        aria-label="Registration form"
      >
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo__icon" aria-hidden="true">
              U
            </div>
            <span className="auth-logo__text">UniOne</span>
          </div>

          <h1 className="auth-title">
            {role === 'faculty'
              ? 'Create Faculty Account'
              : 'Create Student Account'}
          </h1>

          <p className="auth-subtitle">
            Join UniOne — your all-in-one student platform
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="form-group">
            <label className="form-label" htmlFor="role">
              Account type
            </label>

            <select
              id="role"
              className="form-input"
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                setFacultyCode('')
                setMessage('')
                setMessageType('')
              }}
              disabled={loading}
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>

          {role === 'faculty' && (
            <div className="form-group">
              <label
                className="form-label"
                htmlFor="faculty-code"
              >
                Faculty registration code
              </label>

              <input
                id="faculty-code"
                type="password"
                className="form-input"
                placeholder="Enter faculty registration code"
                value={facultyCode}
                onChange={(e) => setFacultyCode(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          )}

          <div className="auth-form__row">
            <div className="form-group">
              <label
                className="form-label"
                htmlFor="register-firstname"
              >
                First Name
              </label>

              <input
                id="register-firstname"
                type="text"
                className="form-input"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
              />
            </div>

            <div className="form-group">
              <label
                className="form-label"
                htmlFor="register-lastname"
              >
                Last Name
              </label>

              <input
                id="register-lastname"
                type="text"
                className="form-input"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label
              className="form-label"
              htmlFor="register-email"
            >
              Email Address
            </label>

            <input
              id="register-email"
              type="email"
              className="form-input"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label
              className="form-label"
              htmlFor="register-password"
            >
              Password
            </label>

            <input
              id="register-password"
              type="password"
              className="form-input"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label
              className="form-label"
              htmlFor="register-confirm-password"
            >
              Confirm Password
            </label>

            <input
              id="register-confirm-password"
              type="password"
              className="form-input"
              placeholder="Repeat your password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {message && (
            <p
              role="status"
              aria-live="polite"
              style={{
                color:
                  messageType === 'success' ? 'green' : 'crimson',
                marginBottom: '12px',
              }}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
            id="register-submit-btn"
            disabled={loading}
          >
            {loading
              ? 'Creating Account...'
              : role === 'faculty'
                ? 'Create Faculty Account'
                : 'Create Student Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <button
            type="button"
            className="auth-footer__link"
            onClick={() => navigate('login')}
            id="register-to-login-btn"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
