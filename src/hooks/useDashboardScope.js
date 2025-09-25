import { useMemo } from 'react';
import { useDashboardContext, DEFAULT_DASHBOARD_ID } from '@/contexts/DashboardContext';

export function useDashboardScope() {
  const context = useDashboardContext();
  const {
    dashboards,
    defaultDashboardName,
    selectedDashboardId,
    dashboardsSupported,
    disableDashboards,
    buildStudentFilter,
  } = context;

  const currentDashboardName = useMemo(() => {
    if (selectedDashboardId === DEFAULT_DASHBOARD_ID) {
      return defaultDashboardName;
    }
    const match = dashboards.find((dashboard) => String(dashboard.id) === selectedDashboardId);
    return match?.name || defaultDashboardName;
  }, [dashboards, defaultDashboardName, selectedDashboardId]);

  const studentFilter = useMemo(() => {
    if (!dashboardsSupported) {
      return { active: true };
    }
    return buildStudentFilter({ active: true });
  }, [dashboardsSupported, buildStudentFilter]);

  return {
    ...context,
    currentDashboardName,
    studentFilter,
    dashboardsSupported,
    disableDashboards,
  };
}

export default useDashboardScope;
