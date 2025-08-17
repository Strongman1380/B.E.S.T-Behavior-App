import Layout from "./Layout.jsx";

import StudentEvaluation from "./StudentEvaluation";

import Settings from "./Settings";

import QuickScore from "./QuickScore";

import BehaviorDashboard from "./BehaviorDashboard";

import ContactLogs from "./ContactLogs";

import StudentProfile from "./StudentProfile";

import BehaviorSummaryReports from "./BehaviorSummaryReports";

import IncidentReports from "./IncidentReports";

import KPIDashboard from "./KPIDashboard";

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    return (
        <Layout>
            <Routes>            
                
                    <Route path="/" element={<StudentEvaluation />} />
                
                
                <Route path="/StudentEvaluation" element={<StudentEvaluation />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/QuickScore" element={<QuickScore />} />
                
                <Route path="/BehaviorDashboard" element={<BehaviorDashboard />} />
                
                <Route path="/ContactLogs" element={<ContactLogs />} />
                
                <Route path="/StudentProfile" element={<StudentProfile />} />
                
                <Route path="/KPIDashboard" element={<KPIDashboard />} />
                
                <Route path="/BehaviorSummaryReports" element={<BehaviorSummaryReports />} />
                
                <Route path="/IncidentReports" element={<IncidentReports />} />
                
            </Routes>
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