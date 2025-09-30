import { useMemo } from 'react';
import { useDashboardContext, DEFAULT_DASHBOARD_ID } from '@/contexts/DashboardContext';

export function useDashboardScope() {
  try {
    // Safety check for React availability
    if (typeof useMemo !== 'function') {
      console.error('React hooks not available - useMemo is not a function');
      return {
        dashboards: [],
        dashboardsLoading: false,
        selectedDashboardId: DEFAULT_DASHBOARD_ID,
        setSelectedDashboardId: () => {},
        defaultDashboardName: 'Main Dashboard',
        currentDashboardName: 'Main Dashboard',
        studentFilter: { active: true },
        dashboardsSupported: false,
        disableDashboards: false,
        buildStudentFilter: (filter) => filter || { active: true }
      };
    }

    const context = useDashboardContext();
  
  // Handle case where context is null/undefined (fallback mode)
  if (!context) {
    return {
      dashboards: [],
      dashboardsLoading: false,
      selectedDashboardId: DEFAULT_DASHBOARD_ID,
      setSelectedDashboardId: () => {},
      defaultDashboardName: 'Main Dashboard',
      currentDashboardName: 'Main Dashboard',
      studentFilter: { active: true },
      dashboardsSupported: false,
      disableDashboards: false,
      buildStudentFilter: (filter) => filter || { active: true }
    };
  }

  const {
    dashboards,
    defaultDashboardName,
    selectedDashboardId,
    dashboardsSupported,
    disableDashboards,
    buildStudentFilter,
  } = context;

  const currentDashboardName = useMemo(() => {
    try {
      if (selectedDashboardId === DEFAULT_DASHBOARD_ID) {
        return defaultDashboardName;
      }
      const match = dashboards.find((dashboard) => String(dashboard.id) === selectedDashboardId);
      return match?.name || defaultDashboardName;
    } catch (error) {
      console.error('Error in currentDashboardName useMemo:', error);
      return defaultDashboardName || 'Main Dashboard';
    }
  }, [dashboards, defaultDashboardName, selectedDashboardId]);

  const studentFilter = useMemo(() => {
    try {
      if (!dashboardsSupported) {
        return { active: true };
      }
      return buildStudentFilter({ active: true });
    } catch (error) {
      console.error('Error in studentFilter useMemo:', error);
      return { active: true };
    }
  }, [dashboardsSupported, buildStudentFilter]);

  return {
    ...context,
    currentDashboardName,
    studentFilter,
    dashboardsSupported,
    disableDashboards,
  };
  } catch (error) {
    console.error('Error in useDashboardScope hook:', error);
    // Return safe fallback values
    return {
      dashboards: [],
      dashboardsLoading: false,
      selectedDashboardId: DEFAULT_DASHBOARD_ID,
      setSelectedDashboardId: () => {},
      defaultDashboardName: 'Main Dashboard',
      currentDashboardName: 'Main Dashboard',
      studentFilter: { active: true },
      dashboardsSupported: false,
      disableDashboards: false,
      buildStudentFilter: (filter) => filter || { active: true }
    };
  }
}

export default useDashboardScope;
