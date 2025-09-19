
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Student } from "@/api/entities";
import { DailyEvaluation } from "@/api/entities";
import { Settings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { format } from "date-fns";
import { todayYmd } from "@/utils";
import { formatDate } from "@/utils";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import EvaluationForm from "../components/behavior/EvaluationForm";
import PrintDialog from "../components/behavior/PrintDialog";

export default function StudentEvaluation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentId = searchParams.get('studentId');
  const date = searchParams.get('date') || todayYmd();

  const [student, setStudent] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const creatingRef = useRef(false);
  const queuedDataRef = useRef(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentData, evaluationData, settingsData] = await Promise.all([
        Student.get(studentId),
        DailyEvaluation.filter({ student_id: studentId, date }),
        Settings.list()
      ]);
      setStudent(studentData);
      setEvaluation(evaluationData[0] || null);
      setSettings(settingsData[0] || null);
    } catch (error) { 
      console.error("Error loading data:", error);
      const msg = typeof error?.message === 'string' ? error.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('row-level security')) {
        toast.error('RLS/permissions prevented loading data. Apply supabase-schema.sql policies/grants.')
      } else {
        toast.error("Failed to load student data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [studentId, date]);

  useEffect(() => { 
    if (studentId) {
      loadData(); 
    } else {
      // Auto-redirect to dashboard if no student specified
      setIsLoading(false);
      navigate(createPageUrl("BehaviorDashboard"), { replace: true });
    }
  }, [studentId, loadData, navigate]);

  const saveEvaluation = async (evaluationData, showToast = true) => {
    setIsSaving(true);
    try {
      if (evaluation) {
        await DailyEvaluation.update(evaluation.id, evaluationData);
        // Update local state instead of reloading
        setEvaluation(prev => ({ ...prev, ...evaluationData }));
        if (showToast) {
          toast.success("Evaluation updated successfully!");
        }
      } else {
        // Prevent duplicate creates when autosave fires multiple times
        if (creatingRef.current) {
          // Queue the latest data to apply after create completes
          queuedDataRef.current = evaluationData;
          return; // exit early; we will apply queued update later
        }
        creatingRef.current = true;
        const newEvaluation = await DailyEvaluation.create({ student_id: studentId, date, ...evaluationData });
        setEvaluation(newEvaluation);
        if (showToast) toast.success("Evaluation created successfully!");
        // If more edits came in during create, apply them as an update now
        if (queuedDataRef.current) {
          const pending = queuedDataRef.current;
          queuedDataRef.current = null;
          await DailyEvaluation.update(newEvaluation.id, pending);
          setEvaluation(prev => ({ ...prev, ...pending }));
        }
      }
    } catch (error) { 
      console.error("Error saving evaluation:", error);
      const msg = typeof error?.message === 'string' ? error.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('row-level security')) {
        toast.error('Insert/update blocked by RLS. Apply supabase-schema.sql policies/grants in Supabase.')
      } else if (msg.toLowerCase().includes('permission') || error?.code === '42501') {
        toast.error('Permission denied. Check RLS policies for anon role in Supabase.')
      } else {
        // Always show error toasts
        toast.error("Failed to save evaluation.");
      }
    } finally {
      setIsSaving(false);
      creatingRef.current = false;
    }
  };

  if (isLoading) return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading evaluation...</p>
        </div>
      </div>
    </div>
  );

  // No student selected: we are redirecting
  if (!studentId) return null;

  // studentId present but student record not found
  if (!student) return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Student not found</h2>
        <Button onClick={() => navigate(createPageUrl("BehaviorDashboard"))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(createPageUrl("BehaviorDashboard"))}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">{student.student_name}</h1>
                <p className="text-slate-600 text-sm sm:text-base">
                  <span className="hidden sm:inline">{formatDate(date, 'EEEE, MMMM d, yyyy')}</span>
                  <span className="sm:hidden">{formatDate(date, 'MMM d, yyyy')}</span>
                </p>
              </div>
            </div>
            {evaluation && (
              <Button 
                variant="outline" 
                onClick={() => setShowPrintDialog(true)} 
                disabled={isSaving}
                className="h-10 sm:h-11 w-full sm:w-auto"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Print PDF</span>
                <span className="sm:hidden">Print</span>
              </Button>
            )}
          </div>
        </div>
        <EvaluationForm evaluation={evaluation} settings={settings} onSave={saveEvaluation} isSaving={isSaving} />
        <PrintDialog open={showPrintDialog} onOpenChange={setShowPrintDialog} student={student} settings={settings} date={date} />
      </div>
    </div>
  );
}
