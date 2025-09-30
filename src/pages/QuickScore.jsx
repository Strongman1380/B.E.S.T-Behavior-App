
import { useState, useEffect, useCallback } from "react";
import { Student } from "@/api/entities";
import { DailyEvaluation } from "@/api/entities";
import { Settings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, ArrowRight, UserCheck, Users, CalendarIcon, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { format } from "date-fns";
import { todayYmd, parseYmd, formatDate } from "@/utils";
import { Toaster, toast } from 'sonner';
import { cn } from "@/lib/utils";

import StudentList from "../components/quick-score/StudentList";
import EvaluationForm from "../components/behavior/EvaluationForm";
import DashboardTabsBar from "@/components/dashboard/DashboardTabsBar";
import useDashboardScope from "@/hooks/useDashboardScope";

export default function QuickScore() {
  const {
    dashboards,
    dashboardsLoading,
    selectedDashboardId,
    setSelectedDashboardId,
    defaultDashboardName,
    currentDashboardName,
    studentFilter,
    dashboardsSupported,
    disableDashboards,
  } = useDashboardScope();

  const [students, setStudents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const today = todayYmd();
  const selectedDateYmd = todayYmd(selectedDate);

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if(showLoading) setIsLoading(true);
      console.log("Loading Quick Score data for date:", selectedDateYmd);
      
      let studentsData;
      let evaluationsData;
      let settingsData;

      const fetchStudents = async () => {
        try {
          return await Student.filter(studentFilter, 'student_name').catch(err => {
            throw err;
          });
        } catch (error) {
          const message = String(error?.message || error?.details || '').toLowerCase();
          const dashboardMissing = message.includes('dashboard') && (message.includes('not exist') || message.includes('could not find'));
          if (dashboardMissing) {
            console.warn('Quick Score student fetch failed due to missing dashboard column. Disabling multi-dashboard mode.');
            disableDashboards();
            return await Student.filter({ active: true }, 'student_name').catch(innerErr => {
              console.error("Error loading students after fallback:", innerErr);
              return [];
            });
          }
          console.error("Error loading students:", error);
          return [];
        }
      };

      const [studentsResult, evaluationsResult, settingsResult] = await Promise.all([
        fetchStudents(),
        DailyEvaluation.filter({ date: selectedDateYmd }).catch(err => {
          console.error("Error loading evaluations:", err);
          return [];
        }),
        Settings.list().catch(err => {
          console.error("Error loading settings:", err);
          return [];
        })
      ]);

      studentsData = Array.isArray(studentsResult) ? studentsResult : [];
      evaluationsData = Array.isArray(evaluationsResult) ? evaluationsResult : [];
      settingsData = Array.isArray(settingsResult) ? settingsResult : [];

      console.log("Quick Score data loaded:", { studentsData, evaluationsData, settingsData });

      const studentIdSet = new Set(studentsData.map(student => student.id));
      const scopedEvaluations = evaluationsData.filter(evaluation => studentIdSet.has(evaluation.student_id));

      const latestEvaluationByStudent = new Map();
      scopedEvaluations.forEach(evaluation => {
        const key = evaluation.student_id;
        const existing = latestEvaluationByStudent.get(key);
        if (!existing) {
          latestEvaluationByStudent.set(key, evaluation);
          return;
        }
        const existingTimestamp = new Date(existing.updated_at || existing.created_at || existing.date || selectedDateYmd).getTime();
        const evaluationTimestamp = new Date(evaluation.updated_at || evaluation.created_at || evaluation.date || selectedDateYmd).getTime();
        if (evaluationTimestamp >= existingTimestamp) {
          latestEvaluationByStudent.set(key, evaluation);
        }
      });

      setStudents(studentsData);
      setEvaluations(Array.from(latestEvaluationByStudent.values()));
      setSettings(settingsData?.[0] || null);
      setCurrentStudentIndex(prev => {
        if (studentsData.length === 0) return 0;
        return Math.min(prev, studentsData.length - 1);
      });

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
  }, [selectedDateYmd, studentFilter, disableDashboards]);

  useEffect(() => { 
    loadData(); 
  }, [loadData]);

  useEffect(() => {
    setCurrentStudentIndex(0);
    setIsStudentListOpen(false);
  }, [selectedDashboardId]);
  
  const saveEvaluation = async (formData, showToast = true) => {
    const studentId = students[currentStudentIndex]?.id;
    if (!studentId) {
      console.warn('No student selected for save operation');
      return;
    }

    console.log('Saving evaluation for student:', students[currentStudentIndex]?.student_name, 'Date:', selectedDateYmd);

    setIsSaving(true);
    try {
      // Find existing evaluation for this student and date
      const existingEvaluation = evaluations.find(e =>
        e.student_id === studentId && e.date === selectedDateYmd
      );

      console.log('Existing evaluation found:', existingEvaluation ? 'Yes' : 'No');

      // Ensure all time slot data is preserved by merging with existing data
      const mergedTimeSlots = existingEvaluation?.time_slots
        ? { ...existingEvaluation.time_slots, ...formData.time_slots }
        : formData.time_slots || {};

      // Validate that we have actual data to save
      const hasTimeSlotData = Object.keys(mergedTimeSlots).some(key => {
        const slot = mergedTimeSlots[key];
        return slot && (slot.ai || slot.pi || slot.ce || slot.comment);
      });

      const dataToSave = {
        ...formData,
        time_slots: mergedTimeSlots,
        date: selectedDateYmd,
        student_id: studentId,
        // Ensure we preserve existing ID and timestamps
        ...(existingEvaluation && {
          id: existingEvaluation.id,
          created_at: existingEvaluation.created_at
        })
      };

      console.log('Data to save:', {
        hasTimeSlotData,
        timeSlotKeys: Object.keys(mergedTimeSlots),
        generalComments: dataToSave.general_comments?.length || 0
      });

      let savedEvaluation;
      if (existingEvaluation) {
        savedEvaluation = await DailyEvaluation.update(existingEvaluation.id, dataToSave);
        console.log('Updated existing evaluation:', savedEvaluation.id);
        // Update local state with merged data
        setEvaluations(prev => prev.map(e =>
          e.id === existingEvaluation.id ? savedEvaluation : e
        ));
      } else {
        savedEvaluation = await DailyEvaluation.create(dataToSave);
        console.log('Created new evaluation:', savedEvaluation.id);
        // Add to local state
        setEvaluations(prev => [...prev, savedEvaluation]);
      }

      // Verify the save was successful
      if (savedEvaluation && savedEvaluation.id) {
        console.log('Save operation completed successfully for student:', students[currentStudentIndex]?.student_name);
      } else {
        console.warn('Save operation may have failed - no ID returned');
      }

      // Only show toast for manual saves, not auto-saves
      if (showToast) {
        toast.success(`${students[currentStudentIndex].student_name}'s evaluation saved!`);
      }

    } catch (error) {
      console.error("Save evaluation error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        studentId,
        selectedDateYmd,
        hasTimeSlotData: Object.keys(formData.time_slots || {}).length > 0
      });
      // Always show error toasts
      toast.error("Failed to save evaluation. Please try again.");
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
      
      {/* Student List Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${
        isStudentListOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        isSidebarCollapsed ? 'md:w-16' : 'md:w-64'
      }`}>
        <StudentList
          students={students}
          evaluations={evaluations}
          currentIndex={currentStudentIndex}
          onSelectStudent={handleSelectStudent}
          collapsed={isSidebarCollapsed}
        />

        {/* Toggle Button on Desktop */}
        <Button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          variant="outline"
          size="icon"
          className="hidden md:flex absolute -right-4 top-4 bg-white border-2 border-slate-200 hover:bg-slate-50 rounded-full shadow-md"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Hamburger Menu Button for Desktop */}
      {isSidebarCollapsed && (
        <Button
          onClick={() => setIsSidebarCollapsed(false)}
          className="hidden md:flex items-center justify-center w-12 h-12 bg-white border-2 border-slate-200 hover:bg-slate-50 fixed left-4 top-1/2 transform -translate-y-1/2 shadow-md z-25 rounded-lg"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </Button>
      )}

      <main className={`flex-1 flex flex-col overflow-y-auto ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-0'}`}>
        {dashboardsSupported && (
          <div className="bg-white border-b border-slate-200 p-3 sm:p-4">
            <DashboardTabsBar
              dashboards={dashboards}
              defaultDashboardName={defaultDashboardName}
              selectedDashboardId={selectedDashboardId}
              onSelect={setSelectedDashboardId}
              isLoading={dashboardsLoading}
            />
          </div>
        )}
        {!currentStudent ? (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <UserCheck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-800">No Students Found</h2>
              <p className="text-slate-500">Add students to the {currentDashboardName} dashboard to begin scoring.</p>
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
                studentName={currentStudent?.student_name}
                studentGrade={currentStudent?.grade_level}
                evaluationDate={selectedDateYmd}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
