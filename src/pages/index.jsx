import { Suspense, lazy } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from "./Layout.jsx";

// Route-level code splitting for heavy pages
const StudentEvaluation = lazy(() => import('./StudentEvaluation'));
const Settings = lazy(() => import('./Settings'));
const QuickScore = lazy(() => import('./QuickScore'));
const BehaviorDashboard = lazy(() => import('./BehaviorDashboard'));
const ContactLogs = lazy(() => import('./ContactLogs'));
const StudentProfile = lazy(() => import('./StudentProfile'));
const BehaviorSummaryReports = lazy(() => import('./BehaviorSummaryReports'));
const SummaryReports = lazy(() => import('./SummaryReports'));
const IncidentReports = lazy(() => import('./IncidentReports'));
const KPIDashboard = lazy(() => import('./KPIDashboard'));
const CreditsEarned = lazy(() => import('./CreditsEarned'));

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    return (
        <Layout>
            <Suspense fallback={<div className="p-4">Loading...</div>}>
            <Routes>            
                
                    <Route path="/" element={<BehaviorDashboard />} />
                
                
                <Route path="/StudentEvaluation" element={<StudentEvaluation />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/QuickScore" element={<QuickScore />} />
                
                <Route path="/BehaviorDashboard" element={<BehaviorDashboard />} />
                
                <Route path="/ContactLogs" element={<ContactLogs />} />
                
                <Route path="/StudentProfile" element={<StudentProfile />} />
                
                <Route path="/KPIDashboard" element={<KPIDashboard />} />
                
                <Route path="/BehaviorSummaryReports" element={<BehaviorSummaryReports />} />
                <Route path="/SummaryReports" element={<SummaryReports />} />
                
                <Route path="/IncidentReports" element={<IncidentReports />} />
                
                <Route path="/CreditsEarned" element={<CreditsEarned />} />
                
            </Routes>
            </Suspense>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
