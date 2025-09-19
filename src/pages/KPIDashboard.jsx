import { useState, useEffect, useCallback, useRef } from "react";
import { Student, DailyEvaluation, IncidentReport, BehaviorSummary, ContactLog, CreditsEarned, Settings as SettingsEntity } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Suspense, lazy } from 'react';
import { 
  Users, AlertTriangle, Star, 
  Calendar, Target, BarChart3, RefreshCw, Download, Trash2, FileText, ChevronDown
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks } from "date-fns";
import { parseYmd } from "@/utils";
import { getNumericSectionValues } from "@/utils/behaviorMetrics";
import { toast } from 'sonner';
import ClearDataDialog from "@/components/kpi/ClearDataDialog";
import { createZip } from "@/lib/zip";
import { useReactToPrint } from 'react-to-print';
import KPIPrintLayout from '@/components/print/KPIPrintLayout';

const BehaviorTrendChart = lazy(() => import('@/components/kpi/BehaviorTrendChart'));
const IncidentTypesBar = lazy(() => import('@/components/kpi/IncidentTypesBar'));
const RatingDistributionBar = lazy(() => import('@/components/kpi/RatingDistributionBar'));
const TimeSlotAnalysisBar = lazy(() => import('@/components/kpi/TimeSlotAnalysisBar'));
const WeeklyTrendsArea = lazy(() => import('@/components/kpi/WeeklyTrendsArea'));

const StudentComparisonList = lazy(() => import('@/components/kpi/StudentComparisonList'));
const TotalCreditsCard = lazy(() => import('@/components/kpi/TotalCreditsCard'));
const CreditsPerStudentChart = lazy(() => import('@/components/kpi/CreditsPerStudentChart'));
const TopStudentCredits = lazy(() => import('@/components/kpi/TopStudentCredits'));
const CreditsTimelineChart = lazy(() => import('@/components/kpi/CreditsTimelineChart'));

const INCIDENT_TYPE_COLORS = {
  "Aggressive Behavior": "#EF4444",
  "Disruptive Behavior": "#F59E0B", 
  "Destruction of Property": "#8B5CF6",
  "Cheating": "#F59E0B",
  "Refusing Redirection": "#3B82F6",
  "Property Destruction": "#8B5CF6",
  "Theft": "#EF4444"
};

