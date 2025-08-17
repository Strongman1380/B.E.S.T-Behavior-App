import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Student } from '@/api/entities';
import { ContactLog } from '@/api/entities';
import { DailyEvaluation } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MessageSquare, ArrowLeft, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Toaster } from 'sonner';
import PrintContactLogsDialog from '../components/contacts/PrintContactLogsDialog';

export default function StudentProfile() {
    const [searchParams] = useSearchParams();
    const studentId = searchParams.get('id');

    const [student, setStudent] = useState(null);
    const [contactLogs, setContactLogs] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPrintLogsDialog, setShowPrintLogsDialog] = useState(false);

    useEffect(() => {
        if (studentId) {
            fetchData();
        }
    }, [studentId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [studentData, logsData, evalsData] = await Promise.all([
                Student.get(studentId),
                ContactLog.filter({ student_id: studentId }, '-contact_date'),
                DailyEvaluation.filter({ student_id: studentId }, '-date')
            ]);
            setStudent(studentData);
            setContactLogs(logsData);
            setEvaluations(evalsData);
        } catch (error) {
            console.error("Failed to fetch student profile data:", error);
        }
        setIsLoading(false);
    };

    if (isLoading) return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading profile...</p>
                </div>
            </div>
        </div>
    );
    
    if (!student) return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-700 mb-2">Student not found</h2>
                <Link to={createPageUrl('BehaviorDashboard')}>
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
    
    const calculateAvgScore = (evaluation) => {
        if (!evaluation || !evaluation.time_slots) return 'N/A';
        const ratedSlots = Object.values(evaluation.time_slots).filter(slot => slot && typeof slot.rating === 'number');
        if (ratedSlots.length === 0) return 'N/A';
        const sum = ratedSlots.reduce((acc, slot) => acc + slot.rating, 0);
        return (sum / ratedSlots.length).toFixed(2);
    };

    return (
        <div className="p-3 sm:p-4 md:p-6 lg:p-10 bg-slate-50 min-h-screen">
            <Toaster richColors />
            <div className="max-w-5xl mx-auto">
                <header className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <Link to={createPageUrl('BehaviorDashboard')}>
                        <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">{student.student_name}</h1>
                        <p className="text-slate-600 text-sm sm:text-base">
                            <span className="hidden sm:inline">Complete historical overview</span>
                            <span className="sm:hidden">Student profile</span>
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" /> 
                                <span className="hidden sm:inline">Contact Log History</span>
                                <span className="sm:hidden">Contact Logs</span>
                            </CardTitle>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setShowPrintLogsDialog(true)} 
                                disabled={contactLogs.length === 0}
                                className="h-8 px-3 text-xs sm:text-sm"
                            >
                                <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Print Logs</span>
                                <span className="sm:hidden">Print</span>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6">
                            {contactLogs.length > 0 ? (
                                <ul className="space-y-3 sm:space-y-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2">
                                    {contactLogs.map(log => (
                                        <li key={log.id} className="p-3 bg-slate-50 rounded-lg border">
                                            <p className="font-semibold text-sm sm:text-base">{log.purpose_of_contact}</p>
                                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                                {format(new Date(log.contact_date), 'MMM d, yyyy')} with {log.contact_person_name}
                                                <span className="hidden sm:inline"> ({log.contact_category})</span>
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-500 text-sm sm:text-base">No contact logs recorded for this student.</p>
                            )}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" /> 
                                <span className="hidden sm:inline">Daily Evaluation History</span>
                                <span className="sm:hidden">Evaluations</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6">
                             {evaluations.length > 0 ? (
                                <ul className="space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2">
                                    {evaluations.map(ev => (
                                        <li key={ev.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 p-3 bg-slate-50 rounded-lg border">
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm sm:text-base">
                                                    <span className="hidden sm:inline">{format(new Date(ev.date), 'EEEE, MMM d, yyyy')}</span>
                                                    <span className="sm:hidden">{format(new Date(ev.date), 'MMM d, yyyy')}</span>
                                                </p>
                                                <p className="text-xs sm:text-sm text-slate-500">Avg Score: {calculateAvgScore(ev)}</p>
                                            </div>
                                            <Link to={createPageUrl(`StudentEvaluation?studentId=${student.id}&date=${ev.date}`)}>
                                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs sm:text-sm w-full sm:w-auto">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-500 text-sm sm:text-base">No evaluations recorded for this student.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <PrintContactLogsDialog 
                open={showPrintLogsDialog}
                onOpenChange={setShowPrintLogsDialog}
                student={student}
                logs={contactLogs}
            />
        </div>
    )
}