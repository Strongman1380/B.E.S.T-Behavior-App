import { Suspense, lazy, useState, useRef, useEffect } from 'react';

// Chart loading component
const ChartLoader = ({ height = 300 }) => (
  <div 
    className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
    style={{ height }}
  >
    <div className="flex flex-col items-center space-y-2">
      <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-sm text-gray-500">Loading chart...</p>
    </div>
  </div>
);

// Intersection Observer hook for lazy loading
function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, options]);

  return [elementRef, isIntersecting, hasIntersected];
}

// Lazy chart wrapper component
export function LazyChart({ 
  chartComponent, 
  fallbackHeight = 300, 
  loadOnMount = false,
  ...props 
}) {
  const [elementRef, isIntersecting, hasIntersected] = useIntersectionObserver();
  const [ChartComponent, setChartComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ((loadOnMount || hasIntersected) && !ChartComponent && !isLoading) {
      setIsLoading(true);
      
      // Dynamically import the chart component
      chartComponent()
        .then(module => {
          setChartComponent(() => module.default || module);
        })
        .catch(error => {
          console.error('Failed to load chart component:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [loadOnMount, hasIntersected, ChartComponent, isLoading, chartComponent]);

  return (
    <div ref={elementRef}>
      {ChartComponent ? (
        <Suspense fallback={<ChartLoader height={fallbackHeight} />}>
          <ChartComponent {...props} />
        </Suspense>
      ) : (
        <ChartLoader height={fallbackHeight} />
      )}
    </div>
  );
}

// Specific lazy chart components for common charts
export const LazyRechartsChart = ({ children, height = 300, ...props }) => (
  <LazyChart
    chartComponent={() => import('recharts').then(recharts => {
      // Return a wrapper component that provides recharts components
      return function RechartsWrapper({ children, ...wrapperProps }) {
        return (
          <div style={{ height }} {...wrapperProps}>
            {typeof children === 'function' ? children(recharts) : children}
          </div>
        );
      };
    })}
    fallbackHeight={height}
    {...props}
  >
    {children}
  </LazyChart>
);

// Lazy loading wrapper for any heavy component
export function LazyComponent({ 
  componentLoader, 
  fallback = null, 
  loadOnMount = false,
  ...props 
}) {
  const [elementRef, isIntersecting, hasIntersected] = useIntersectionObserver();
  const [Component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ((loadOnMount || hasIntersected) && !Component && !isLoading) {
      setIsLoading(true);
      
      componentLoader()
        .then(module => {
          setComponent(() => module.default || module);
        })
        .catch(error => {
          console.error('Failed to load component:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [loadOnMount, hasIntersected, Component, isLoading, componentLoader]);

  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div ref={elementRef}>
      {Component ? (
        <Suspense fallback={fallback || defaultFallback}>
          <Component {...props} />
        </Suspense>
      ) : (
        fallback || defaultFallback
      )}
    </div>
  );
}

export default LazyChart;