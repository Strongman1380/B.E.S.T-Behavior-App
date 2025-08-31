import './App.css'
//
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from './components/auth/ErrorBoundary'
// Removed hard database gate to avoid blocking the UI

function App() {
  // Always render the app; DB issues can be handled in features that need it
  return (
    <ErrorBoundary>
      <Pages />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App 
