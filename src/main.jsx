import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initPerformanceMonitoring, perfMonitor } from '@/utils/performance'

// Initialize performance monitoring
initPerformanceMonitoring();
perfMonitor.startTiming('app-init');

// Performance monitoring and service worker registration
if (typeof window !== 'undefined') {
  // Register service worker for caching
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }

  // Preload critical resources
  const preloadResources = () => {
    const bundleMonitor = perfMonitor.measureBundleLoad('critical-preload');
    bundleMonitor.start();
    
    Promise.all([
      // Preload commonly used icons
      import('lucide-react').catch(() => {}),
      // Preload router for navigation
      import('react-router-dom').catch(() => {}),
      // Preload critical pages
      import('@/pages/BehaviorDashboard.jsx').catch(() => {}),
      import('@/pages/KPIDashboard.jsx').catch(() => {}),
      // Preload chart library
      import('recharts').catch(() => {})
    ]).then(() => {
      bundleMonitor.end();
      console.log('✅ Critical resources preloaded');
    }).catch(() => {
      bundleMonitor.end();
    });
  };
  
  // Use requestIdleCallback for non-critical preloading
  if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadResources);
  } else {
    setTimeout(preloadResources, 1);
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));

// Remove loading spinner when React takes over
const loadingSpinner = document.querySelector('.loading-spinner');
if (loadingSpinner) {
  loadingSpinner.style.display = 'none';
}

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)

// End app initialization timing
perfMonitor.endTiming('app-init'); 