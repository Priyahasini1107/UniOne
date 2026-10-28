import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * vite.config.js — Vite Development Server Configuration
 *
 * The server.proxy setting forwards all requests that start with /api
 * to the Express backend running on http://localhost:5000.
 *
 * This means in your React code you can write:
 *   fetch('/api/health')
 * and Vite will forward it to:
 *   http://localhost:5000/api/health
 *
 * This avoids CORS issues during development without needing the cors package.
 * When you build for production, you configure your real web server
 * (e.g. Nginx) to do the same proxy.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
