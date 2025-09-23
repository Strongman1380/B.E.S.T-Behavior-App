
import { useState, useEffect, useCallback } from "react";
import { Student } from "@/api/entities";
import { DailyEvaluation } from "@/api/entities";
import { Settings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, ArrowRight, UserCheck, Users, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { todayYmd, parseYmd, formatDate } from "@/utils";
import { Toaster, toast } from 'sonner';
import { cn } from "@/lib/utils";

import StudentList from "../components/quick-score/StudentList";
import EvaluationForm from "../components/behavior/EvaluationForm";

export default function QuickScore() {
  const [students, setStudents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const today = todayYmd();
  const selectedDateYmd = todayYmd(selectedDate);

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if(showLoading) setIsLoading(true);
      console.log("Loading Quick Score data for date:", selectedDateYmd);
      
      const [studentsData, evaluationsData, settingsData] = await Promise.all([
        Student.filter({ active: true }).catch(err => {
          console.error("Error loading students:", err);
          return [];
        }),
        DailyEvaluation.filter({ date: selectedDateYmd }).catch(err => {
          console.error("Error loading evaluations:", err);
          return [];
        }),
        Settings.list().catch(err => {
          console.error("Error loading settings:", err);
          return [];
        })
      ]);
      
      console.log("Quick Score data loaded:", { studentsData, evaluationsData, settingsData });
      
      setStudents(studentsData || []);
      setEvaluations(evaluationsData || []);
      setSettings(settingsData?.[0] || null);
      
    } catch (error) { 
      console.error("Load data error:", error); // Keep original console log
      if (error.message.includes('429') || error.message.includes('Rate limit')) {
        toast.error("Too many requests. Please wait a moment and try again.");
      } else {
        toast.error("Failed to load data. Please try refreshing the page."); // General error message
      }
    } finally {
      if(showLoading) setIsLoading(false);
    }
  }, [selectedDateYmd]);

  useEffect(() => { 
    loadData(); 
  }, [loadData]);
  
  const saveEvaluation = async (formData, showToast = true) => {
    const studentId = students[currentStudentIndex]?.id;
    if (!studentId) return;
    
    setIsSaving(true);
    try {
      const existingEvaluation = evaluations.find(e => e.student_id === studentId);
      
      if (existingEvaluation) {
        await DailyEvaluation.update(existingEvaluation.id, formData);
        // Update local state instead of reloading
        setEvaluations(prev => prev.map(e => 
          e.id === existingEvaluation.id ? { ...e, ...formData } : e
        ));
      } else {
        const newEvaluation = await DailyEvaluation.create({ student_id: studentId, date: selectedDateYmd, ...formData });
        // Add to local state instead of reloading
        setEvaluations(prev => [...prev, newEvaluation]);
      }
      
      // Only show toast for manual saves, not auto-saves
      if (showToast) {
        toast.success(`${students[currentStudentIndex].student_name}'s evaluation saved!`);
      }
      
    } catch (error) { 
      console.error("Save evaluation error:", error);
      // Always show error toasts
      toast.error("Failed to save evaluation.");
    }
    setIsSaving(false);
  };

  const handleSelectStudent = (index) => {
    setCurrentStudentIndex(index);
    setIsStudentListOpen(false);
  };

  const currentStudent = students[currentStudentIndex];
  const currentEvaluation = currentStudent ? evaluations.find(e => e.student_id === currentStudent.id) : null;
  const navigateStudent = (dir) => setCurrentStudentIndex(p => Math.max(0, Math.min(p + dir, students.length - 1)));

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading Quick Score...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <Toaster richColors />
      {isStudentListOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setIsStudentListOpen(false)}></div>}
      
      <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isStudentListOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <StudentList students={students} evaluations={evaluations} currentIndex={currentStudentIndex} onSelectStudent={handleSelectStudent} />
      </div>

      <main className="flex-1 flex flex-col overflow-y-auto">
        {!currentStudent ? (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <UserCheck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-800">No Students Found</h2>
              <p className="text-slate-500">Add students from the main dashboard to begin scoring.</p>
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
                <Button onClick={() => navigateStudent(-1)} disabled={currentStudentIndex === 0} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Previous</Button>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">{currentStudent.student_name}</h2>
                  <p className="text-sm text-slate-500">Student {currentStudentIndex + 1} of {students.length}</p>
                </div>
                <Button onClick={() => navigateStudent(1)} disabled={currentStudentIndex === students.length - 1} variant="outline">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
              <div className="flex md:hidden items-center justify-between mt-4 gap-2">
                <Button onClick={() => navigateStudent(-1)} disabled={currentStudentIndex === 0} variant="outline" className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" /> Prev</Button>
                <Button onClick={() => navigateStudent(1)} disabled={currentStudentIndex === students.length - 1} variant="outline" className="flex-1">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
              
              {/* Date Picker */}
              <div className="flex justify-center mt-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setCurrentStudentIndex(0); // Reset to first student when changing dates
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </header>
            <div className="p-4 md:p-8 flex-1">
              <EvaluationForm 
                key={`${currentStudent.id}-${currentEvaluation?.id || 'new'}`} 
                evaluation={currentEvaluation} 
                settings={settings} 
                onSave={saveEvaluation} 
                isSaving={isSaving} 
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
