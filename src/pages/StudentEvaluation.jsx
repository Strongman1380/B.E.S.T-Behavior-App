
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Student } from "@/api/entities";
import { DailyEvaluation } from "@/api/entities";
import { Settings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import EvaluationForm from "../components/behavior/EvaluationForm";
import PrintDialog from "../components/behavior/PrintDialog";

export default function StudentEvaluation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentId = searchParams.get('studentId');
  const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const [student, setStudent] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    if (studentId) {
      loadData(); 
    }
  }, [studentId, date]);

  const loadData = async () => {
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
      toast.error("Failed to load student data.");
    } finally {
      setIsLoading(false);
    }
  };

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
        const newEvaluation = await DailyEvaluation.create({ student_id: studentId, date, ...evaluationData });
        // Set local state instead of reloading
        setEvaluation(newEvaluation);
        if (showToast) {
          toast.success("Evaluation created successfully!");
        }
      }
    } catch (error) { 
      console.error("Error saving evaluation:", error);
      // Always show error toasts
      toast.error("Failed to save evaluation.");
    } finally {
      setIsSaving(false);
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
      <div className="max-w-4xl mx-auto">
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
                  <span className="hidden sm:inline">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</span>
                  <span className="sm:hidden">{format(new Date(date), 'MMM d, yyyy')}</span>
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
