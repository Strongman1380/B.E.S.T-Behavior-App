import { memo, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { DEFAULT_DASHBOARD_ID } from '@/contexts/DashboardContext';
import { cn } from '@/lib/utils';

const DashboardTabsBar = memo(function DashboardTabsBar({
  dashboards = [],
  defaultDashboardName = 'Heartland Boys Home',
  selectedDashboardId = DEFAULT_DASHBOARD_ID,
  onSelect,
  onAddDashboard,
  isLoading = false,
  className = ''
}) {
  const tabs = useMemo(() => {
    const userDefined = Array.isArray(dashboards) ? dashboards : [];
    const mapped = userDefined.map((dashboard) => ({
      id: String(dashboard.id),
      name: dashboard.name?.trim() || 'Untitled Dashboard'
    }));

    return [
      {
        id: DEFAULT_DASHBOARD_ID,
        name: defaultDashboardName?.trim() || 'Heartland Boys Home'
      },
      ...mapped
    ];
  }, [dashboards, defaultDashboardName]);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {tabs.map((tab) => {
        const isActive = selectedDashboardId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 shadow-sm',
              isActive
                ? 'border-sky-600 bg-sky-100 text-sky-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-sky-400 hover:text-sky-700',
              isLoading && 'pointer-events-none opacity-60'
            )}
            onClick={() => onSelect?.(tab.id)}
          >
            {tab.name}
          </button>
        );
      })}
      {onAddDashboard && (
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 transition-colors duration-200 hover:border-sky-400 hover:text-sky-600',
            isLoading && 'pointer-events-none opacity-60'
          )}
          onClick={onAddDashboard}
        >
          <Plus className="h-4 w-4" />
          Add Dashboard
        </button>
      )}
    </div>
  );
});

export default DashboardTabsBar;