export default function KPIDashboard() {
  const [students, setStudents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [behaviorSummaries, setBehaviorSummaries] = useState([]);
  const [contactLogs, setContactLogs] = useState([]);
  const [creditsEarned, setCreditsEarned] = useState([]);
  const [creditsAvailable, setCreditsAvailable] = useState(true);
  const [settings, setSettings] = useState(null);

  // New academic data states (placeholders)
  const [stepsCompleted, setStepsCompleted] = useState([]);
  const [grades, setGrades] = useState([]);
  const [gpas, setGpas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all'); // days
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);

  const printComponentRef = useRef();

  // Helper: current date in local time
  const getCurrentDate = () => new Date();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    // Load data individually to handle failures gracefully
    const loadDataSafely = async (loadFn, name) => {
      try {
        const data = await loadFn();
        return data || [];
      } catch (error) {
        console.warn(`Failed to load ${name}:`, error?.message);
        return [];
      }
    };

    try {
      const [studentsData, evaluationsData, incidentsData, summariesData, contactsData, settingsData] = await Promise.all([
        loadDataSafely(() => Student.filter({ active: true }), 'Students'),
        loadDataSafely(() => DailyEvaluation.list('date'), 'Evaluations'),
        loadDataSafely(() => IncidentReport.list('incident_date'), 'Incidents'),
        loadDataSafely(() => BehaviorSummary.list('date_from'), 'Summaries'),
        loadDataSafely(() => ContactLog.list('contact_date'), 'Contacts'),
        loadDataSafely(() => SettingsEntity.list(), 'Settings'),
      ]);

      let creditsData = [];
      try {
        creditsData = await CreditsEarned.list('date_earned');
        setCreditsAvailable(true);
      } catch (creditError) {
        const msg = creditError?.message || '';
        if (msg.includes("Could not find the table")) {
          console.warn('Credits table not found in Supabase; hiding academic credits widgets.');
        } else {
          console.warn('Failed to load Credits:', msg);
        }
        setCreditsAvailable(false);
        creditsData = [];
      }
      
      // Load new academic data (when entities are available)
      let stepsData = [], gradesData = [], gpasData = [];
      try {
        // Placeholder for when StepsCompleted entity is added
        // stepsData = await loadDataSafely(() => StepsCompleted.list('date_completed'), 'Steps');
      } catch (e) {
        console.log('StepsCompleted entity not yet available');
      }
      try {
        // Placeholder for when Grades entity is added
        // gradesData = await loadDataSafely(() => Grades.list('date_entered'), 'Grades');
      } catch (e) {
        console.log('Grades entity not yet available');
      }
      try {
        // Placeholder for when GPA entity is added
        // gpasData = await loadDataSafely(() => GPA.list('calculated_date'), 'GPAs');
      } catch (e) {
        console.log('GPA entity not yet available');
      }
      
      setStudents(studentsData);
      setEvaluations(evaluationsData);
      setIncidents(incidentsData);
      setBehaviorSummaries(summariesData);
      setContactLogs(contactsData);
      setSettings(settingsData?.[0] || null);
      setCreditsEarned(Array.isArray(creditsData) ? creditsData : []);
      setStepsCompleted(stepsData);
      setGrades(gradesData);
      setGpas(gpasData);
      
      
    } catch (error) {
      console.error("Error loading KPI data:", error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      const msg = typeof error?.message === 'string' ? error.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('row-level security')) {
        toast.error('RLS/permissions preventing reads. Apply supabase-schema.sql policies/grants in Supabase.')
      } else {
        toast.error("Failed to load KPI data: " + msg);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  

  // Filter data based on date range and selected student
  const getFilteredData = () => {
    const selectedId = selectedStudent === 'all' ? null : Number(selectedStudent);
    
    let filteredEvaluations = evaluations;
    let filteredIncidents = incidents;
    
    // Apply date filtering only if not 'all'
    if (dateRange !== 'all') {
      const daysBack = parseInt(dateRange);
      const cutoffDate = subDays(getCurrentDate(), daysBack);
      
      filteredEvaluations = evaluations.filter(evaluation => 
        parseYmd(evaluation.date) >= cutoffDate
      );
      
      filteredIncidents = incidents.filter(incident => 
        parseYmd(incident.incident_date) >= cutoffDate
      );
    }
    
    // Apply student filtering
    if (selectedId != null) {
      filteredEvaluations = filteredEvaluations.filter(evaluation => evaluation.student_id === selectedId);
      filteredIncidents = filteredIncidents.filter(incident => incident.student_id === selectedId);
    }

    return { filteredEvaluations, filteredIncidents };
  };

  // Calculate behavior ratings trend (1-4 scale where 4 = Exceeds expectations)
  const getBehaviorTrendData = () => {
    const { filteredEvaluations } = getFilteredData();
    
    let dates = [];
    if (dateRange === 'all' && filteredEvaluations.length > 0) {
      // For "all time", find actual date range of data
      const evaluationDates = filteredEvaluations.map(e => parseYmd(e.date)).filter(d => d);
      if (evaluationDates.length > 0) {
        const minDate = new Date(Math.min(...evaluationDates));
        const maxDate = new Date(Math.max(...evaluationDates));
        dates = eachDayOfInterval({ start: minDate, end: maxDate });
      }
    } else if (dateRange !== 'all') {
      // For specific date ranges, use the configured period
      const daysBack = parseInt(dateRange);
      dates = eachDayOfInterval({
        start: subDays(getCurrentDate(), daysBack - 1),
        end: getCurrentDate()
      });
    }

    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayEvaluations = filteredEvaluations.filter(evaluation => evaluation.date === dateStr);
      
      let totalRatings = 0;
      let ratingCount = 0;
      let foursCount = 0;
      let totalSlots = 0;

      dayEvaluations.forEach(evaluation => {
        if (evaluation.time_slots) {
          Object.values(evaluation.time_slots).forEach(slot => {
            const numericValues = getNumericSectionValues(slot);
            totalSlots += numericValues.length;
            numericValues.forEach(value => {
              totalRatings += value;
              ratingCount++;
              if (value === 4) {
                foursCount++;
              }
            });
          });
        }
      });

      const avgRating = ratingCount > 0 ? (totalRatings / ratingCount) : 0;
      const foursPercentage = totalSlots > 0 ? (foursCount / totalSlots) * 100 : 0;

      return {
        date: format(date, 'MMM dd'),
        fullDate: dateStr,
        avgRating: Math.round(avgRating * 100) / 100,
        smileyPercentage: Math.round(foursPercentage * 100) / 100,
        evaluationCount: dayEvaluations.length
      };
    });
  };

  // Calculate incident statistics
  const getIncidentStats = () => {
    const { filteredIncidents } = getFilteredData();
    
    // Group by incident type
    const incidentsByType = filteredIncidents.reduce((acc, incident) => {
      acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
      return acc;
    }, {});

    const total = filteredIncidents.length;
    
    return Object.entries(incidentsByType).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: INCIDENT_TYPE_COLORS[type] || '#6B7280'
    }));
  };

  // Calculate rating distribution (1s, 2s, 3s, 4s)
  const getRatingDistribution = () => {
    const { filteredEvaluations } = getFilteredData();
    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0 };
    let totalRatings = 0;

    filteredEvaluations.forEach(evaluation => {
      if (evaluation.time_slots) {
        Object.values(evaluation.time_slots).forEach(slot => {
          const numericValues = getNumericSectionValues(slot);
          numericValues.forEach(value => {
            if (value >= 1 && value <= 4) {
              distribution[value.toString()]++;
              totalRatings++;
            }
          });
        });
      }
    });

    return Object.entries(distribution).map(([rating, count]) => ({
      rating: `${rating}'s`,
      count,
      percentage: totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0
    }));
  };

  // Calculate overall KPI metrics
  const getOverallMetrics = () => {
    const { filteredEvaluations, filteredIncidents } = getFilteredData();
    
    let totalRatings = 0;
    let ratingSum = 0;
    let foursCount = 0;
    let totalSlots = 0;
    let studentsWithEvaluations = new Set();

    filteredEvaluations.forEach(evaluation => {
      studentsWithEvaluations.add(evaluation.student_id);
      if (evaluation.time_slots) {
        Object.values(evaluation.time_slots).forEach(slot => {
          const numericValues = getNumericSectionValues(slot);
          totalSlots += numericValues.length;
          numericValues.forEach(value => {
            totalRatings++;
            ratingSum += value;
            if (value === 4) {
              foursCount++;
            }
          });
        });
      }
    });

    const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
    const foursRate = totalSlots > 0 ? (foursCount / totalSlots) * 100 : 0;
    const incidentRate = studentsWithEvaluations.size > 0 ? (filteredIncidents.length / studentsWithEvaluations.size) : 0;

    return {
      avgRating: Math.round(avgRating * 100) / 100,
      smileyRate: Math.round(foursRate * 100) / 100,
      totalIncidents: filteredIncidents.length,
      incidentRate: Math.round(incidentRate * 100) / 100,
      studentsEvaluated: studentsWithEvaluations.size,
      totalEvaluations: filteredEvaluations.length
    };
  };

  // Get student performance comparison
  const getStudentComparison = () => {
    const { filteredEvaluations, filteredIncidents } = getFilteredData();

    return students.map(student => {
      const studentEvals = filteredEvaluations.filter(evaluation => evaluation.student_id === student.id);
      const studentIncidents = filteredIncidents.filter(incident => incident.student_id === student.id);

      let totalRatings = 0;
      let ratingSum = 0;
      let foursCount = 0;
      let totalSlots = 0;

      // Calculate behavioral ratings average
      studentEvals.forEach(evaluation => {
        if (evaluation.time_slots) {
          Object.values(evaluation.time_slots).forEach(slot => {
            const numericValues = getNumericSectionValues(slot);
            totalSlots += numericValues.length;
            numericValues.forEach(value => {
              totalRatings++;
              ratingSum += value;
              if (value === 4) {
                foursCount++;
              }
            });
          });
        }
      });

      // Initialize academic metrics (to be populated when academic data is available)
      let academicMetrics = [];
      let academicSum = 0;
      let academicCount = 0;

      // TODO: Include GPA data when GPA entity is implemented
      // const studentGPA = await GPA.filter({ student_id: student.id });
      // if (studentGPA.length > 0) {
      //   const avgGPA = studentGPA.reduce((sum, gpa) => sum + gpa.gpa_value, 0) / studentGPA.length;
      //   const normalizedGPA = (avgGPA / 4) * 4; // Convert 0-4 GPA scale to 0-4 rating scale
      //   academicMetrics.push(normalizedGPA);
      //   academicSum += normalizedGPA;
      //   academicCount++;
      // }

      // TODO: Include grades data when Grades entity is implemented
      // const studentGrades = await Grades.filter({ student_id: student.id });
      // if (studentGrades.length > 0) {
      //   const avgGrade = studentGrades.reduce((sum, grade) => sum + (grade.grade_value / 100) * 4, 0) / studentGrades.length;
      //   academicMetrics.push(avgGrade);
      //   academicSum += avgGrade;
      //   academicCount++;
      // }

      // TODO: Include steps data when StepsCompleted entity is implemented
      // const studentSteps = await StepsCompleted.filter({ student_id: student.id });
      // if (studentSteps.length > 0) {
      //   const avgSteps = studentSteps.reduce((sum, steps) => sum + Math.min(steps.steps_count / 10000, 1) * 4, 0) / studentSteps.length;
      //   academicMetrics.push(avgSteps);
      //   academicSum += avgSteps;
      //   academicCount++;
      // }

      // Calculate combined average (behavioral + academic)
      const behavioralAvg = totalRatings > 0 ? ratingSum / totalRatings : 0;
      const academicAvg = academicCount > 0 ? academicSum / academicCount : 0;

      // Weight behavioral ratings at 70% and academic at 30% (adjustable)
      const combinedAvg = totalRatings > 0 || academicCount > 0 ?
        (behavioralAvg * 0.7) + (academicAvg * 0.3) : 0;

      const foursRate = totalSlots > 0 ? (foursCount / totalSlots) * 100 : 0;

      return {
        name: student.student_name,
        avgRating: Math.round(combinedAvg * 100) / 100,
        behavioralAvg: Math.round(behavioralAvg * 100) / 100,
        academicAvg: Math.round(academicAvg * 100) / 100,
        smileyRate: Math.round(foursRate * 100) / 100,
        incidents: studentIncidents.length,
        evaluations: studentEvals.length,
        academicMetrics: academicCount
      };
    }).filter(student => student.evaluations > 0 || student.academicMetrics > 0); // Show students with any data
  };

  // Get time slot performance analysis
  const getTimeSlotAnalysis = () => {
    const { filteredEvaluations } = getFilteredData();
    const timeSlots = ['8:30', '9:10', '9:50', '10:30', '11:10', '1:10', '1:50', '2:30'];
    
    return timeSlots.map(slot => {
      let totalRatings = 0;
      let ratingSum = 0;
      let foursCount = 0;
      let entryCount = 0;

      filteredEvaluations.forEach(evaluation => {
        if (evaluation.time_slots && evaluation.time_slots[slot]) {
          const slotData = evaluation.time_slots[slot];
          const numericValues = getNumericSectionValues(slotData);
          entryCount += numericValues.length;
          numericValues.forEach(value => {
            totalRatings++;
            ratingSum += value;
            if (value === 4) {
              foursCount++;
            }
          });
        }
      });

      const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
      const foursRate = entryCount > 0 ? (foursCount / entryCount) * 100 : 0;

      return {
        timeSlot: slot,
        avgRating: Math.round(avgRating * 100) / 100,
        smileyRate: Math.round(foursRate * 100) / 100,
        evaluationCount: entryCount
      };
    });
  };

  // Get weekly progress trends respecting the selected date range
  const getWeeklyTrends = () => {
    const { filteredEvaluations } = getFilteredData();

    // Determine weekly range to cover
    let rangeStart = null;
    let rangeEnd = null;

    if (dateRange === 'all') {
      const evalDates = filteredEvaluations.map(e => parseYmd(e.date)).filter(Boolean);
      if (evalDates.length === 0) return [];
      rangeStart = startOfWeek(new Date(Math.min(...evalDates)));
      rangeEnd = endOfWeek(new Date(Math.max(...evalDates)));
    } else {
      const daysBack = parseInt(dateRange);
      const end = getCurrentDate();
      const start = subDays(end, daysBack - 1);
      rangeStart = startOfWeek(start);
      rangeEnd = endOfWeek(end);
    }

    const weeks = [];
    for (let ws = rangeStart; ws <= rangeEnd; ws = addWeeks(ws, 1)) {
      const weekStart = ws;
      const weekEnd = endOfWeek(weekStart);

      const weekEvals = filteredEvaluations.filter(evaluation => {
        const evalDate = parseYmd(evaluation.date);
        return evalDate >= weekStart && evalDate <= weekEnd;
      });

      let totalRatings = 0;
      let ratingSum = 0;
      let foursCount = 0;
      let totalSlots = 0;

      weekEvals.forEach(evaluation => {
        if (evaluation.time_slots) {
          Object.values(evaluation.time_slots).forEach(slot => {
            const numericValues = getNumericSectionValues(slot);
            totalSlots += numericValues.length;
            numericValues.forEach(value => {
              totalRatings++;
              ratingSum += value;
              if (value === 4) {
                foursCount++;
              }
            });
          });
        }
      });

      const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
      const foursRate = totalSlots > 0 ? (foursCount / totalSlots) * 100 : 0;

      weeks.push({
        week: `Week of ${format(weekStart, 'MMM dd')}`,
        avgRating: Math.round(avgRating * 100) / 100,
        smileyRate: Math.round(foursRate * 100) / 100,
        evaluations: weekEvals.length
      });
    }

    return weeks;
  };

  // Export KPI data as CSV
  const exportKPIData = () => {
    const data = {
      overallMetrics,
      behaviorTrendData: getBehaviorTrendData(),
      incidentStats: getIncidentStats(),
      ratingDistribution: getRatingDistribution(),
      studentComparison: getStudentComparison(),
      timeSlotAnalysis: getTimeSlotAnalysis(),
      weeklyTrends: getWeeklyTrends(),
      // New academic KPIs
      stepsSummary,
      gradesSummary,
      gpaSummary,
      studentImprovementStatus,
      exportDate: getCurrentDate().toISOString(),
      dateRange,
      selectedStudent: selectedStudent === 'all' ? 'All Students' : students.find(s => s.id === selectedStudent)?.student_name
    };

    const csvContent = [
      'KPI Dashboard Export',
      `Export Date: ${format(getCurrentDate(), 'yyyy-MM-dd HH:mm:ss')}`,
      `Date Range: Last ${dateRange} days`,
      `Student Filter: ${data.selectedStudent}`,
      '',
      'Overall Metrics:',
      `Average Rating: ${overallMetrics.avgRating}/4`,
      `4's Rate: ${overallMetrics.smileyRate}%`,
      `Total Incidents: ${overallMetrics.totalIncidents}`,
      `Students Tracked: ${overallMetrics.studentsEvaluated}`,
      `Total Evaluations: ${overallMetrics.totalEvaluations}`,
      '',
      'Academic KPIs:',
      `Total Steps: ${stepsSummary.totalSteps}`,
      `Average Steps per Student: ${stepsSummary.avgStepsPerStudent}`,
      `Average GPA: ${gpaSummary.avgGPA}`,
      `Total Grades: ${gradesSummary.totalGrades}`,
      `Average Grade: ${gradesSummary.avgGrade}`,
      '',
      'Student Improvement Status:',
      `Needs Improvement: ${studentImprovementStatus.improvementCategories.needsImprovement}`,
      `Average: ${studentImprovementStatus.improvementCategories.average}`,
      `Excellent: ${studentImprovementStatus.improvementCategories.excellent}`,
      `Outstanding: ${studentImprovementStatus.improvementCategories.outstanding}`,
      `Steps Exceeds: ${studentImprovementStatus.stepsCategories.exceeds}`,
      `Steps Meets: ${studentImprovementStatus.stepsCategories.meets}`,
      `Steps Needs Work: ${studentImprovementStatus.stepsCategories.needsWork}`,
      `Fast Credit Earners: ${studentImprovementStatus.creditsPerformance.fastEarners}`,
      '',
      'Student Performance:',
      'Name,Avg Rating,4\'s Rate %,Incidents,Evaluations',
      ...studentComparison.map(s => `${s.name},${s.avgRating},${s.smileyRate},${s.incidents},${s.evaluations}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-dashboard-${format(getCurrentDate(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('KPI data exported successfully!');
  };

  // Export all raw rows zipped (evaluations, incidents, contact logs, credits, active students)
const exportAllCSVs = async () => {
    let start, end;
    if (dateRange === 'all') {
      // For all time, use a very early start date and current end date
      start = '2020-01-01'; // Far back date to include all data
      end = format(getCurrentDate(), 'yyyy-MM-dd');
    } else {
      start = format(subDays(getCurrentDate(), parseInt(dateRange) - 1), 'yyyy-MM-dd');
      end = format(getCurrentDate(), 'yyyy-MM-dd');
    }
    const files = [];

    try {
      // Evaluations
      {
        const rows = await DailyEvaluation.filter({ date_from: start, date_to: end })
        const headers = ['id','student_id','date','teacher_name','school','time_slots','general_comments']
        const csv = [headers.join(',')]
        rows.forEach(r => csv.push([
          r.id, r.student_id, r.date, r.teacher_name ?? '', r.school ?? '', JSON.stringify(r.time_slots ?? {}), (r.general_comments ?? '').replaceAll('\n',' ')
        ].map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')))
        files.push({ name: `evaluations-${start}_to_${end}.csv`, data: csv.join('\n') })
      }
      // Incidents
      {
        const rows = await IncidentReport.filter({ incident_date_from: start, incident_date_to: end })
        const headers = ['id','student_id','incident_date','incident_time','location','incident_type','severity_level','description','action_taken','reported_by','follow_up_required','follow_up_notes']
        const csv = [headers.join(',')]
        rows.forEach(r => csv.push([
          r.id, r.student_id, r.incident_date, r.incident_time ?? '', r.location ?? '', r.incident_type ?? '', r.severity_level ?? '', (r.description ?? '').replaceAll('\n',' '), r.action_taken ?? '', r.reported_by ?? '', r.follow_up_required ?? false, (r.follow_up_notes ?? '').replaceAll('\n',' ')
        ].map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')))
        files.push({ name: `incidents-${start}_to_${end}.csv`, data: csv.join('\n') })
      }
      // Contact Logs
      {
        const rows = await ContactLog.filter({ contact_date_from: start, contact_date_to: end })
        const headers = ['id','student_id','contact_date','contact_person_name','contact_category','purpose_of_contact','outcome_of_contact']
        const csv = [headers.join(',')]
        rows.forEach(r => csv.push([
          r.id, r.student_id, r.contact_date, r.contact_person_name ?? '', r.contact_category ?? '', (r.purpose_of_contact ?? '').replaceAll('\n',' '), (r.outcome_of_contact ?? '').replaceAll('\n',' ')
        ].map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')))
        files.push({ name: `contact-logs-${start}_to_${end}.csv`, data: csv.join('\n') })
      }
      // Credits earned (if available)
      if (creditsAvailable) {
        try {
          const rows = await CreditsEarned.list('date_earned');
          const startDate = parseYmd(start);
          const endDate = parseYmd(end);
          const filteredRows = Array.isArray(rows)
            ? rows.filter(r => {
                const earnedDate = parseYmd(r.date_earned);
                return earnedDate >= startDate && earnedDate <= endDate;
              })
            : [];
          if (filteredRows.length > 0) {
            const headers = ['id','student_id','course_name','credit_value','date_earned','grade'];
            const csv = [headers.join(',')];
            filteredRows.forEach(r => csv.push([
              r.id,
              r.student_id,
              r.course_name ?? '',
              r.credit_value ?? 0,
              r.date_earned ?? '',
              r.grade ?? ''
            ].map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')));
            files.push({ name: `credits-earned-${start}_to_${end}.csv`, data: csv.join('\n') });
          }
        } catch (creditExportError) {
          console.warn('Skipping credits export:', creditExportError?.message || creditExportError);
        }
      }
      // Active students
      {
        const rows = await Student.filter({ active: true })
        const headers = ['id','student_name','grade_level','teacher_name','active']
        const csv = [headers.join(',')]
        rows.forEach(r => csv.push([
          r.id, r.student_name ?? '', r.grade_level ?? '', r.teacher_name ?? '', r.active ?? true
        ].map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')))
        files.push({ name: 'students-active.csv', data: csv.join('\n') })
      }
      // Zip and download
      const zipBlob = await createZip(files);
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url; a.download = `export-${start}_to_${end}.zip`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Exported ZIP with evaluations, incidents, contact logs, and active students');
    } catch (e) {
      console.error('Export all failed', e);
      toast.error('Failed to export all CSVs');
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printComponentRef.current,
    documentTitle: `KPI-Dashboard-${format(new Date(), 'yyyy-MM-dd')}`,
    onAfterPrint: () => toast.success('PDF export prepared successfully!'),
  });

  const exportKPIToPDF = async () => {
    handlePrint();
  };

  // Clear all data
  const clearAllData = async () => {
    try {
      setIsLoading(true);
      
      // Clear all data entities
      await Promise.all([
        DailyEvaluation.clearAll(),
        IncidentReport.clearAll(),
        BehaviorSummary.clearAll(),
        ContactLog.clearAll()
      ]);
      
      // Reload data to refresh the UI
      await loadData();
      
      toast.success('All data has been cleared successfully!');
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Failed to clear data. Please try again.");
      setIsLoading(false);
    }
  };

  // Get data count for the clear dialog
  const getDataCount = () => ({
    evaluations: evaluations.length,
    incidents: incidents.length,
    summaries: behaviorSummaries.length,
    contacts: contactLogs.length
  });

  const behaviorTrendData = getBehaviorTrendData();
  const incidentStats = getIncidentStats();
  const ratingDistribution = getRatingDistribution();
  const overallMetrics = getOverallMetrics();
  const studentComparison = getStudentComparison();
  const timeSlotAnalysis = getTimeSlotAnalysis();
  const weeklyTrends = getWeeklyTrends();
  const activeStudentsCount = students.length;

  // Credits processing functions
  const getCreditsData = () => {
    const selectedId = selectedStudent === 'all' ? null : Number(selectedStudent);
    const sourceCredits = Array.isArray(creditsEarned) ? creditsEarned : [];
    let filteredCredits = [...sourceCredits];
    
    // Apply date filtering only if not 'all'
    if (dateRange !== 'all') {
      const daysBack = parseInt(dateRange);
      const cutoffDate = subDays(getCurrentDate(), daysBack);
      
      filteredCredits = filteredCredits.filter(credit => 
        parseYmd(credit.date_earned) >= cutoffDate
      );
    }
    
    // Apply student filtering
    if (selectedId != null) {
      filteredCredits = filteredCredits.filter(credit => credit.student_id === selectedId);
    }

    return filteredCredits;
  };

  const getTotalCreditsData = () => {
    const filteredCredits = getCreditsData();
    const totalCredits = filteredCredits.reduce((sum, credit) => sum + (credit.credit_value || 0), 0);
    const studentsWithCredits = new Set(filteredCredits.map(credit => credit.student_id)).size;
    const avgCreditsPerStudent = studentsWithCredits > 0 ? Math.round((totalCredits / studentsWithCredits) * 100) / 100 : 0;

    return {
      totalCredits: Math.round(totalCredits * 100) / 100,
      totalStudents: studentsWithCredits,
      avgCreditsPerStudent
    };
  };

  const getCreditsPerStudentData = () => {
    const filteredCredits = getCreditsData();
    
    const studentCreditsMap = {};
    filteredCredits.forEach(credit => {
      if (!studentCreditsMap[credit.student_id]) {
        const student = students.find(s => s.id === credit.student_id);
        if (student) {
          studentCreditsMap[credit.student_id] = {
            studentId: credit.student_id,
            fullName: student.student_name,
            initials: student.student_name.split(' ').map(n => n[0]).join(''),
            grade: student.grade_level,
            credits: 0,
            courses: 0
          };
        }
      }
      if (studentCreditsMap[credit.student_id]) {
        studentCreditsMap[credit.student_id].credits += credit.credit_value || 0;
        studentCreditsMap[credit.student_id].courses += 1;
      }
    });

    return Object.values(studentCreditsMap).map(student => ({
      ...student,
      credits: Math.round(student.credits * 100) / 100
    }));
  };

  const getTopStudentCreditsData = () => {
    const creditsPerStudent = getCreditsPerStudentData();
    
    return creditsPerStudent.map(student => {
      const studentCredits = getCreditsData().filter(credit => credit.student_id === student.studentId);
      const recentCredit = studentCredits.sort((a, b) => new Date(b.date_earned) - new Date(a.date_earned))[0];
      
      return {
        ...student,
        recentCourse: recentCredit?.course_name
      };
    });
  };

  const getCreditsTimelineData = () => {
    const filteredCredits = getCreditsData();
    
    // Group credits by month
    const monthlyCredits = {};
    let cumulativeTotal = 0;
    
    filteredCredits
      .sort((a, b) => new Date(a.date_earned) - new Date(b.date_earned))
      .forEach(credit => {
        const date = new Date(credit.date_earned);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMM yyyy');
        
        if (!monthlyCredits[monthKey]) {
          monthlyCredits[monthKey] = {
            period: monthLabel,
            creditsEarned: 0,
            cumulative: 0
          };
        }
        
        monthlyCredits[monthKey].creditsEarned += credit.credit_value || 0;
      });

    // Calculate cumulative totals
    return Object.keys(monthlyCredits)
      .sort()
      .map(monthKey => {
        cumulativeTotal += monthlyCredits[monthKey].creditsEarned;
        return {
          ...monthlyCredits[monthKey],
          creditsEarned: Math.round(monthlyCredits[monthKey].creditsEarned * 100) / 100,
          cumulative: Math.round(cumulativeTotal * 100) / 100
        };
      });
  };

  // Get processed credits data
  const totalCreditsData = getTotalCreditsData();
  const creditsPerStudentData = getCreditsPerStudentData();
  const topStudentCreditsData = getTopStudentCreditsData();
  const creditsTimelineData = getCreditsTimelineData();

  // Academic KPI functions
  const getStepsData = () => {
    const selectedId = selectedStudent === 'all' ? null : Number(selectedStudent);
    
    let filteredSteps = stepsCompleted;
    
    // Apply date filtering only if not 'all'
    if (dateRange !== 'all') {
      const daysBack = parseInt(dateRange);
      const cutoffDate = subDays(getCurrentDate(), daysBack);
      
      filteredSteps = stepsCompleted.filter(step => 
        parseYmd(step.date_completed) >= cutoffDate
      );
    }
    
    // Apply student filtering
    if (selectedId != null) {
      filteredSteps = filteredSteps.filter(step => step.student_id === selectedId);
    }

    return filteredSteps;
  };

  const getStepsSummary = () => {
    const filteredSteps = getStepsData();
    const totalSteps = filteredSteps.reduce((sum, step) => sum + (step.steps_count || 0), 0);
    const studentsWithSteps = new Set(filteredSteps.map(step => step.student_id)).size;
    const avgStepsPerStudent = studentsWithSteps > 0 ? Math.round((totalSteps / studentsWithSteps) * 100) / 100 : 0;

    return {
      totalSteps: Math.round(totalSteps * 100) / 100,
      totalStudents: studentsWithSteps,
      avgStepsPerStudent
    };
  };

  const getGradesData = () => {
    const selectedId = selectedStudent === 'all' ? null : Number(selectedStudent);
    
    let filteredGrades = grades;
    
    // Apply date filtering only if not 'all'
    if (dateRange !== 'all') {
      const daysBack = parseInt(dateRange);
      const cutoffDate = subDays(getCurrentDate(), daysBack);
      
      filteredGrades = grades.filter(grade => 
        parseYmd(grade.date_entered) >= cutoffDate
      );
    }
    
    // Apply student filtering
    if (selectedId != null) {
      filteredGrades = filteredGrades.filter(grade => grade.student_id === selectedId);
    }

    return filteredGrades;
  };

  const getGradesSummary = () => {
    const filteredGrades = getGradesData();
    const totalGrades = filteredGrades.length;
    const avgGrade = totalGrades > 0 ? 
      filteredGrades.reduce((sum, grade) => sum + (grade.grade_value || 0), 0) / totalGrades : 0;
    const studentsWithGrades = new Set(filteredGrades.map(grade => grade.student_id)).size;

    return {
      totalGrades,
      avgGrade: Math.round(avgGrade * 100) / 100,
      totalStudents: studentsWithGrades
    };
  };

  const getGPASummary = () => {
    const selectedId = selectedStudent === 'all' ? null : Number(selectedStudent);
    
    let filteredGPAs = gpas;
    
    // Apply student filtering
    if (selectedId != null) {
      filteredGPAs = gpas.filter(gpa => gpa.student_id === selectedId);
    }

    const totalGPAs = filteredGPAs.length;
    const avgGPA = totalGPAs > 0 ? 
      filteredGPAs.reduce((sum, gpa) => sum + (gpa.gpa_value || 0), 0) / totalGPAs : 0;

    return {
      totalGPAs,
      avgGPA: Math.round(avgGPA * 100) / 100
    };
  };

  const getStudentImprovementStatus = () => {
    // This will combine GPA, steps, credits, and grades to determine improvement status
    const studentComparison = getStudentComparison();
    const creditsData = getCreditsPerStudentData();

    // Use behavior ratings as proxy for GPA categories until GPA entity is available
    const improvementCategories = {
      needsImprovement: 0, // GPA <= 2.4 (proxy: avg rating < 2.5)
      average: 0, // GPA 2.5-3.0 (proxy: avg rating 2.5-3.0)
      excellent: 0, // GPA 3.1-3.5 (proxy: avg rating 3.0-3.5)
      outstanding: 0 // GPA 3.6-4.0 (proxy: avg rating > 3.5)
    };

    studentComparison.forEach(student => {
      if (student.avgRating < 2.5) improvementCategories.needsImprovement++;
      else if (student.avgRating <= 3.0) improvementCategories.average++;
      else if (student.avgRating <= 3.5) improvementCategories.excellent++;
      else improvementCategories.outstanding++;
    });

    // Steps categories - placeholder until steps entity is available
    const stepsCategories = {
      exceeds: 0, // >=16 steps
      meets: 0, // 15 steps
      needsWork: 0 // <10 steps
    };

    // For now, use 4's rate as proxy for steps performance
    studentComparison.forEach(student => {
      if (student.smileyRate >= 30) stepsCategories.exceeds++; // High 4's rate = exceeds
      else if (student.smileyRate >= 20) stepsCategories.meets++; // Medium 4's rate = meets
      else stepsCategories.needsWork++; // Low 4's rate = needs work
    });

    // Credits performance - students earning credits quickly
    const creditsPerformance = {
      fastEarners: creditsData.filter(student => student.credits > 5).length // More than 5 credits = fast earner
    };

    return {
      improvementCategories,
      stepsCategories,
      creditsPerformance
    };
  };

  // Get processed academic data
  const stepsSummary = getStepsSummary();
  const gradesSummary = getGradesSummary();
  const gpaSummary = getGPASummary();
  const studentImprovementStatus = getStudentImprovementStatus();

  // Export only the Student Performance Overview section as CSV
  const exportStudentPerformanceCSV = () => {
    const headers = ['Name','Combined Avg Rating','Behavioral Avg','Academic Avg','4\'s Rate %','Incidents','Evaluations','Academic Metrics'];
    const rows = studentComparison.map(s => [s.name, s.avgRating, s.behavioralAvg || 0, s.academicAvg || 0, s.smileyRate, s.incidents, s.evaluations, s.academicMetrics || 0]);
    const csv = [headers.join(',')]
      .concat(rows.map(r => r.map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-performance-${format(getCurrentDate(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Student Performance exported successfully!');
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading KPI Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 bg-slate-50 min-h-screen">
      <div style={{ display: 'none' }}>
      <KPIPrintLayout 
        ref={printComponentRef} 
        data={{
          overallMetrics,
          studentComparison,
            ratingDistribution,
            incidentStats,
            timeSlotAnalysis,
            weeklyTrends,
            studentImprovementStatus,
            stepsSummary,
            gradesSummary,
          gpaSummary
        }}
        schoolName={settings?.school_name || 'B.E.S.T. Education'}
        dateRange={dateRange === 'all' ? 'All Time' : `Last ${dateRange} days`}
      />
      </div>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-2 sm:gap-3">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                <span>KPI Dashboard</span>
              </h1>
              <p className="text-slate-600 flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Evidence-based insights and performance metrics</span>
                <span className="sm:hidden">Performance insights</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              {/* Direct PDF Export Button */}
              <Button 
                onClick={exportKPIToPDF} 
                variant="default" 
                className="h-10 sm:h-auto bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export PDF Report</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              

              
              {/* Other Export Options Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 sm:h-auto">
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">More Exports</span>
                    <span className="sm:hidden">More</span>
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={exportEnhancedCSVHandler}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Enhanced CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportKPIData}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Basic CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportAllCSVs}>
                    <Download className="w-4 h-4 mr-2" />
                    Export All Data (ZIP)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                onClick={() => setShowClearDataDialog(true)} 
                variant="outline" 
                className="h-10 sm:h-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Clear Data</span>
                <span className="sm:hidden">Clear</span>
              </Button>
              <Button onClick={loadData} variant="outline" disabled={isLoading} className="h-10 sm:h-auto">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="h-10 sm:h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 6 months</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Student Filter</label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="h-10 sm:h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.student_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallMetrics.avgRating}/4</div>
              <p className="text-xs text-muted-foreground">
                From {overallMetrics.totalEvaluations} evaluations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">4's Rate</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallMetrics.smileyRate}%</div>
              <p className="text-xs text-muted-foreground">
                Exceeds expectations rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallMetrics.totalIncidents}</div>
              <p className="text-xs text-muted-foreground">
                {overallMetrics.incidentRate} per student avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students Tracked / Active</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallMetrics.studentsEvaluated} / {activeStudentsCount}</div>
              <p className="text-xs text-muted-foreground">
                Tracked in range / Active total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Behavior Trend Line Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Behavior Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-sm text-slate-500">Loading chart...</div>}>
                <BehaviorTrendChart data={behaviorTrendData} />
              </Suspense>
            </CardContent>
          </Card>

          {/* Incident Types Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Incident Types Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-sm text-slate-500">Loading chart...</div>}>
                <IncidentTypesBar data={incidentStats} />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution and Student Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Rating Distribution Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-sm text-slate-500">Loading chart...</div>}>
                <RatingDistributionBar data={ratingDistribution} />
              </Suspense>
            </CardContent>
          </Card>

          {/* Student Performance Comparison */}
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Student Performance Overview</CardTitle>
              <Button onClick={exportStudentPerformanceCSV} variant="outline" className="h-9">
                <Download className="w-4 h-4 mr-2" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-sm text-slate-500">Loading...</div>}>
                <StudentComparisonList data={studentComparison} />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Time Slot Analysis and Weekly Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Time Slot Performance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Performance by Time of Day</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-sm text-slate-500">Loading chart...</div>}>
                <TimeSlotAnalysisBar data={timeSlotAnalysis} />
              </Suspense>
            </CardContent>
          </Card>

          {/* Weekly Progress Trends */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Weekly Progress Trends</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-sm text-slate-500">Loading chart...</div>}>
                <WeeklyTrendsArea data={weeklyTrends} />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Progress Dashboard Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Progress Dashboard</h2>

          {creditsAvailable ? (
            <>
              {/* Credits Overview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                {/* Total Credits Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">Credits Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <Suspense fallback={<div className="h-[200px] flex items-center justify-center text-sm text-slate-500">Loading...</div>}>
                      <TotalCreditsCard data={totalCreditsData} />
                    </Suspense>
                  </CardContent>
                </Card>

                {/* Top Student Credits */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <Suspense fallback={<div className="h-[200px] flex items-center justify-center text-sm text-slate-500">Loading...</div>}>
                      <TopStudentCredits data={topStudentCreditsData} />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>

              {/* Credits Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Credits per Student Chart */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">Credits by Student</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-sm text-slate-500">Loading chart...</div>}>
                      <CreditsPerStudentChart data={creditsPerStudentData} />
                    </Suspense>
                  </CardContent>
                </Card>

                {/* Credits Timeline Chart */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">Credits Over Time</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-sm text-slate-500">Loading chart...</div>}>
                      <CreditsTimelineChart data={creditsTimelineData} />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="p-6 text-sm text-slate-600">
                Academic credit tracking is unavailable because the Supabase table `credits_earned` could not be reached. Run the statements in `supabase-schema.sql` to create the table or re-enable access when ready.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Academic Performance KPIs */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Academic Performance KPIs</h2>
          
          {/* Academic Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {/* Steps Completed Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Steps Completed</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="text-2xl font-bold text-blue-600">{stepsSummary.totalSteps || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Avg {stepsSummary.avgStepsPerStudent || 0} per student
                </p>
              </CardContent>
            </Card>

            {/* GPA Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Average GPA</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="text-2xl font-bold text-green-600">{gpaSummary.avgGPA || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">
                  From {gpaSummary.totalGPAs || 0} GPA records
                </p>
              </CardContent>
            </Card>

            {/* Grades Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Grades Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="text-2xl font-bold text-purple-600">{gradesSummary.avgGrade || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">
                  From {gradesSummary.totalGrades || 0} grade entries
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Student Improvement Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Student Improvement Status</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-4">
                <div className="text-sm text-slate-600 mb-4">
                  Based on GPA, steps completed, credits earned, and grades:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-900 text-sm">Needs Improvement</h4>
                    <p className="text-xs text-red-700 mt-1">GPA ≤ 2.4</p>
                    <div className="text-lg font-bold text-red-600 mt-2">{studentImprovementStatus.improvementCategories.needsImprovement}</div>
                    <p className="text-xs text-red-600">Students</p>
                  </div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 text-sm">Average</h4>
                    <p className="text-xs text-yellow-700 mt-1">GPA 2.5 - 3.0</p>
                    <div className="text-lg font-bold text-yellow-600 mt-2">{studentImprovementStatus.improvementCategories.average}</div>
                    <p className="text-xs text-yellow-600">Students</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 text-sm">Excellent</h4>
                    <p className="text-xs text-blue-700 mt-1">GPA 3.1 - 3.5</p>
                    <div className="text-lg font-bold text-blue-600 mt-2">{studentImprovementStatus.improvementCategories.excellent}</div>
                    <p className="text-xs text-blue-600">Students</p>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-900 text-sm">Outstanding</h4>
                    <p className="text-xs text-green-700 mt-1">GPA 3.6 - 4.0</p>
                    <div className="text-lg font-bold text-green-600 mt-2">{studentImprovementStatus.improvementCategories.outstanding}</div>
                    <p className="text-xs text-green-600">Students</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 text-sm mb-2">Steps Performance</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="text-center">
                      <div className="font-medium text-green-700">Exceeds (≥16)</div>
                      <div className="text-lg font-bold text-green-600">{studentImprovementStatus.stepsCategories.exceeds}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-blue-700">Meets (15)</div>
                      <div className="text-lg font-bold text-blue-600">{studentImprovementStatus.stepsCategories.meets}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-red-700">Needs Work (&lt;10)</div>
                      <div className="text-lg font-bold text-red-600">{studentImprovementStatus.stepsCategories.needsWork}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 text-sm mb-2">Credits Performance</h4>
                  <p className="text-xs text-slate-600">Credits earned quickly highlight excellent progress</p>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Fast Earners:</span> {studentImprovementStatus.creditsPerformance.fastEarners} students
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Additional Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Behavior Trends</h4>
                <p className="text-sm text-blue-800">
                  {overallMetrics.avgRating >= 3 ? 
                    "Overall behavior is trending positively. Continue current strategies." :
                    "Behavior scores indicate need for intervention strategies."
                  }
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Recognition Rate</h4>
                <p className="text-sm text-green-800">
                  {overallMetrics.smileyRate >= 20 ? 
                    "Good positive reinforcement rate. Students are receiving recognition." :
                    "Consider increasing positive behavior recognition opportunities."
                  }
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-900 mb-2">Incident Prevention</h4>
                <p className="text-sm text-orange-800">
                  {overallMetrics.totalIncidents === 0 ? 
                    "Excellent! No incidents recorded in this period." :
                    `${overallMetrics.totalIncidents} incidents recorded. Review patterns for prevention strategies.`
                  }
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Data Quality</h4>
                <p className="text-sm text-purple-800">
                  {overallMetrics.totalEvaluations >= (overallMetrics.studentsEvaluated * parseInt(dateRange) * 0.8) ? 
                    "Good data coverage for reliable insights." :
                    "Consider increasing evaluation frequency for better insights."
                  }
                </p>
              </div>
            </div>

            {/* Action Items */}
            <div className="mt-6 p-4 bg-slate-100 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-3">Recommended Action Items</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-slate-800 mb-2">🎯 Focus Areas</h5>
                  <ul className="text-sm text-slate-700 space-y-1">
                    {overallMetrics.avgRating < 3 && <li>• Implement targeted behavior interventions</li>}
                    {overallMetrics.smileyRate < 20 && <li>• Increase positive reinforcement strategies</li>}
                    {overallMetrics.totalIncidents > 0 && <li>• Review incident patterns for prevention</li>}
                    {timeSlotAnalysis.some(slot => slot.avgRating < 2.5) && <li>• Address challenging time periods</li>}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-slate-800 mb-2">📈 Celebrate Successes</h5>
                  <ul className="text-sm text-slate-700 space-y-1">
                    {overallMetrics.avgRating >= 3.5 && <li>• Excellent overall behavior ratings!</li>}
                    {overallMetrics.smileyRate >= 30 && <li>• High positive recognition rate!</li>}
                    {overallMetrics.totalIncidents === 0 && <li>• Zero incidents - great classroom management!</li>}
                    {studentComparison.filter(s => s.avgRating >= 3.5).length > 0 && 
                      <li>• {studentComparison.filter(s => s.avgRating >= 3.5).length} students showing excellent progress!</li>}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clear Data Dialog */}
        <ClearDataDialog
          open={showClearDataDialog}
          onOpenChange={setShowClearDataDialog}
          onClearData={clearAllData}
          dataCount={getDataCount()}
        />
      </div>
    </div>
  );
}
