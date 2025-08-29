import './App.css'
import { useState, useEffect } from 'react'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from './components/auth/ErrorBoundary'
import DatabaseError from './components/DatabaseError'

function App() {
  const [databaseStatus, setDatabaseStatus] = useState({ loading: true, ready: false, error: null });

  useEffect(() => {
    // Check database status on app load
    const checkDatabaseStatus = async () => {
      try {
        const response = await fetch('/api/status');
        const status = await response.json();
        setDatabaseStatus({
          loading: false,
          ready: status.database.ready,
          error: status.database.error
        });
      } catch (error) {
        setDatabaseStatus({
          loading: false,
          ready: false,
          error: 'Unable to connect to server'
        });
      }
    };

    checkDatabaseStatus();
  }, []);

  // Show loading state
  if (databaseStatus.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to database...</p>
        </div>
      </div>
    );
  }

  // Show database error if not ready
  if (!databaseStatus.ready) {
    return <DatabaseError error={databaseStatus.error} />;
  }

  // Show main app if database is ready
  return (
    <ErrorBoundary>
      <Pages />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App 