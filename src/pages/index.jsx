import { Suspense, lazy, useEffect } from 'react';
import { HashRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Layout from "./Layout.jsx";

// Enhanced loading component
const PageLoader = ({ message = "Loading..." }) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  </div>
);

// Route-level code splitting with preloading hints
const BehaviorDashboard = lazy(() => 
  import('./BehaviorDashboard').then(module => {
    // Preload commonly accessed pages from dashboard
    import('./StudentEvaluation').catch(() => {});
    import('./QuickScore').catch(() => {});
    return module;
  })
);

const StudentEvaluation = lazy(() => import('./StudentEvaluation'));
const Settings = lazy(() => import('./Settings'));
const QuickScore = lazy(() => import('./QuickScore'));
const ContactLogs = lazy(() => import('./ContactLogs'));
const StudentProfile = lazy(() => import('./StudentProfile'));
const BehaviorSummaryReports = lazy(() => import('./BehaviorSummaryReports'));
const SummaryReports = lazy(() => import('./SummaryReports'));
const IncidentReports = lazy(() => import('./IncidentReports'));
const PrintReports = lazy(() => import('./PrintReports'));

// Heavy pages with special loading messages
const KPIDashboard = lazy(() => 
  import('./KPIDashboard').then(module => {
    // Preload chart dependencies
    import('recharts').catch(() => {});
    return module;
  })
);

const CreditsEarned = lazy(() => import('./CreditsEarned'));
const BestInteractiveGrid = lazy(() => import('./BestInteractiveGrid'));

// Preload routes based on current location
function RoutePreloader() {
  const location = useLocation();
  
  useEffect(() => {
    const preloadRoutes = () => {
      switch (location.pathname) {
        case '/':
        case '/BehaviorDashboard':
          // From dashboard, users often go to evaluation or quick score
          import('./StudentEvaluation').catch(() => {});
          import('./QuickScore').catch(() => {});
          break;
        case '/StudentEvaluation':
          // From evaluation, users might check profiles or dashboard
          import('./StudentProfile').catch(() => {});
          import('./BehaviorDashboard').catch(() => {});
          break;
        case '/QuickScore':
          // From quick score, users might go to dashboard or evaluation
          import('./BehaviorDashboard').catch(() => {});
          import('./StudentEvaluation').catch(() => {});
          break;
        default:
          // Preload dashboard as it's the most common destination
          import('./BehaviorDashboard').catch(() => {});
      }
    };

    // Use requestIdleCallback for non-critical preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadRoutes);
    } else {
      setTimeout(preloadRoutes, 100);
    }
  }, [location.pathname]);

  return null;
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    return (
        <Layout>
            <RoutePreloader />
            <Suspense fallback={<PageLoader />}>
            <Routes>            
                <Route path="/" element={<BehaviorDashboard />} />
                <Route path="/StudentEvaluation" element={<StudentEvaluation />} />
                <Route path="/Settings" element={<Settings />} />
                <Route path="/QuickScore" element={<QuickScore />} />
                <Route path="/BehaviorDashboard" element={<BehaviorDashboard />} />
                <Route path="/ContactLogs" element={<ContactLogs />} />
                <Route path="/StudentProfile" element={<StudentProfile />} />
                <Route 
                  path="/KPIDashboard" 
                  element={
                    <Suspense fallback={<PageLoader message="Loading analytics..." />}>
                      <KPIDashboard />
                    </Suspense>
                  } 
                />
                <Route path="/BehaviorSummaryReports" element={<BehaviorSummaryReports />} />
                <Route path="/SummaryReports" element={<SummaryReports />} />
                <Route path="/IncidentReports" element={<IncidentReports />} />
                <Route path="/PrintReports" element={<PrintReports />} />
                <Route path="/CreditsEarned" element={<CreditsEarned />} />
                <Route path="/BestInteractiveGrid" element={<BestInteractiveGrid />} />
            </Routes>
            </Suspense>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
