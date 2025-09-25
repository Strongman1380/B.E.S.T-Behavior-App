import './App.css'
import { useEffect } from 'react'
//
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from './components/auth/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { DashboardProvider } from './contexts/DashboardContext'
// Enforce auth wrapping

function App() {
  // Auto-reload on stale chunk errors to recover from deploy cache mismatches
  useEffect(() => {
    const shouldReload = (msg = '') => {
      const s = String(msg || '').toLowerCase()
      return (
        s.includes('failed to fetch dynamically imported module') ||
        s.includes('mime type of "text/html"') ||
        s.includes('is not defined') // minified var from old bundle
      )
    }
    const throttleReload = () => {
      try {
        const key = 'bt_last_reload'
        const last = Number(sessionStorage.getItem(key) || '0')
        const now = Date.now()
        if (!last || now - last > 60_000) { // at most once per minute
          sessionStorage.setItem(key, String(now))
          window.location.reload()
        }
      } catch {
        window.location.reload()
      }
    }
    const onRejection = (e) => {
      const msg = e?.reason?.message || e?.reason || ''
      if (shouldReload(msg)) throttleReload()
    }
    const onError = (e) => {
      const msg = e?.message || ''
      if (shouldReload(msg)) throttleReload()
    }
    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('error', onError)
    return () => {
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('error', onError)
    }
  }, [])

  // Always render the app; protect routes behind auth in production
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedRoute>
          <DashboardProvider>
            <Pages />
          </DashboardProvider>
        </ProtectedRoute>
        <Toaster />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App 
