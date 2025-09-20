// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = import.meta.env.DEV || localStorage.getItem('bt_perf_monitor') === 'true';
  }

  // Start timing a operation
  startTiming(name) {
    if (!this.isEnabled) return;
    
    this.metrics.set(name, {
      startTime: performance.now(),
      startMark: `${name}-start`
    });
    
    if (performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  // End timing and log results
  endTiming(name) {
    if (!this.isEnabled) return;
    
    const metric = this.metrics.get(name);
    if (!metric) return;

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    if (performance.mark && performance.measure) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }

    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    
    // Store for analytics
    this.metrics.set(name, {
      ...metric,
      endTime,
      duration
    });

    return duration;
  }

  // Monitor component render times
  measureComponent(componentName, renderFn) {
    if (!this.isEnabled) return renderFn();
    
    this.startTiming(`render-${componentName}`);
    const result = renderFn();
    this.endTiming(`render-${componentName}`);
    
    return result;
  }

  // Monitor data loading times
  async measureDataLoad(operationName, loadFn) {
    if (!this.isEnabled) return await loadFn();
    
    this.startTiming(`data-${operationName}`);
    try {
      const result = await loadFn();
      this.endTiming(`data-${operationName}`);
      return result;
    } catch (error) {
      this.endTiming(`data-${operationName}`);
      throw error;
    }
  }

  // Monitor bundle loading
  measureBundleLoad(bundleName) {
    if (!this.isEnabled) return;
    
    return {
      start: () => this.startTiming(`bundle-${bundleName}`),
      end: () => this.endTiming(`bundle-${bundleName}`)
    };
  }

  // Get Web Vitals
  getWebVitals() {
    if (!this.isEnabled) return {};
    
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      // Core Web Vitals
      FCP: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      LCP: this.getLCP(),
      CLS: this.getCLS(),
      FID: this.getFID(),
      
      // Navigation timing
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
      
      // Resource timing
      totalResources: performance.getEntriesByType('resource').length,
      jsResources: performance.getEntriesByType('resource').filter(r => r.name.includes('.js')).length,
      cssResources: performance.getEntriesByType('resource').filter(r => r.name.includes('.css')).length,
    };
  }

  // Monitor Largest Contentful Paint
  getLCP() {
    return new Promise((resolve) => {
      if (!('PerformanceObserver' in window)) {
        resolve(null);
        return;
      }

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Cleanup after 10 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 10000);
    });
  }

  // Monitor Cumulative Layout Shift
  getCLS() {
    return new Promise((resolve) => {
      if (!('PerformanceObserver' in window)) {
        resolve(null);
        return;
      }

      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      
      // Return final value after 10 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 10000);
    });
  }

  // Monitor First Input Delay
  getFID() {
    return new Promise((resolve) => {
      if (!('PerformanceObserver' in window)) {
        resolve(null);
        return;
      }

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          resolve(entry.processingStart - entry.startTime);
          observer.disconnect();
          return;
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
      
      // Cleanup after 30 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 30000);
    });
  }

  // Log performance summary
  async logSummary() {
    if (!this.isEnabled) return;
    
    const vitals = await this.getWebVitals();
    const customMetrics = Array.from(this.metrics.entries())
      .filter(([_, metric]) => metric.duration)
      .map(([name, metric]) => ({ name, duration: metric.duration }))
      .sort((a, b) => b.duration - a.duration);

    console.group('🚀 Performance Summary');
    console.log('Web Vitals:', vitals);
    console.log('Custom Metrics:', customMetrics);
    console.log('Bundle Info:', this.getBundleInfo());
    console.groupEnd();
  }

  // Get bundle size information
  getBundleInfo() {
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources.filter(r => r.name.includes('.js'));
    const cssResources = resources.filter(r => r.name.includes('.css'));
    
    return {
      totalJS: jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      totalCSS: cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      jsFiles: jsResources.length,
      cssFiles: cssResources.length,
      largestJS: Math.max(...jsResources.map(r => r.transferSize || 0)),
      largestCSS: Math.max(...cssResources.map(r => r.transferSize || 0))
    };
  }

  // Enable/disable monitoring
  enable() {
    this.isEnabled = true;
    localStorage.setItem('bt_perf_monitor', 'true');
  }

  disable() {
    this.isEnabled = false;
    localStorage.removeItem('bt_perf_monitor');
  }
}

// Global instance
export const perfMonitor = new PerformanceMonitor();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName) {
  const startRender = () => perfMonitor.startTiming(`render-${componentName}`);
  const endRender = () => perfMonitor.endTiming(`render-${componentName}`);
  
  return { startRender, endRender };
}

// HOC for automatic component performance monitoring
export function withPerformanceMonitoring(WrappedComponent, componentName) {
  return function PerformanceMonitoredComponent(props) {
    return perfMonitor.measureComponent(componentName || WrappedComponent.name, () => {
      return WrappedComponent(props);
    });
  };
}

// Utility to measure async operations
export async function measureAsync(name, asyncFn) {
  return await perfMonitor.measureDataLoad(name, asyncFn);
}

// Initialize performance monitoring on app start
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;
  
  // Log initial page load metrics
  window.addEventListener('load', () => {
    setTimeout(() => {
      perfMonitor.logSummary();
    }, 1000);
  });

  // Monitor route changes (for SPAs)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      perfMonitor.startTiming('route-change');
      
      // End timing after next paint
      requestAnimationFrame(() => {
        perfMonitor.endTiming('route-change');
      });
    }
  }).observe(document, { subtree: true, childList: true });

  // Expose to global for debugging
  if (import.meta.env.DEV) {
    window.perfMonitor = perfMonitor;
  }
}

export default perfMonitor;