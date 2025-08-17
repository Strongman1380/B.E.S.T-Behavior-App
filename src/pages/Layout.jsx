
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, MessageSquare, Zap, Settings, ShieldCheck, Menu, FileText, AlertTriangle, BarChart3 } from 'lucide-react';
import RealTimeSync from '../components/sync/RealTimeSync';
import UserProfile from '../components/auth/UserProfile';

const navItems = [
    { title: 'Dashboard', icon: LayoutDashboard, url: createPageUrl('BehaviorDashboard') },
    { title: 'Contact Logs', icon: MessageSquare, url: createPageUrl('ContactLogs') },
    { title: 'Quick Score', icon: Zap, url: createPageUrl('QuickScore') },
    { title: 'KPI Dashboard', icon: BarChart3, url: createPageUrl('KPIDashboard') },
    { title: 'Behavior Summaries', icon: FileText, url: createPageUrl('BehaviorSummaryReports') },
    { title: 'Incident Reports', icon: AlertTriangle, url: createPageUrl('IncidentReports') },
    { title: 'Settings', icon: Settings, url: createPageUrl('Settings') },
];

const NavLink = ({ item, currentPath, onNavigate }) => (
    <Link
        to={item.url}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
            currentPath === item.url
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
        }`}
    >
        <item.icon className="w-5 h-5" />
        <span>{item.title}</span>
    </Link>
);

export default function Layout({ children }) {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="relative min-h-screen md:flex bg-slate-50">
            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex-col flex transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800">Heartland School Hub</h1>
                            <p className="text-xs text-slate-500">Behavior & Contact Hub</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map(item => <NavLink key={item.title} item={item} currentPath={location.pathname} onNavigate={() => setIsSidebarOpen(false)} />)}
                </nav>
                <div className="p-4 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Account</span>
                        <UserProfile />
                    </div>
                    <RealTimeSync />
                </div>
            </aside>
            
            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Mobile Header */}
                <header className="sticky top-0 z-10 flex items-center justify-between bg-white p-2 border-b md:hidden safe-area-top">
                    <button 
                        onClick={() => setIsSidebarOpen(true)} 
                        className="p-2 touch-target rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex-1 text-center font-semibold text-slate-800">
                        Heartland School Hub
                    </div>
                    <div className="p-2">
                        <UserProfile />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto mobile-scroll safe-area-bottom">
                    {children}
                </main>
            </div>
        </div>
    );
}
