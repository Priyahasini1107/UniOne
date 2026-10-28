/**
 * main.jsx — React Application Entry Point
 *
 * This is the first file React loads. It attaches the root <App /> component
 * to the <div id="root"> element defined in index.html.
 *
 * global.css is imported here so it applies to the entire application.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'

// Mount the React app into the root div in index.html
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
