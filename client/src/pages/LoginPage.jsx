import { useState } from 'react'
import '../styles/Auth.css'

function LoginPage({ navigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!email.trim() || !password) {
      setMessage('Please enter your email and password.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setMessage(data.message || 'Login failed. Please try again.')
        return
      }

      setMessage('Login successful!')

      // Navigate according to the role returned by the backend.
      if (data.user?.role === 'admin') {
        navigate('admin')
      } else if (data.user?.role === 'faculty') {
        navigate('faculty')
      } else if (data.user?.role === 'student') {
        navigate('dashboard')
      } else {
        setMessage('Unknown user role. Please contact the administrator.')
      }
    } catch (error) {
      setMessage(
        'Unable to connect to the server. Please make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <button
        className="auth-back"
        onClick={() => navigate('landing')}
        id="login-back-btn"
      >
        ← Home
      </button>

      <div className="auth-card" role="main" aria-label="Login form">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo__icon" aria-hidden="true">U</div>
            <span className="auth-logo__text">UniOne</span>
          </div>

          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your UniOne account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address
            </label>
            <input
              id="login-email"
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
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {message && (
            <p role="status" aria-live="polite">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
            id="login-submit-btn"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <button
            className="auth-footer__link"
            onClick={() => navigate('register')}
            id="login-to-register-btn"
          >
            Create one
          </button>
        </div>

        <div className="auth-preview-row">
          Preview dashboard layout:{' '}
          <button
            onClick={() => navigate('dashboard')}
            id="login-preview-student-btn"
          >
            Student
          </button>
          {' / '}
          <button
            onClick={() => navigate('admin')}
            id="login-preview-admin-btn"
          >
            Admin
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage