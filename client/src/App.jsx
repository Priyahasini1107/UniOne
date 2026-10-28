/**
 * App.jsx — Root Application Component
 *
 * Controls which page is currently visible using React's built-in useState hook.
 * No external router library is needed for Stage 1.
 *
 * HOW NAVIGATION WORKS:
 *   A `navigate` function (which is just React's setPage) is passed as a prop
 *   to every page component. Pages call navigate('login'), navigate('dashboard'),
 *   etc. to switch pages.
 *
 *   Example — inside LandingPage.jsx:
 *     <button onClick={() => navigate('login')}>Sign In</button>
 *
 * NOTE:
 *   The browser address bar does not change in this approach.
 *   Real URL routing (react-router-dom) can be added in a later stage if needed.
 */

import { useState } from 'react'

// Import all page components
import LandingPage      from './pages/LandingPage'
import LoginPage        from './pages/LoginPage'
import RegisterPage     from './pages/RegisterPage'
import StudentDashboard from './pages/StudentDashboard'
import AdminDashboard   from './pages/AdminDashboard'
import FacultyDashboard from './pages/FacultyDashboard'

function App() {
  // `page` holds the name of the currently visible page
  // Starting on the landing page
  const [page, setPage] = useState('landing')

  // `navigate` is the function passed to child components
  // so they can switch the active page
  const navigate = (targetPage) => setPage(targetPage)

  // Render the correct page based on current state
  switch (page) {
    case 'landing':   return <LandingPage      navigate={navigate} />
    case 'login':     return <LoginPage         navigate={navigate} />
    case 'register':  return <RegisterPage      navigate={navigate} />
    case 'dashboard': return <StudentDashboard  navigate={navigate} />
    case 'admin':     return <AdminDashboard    navigate={navigate} />
    case 'faculty': return <FacultyDashboard navigate={navigate} />
    default:          return <LandingPage      navigate={navigate} />
  }
}

export default App
