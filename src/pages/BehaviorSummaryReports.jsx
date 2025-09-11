import { useState, useEffect } from "react";
import { Student } from "@/api/entities";
import { BehaviorSummary } from "@/api/entities";
import { Settings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Users, FileText, Printer } from "lucide-react";
import { Toaster, toast } from 'sonner';

import StudentList from "../components/behavior-summary/StudentList";
import SummaryForm from "../components/behavior-summary/SummaryForm";
import PrintBehaviorSummariesDialog from "../components/behavior/PrintBehaviorSummariesDialog";
import { todayYmd } from "@/utils";

export default function BehaviorSummaryReports() {
  const [students, setStudents] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [showPrintAllDialog, setShowPrintAllDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentFormData, setCurrentFormData] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [studentsData, summariesData, settingsData] = await Promise.all([
        Student.filter({ active: true }),
        // Order by latest end date; column is `date_to` in schema
        BehaviorSummary.list('-date_to'),
        Settings.list()
      ]);
      setStudents(studentsData);
      setSummaries(summariesData);
      setSettings(settingsData[0] || null);
    } catch (error) {
      console.error("Load data error:", error);
      const msg = typeof error?.message === 'string' ? error.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('row-level security')) {
        toast.error('RLS/permissions preventing reads. Apply supabase-schema.sql policies/grants in Supabase.')
      } else {
        toast.error("Failed to load data.");
      }
    }
    setIsLoading(false);
  };

  // Find a summary for a given student and exact date range
  const findSummaryForRange = (studentId, startYmd, endYmd) => {
    return summaries.find(s => s.student_id === studentId && s.date_range_start === startYmd && s.date_range_end === endYmd) || null;
  };

  const saveSummary = async (formData, opts = {}) => {
    const { silent = false } = opts || {};
    const studentId = students[currentStudentIndex]?.id;
    if (!studentId) return;

    setIsSaving(true);
    try {
      // Persist by student + date range so multiple summaries per student are allowed
      const existingSummary = findSummaryForRange(
        studentId,
        formData.date_range_start,
        formData.date_range_end
      );
      
      if (existingSummary) {
        await BehaviorSummary.update(existingSummary.id, formData);
        console.log("Updated existing summary for student/date range:", students[currentStudentIndex].student_name, formData.date_range_start, formData.date_range_end);
      } else {
        const created = await BehaviorSummary.create({ student_id: studentId, ...formData });
        console.log("Created new summary for student/date range:", students[currentStudentIndex].student_name, formData.date_range_start, formData.date_range_end);
        // Ensure created object has id and mapped fields
        formData = { ...created };
      }
      
      if (!silent) {
        toast.success(`${students[currentStudentIndex].student_name}'s behavior summary saved!`);
      }
      
      // Update local state
      const updatedSummaries = existingSummary 
        ? summaries.map(s => s.id === existingSummary.id ? { ...s, ...formData } : s)
        : [...summaries, { ...formData }];
      
      setSummaries(updatedSummaries);
      
    } catch (error) {
      console.error("Save summary error:", error);
      const msg = typeof error?.message === 'string' ? error.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('row-level security')) {
        toast.error('Insert/update blocked by RLS. Apply supabase-schema.sql policies/grants in Supabase.')
      } else if (msg.toLowerCase().includes('permission') || error?.code === '42501') {
        toast.error('Permission denied. Check RLS policies for anon role in Supabase.')
      } else {
        toast.error("Failed to save behavior summary.");
      }
    }
    setIsSaving(false);
  };

  const getCurrentSummaryData = () => {
    return currentFormData;
  };

  const handleSelectStudent = async (index) => {
    // Save current student's data before switching if there are unsaved changes
    if (currentStudent && hasUnsavedChanges && currentFormData) {
      try {
        await saveSummary(currentFormData, { silent: true });
      } catch (error) {
        console.error('Failed to save before switching students:', error);
        // Continue with navigation even if save fails
      }
    }
    
    setCurrentStudentIndex(index);
    setIsStudentListOpen(false);
    setHasUnsavedChanges(false);
    setCurrentFormData(null);
  };

  const currentStudent = students[currentStudentIndex];
  // Show today's summary by default; if none exists for today, form will start blank for a new entry
  const today = todayYmd();
  const currentSummary = currentStudent 
    ? summaries.find(s => s.student_id === currentStudent.id && s.date_range_start === today && s.date_range_end === today) || null
    : null;
  const navigateStudent = async (dir) => {
    const newIndex = Math.max(0, Math.min(currentStudentIndex + dir, students.length - 1));
    if (newIndex !== currentStudentIndex) {
      await handleSelectStudent(newIndex);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading Behavior Summary Reports...</div>;

  return (
    <div className="flex h-screen bg-slate-50">
      <Toaster richColors />
      {isStudentListOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setIsStudentListOpen(false)}></div>}
      
      <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isStudentListOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <StudentList students={students} summaries={summaries} currentIndex={currentStudentIndex} onSelectStudent={handleSelectStudent} />
      </div>

      <main className="flex-1 flex flex-col overflow-y-auto">
        {!currentStudent ? (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-800">No Students Found</h2>
              <p className="text-slate-500">Add students from the main dashboard to begin creating behavior summaries.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10">
              <div className="flex items-center justify-between md:hidden">
                <Button onClick={() => setIsStudentListOpen(true)} variant="outline" size="icon">
                  <Users className="w-5 h-5" />
                </Button>
                <div className="text-center">
                  <h2 className="text-lg font-bold text-slate-900 truncate">{currentStudent.student_name}</h2>
                  <p className="text-sm text-slate-500">Student {currentStudentIndex + 1} of {students.length}</p>
                </div>
                <div className="w-9 h-9" />
              </div>
              <div className="hidden md:flex items-center justify-between">
                <Button onClick={() => navigateStudent(-1)} disabled={currentStudentIndex === 0} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">{currentStudent.student_name} - Behavior Summary</h2>
                  <p className="text-sm text-slate-500">Student {currentStudentIndex + 1} of {students.length}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setShowPrintAllDialog(true)} variant="outline">
                    <Printer className="w-4 h-4 mr-2" /> Print All
                  </Button>
                  <Button onClick={() => navigateStudent(1)} disabled={currentStudentIndex === students.length - 1} variant="outline">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
              <div className="flex md:hidden items-center justify-between mt-4 gap-2">
                <Button onClick={() => navigateStudent(-1)} disabled={currentStudentIndex === 0} variant="outline" className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Prev
                </Button>
                <div className="flex-1 flex gap-2">
                  <Button onClick={() => setShowPrintAllDialog(true)} variant="outline" className="flex-1">
                    <Printer className="w-4 h-4 mr-2" /> All
                  </Button>
                  <Button onClick={() => navigateStudent(1)} disabled={currentStudentIndex === students.length - 1} variant="outline" className="flex-1">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </header>
            <div className="p-4 md:p-8 flex-1">
              <SummaryForm 
                key={`${currentStudent.id}-${currentSummary?.id || 'new'}`} 
                summary={currentSummary} 
                settings={settings} 
                onSave={saveSummary} 
                isSaving={isSaving}
                studentId={currentStudent.id}
                student={currentStudent}
                onFormDataChange={setCurrentFormData}
                onUnsavedChanges={setHasUnsavedChanges}
              />
            </div>
          </>
        )}
      </main>
      <PrintBehaviorSummariesDialog 
        open={showPrintAllDialog} 
        onOpenChange={setShowPrintAllDialog} 
        students={students} 
        settings={settings} 
        currentStudentId={currentStudent?.id}
      />
    </div>
  );
}
