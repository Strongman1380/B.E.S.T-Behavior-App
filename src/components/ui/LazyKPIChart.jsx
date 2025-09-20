import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy loading wrapper for KPI charts with intersection observer
export function LazyKPIChart({ 
  importFn, 
  title, 
  description,
  icon: Icon,
  className = "",
  threshold = 0.1,
  rootMargin = "50px",
  ...props 
}) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [Component, setComponent] = useState(null);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !shouldLoad) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [shouldLoad, threshold, rootMargin]);

  useEffect(() => {
    if (shouldLoad && !Component) {
      importFn().then(module => {
        setComponent(() => module.default || module);
      }).catch(error => {
        console.error(`Failed to load chart component: ${title}`, error);
      });
    }
  }, [shouldLoad, Component, importFn, title]);

  const LoadingSkeleton = () => (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div ref={ref} className={className}>
      {!shouldLoad ? (
        <LoadingSkeleton />
      ) : Component ? (
        <Suspense fallback={<LoadingSkeleton />}>
          <Component {...props} />
        </Suspense>
      ) : (
        <LoadingSkeleton />
      )}
    </div>
  );
}

// Specialized lazy loading for different chart types
export function LazyBehaviorChart(props) {
  return (
    <LazyKPIChart
      importFn={() => import('@/components/kpi/BehaviorTrendChart')}
      title="Behavior Trends"
      description="Daily behavior rating trends over time"
      {...props}
    />
  );
}

export function LazyIncidentChart(props) {
  return (
    <LazyKPIChart
      importFn={() => import('@/components/kpi/IncidentTypesBar')}
      title="Incident Types"
      description="Distribution of incident types"
      {...props}
    />
  );
}

export function LazyRatingChart(props) {
  return (
    <LazyKPIChart
      importFn={() => import('@/components/kpi/RatingDistributionBar')}
      title="Rating Distribution"
      description="Distribution of behavior ratings"
      {...props}
    />
  );
}

export function LazyTimeSlotChart(props) {
  return (
    <LazyKPIChart
      importFn={() => import('@/components/kpi/TimeSlotAnalysisBar')}
      title="Time Slot Analysis"
      description="Behavior patterns by time of day"
      {...props}
    />
  );
}

export function LazyWeeklyChart(props) {
  return (
    <LazyKPIChart
      importFn={() => import('@/components/kpi/WeeklyTrendsArea')}
      title="Weekly Trends"
      description="Weekly behavior trend analysis"
      {...props}
    />
  );
}

export function LazyCreditsChart(props) {
  return (
    <LazyKPIChart
      importFn={() => import('@/components/kpi/CreditsPerStudentChart')}
      title="Credits Per Student"
      description="Academic credits earned by student"
      {...props}
    />
  );
}

export function LazyCreditsTimeline(props) {
  return (
    <LazyKPIChart
      importFn={() => import('@/components/kpi/CreditsTimelineChart')}
      title="Credits Timeline"
      description="Credits earned over time"
      {...props}
    />
  );
}

export function LazyStudentComparison(props) {
  return (
    <LazyKPIChart
      importFn={() => import('@/components/kpi/StudentComparisonList')}
      title="Student Comparison"
      description="Comparative student performance metrics"
      {...props}
    />
  );
}