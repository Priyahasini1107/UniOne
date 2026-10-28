/**
 * LandingPage.jsx — UniOne Public Landing Page
 *
 * The first page visitors see. Shows the hero section, platform statistics,
 * an overview of all 12 modules, a call-to-action section, and a footer.
 *
 * Props:
 *   navigate {function} — Call navigate('login') or navigate('register')
 *                         to move to another page.
 */

import '../styles/Landing.css'

/* ─── Data: 12 platform modules shown on the landing page ─── */
const MODULES = [
  {
    id: 'academic', icon: '📚',
    name: 'Academic Resources',
    desc: 'Access notes, textbooks, and previous year question papers.',
    color: '#1a237e',
  },
  {
    id: 'interview', icon: '💼',
    name: 'Interview Preparation',
    desc: 'Practice DSA, aptitude tests, and mock interview questions.',
    color: '#283593',
  },
  {
    id: 'internships', icon: '🌐',
    name: 'Internships & Opportunities',
    desc: 'Browse internship listings and job opportunities for students.',
    color: '#1565c0',
  },
  {
    id: 'roadmaps', icon: '🗺️',
    name: 'Career Roadmaps',
    desc: 'Follow step-by-step guides for web dev, data science, and more.',
    color: '#0277bd',
  },
  {
    id: 'events', icon: '📅',
    name: 'Events Calendar',
    desc: 'Stay updated on college fests, workshops, and seminars.',
    color: '#00838f',
  },
  {
    id: 'scholarships', icon: '🎓',
    name: 'Scholarships',
    desc: 'Discover scholarships and track application deadlines.',
    color: '#2e7d32',
  },
  {
    id: 'findback', icon: '🔍',
    name: 'FindBack',
    desc: 'Post and find lost items across the campus quickly.',
    color: '#6a1b9a',
  },
  {
    id: 'projectvault', icon: '🗂️',
    name: 'ProjectVault',
    desc: 'Showcase your projects and explore work from peers.',
    color: '#ad1457',
  },
  {
    id: 'campus', icon: '🏫',
    name: 'Smart Campus Services',
    desc: 'Book facilities, raise complaints, and access campus services.',
    color: '#c62828',
  },
  {
    id: 'community', icon: '👥',
    name: 'Student Community',
    desc: 'Connect, discuss, and collaborate with fellow students.',
    color: '#e65100',
  },
  {
    id: 'portfolio', icon: '📋',
    name: 'My Portfolio',
    desc: 'Build and share your personal academic and project portfolio.',
    color: '#4527a0',
  },
  {
    id: 'notifications', icon: '🔔',
    name: 'Notifications',
    desc: 'Get notified about events, deadlines, and campus updates.',
    color: '#558b2f',
  },
]

function LandingPage({ navigate }) {
  // Smooth scroll to the modules section when "Explore Modules" is clicked
  const scrollToModules = () => {
    document.getElementById('modules-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-page">

      {/* ──────────────── Top Navigation ──────────────── */}
      <nav className="landing-nav" aria-label="Main site navigation">
        <div className="landing-nav__logo">
          <div className="landing-nav__logo-icon" aria-hidden="true">U</div>
          <span className="landing-nav__logo-text">UniOne</span>
        </div>

        <div className="landing-nav__actions">
          <button
            className="landing-nav__btn-login"
            onClick={() => navigate('login')}
            id="landing-nav-login-btn"
          >
            Sign In
          </button>
          <button
            className="landing-nav__btn-signup"
            onClick={() => navigate('register')}
            id="landing-nav-signup-btn"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ──────────────── Hero Section ──────────────── */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero__content">

          {/* "Now in development" pill */}
          <div className="hero__badge">
            <span className="hero__badge-dot" aria-hidden="true" />
            Stage 1 Foundation — In Development
          </div>

          <h1 className="hero__title" id="hero-heading">
            Welcome to <span className="hero__title-accent">UniOne</span>
          </h1>

          <p className="hero__tagline">
            One platform. Everything students need.
          </p>

          <div className="hero__actions">
            <button
              className="hero__btn-primary"
              onClick={() => navigate('register')}
              id="hero-getstarted-btn"
            >
              Get Started →
            </button>
            <button
              className="hero__btn-secondary"
              onClick={scrollToModules}
              id="hero-explore-btn"
            >
              Explore Modules
            </button>
          </div>
        </div>

        <div className="hero__scroll-hint" aria-hidden="true">scroll</div>
      </section>

      {/* ──────────────── Stats Bar ──────────────── */}
      <div className="stats-bar" role="complementary" aria-label="Platform highlights">
        <div className="stats-bar__item">
          <span className="stats-bar__value">12</span>
          <span className="stats-bar__label">Modules</span>
        </div>
        <div className="stats-bar__divider" aria-hidden="true" />
        <div className="stats-bar__item">
          <span className="stats-bar__value">1</span>
          <span className="stats-bar__label">Platform</span>
        </div>
        <div className="stats-bar__divider" aria-hidden="true" />
        <div className="stats-bar__item">
          <span className="stats-bar__value">∞</span>
          <span className="stats-bar__label">Possibilities</span>
        </div>
        <div className="stats-bar__divider" aria-hidden="true" />
        <div className="stats-bar__item">
          <span className="stats-bar__value">Free</span>
          <span className="stats-bar__label">For Students</span>
        </div>
      </div>

      {/* ──────────────── Modules Section ──────────────── */}
      <section id="modules-section" className="modules-section" aria-label="Platform modules">
        <div className="section-header">
          <span className="section-label">Platform Modules</span>
          <h2 className="section-title">Everything You Need, In One Place</h2>
          <p className="section-subtitle">
            UniOne brings 12 essential student services together on a single, unified platform.
          </p>
        </div>

        <div className="modules-grid">
          {MODULES.map((mod) => (
            <article
              key={mod.id}
              className="module-card-landing"
              style={{ '--card-color': mod.color }}
              aria-label={mod.name}
            >
              <div className="module-card-landing__icon" aria-hidden="true">{mod.icon}</div>
              <h3 className="module-card-landing__name">{mod.name}</h3>
              <p className="module-card-landing__desc">{mod.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ──────────────── CTA Section ──────────────── */}
      <section className="cta-section" aria-label="Call to action">
        <h2 className="cta-section__title">Ready to get started?</h2>
        <p className="cta-section__sub">
          Join UniOne and access everything your campus has to offer.
        </p>
        <div className="cta-section__actions">
          <button
            className="btn-primary"
            onClick={() => navigate('register')}
            id="cta-register-btn"
            style={{ fontSize: '1.05rem', padding: '13px 34px' }}
          >
            Create an Account
          </button>
          <button
            className="btn-outline-white"
            onClick={() => navigate('login')}
            id="cta-login-btn"
            style={{ fontSize: '1.05rem', padding: '13px 34px' }}
          >
            Sign In
          </button>
        </div>
      </section>

      {/* ──────────────── Footer ──────────────── */}
      <footer className="landing-footer">
        <p>
          © 2024 <strong>UniOne</strong> — One platform. Everything students need.
          &nbsp;|&nbsp; Built with React.js · Node.js · Express.js · MySQL
        </p>
      </footer>

    </div>
  )
}

export default LandingPage
