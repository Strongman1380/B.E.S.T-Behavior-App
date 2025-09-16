import { useState, useEffect, useCallback } from "react";
import { Student, DailyEvaluation, IncidentReport, BehaviorSummary, ContactLog } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Suspense, lazy } from 'react';
import { 
  Users, AlertTriangle, Star, 
  Calendar, Target, BarChart3, RefreshCw, Download, Trash2
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks } from "date-fns";
import { parseYmd } from "@/utils";
import { toast } from 'sonner';
import ClearDataDialog from "@/components/kpi/ClearDataDialog";
import { createZip } from "@/lib/zip";

const BehaviorTrendChart = lazy(() => import('@/components/kpi/BehaviorTrendChart'));
const IncidentTypesBar = lazy(() => import('@/components/kpi/IncidentTypesBar'));
const RatingDistributionPie = lazy(() => import('@/components/kpi/RatingDistributionPie'));
const TimeSlotAnalysisBar = lazy(() => import('@/components/kpi/TimeSlotAnalysisBar'));
const WeeklyTrendsArea = lazy(() => import('@/components/kpi/WeeklyTrendsArea'));

const StudentComparisonList = lazy(() => import('@/components/kpi/StudentComparisonList'));

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
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all'); // days
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);

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
      const [studentsData, evaluationsData, incidentsData, summariesData, contactsData] = await Promise.all([
        loadDataSafely(() => Student.filter({ active: true }), 'Students'),
        loadDataSafely(() => DailyEvaluation.list('date'), 'Evaluations'),
        loadDataSafely(() => IncidentReport.list('incident_date'), 'Incidents'),
        loadDataSafely(() => BehaviorSummary.list('date_from'), 'Summaries'),
        loadDataSafely(() => ContactLog.list('contact_date'), 'Contacts'),
        
      ]);
      

      
      setStudents(studentsData);
      setEvaluations(evaluationsData);
      setIncidents(incidentsData);
      setBehaviorSummaries(summariesData);
      setContactLogs(contactsData);
      
      
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
            totalSlots++;
            if (slot.rating) {
              totalRatings += slot.rating;
              ratingCount++;
              if (slot.rating === 4) {
                foursCount++;
              }
            }
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
          if (slot.rating) {
            distribution[slot.rating.toString()]++;
            totalRatings++;
          }
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
          totalSlots++;
          if (slot.rating) {
            totalRatings++;
            ratingSum += slot.rating;
            if (slot.rating === 4) {
              foursCount++;
            }
          }
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

      studentEvals.forEach(evaluation => {
        if (evaluation.time_slots) {
          Object.values(evaluation.time_slots).forEach(slot => {
            totalSlots++;
            if (slot.rating) {
              totalRatings++;
              ratingSum += slot.rating;
              if (slot.rating === 4) {
                foursCount++;
              }
            }
          });
        }
      });

      const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
      const foursRate = totalSlots > 0 ? (foursCount / totalSlots) * 100 : 0;

      return {
        name: student.student_name,
        avgRating: Math.round(avgRating * 100) / 100,
        smileyRate: Math.round(foursRate * 100) / 100,
        incidents: studentIncidents.length,
        evaluations: studentEvals.length
      };
    }).filter(student => student.evaluations > 0); // Only show students with data
  };

  // Get time slot performance analysis
  const getTimeSlotAnalysis = () => {
    const { filteredEvaluations } = getFilteredData();
    const timeSlots = ['8:30', '9:10', '9:50', '10:30', '11:10', '1:10', '1:50', '2:30'];
    
    return timeSlots.map(slot => {
      let totalRatings = 0;
      let ratingSum = 0;
      let foursCount = 0;
      let evaluationCount = 0;

      filteredEvaluations.forEach(evaluation => {
        if (evaluation.time_slots && evaluation.time_slots[slot]) {
          evaluationCount++;
          const slotData = evaluation.time_slots[slot];
          if (slotData.rating) {
            totalRatings++;
            ratingSum += slotData.rating;
            if (slotData.rating === 4) {
              foursCount++;
            }
          }
        }
      });

      const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
      const foursRate = evaluationCount > 0 ? (foursCount / evaluationCount) * 100 : 0;

      return {
        timeSlot: slot,
        avgRating: Math.round(avgRating * 100) / 100,
        smileyRate: Math.round(foursRate * 100) / 100,
        evaluationCount
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
            totalSlots++;
            if (slot.rating) {
              totalRatings++;
              ratingSum += slot.rating;
              if (slot.rating === 4) {
                foursCount++;
              }
            }
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

  // Export all raw rows zipped (evaluations, incidents, contact logs, active students)
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
  // Grades trend per day; 'all' plots one line per student, otherwise single student line
  const getGradesTrend = () => {
    const daysBack = parseInt(dateRange);
    const dates = eachDayOfInterval({ start: subDays(getCurrentDate(), daysBack - 1), end: getCurrentDate() });
    const dayKeys = dates.map(d => ({ key: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM dd') }));
    const inRange = (g) => {
      const createdDay = (g.created_at || '').slice(0, 10);
      return createdDay >= dayKeys[0].key && createdDay <= dayKeys[dayKeys.length - 1].key;
    };
    const filtered = grades.filter(inRange);

    const selectedId = selectedStudent === 'all' ? null : Number(selectedStudent);
    if (selectedId != null) {
      const sid = selectedId;
      const rows = dayKeys.map(({ key, label }) => {
        const dayGrades = filtered.filter(g => g.student_id === sid && (g.created_at || '').slice(0,10) === key);
        const avg = dayGrades.length ? dayGrades.reduce((a, b) => a + Number(b.percentage || 0), 0) / dayGrades.length : null;
        return { date: label, value: avg };
      });
      return { data: rows, seriesKeys: ['value'] };
    }

    const nameById = Object.fromEntries(students.map(s => [s.id, s.student_name]));
    const seriesKeys = students.map(s => nameById[s.id]).filter(Boolean);
    const rows = dayKeys.map(({ key, label }) => {
      const row = { date: label };
      students.forEach(s => {
        const dayGrades = filtered.filter(g => g.student_id === s.id && (g.created_at || '').slice(0,10) === key);
        const avg = dayGrades.length ? dayGrades.reduce((a, b) => a + Number(b.percentage || 0), 0) / dayGrades.length : null;
        row[nameById[s.id]] = avg;
      });
      return row;
    });
    return { data: rows, seriesKeys };
  };

  const gradesTrend = getGradesTrend();
  const activeStudentsCount = students.length;

  // Export only the Student Performance Overview section as CSV
  const exportStudentPerformanceCSV = () => {
    const headers = ['Name','Avg Rating','4\'s Rate %','Incidents','Evaluations'];
    const rows = studentComparison.map(s => [s.name, s.avgRating, s.smileyRate, s.incidents, s.evaluations]);
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
    <div className="p-3 sm:p-4 md:p-6 lg:p-10 bg-slate-50 min-h-screen">
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
              <Button onClick={exportKPIData} variant="outline" className="h-10 sm:h-auto">
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export Data</span>
                <span className="sm:hidden">Export</span>
              </Button>
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

        {/* Grades Trend */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Grades Over Time {selectedStudent === 'all' ? '(All Students)' : ''}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-sm text-slate-500">Loading chart...</div>}>
                <GradesLineChart data={gradesTrend.data} seriesKeys={gradesTrend.seriesKeys} />
              </Suspense>
            </CardContent>
          </Card>
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
          {/* Rating Distribution Pie Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-sm text-slate-500">Loading chart...</div>}>
                <RatingDistributionPie data={ratingDistribution} />
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

        {/* Additional KPI Insights */}
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
