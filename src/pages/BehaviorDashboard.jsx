import { useState, useEffect, useCallback } from "react";
import { Student, DailyEvaluation, Settings, IncidentReport } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, X, CheckSquare, Calendar, RotateCcw, Edit, Eye, User, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Toaster, toast } from 'sonner';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import AddStudentDialog from "../components/behavior/AddStudentDialog";
import EditStudentDialog from "../components/behavior/EditStudentDialog";
import DeleteConfirmationDialog from "../components/behavior/DeleteConfirmationDialog";
import PrintAllDialog from "../components/behavior/PrintAllDialog";
import ResetDialog from "../components/behavior/ResetDialog";
import PrintDialog from "../components/behavior/PrintDialog";
import PrintBehaviorSummariesDialog from "../components/behavior/PrintBehaviorSummariesDialog";
import IncidentReportDialog from "../components/behavior/IncidentReportDialog";
import RealTimeSync from "../components/sync/RealTimeSync";

export default function BehaviorDashboard() {
  const [students, setStudents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentToPrint, setStudentToPrint] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showPrintSummariesDialog, setShowPrintSummariesDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showIncidentReportDialog, setShowIncidentReportDialog] = useState(false);
  const [incidentStudent, setIncidentStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selection, setSelection] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [studentsData, evaluationsData, settingsData] = await Promise.all([
        Student.filter({ active: true }, 'student_name').catch(() => []),
        DailyEvaluation.filter({ date: today }).catch(() => []),
        Settings.list().catch(() => [])
      ]);
      
      setStudents(studentsData || []);
      setEvaluations(evaluationsData || []);
      setSettings(settingsData?.[0] || null);
      
    } catch (error) { 
      console.error("Error loading data:", error);
      toast.error("Failed to load data. Please try refreshing the page.");
    } finally {
      setIsLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addStudent = async (studentData) => { 
    try {
      await Student.create(studentData); 
      await loadData(); 
      toast.success("Student added successfully!");
    } catch (error) {
      console.error("Error adding student:", error);
      const msg = typeof error?.message === 'string' ? error.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('row-level security')) {
        toast.error('Insert blocked by RLS. Apply supabase-schema.sql policies/grants in Supabase.')
      } else if (msg.toLowerCase().includes('permission') || error?.code === '42501') {
        toast.error('Permission denied. Check RLS policies for anon role in Supabase.')
      } else {
        toast.error("Failed to add student.");
      }
    }
  };
  
  const updateStudent = async (studentId, studentData) => { 
    try {
      await Student.update(studentId, studentData); 
      await loadData(); 
      toast.success("Student updated successfully!");
    } catch (error) {
      console.error("Error updating student:", error);
      const msg = typeof error?.message === 'string' ? error.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('row-level security')) {
        toast.error('Update blocked by RLS. Apply supabase-schema.sql policies/grants in Supabase.')
      } else if (msg.toLowerCase().includes('permission') || error?.code === '42501') {
        toast.error('Permission denied. Check RLS policies for anon role in Supabase.')
      } else {
        toast.error("Failed to update student.");
      }
    }
  };

  const handleSelectStudent = (studentId) => {
    setSelection(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };
  
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelection(students.map(s => s.id));
    } else {
      setSelection([]);
    }
  };

  const handleDeleteSelected = async () => {
    setShowDeleteConfirm(false);
    try {
      const evalsToDeletePromises = selection.map(id => DailyEvaluation.filter({ student_id: id }));
      const evalsToDeleteNested = await Promise.all(evalsToDeletePromises);
      const evalsToDelete = evalsToDeleteNested.flat();
      if(evalsToDelete.length > 0) await Promise.all(evalsToDelete.map(e => DailyEvaluation.delete(e.id)));
      await Promise.all(selection.map(id => Student.update(id, { active: false })));
      toast.success(`${selection.length} student(s) made inactive.`);
      setSelection([]);
      setIsSelectMode(false);
      await loadData();
    } catch (error) { 
      console.error("Error deleting students:", error);
      const msg = typeof error?.message === 'string' ? error.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('row-level security')) {
        toast.error('Update blocked by RLS. Apply supabase-schema.sql policies/grants in Supabase.')
      } else if (msg.toLowerCase().includes('permission') || error?.code === '42501') {
        toast.error('Permission denied. Check RLS policies for anon role in Supabase.')
      } else {
        toast.error("Failed to update students."); 
      }
    }
  };
  
  const getStudentEvaluation = (studentId) => evaluations.find(e => e.student_id === studentId);
  const todayEvaluations = students.filter(s => getStudentEvaluation(s.id));

  const handleSaveIncidentReport = async (reportData) => {
    try {
      await IncidentReport.create(reportData);
      toast.success("Incident report saved successfully!");
    } catch (error) {
      console.error("Error saving incident report:", error);
      throw error;
    }
  };

  const handleOpenIncidentReport = (student) => {
    setIncidentStudent(student);
    setShowIncidentReportDialog(true);
  };

  const calculateMetrics = (evaluation) => {
    if (!evaluation || !evaluation.time_slots) {
      return { completedSlots: 0, totalSlots: 9, averageScore: 0, status: "Not Started" };
    }
    const slots = evaluation.time_slots;
    const ratedSlots = Object.values(slots).filter(slot => slot && typeof slot.rating === 'number');
    const completedCount = Object.values(slots).filter(slot => slot && (slot.rating || slot.status)).length;
    const totalSlots = 9;
    
    if (ratedSlots.length === 0) {
      return { completedSlots: completedCount, totalSlots, averageScore: 0, status: completedCount > 0 ? "In Progress" : "Not Started" };
    }
    const sum = ratedSlots.reduce((acc, slot) => acc + slot.rating, 0);
    const average = sum / ratedSlots.length;
    const status = completedCount === totalSlots ? "Completed" : "In Progress";
    return { completedSlots: completedCount, totalSlots, averageScore: average, status };
  };
  
  const statusColors = {
    "Not Started": "bg-slate-100 text-slate-600",
    "In Progress": "bg-blue-100 text-blue-700",
    "Completed": "bg-green-100 text-green-700",
  };

  const handlePrintStudent = (student) => {
    const evaluation = getStudentEvaluation(student.id);
    setStudentToPrint({ student, evaluation });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-10 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Behavior Dashboard</h1>
              <p className="text-slate-600 flex items-center gap-2"><Calendar className="w-5 h-5" /> {format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
          <Card className="shadow-xl border-slate-200 bg-white/80">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading dashboard data...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-10 bg-slate-50 min-h-screen">
      <Toaster richColors />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-6 md:mb-8 lg:mb-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">Behavior Dashboard</h1>
                <RealTimeSync />
              </div>
              <p className="text-slate-600 flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" /> 
                <span className="hidden sm:inline">{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
                <span className="sm:hidden">{format(new Date(), 'MMM d, yyyy')}</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3">
             {!isSelectMode ? (
              <>
                {todayEvaluations.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowResetDialog(true)} 
                    className="justify-center border-orange-300 text-orange-600 hover:bg-orange-50 h-10 sm:h-11 text-sm sm:text-base"
                  >
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> 
                    <span className="hidden sm:inline">Reset Day</span>
                    <span className="sm:hidden">Reset</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setShowPrintSummariesDialog(true)} 
                  className="justify-center border-purple-300 text-purple-600 hover:bg-purple-50 h-10 sm:h-11 text-sm sm:text-base"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> 
                  <span className="hidden sm:inline">Print Summaries</span>
                  <span className="sm:hidden">Summaries</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPrintDialog(true)} 
                  disabled={todayEvaluations.length === 0} 
                  className="justify-center border-slate-300 hover:bg-slate-50 h-10 sm:h-11 text-sm sm:text-base"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> 
                  <span className="hidden sm:inline">Print All ({todayEvaluations.length})</span>
                  <span className="sm:hidden">Print ({todayEvaluations.length})</span>
                </Button>
                <Button 
                  onClick={() => setIsSelectMode(true)} 
                  className="justify-center bg-yellow-500 hover:bg-yellow-600 h-10 sm:h-11 text-sm sm:text-base"
                >
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> 
                  Select
                </Button>
                <Button 
                  onClick={() => setShowAddDialog(true)} 
                  className="justify-center bg-blue-600 hover:bg-blue-700 h-10 sm:h-11 text-sm sm:text-base sm:col-span-2 lg:col-span-1"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> 
                  <span className="hidden sm:inline">Add Student</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteConfirm(true)} 
                  disabled={selection.length === 0} 
                  className="justify-center h-10 sm:h-11 text-sm sm:text-base"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> 
                  Inactivate ({selection.length})
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => { setIsSelectMode(false); setSelection([]); }} 
                  className="justify-center h-10 sm:h-11 text-sm sm:text-base"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> 
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="shadow-xl border-slate-200 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
             {students.length === 0 ? (
                <div className="text-center py-20 px-6"><h2 className="text-2xl font-semibold text-slate-700">No Active Students</h2><p className="text-slate-500 mt-2">Click “Add Student” to get started.</p></div>
              ) : (
                <>
                {/* Mobile Card View */}
                <div className="md:hidden">
                  {isSelectMode && (
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Checkbox 
                            onCheckedChange={handleSelectAll} 
                            checked={selection.length === students.length && students.length > 0} 
                          />
                          Select All ({students.length})
                        </label>
                        <span className="text-sm text-slate-500">{selection.length} selected</span>
                      </div>
                    </div>
                  )}
                  <div className="divide-y divide-slate-200">
                    {students.map(student => {
                      const evaluation = getStudentEvaluation(student.id);
                      const metrics = calculateMetrics(evaluation);
                      const hasEvaluation = !!evaluation;
                      return (
                        <div key={student.id} className={`p-4 ${selection.includes(student.id) ? 'bg-blue-50' : ''}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              {isSelectMode && (
                                <Checkbox 
                                  checked={selection.includes(student.id)} 
                                  onCheckedChange={() => handleSelectStudent(student.id)} 
                                />
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg">{student.student_name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={`${statusColors[metrics.status]} font-medium text-xs`}>
                                    {metrics.status}
                                  </Badge>
                                  <span className="text-sm font-bold text-slate-800">
                                    {metrics.averageScore > 0 ? `${metrics.averageScore.toFixed(1)}/4` : 'No Score'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                              <span>Progress</span>
                              <span>{metrics.completedSlots}/{metrics.totalSlots} slots</span>
                            </div>
                            <Progress value={(metrics.completedSlots / metrics.totalSlots) * 100} className="h-2" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <Link to={createPageUrl(`StudentProfile?id=${student.id}`)}>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  Profile
                                </Button>
                              </Link>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-3 text-xs" 
                                onClick={() => handlePrintStudent(student)}
                                disabled={!hasEvaluation}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800" 
                                onClick={() => setEditingStudent(student)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700" 
                                onClick={() => handleOpenIncidentReport(student)}
                              >
                                <AlertTriangle className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop Table View */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      {isSelectMode && <TableHead className="w-12"><Checkbox onCheckedChange={handleSelectAll} checked={selection.length === students.length && students.length > 0} /></TableHead>}
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[200px]">Progress</TableHead>
                      <TableHead>Avg. Score</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(student => {
                       const evaluation = getStudentEvaluation(student.id);
                       const metrics = calculateMetrics(evaluation);
                       const hasEvaluation = !!evaluation;
                       return (
                        <TableRow key={student.id} data-state={selection.includes(student.id) ? 'selected' : ''}>
                          {isSelectMode && <TableCell><Checkbox checked={selection.includes(student.id)} onCheckedChange={() => handleSelectStudent(student.id)} /></TableCell>}
                          <TableCell className="font-medium text-slate-900">{student.student_name}</TableCell>
                          <TableCell><Badge className={`${statusColors[metrics.status]} font-semibold`}>{metrics.status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                                <Progress value={(metrics.completedSlots / metrics.totalSlots) * 100} className="w-24 h-2" />
                                <span className="text-sm text-slate-500">{metrics.completedSlots}/{metrics.totalSlots}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-800 text-base">{metrics.averageScore > 0 ? metrics.averageScore.toFixed(2) : 'N/A'}</TableCell>
                          <TableCell className="text-right">
                             <div className="flex gap-1 justify-end">
                                <Link to={createPageUrl(`StudentProfile?id=${student.id}`)}>
                                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800"><User className="h-4 w-4" /></Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-slate-500 hover:text-slate-800" 
                                  onClick={() => handlePrintStudent(student)}
                                  disabled={!hasEvaluation}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50" 
                                  onClick={() => handleOpenIncidentReport(student)}
                                  title="Create Incident Report"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800" onClick={() => setEditingStudent(student)}><Edit className="h-4 w-4" /></Button>
                                <Link to={createPageUrl(`StudentEvaluation?studentId=${student.id}&date=${today}`)}>
                                    <Button size="sm" className="w-28" variant={hasEvaluation ? 'outline' : 'default'}>{hasEvaluation ? 'Continue' : 'Start'}</Button>
                                </Link>
                             </div>
                          </TableCell>
                        </TableRow>
                       )
                    })}
                  </TableBody>
                </Table>
                
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-200">
                    {students.map(student => {
                        const evaluation = getStudentEvaluation(student.id);
                        const metrics = calculateMetrics(evaluation);
                        const hasEvaluation = !!evaluation;
                        return (
                            <div key={student.id} className={`p-4 ${selection.includes(student.id) ? 'bg-blue-50' : ''}`}>
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex items-start gap-3 flex-grow">
                                        {isSelectMode && (
                                            <Checkbox 
                                                className="w-5 h-5 mt-1" 
                                                checked={selection.includes(student.id)} 
                                                onCheckedChange={() => handleSelectStudent(student.id)} 
                                            />
                                        )}
                                        <div className="flex-grow">
                                            <p className="font-bold text-slate-900">{student.student_name}</p>
                                            <Badge className={`${statusColors[metrics.status]} font-semibold mt-1`}>{metrics.status}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5">
                                        <Link to={createPageUrl(`StudentProfile?id=${student.id}`)}>
                                            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500"><User className="h-4 w-4" /></Button>
                                        </Link>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="w-8 h-8 text-slate-500" 
                                          onClick={() => handlePrintStudent(student)}
                                          disabled={!hasEvaluation}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50" 
                                          onClick={() => handleOpenIncidentReport(student)}
                                          title="Create Incident Report"
                                        >
                                          <AlertTriangle className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500" onClick={() => setEditingStudent(student)}><Edit className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <div className="flex justify-between text-sm text-slate-600 mb-1"><span>Progress</span><span>{metrics.completedSlots}/{metrics.totalSlots}</span></div>
                                        <Progress value={(metrics.completedSlots / metrics.totalSlots) * 100} className="h-2" />
                                    </div>
                                     <div>
                                        <p className="text-sm text-slate-600">Avg. Score</p>
                                        <p className="font-bold text-slate-800 text-lg">{metrics.averageScore > 0 ? metrics.averageScore.toFixed(2) : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Link to={createPageUrl(`StudentEvaluation?studentId=${student.id}&date=${today}`)}>
                                        <Button className="w-full" variant={hasEvaluation ? 'outline' : 'default'}>{hasEvaluation ? 'Continue Evaluation' : 'Start Evaluation'}</Button>
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
                </>
              )}
          </CardContent>
        </Card>
      </div>

      <AddStudentDialog open={showAddDialog} onOpenChange={setShowAddDialog} onAddStudent={addStudent} />
      {editingStudent && <EditStudentDialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)} student={editingStudent} onUpdateStudent={updateStudent} />}
      <DeleteConfirmationDialog 
        open={showDeleteConfirm} 
        onOpenChange={setShowDeleteConfirm} 
        onConfirm={handleDeleteSelected} 
        count={selection.length}
        actionText="inactivate"
        description={`This will mark ${selection.length} student(s) as inactive. They will be hidden from the dashboard but their data will be retained.`}
      />
      <PrintAllDialog open={showPrintDialog} onOpenChange={setShowPrintDialog} students={todayEvaluations} evaluations={evaluations} settings={settings} date={today} />
      {studentToPrint && (
        <PrintDialog 
          open={!!studentToPrint} 
          onOpenChange={() => setStudentToPrint(null)} 
          student={studentToPrint.student} 
          evaluation={studentToPrint.evaluation} 
          settings={settings} 
          date={today} 
        />
      )}
      <ResetDialog open={showResetDialog} onOpenChange={setShowResetDialog} onConfirm={async () => { await Promise.all(todayEvaluations.map(s => DailyEvaluation.delete(getStudentEvaluation(s.id).id))); await loadData(); }} count={todayEvaluations.length} />
      <PrintBehaviorSummariesDialog open={showPrintSummariesDialog} onOpenChange={setShowPrintSummariesDialog} students={students} settings={settings} />
      <IncidentReportDialog 
        open={showIncidentReportDialog} 
        onOpenChange={setShowIncidentReportDialog} 
        student={incidentStudent} 
        settings={settings} 
        onSave={handleSaveIncidentReport} 
      />
    </div>
  );
}
