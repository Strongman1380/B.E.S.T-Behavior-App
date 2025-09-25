
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, MessageSquare, Zap, Settings, Menu, FileText, AlertTriangle, BarChart3, BookOpen, Printer, Grid } from 'lucide-react';
import RealTimeSync from '../components/sync/RealTimeSync';
import SupabaseStatus from '../components/SupabaseStatus';
import SupabaseHealth from '../components/SupabaseHealth';
import DeploymentLinks from '../components/DeploymentLinks';
import UserProfile from '@/components/auth/UserProfile';

const navItems = [
    { title: 'Dashboard', icon: LayoutDashboard, url: createPageUrl('BehaviorDashboard') },
    { title: 'Quick Score', icon: Zap, url: createPageUrl('QuickScore') },
    { title: 'KPI Dashboard', icon: BarChart3, url: createPageUrl('KPIDashboard') },
    { title: 'B.E.S.T Interactive Grid', icon: Grid, url: createPageUrl('BestInteractiveGrid') },
    { title: 'Behavior Summaries', icon: FileText, url: createPageUrl('BehaviorSummaryReports') },
    { title: 'Summary Reports', icon: FileText, url: createPageUrl('SummaryReports') },
    { title: 'Print Reports', icon: Printer, url: createPageUrl('PrintReports') },
    { title: 'Academic Progress Dashboard', icon: BookOpen, url: createPageUrl('CreditsEarned') },
    { title: 'Incident Reports', icon: AlertTriangle, url: createPageUrl('IncidentReports') },
    { title: 'Settings', icon: Settings, url: createPageUrl('Settings') },
];

const NavLink = ({ item, currentPath, onNavigate }) => (
    <Link
        to={item.url}
        onClick={onNavigate}
        className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            currentPath === item.url
                ? 'bg-[#dff5ff] text-[#0c5b8c] font-semibold ring-1 ring-[#9fdcff] shadow-sm'
                : 'text-[#3a6a94] hover:bg-[#eef7ff] hover:text-[#0e4e7c]'
        }`}
    >
        <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
        <span className="tracking-tight">{item.title}</span>
    </Link>
);

export default function Layout({ children }) {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="relative min-h-screen md:flex bg-gradient-to-br from-[#f0f8ff] via-[#eaf7ff] to-[#e6fbff]">
            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white/75 backdrop-blur-lg border-r border-[#cbe7ff] flex-col flex transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out shadow-lg shadow-sky-100/40 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-[#d6ecff] bg-white/70">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200/60">
                            <img src="/icon.svg" alt="BEST Hub Logo" className="w-11 h-11 rounded-2xl" />
                        </div>
                        <div>
                            <h1 className="text-lg font-extrabold text-[#0e4e7c] tracking-tight">BEST Hub</h1>
                            <p className="text-xs font-semibold text-[#1d7fb8] uppercase tracking-wider">Berniklau Solutions</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map(item => <NavLink key={item.title} item={item} currentPath={location.pathname} onNavigate={() => setIsSidebarOpen(false)} />)}
                </nav>
                <div className="p-4 border-t border-[#d6ecff] space-y-2 bg-gradient-to-b from-transparent to-white/60">
                    <RealTimeSync />
                    <SupabaseStatus />
                    <SupabaseHealth />
                    <DeploymentLinks />
                </div>
            </aside>
            
            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Mobile Header */}
                <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 backdrop-blur p-2 border-b border-[#d0e9ff] md:hidden safe-area-top">
                    <button 
                        onClick={() => setIsSidebarOpen(true)} 
                        className="p-2 touch-target rounded-lg hover:bg-[#e6f5ff] transition-colors text-[#0c5b8c]"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2">
                        <img src="/icon.svg" alt="BEST Hub Logo" className="w-8 h-8 rounded-lg" />
                        <span className="font-semibold text-[#0e4e7c]">BEST Hub</span>
                    </div>
                    <div className="p-2">
                        {/* User profile menu when authenticated */}
                        <UserProfile />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto mobile-scroll safe-area-bottom p-4 md:p-6 lg:p-8">
                    <div className="mx-auto w-full max-w-[1400px]">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
