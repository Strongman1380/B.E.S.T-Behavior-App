import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Zap, BarChart3, AlertTriangle, Settings } from 'lucide-react'

const items = [
  { to: '/BehaviorDashboard', label: 'Home', Icon: LayoutDashboard },
  { to: '/ContactLogs', label: 'Logs', Icon: MessageSquare },
  { to: '/QuickScore', label: 'Score', Icon: Zap },
  { to: '/KPIDashboard', label: 'KPI', Icon: BarChart3 },
  { to: '/IncidentReports', label: 'Incidents', Icon: AlertTriangle },
  { to: '/Settings', label: 'Settings', Icon: Settings },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 md:hidden safe-area-bottom">
      <ul className="grid grid-cols-6">
        {items.map(({ to, label, Icon }) => {
          const active = pathname === to
          return (
            <li key={to} className="text-center">
              <Link to={to} className="flex flex-col items-center justify-center py-2 touch-target">
                <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-500'}`} />
                <span className={`mt-1 text-[11px] ${active ? 'text-blue-600 font-medium' : 'text-slate-600'}`}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

