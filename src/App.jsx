import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/auth/ErrorBoundary'
import '@/utils/dataManager' // Initialize data manager

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedRoute>
          <Pages />
        </ProtectedRoute>
        <Toaster />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App 