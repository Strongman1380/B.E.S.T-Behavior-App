import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Dashboard } from '@/api/entities';

export const DEFAULT_DASHBOARD_ID = 'default';

const SELECTED_STORAGE_KEY = 'best:selected-dashboard';

const DashboardContext = createContext(null);

function sanitizeSelectedId(value) {
  if (value === null || value === undefined) return DEFAULT_DASHBOARD_ID;
  const str = String(value);
  if (!str || str === DEFAULT_DASHBOARD_ID) return DEFAULT_DASHBOARD_ID;
  return /^\d+$/.test(str) ? str : DEFAULT_DASHBOARD_ID;
}

export function DashboardProvider({ children }) {
  const [dashboards, setDashboards] = useState([]);
  const [dashboardsLoading, setDashboardsLoading] = useState(false);
  const [dashboardsSupported, setDashboardsSupported] = useState(true);
  const [defaultDashboardName, setDefaultDashboardName] = useState('Heartland Boys Home');
  const [selectedDashboardId, setSelectedDashboardIdState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_DASHBOARD_ID;
    try {
      const stored = window.localStorage.getItem(SELECTED_STORAGE_KEY);
      return sanitizeSelectedId(stored);
    } catch {
      return DEFAULT_DASHBOARD_ID;
    }
  });

  const persistSelectedId = useCallback((value) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SELECTED_STORAGE_KEY, value);
    } catch {
      // Ignore storage errors (e.g., Safari private mode)
    }
  }, []);

  const selectedDashboardNumericId = useMemo(() => {
    if (!selectedDashboardId || selectedDashboardId === DEFAULT_DASHBOARD_ID) return null;
    const parsed = Number(selectedDashboardId);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }, [selectedDashboardId]);

  const setSelectedDashboardId = useCallback((value) => {
    const sanitized = sanitizeSelectedId(value);
    setSelectedDashboardIdState(sanitized);
    persistSelectedId(sanitized);
  }, [persistSelectedId]);

  const disableDashboards = useCallback(() => {
    setDashboardsSupported(false);
    setDashboards([]);
    setSelectedDashboardId(DEFAULT_DASHBOARD_ID);
  }, [setSelectedDashboardId]);

  const refreshDashboards = useCallback(async () => {
    if (dashboardsSupported === false) {
      setDashboards([]);
      return;
    }
    setDashboardsLoading(true);
    try {
      const results = await Dashboard.list('name');
      setDashboards(Array.isArray(results) ? results : []);
    } catch (error) {
      const message = String(error?.message || error?.details || '').toLowerCase();
      const missingTable = message.includes('could not find the table') && message.includes('dashboards');
      const missingColumn = message.includes('column') && message.includes('dashboard');
      if (missingTable || missingColumn) {
        console.warn('Dashboards table is not available. Falling back to single-dashboard mode.');
        disableDashboards();
      } else {
        console.error('Failed to load dashboards:', error?.message || error);
      }
    } finally {
      setDashboardsLoading(false);
    }
  }, [dashboardsSupported, disableDashboards]);

  useEffect(() => {
    refreshDashboards();
  }, [refreshDashboards]);

  useEffect(() => {
    if (selectedDashboardId === DEFAULT_DASHBOARD_ID) return;
    const exists = dashboards.some((item) => String(item.id) === selectedDashboardId);
    if (!exists) {
      setSelectedDashboardId(DEFAULT_DASHBOARD_ID);
    }
  }, [dashboards, selectedDashboardId, setSelectedDashboardId]);

  useEffect(() => {
    if (dashboardsSupported === false && selectedDashboardId !== DEFAULT_DASHBOARD_ID) {
      setSelectedDashboardId(DEFAULT_DASHBOARD_ID);
    }
  }, [dashboardsSupported, selectedDashboardId, setSelectedDashboardId]);

  const buildStudentFilter = useCallback((base = {}) => {
    const filter = { ...base };
    if (!dashboardsSupported) {
      return filter;
    }
    if (selectedDashboardId === DEFAULT_DASHBOARD_ID) {
      filter.dashboard_id = null;
    } else if (selectedDashboardNumericId !== null) {
      filter.dashboard_id = selectedDashboardNumericId;
    }
    return filter;
  }, [dashboardsSupported, selectedDashboardId, selectedDashboardNumericId]);

  const value = useMemo(() => ({
    dashboards,
    dashboardsLoading,
    refreshDashboards,
    selectedDashboardId,
    selectedDashboardNumericId,
    setSelectedDashboardId,
    defaultDashboardName,
    setDefaultDashboardName,
    dashboardsSupported,
    disableDashboards,
    buildStudentFilter,
  }), [dashboards, dashboardsLoading, refreshDashboards, selectedDashboardId, selectedDashboardNumericId, setSelectedDashboardId, defaultDashboardName, dashboardsSupported, disableDashboards, buildStudentFilter]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    // Instead of throwing, return a default context to prevent crashes
    console.warn('useDashboardContext used outside DashboardProvider - using fallback mode');
    return null;
  }
  return context;
}
