import { useState, useEffect, useCallback } from "react";
import { DailyEvaluation, IncidentReport, Student, Settings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Printer, Calendar, User, FileText, AlertTriangle, Download, BarChart3 } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { formatDate } from "@/utils";
import { toast } from 'sonner';
import { BEHAVIOR_SECTION_KEYS, calculateAverageFromSlots, calculateSectionAverages, getNumericSectionValues } from "@/utils/behaviorMetrics";
import { TIME_SLOTS } from "@/config/timeSlots";
import DashboardTabsBar from "@/components/dashboard/DashboardTabsBar";
import useDashboardScope from "@/hooks/useDashboardScope";
import { DEFAULT_DASHBOARD_ID } from "@/contexts/DashboardContext";
import { aiService } from "@/services/aiService";

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "thisWeek" },
  { label: "Last Week", value: "lastWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Last 7 Days", value: "last7Days" },
  { label: "Last 30 Days", value: "last30Days" },
  { label: "Custom Range", value: "custom" }
];

const REPORT_TYPES = [
  { id: "behavior", label: "Behavior Sheets", icon: FileText },
  { id: "incidents", label: "Incident Reports", icon: AlertTriangle },
  { id: "heartlandBehavior", label: "Heartland Boys Home Staff Report", icon: FileText },
  { id: "weeklyAverages", label: "Weekly End of Day Averages", icon: BarChart3 },
  { id: "dailyAverages", label: "Daily Averages Combined", icon: BarChart3 },
  { id: "hbhBestPrintout", label: "HBH BEST Print out", icon: BarChart3 }
];

const applyHeartlandRounding = (value) => {
  if (!Number.isFinite(value)) return value;
  if (value < 2) return 1;
  if (value < 3) return 2;
  if (value >= 3.5) return 4;
  const rounded = Math.round(value);
  if (rounded > 4) return 4;
  if (rounded < 1) return 1;
  return rounded;
};

export default function PrintReports() {
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
  const [settings, setSettings] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedReportTypes, setSelectedReportTypes] = useState(["behavior"]);
  const [datePreset, setDatePreset] = useState("thisWeek");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [heartlandStudentId, setHeartlandStudentId] = useState('');
  const [heartlandDate, setHeartlandDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [isPrintingHeartland, setIsPrintingHeartland] = useState(false);

  const normalizeId = useCallback((value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  }, []);

  const prepareIdForQuery = useCallback((value) => {
    const idString = normalizeId(value);
    return /^\d+$/.test(idString) ? Number(idString) : idString;
  }, [normalizeId]);

  // Initialize dates based on preset
  const initializeDates = useCallback((preset) => {
    const today = new Date();
    let start, end;

    switch (preset) {
      case "today":
        start = end = today;
        break;
      case "yesterday":
        start = end = subDays(today, 1);
        break;
      case "thisWeek":
        start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "lastWeek":
        const lastWeek = subWeeks(today, 1);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case "thisMonth":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case "last7Days":
        start = subDays(today, 6);
        end = today;
        break;
      case "last30Days":
        start = subDays(today, 29);
        end = today;
        break;
      default:
        return; // Custom range - don't auto-set dates
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let studentsData;
      let settingsData;

      try {
        [studentsData, settingsData] = await Promise.all([
          Student.filter(studentFilter, 'student_name'),
          Settings.list()
        ]);
      } catch (error) {
        const message = String(error?.message || error?.details || '').toLowerCase();
        const dashboardMissing = message.includes('dashboard') && (message.includes('not exist') || message.includes('could not find'));
        if (dashboardMissing) {
          console.warn('Student filter failed due to missing dashboard column. Retrying without dashboard scope.');
          disableDashboards();
          [studentsData, settingsData] = await Promise.all([
            Student.filter({ active: true }, 'student_name'),
            Settings.list()
          ]);
        } else {
          throw error;
        }
      }

      const safeStudents = Array.isArray(studentsData) ? studentsData : [];
      setStudents(safeStudents);
      setSettings(settingsData?.[0] || null);
      setSelectedStudents(safeStudents.map(s => s.id));
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [studentFilter, disableDashboards]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (students.length === 0) {
      setHeartlandStudentId('');
      return;
    }
    const exists = students.some(student => String(student.id) === String(heartlandStudentId));
    if (!exists) {
      setHeartlandStudentId(String(students[0].id));
    }
  }, [students, heartlandStudentId]);

  useEffect(() => {
    initializeDates(datePreset);
  }, [datePreset, initializeDates]);

  const handleStudentToggle = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const handleDeselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const handleReportTypeToggle = (reportType) => {
    setSelectedReportTypes(prev => 
      prev.includes(reportType) 
        ? prev.filter(type => type !== reportType)
        : [...prev, reportType]
    );
  };

  const generatePreview = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select a date range");
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    if (selectedReportTypes.length === 0) {
      toast.error("Please select at least one report type");
      return;
    }

    try {
      setIsGenerating(true);
      const selectedSet = new Set(selectedStudents.map(normalizeId));
      const preview = {
        dateRange: { start: startDate, end: endDate },
        students: students.filter(s => selectedSet.has(normalizeId(s.id))),
        reportTypes: selectedReportTypes,
        data: {}
      };

      // Fetch data for preview - only fetch what's actually selected
      if (selectedReportTypes.includes("behavior")) {
        const evaluations = await DailyEvaluation.filter({
          date_from: startDate,
          date_to: endDate
        });
        preview.data.evaluations = evaluations.filter(e => 
          selectedSet.has(normalizeId(e.student_id))
        );
      } else {
        // Explicitly set to null/undefined when not selected to prevent stale data
        preview.data.evaluations = null;
      }

      if (selectedReportTypes.includes("incidents")) {
        const incidents = await IncidentReport.filter({
          incident_date_from: startDate,
          incident_date_to: endDate
        });
        console.log("Raw incidents fetched:", incidents.length);
        console.log("Selected students:", selectedSet);
        preview.data.incidents = incidents.filter(i => 
          selectedSet.has(normalizeId(i.student_id))
        );
        console.log("Filtered incidents:", preview.data.incidents.length);
      } else {
        // Explicitly set to null when not selected to prevent stale data
        preview.data.incidents = null;
      }

      if (selectedReportTypes.includes("heartlandBehavior")) {
        const evaluations = await DailyEvaluation.filter({
          date_from: startDate,
          date_to: endDate
        });
        preview.data.heartlandEvaluations = evaluations.filter(e => 
          selectedSet.has(normalizeId(e.student_id))
        );
      } else {
        preview.data.heartlandEvaluations = null;
      }

      if (selectedReportTypes.includes("weeklyAverages")) {
        const evaluations = await DailyEvaluation.filter({
          date_from: startDate,
          date_to: endDate
        });
        preview.data.weeklyEvaluations = evaluations.filter(e => 
          selectedSet.has(normalizeId(e.student_id))
        );
      } else {
        preview.data.weeklyEvaluations = null;
      }

      if (selectedReportTypes.includes("dailyAverages")) {
        const evaluations = await DailyEvaluation.filter({
          date_from: startDate,
          date_to: endDate
        });
        console.log("Daily Averages - Raw evaluations:", evaluations.length);
        console.log("Daily Averages - Selected students:", selectedSet);
        preview.data.dailyAveragesEvaluations = evaluations.filter(e => 
          selectedSet.has(normalizeId(e.student_id))
        );
        console.log("Daily Averages - Filtered evaluations:", preview.data.dailyAveragesEvaluations.length);
      } else {
        preview.data.dailyAveragesEvaluations = null;
      }

      if (selectedReportTypes.includes("hbhBestPrintout")) {
        const evaluations = await DailyEvaluation.filter({
          date_from: startDate,
          date_to: endDate
        });
        console.log("HBH BEST Print out - Raw evaluations:", evaluations.length);
        console.log("HBH BEST Print out - Selected students:", selectedSet);
        preview.data.hbhBestEvaluations = evaluations.filter(e => 
          selectedSet.has(normalizeId(e.student_id))
        );
        console.log("HBH BEST Print out - Filtered evaluations:", preview.data.hbhBestEvaluations.length);
      } else {
        preview.data.hbhBestEvaluations = null;
      }

      setPreviewData(preview);
      toast.success("Preview generated successfully!");
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Failed to generate preview. Please try again.");
    }
    setIsGenerating(false);
  };

  // BEST Logo URL for print reports
  const BEST_LOGO_URL = "/best-logo.png";

  const escapeHtml = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Reusable header for Heartland staff reports
  const renderHeartlandHeader = (title, dashboardLabel) => `
    <div style="display: flex; align-items: flex-start; gap: 16px;">
      <img src="${BEST_LOGO_URL}" alt="BEST Logo" style="width: 96px; height: 96px; flex-shrink: 0;" />
      <div style="display: flex; flex-direction: column; justify-content: flex-start;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">${escapeHtml(title)}</h1>
        <div style="font-size: 12px; font-weight: 500; color: #444;">${escapeHtml(dashboardLabel || '')}</div>
      </div>
    </div>
  `;

  const formatSlotLabelForSheet = (label) => {
    if (!label) return '';
    const parts = label.split(' - ');
    if (parts.length !== 2) return label;
    const formatPart = (part) => part
      .replace('AM', 'a.m.')
      .replace('PM', 'p.m.');
    return `${formatPart(parts[0])} to ${formatPart(parts[1])}`;
  };

  const computeSlotAverage = (evaluations, slotKey) => {
    if (!Array.isArray(evaluations) || evaluations.length === 0) return '';
    const values = [];
    evaluations.forEach((evaluation) => {
      const slot = evaluation?.time_slots?.[slotKey];
      if (!slot) return;
      const slotValues = getNumericSectionValues(slot);
      if (slotValues.length > 0) {
        values.push(...slotValues);
      } else {
        const fallback = Number(slot?.rating ?? slot?.score);
        if (Number.isFinite(fallback)) {
          values.push(fallback);
        }
      }
    });

    if (values.length === 0) return '';
    const sum = values.reduce((acc, value) => acc + value, 0);
    return Math.round(sum / values.length);
  };

  const collectSlotNotes = (evaluations, slotKey) => {
    if (!Array.isArray(evaluations)) return '';
    const notes = [];
    evaluations.forEach((evaluation) => {
      const slot = evaluation?.time_slots?.[slotKey];
      if (!slot) return;
      const raw = slot?.comment ?? slot?.comments ?? slot?.notes ?? slot?.note ?? slot?.observation ?? slot?.observations;
      if (raw && `${raw}`.trim().length > 0) {
        notes.push(`${raw}`.trim());
      }
    });
    return notes.length > 0 ? notes.join(' • ') : '';
  };

  const handlePrintHeartlandSheet = useCallback(async () => {
    if (!heartlandStudentId) {
      toast.error('Select a student to print.');
      return;
    }

    const student = students.find((item) => normalizeId(item.id) === normalizeId(heartlandStudentId));
    if (!student) {
      toast.error('Selected student is not available for this dashboard.');
      return;
    }

    setIsPrintingHeartland(true);
    try {
      const response = await DailyEvaluation.filter({
        student_id: prepareIdForQuery(student.id),
        date: heartlandDate
      });

      const evaluationsList = Array.isArray(response) ? response : [];
      const latestPerDate = new Map();
      evaluationsList.forEach((evaluation) => {
        const key = `${evaluation.student_id}-${evaluation.date}`;
        const timestamp = new Date(evaluation.updated_at || evaluation.created_at || evaluation.date || heartlandDate).getTime();
        const existing = latestPerDate.get(key);
        if (!existing || timestamp >= existing.timestamp) {
          latestPerDate.set(key, { evaluation, timestamp });
        }
      });

      const evaluations = Array.from(latestPerDate.values()).map(entry => entry.evaluation);

      const formattedDate = (() => {
        try {
          return format(parseISO(heartlandDate), 'MMMM d, yyyy');
        } catch (error) {
          return heartlandDate;
        }
      })();

      const rowsHtml = TIME_SLOTS.map(slot => {
        const slotAverage = computeSlotAverage(evaluations, slot.key);
        const averageDisplay = slotAverage === '' ? '' : Math.round(Number(slotAverage));
        const notes = collectSlotNotes(evaluations, slot.key);
        return `
          <tr>
            <td class="time-cell">${escapeHtml(formatSlotLabelForSheet(slot.label))}</td>
            <td class="avg-cell">${averageDisplay || ''}</td>
            <td class="notes-cell">${escapeHtml(notes)}</td>
          </tr>`;
      }).join('');

      const generalCommentsEntry = evaluations.reduce((acc, evaluation) => {
        const comment = (evaluation?.general_comments || '').trim();
        if (!comment) return acc;
        const timestamp = new Date(evaluation.updated_at || evaluation.created_at || evaluation.date || heartlandDate).getTime();
        if (!acc || timestamp >= acc.timestamp) {
          return { value: comment, timestamp };
        }
        return acc;
      }, null);
      const generalComments = generalCommentsEntry?.value || '';

      const sheetHtml = `
        <html>
          <head>
            <title>Behavior Monitoring Schedule - ${escapeHtml(student.student_name)}</title>
            <style>
              @page { size: letter; margin: 0.75in; }
              body {
                font-family: 'Helvetica Neue', Arial, sans-serif;
                color: #111;
              }
              .sheet { width: 100%; }
              .header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
              .header img { width: 80px; height: 80px; }
              .title-block h1 { margin: 0; font-size: 24px; letter-spacing: 0.5px; }
              .meta { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 12px; padding: 8px 12px; border: 2px solid #000; }
              .meta span { font-weight: 600; margin-right: 4px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 2px solid #000; }
              th { background: #f6f7fb; text-transform: uppercase; font-size: 12px; padding: 8px; text-align: center; }
              td { font-size: 12px; padding: 10px; vertical-align: top; }
              .time-cell { width: 30%; }
              .avg-cell { width: 15%; text-align: center; font-size: 18px; font-weight: bold; }
              .notes-cell { width: 55%; }
              .rating-scale { font-size: 12px; line-height: 1.5; margin-top: 12px; }
              .comments { margin-top: 18px; font-size: 12px; }
              .comments .label { font-weight: 600; margin-bottom: 6px; }
              .comments .box { min-height: 80px; border: 2px solid #ccc; padding: 12px; background: #f7f7f7; }
            </style>
          </head>
          <body>
            <div class="sheet">
              <div style="margin-bottom: 16px;">
                ${renderHeartlandHeader('BEHAVIOR MONITORING SCHEDULE', defaultDashboardName || 'Heartland Boys Home')}
              </div>
              <div class="meta">
                <div><span>Student Name:</span> ${escapeHtml(student.student_name)}</div>
                <div><span>Date:</span> ${escapeHtml(formattedDate)}</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Overall Period Avg.</th>
                    <th>Observation / Notes / Comments</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
              <div class="rating-scale">
                <strong>BEHAVIOR RATING SCALE</strong><br/>
                4 = Exceeds expectations<br/>
                3 = Meets expectations<br/>
                2 = Needs Improvement / Does not meet expectations<br/>
                1 = Unsatisfactory Behavior
              </div>
              <div class="comments">
                <div class="label">COMMENTS:</div>
                <div class="box">${escapeHtml(generalComments) || '&nbsp;'}</div>
              </div>
            </div>
          </body>
        </html>`;

      const printWindow = window.open('', '', 'height=900,width=700');
      if (!printWindow) {
        toast.error('Unable to open print window. Check your popup blocker.');
        return;
      }
      printWindow.document.write(sheetHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        toast.success('Behavior sheet sent to printer.');
      }, 300);
    } catch (error) {
      console.error('Failed to generate Heartland sheet:', error);
      toast.error('Unable to generate the Heartland behavior sheet.');
    } finally {
      setIsPrintingHeartland(false);
    }
  }, [heartlandStudentId, heartlandDate, students, defaultDashboardName, normalizeId, prepareIdForQuery]);

  const printReports = async () => {
    if (!previewData) {
      toast.error("Please generate a preview first");
      return;
    }

    const printContent = await generatePrintContent();
    const printWindow = window.open('', '', 'height=800,width=1200');
    printWindow.document.write(`
      <html>
        <head>
          <title>Behavior Reports - ${formatDate(previewData.dateRange.start, 'MMM d')} to ${formatDate(previewData.dateRange.end, 'MMM d, yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #000; }
            .page-break { page-break-before: always; }
            .report-header { margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; padding-left: 110px; position: relative; }
            .report-logo { position: absolute; top: -10px; left: 0; width: 100px; height: 120px; }
            .report-title { font-size: 28px; font-weight: bold; margin-bottom: 8px; text-align: left; }
            .report-subtitle { font-size: 16px; color: #666; margin-bottom: 4px; text-align: left; }
            
            /* Evaluation Content Styles */
            .evaluation-content { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { border: 1px solid #000; padding: 10px; vertical-align: top; }
            th { background: #f4f4f4; text-align: center; font-weight: bold; font-size: 14px; }
            .time-cell { width: 20%; text-align: center; font-size: 13px; font-weight: 600; }
            .score-cell { width: 12%; text-align: center; font-size: 16px; font-weight: bold; }
            .comment-cell { width: 32%; font-size: 12px; line-height: 1.4; }
            
            .general-comments { margin-top: 15px; margin-bottom: 20px; padding: 10px; background: #f9f9f9; border-left: 4px solid #0066cc; }
            .scale { margin-top: 20px; padding: 15px; background: #f8f8f8; border: 1px solid #ddd; font-size: 12px; }
            .scale b { display: block; margin-bottom: 8px; font-size: 14px; }
            
            /* Incident Report Styles */
            .incident-content { margin-bottom: 20px; }
            .incident-report-full { border: 2px solid #dc2626; padding: 20px; background: #fef2f2; }
            .incident-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .incident-field { font-size: 14px; padding: 8px; background: white; border-radius: 4px; }
            .incident-field strong { display: inline-block; width: 120px; color: #dc2626; }
            
            .incident-section { margin-top: 20px; padding: 15px; background: white; border-radius: 4px; }
            .incident-section strong { color: #dc2626; font-size: 14px; margin-bottom: 8px; display: block; }
            .incident-text { font-size: 13px; line-height: 1.5; margin-top: 8px; }
            
            .no-data { text-align: center; color: #666; font-style: italic; padding: 40px; font-size: 16px; }
            
            /* Print-specific adjustments */
            @media print {
              body { margin: 0; padding: 12px; }
              .report-header { margin-bottom: 25px; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { 
      printWindow.print(); 
      printWindow.close(); 
      toast.success("Reports sent to printer!");
    }, 500);
  };

  const generateHBHBestPrintout = async (dateRange, selectedStudentData, data) => {
    if (!data.hbhBestEvaluations) return '';
    
    console.log("Generating HBH BEST Print out with", data.hbhBestEvaluations.length, "evaluations");
    
    // Group evaluations by student and calculate period averages
    const studentPeriodAverages = {};
    const studentComments = {};
    
    // Initialize data structures
    selectedStudentData.forEach(student => {
      studentPeriodAverages[student.id] = {};
      studentComments[student.id] = [];
      
      // Initialize each period with empty data
      TIME_SLOTS.forEach(slot => {
        studentPeriodAverages[student.id][slot.key] = { sum: 0, count: 0, average: 0 };
      });
    });
    
    // Process evaluations to calculate averages and collect comments
    data.hbhBestEvaluations.forEach(evaluation => {
      if (evaluation.time_slots) {
        Object.keys(evaluation.time_slots).forEach(slotKey => {
          const slotData = evaluation.time_slots[slotKey];
          if (slotData && studentPeriodAverages[evaluation.student_id] && studentPeriodAverages[evaluation.student_id][slotKey]) {
            // Get numeric values from the slot
            const numericValues = getNumericSectionValues(slotData);
            if (numericValues.length > 0) {
              const slotAverage = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
              studentPeriodAverages[evaluation.student_id][slotKey].sum += slotAverage;
              studentPeriodAverages[evaluation.student_id][slotKey].count += 1;
            }
            
            // Collect comments
            if (slotData.notes && slotData.notes.trim()) {
              studentComments[evaluation.student_id].push({
                date: evaluation.date,
                period: slotKey,
                comment: slotData.notes.trim(),
                rating: numericValues.length > 0 ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length : null
              });
            }
          }
        });
      }
      
      // Also collect general comments if they exist
      if (evaluation.general_comments && evaluation.general_comments.trim()) {
        studentComments[evaluation.student_id].push({
          date: evaluation.date,
          period: 'general',
          comment: evaluation.general_comments.trim(),
          rating: null
        });
      }
    });
    
    // Calculate final averages
    Object.keys(studentPeriodAverages).forEach(studentId => {
      TIME_SLOTS.forEach(slot => {
        const periodData = studentPeriodAverages[studentId][slot.key];
        if (periodData.count > 0) {
          periodData.average = Math.round(periodData.sum / periodData.count);
        }
      });
    });
    
    // Generate AI comment summaries for each student
    const studentAISummaries = {};
    
    // Calculate daily averages for each student first
    const studentDailyAverages = {};
    selectedStudentData.forEach(student => {
      const periodAverages = studentPeriodAverages[student.id];
      let totalSum = 0;
      let totalCount = 0;
      
      TIME_SLOTS.forEach(slot => {
        if (periodAverages[slot.key].count > 0) {
          totalSum += periodAverages[slot.key].average;
          totalCount += 1;
        }
      });
      
      studentDailyAverages[student.id] = totalCount > 0 ? Math.round(totalSum / totalCount) : 0;
    });

    // Generate AI summaries for each student
    const generateAISummariesPromises = selectedStudentData.map(async (student) => {
      const comments = studentComments[student.id];
      if (comments.length > 0) {
        try {
          // Prepare comments data for AI service
          const commentsData = comments.map(comment => ({
            content: comment.comment,
            date: comment.date,
            source: `Period ${comment.period}`,
            type: 'behavior_note',
            rating: comment.rating
          }));
          
          // Include period averages for more comprehensive AI analysis
          const periodAverages = studentPeriodAverages[student.id];
          const dailyAverage = studentDailyAverages[student.id] || 0;
          
          const aiSummary = await aiService.generateBehaviorSummary(
            commentsData,
            dateRange,
            {
              studentId: student.id,
              studentName: student.student_name,
              forceRefresh: false,
              periodAverages: periodAverages,
              dailyAverage: dailyAverage,
              reportType: 'hbh_best_printout',
              teacherName: settings?.teacher_name,
              schoolName: settings?.school_name
            }
          );
          
          studentAISummaries[student.id] = aiSummary.general_overview || 'No behavioral summary available.';
        } catch (error) {
          console.error(`Failed to generate AI summary for student ${student.student_name}:`, error);
          studentAISummaries[student.id] = comments.map(c => c.comment).join(' ').substring(0, 200) + '...';
        }
      } else {
        studentAISummaries[student.id] = 'No comments available for this period.';
      }
    });
    
    // Wait for all AI summaries to complete
    try {
      await Promise.all(generateAISummariesPromises);
    } catch (error) {
      console.error('Error generating AI summaries:', error);
    }
    

    
    const formatPeriodLabel = (slot) => {
      const parts = slot.label.split(' - ');
      if (parts.length === 2) {
        return `${parts[0]}<br/>${parts[1]}`;
      }
      return slot.label;
    };
    
    const displayValue = (value) => {
      return value > 0 ? value.toString() : 'N/A';
    };
    
    return `
      <div class="report-header">
        <img src="${BEST_LOGO_URL}" alt="BEST Logo" class="report-logo" />
        <div class="report-title">HBH BEST Print out</div>
        <div class="report-subtitle">
          ${formatDate(dateRange.start, 'EEEE, MMMM d, yyyy')} - ${formatDate(dateRange.end, 'EEEE, MMMM d, yyyy')}
        </div>
        <div class="report-subtitle">
          ${settings?.school_name || 'School'} • Generated by ${settings?.teacher_name || 'Teacher'}
        </div>
      </div>

      <div class="evaluation-content">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 10px;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 6px; background: #f4f4f4; text-align: left; font-size: 10px; width: 100px; font-weight: bold;">Student</th>
              ${TIME_SLOTS.map(slot => `
                <th style="border: 1px solid #000; padding: 4px; background: #f4f4f4; text-align: center; font-size: 9px; width: 60px; font-weight: bold; line-height: 1.1;">
                  ${formatPeriodLabel(slot)}
                </th>
              `).join('')}
              <th style="border: 1px solid #000; padding: 6px; background: #f4f4f4; text-align: center; font-size: 10px; width: 60px; font-weight: bold;">Daily<br/>Average</th>
              <th style="border: 1px solid #000; padding: 6px; background: #f4f4f4; text-align: center; font-size: 10px; width: 300px; font-weight: bold;">Comments</th>
            </tr>
          </thead>
          <tbody>
            ${selectedStudentData.map(student => {
              const periodAverages = studentPeriodAverages[student.id];
              const dailyAverage = studentDailyAverages[student.id];
              const aiSummary = studentAISummaries[student.id] || 'No summary available.';
              
              return `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; text-align: left; font-weight: 600; font-size: 10px; vertical-align: top;">${escapeHtml(student.student_name)}</td>
                  ${TIME_SLOTS.map(slot => `
                    <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 10px; vertical-align: top;">
                      ${displayValue(periodAverages[slot.key].average)}
                    </td>
                  `).join('')}
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: 600; font-size: 10px; vertical-align: top;">
                    ${displayValue(dailyAverage)}
                  </td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 9px; vertical-align: top; line-height: 1.2;">
                    ${escapeHtml(aiSummary)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="scale" style="font-size: 10px; margin-top: 15px;">
          <b>Behavior Rating Scale:</b><br/>
          <strong>4 - Exceeds Expectations:</strong> Student consistently demonstrates exceptional behavior and goes above and beyond expectations.<br/>
          <strong>3 - Meets Expectations:</strong> Student demonstrates appropriate behavior and follows guidelines consistently.<br/>
          <strong>2 - Needs Improvement:</strong> Student shows some behavioral issues that require attention and support.<br/>
          <strong>1 - Does Not Meet Expectations:</strong> Student demonstrates significant behavioral concerns requiring immediate intervention.
        </div>
      </div>`;
  };

  const generatePrintContent = async () => {
    if (!previewData) return '';

    const { dateRange, students: selectedStudentData, reportTypes, data } = previewData;
    console.log("Generating print content with reportTypes:", reportTypes);
    console.log("Available data keys:", Object.keys(data));
    console.log("data.evaluations exists:", !!data.evaluations);
    console.log("data.incidents exists:", !!data.incidents);
    
    let content = '';
    let isFirstPage = true;

    // If HBH BEST Print out is selected, only generate that report
    if (reportTypes.includes("hbhBestPrintout")) {
      return await generateHBHBestPrintout(dateRange, selectedStudentData, data);
    }

    selectedStudentData.forEach((student) => {
      let hasStudentContent = false;

      // Behavior Sheets - Each evaluation date gets its own page
      if (reportTypes.includes("behavior") && data.evaluations) {
        console.log("Processing behavior sheets for student:", student.student_name);
        const studentEvaluations = data.evaluations.filter(e => e.student_id === student.id);
        
        if (studentEvaluations.length > 0) {
          // Group evaluations by date
          const evaluationsByDate = {};
          studentEvaluations.forEach(evaluation => {
            const key = evaluation.date;
            if (!evaluationsByDate[key]) {
              evaluationsByDate[key] = [];
            }
            evaluationsByDate[key].push(evaluation);
          });

          Object.keys(evaluationsByDate).sort().forEach(date => {
            if (!isFirstPage) content += '<div class="page-break"></div>';
            isFirstPage = false;
            hasStudentContent = true;

            const dayEvaluations = evaluationsByDate[date];
            
            content += `
              <div class="report-header">
                <img src="${BEST_LOGO_URL}" alt="BEST Logo" class="report-logo" />
                <div class="report-title">Behavior Evaluation Sheet</div>
                <div class="report-subtitle">
                  ${student.student_name} • ${formatDate(date, 'EEEE, MMMM d, yyyy')}
                </div>
                <div class="report-subtitle">
                  ${settings?.school_name || 'School'} • Generated by ${settings?.teacher_name || 'Teacher'}
                </div>
              </div>

              <div class="evaluation-content">
                <table>
                  <thead>
                    <tr>
                      <th>Time Period</th>
                      <th>Adult Interaction (AI)</th>
                      <th>Peer Interaction (PI)</th>
                      <th>Classroom Expectations (CE)</th>
                      <th>Comments/Notes</th>
                    </tr>
                  </thead>
                  <tbody>`;

            // Time slots for the day
            const timeSlots = TIME_SLOTS;

            // Combine all evaluations for this date
            const combinedTimeSlots = {};
            dayEvaluations.forEach(evaluation => {
              if (evaluation.time_slots) {
                Object.keys(evaluation.time_slots).forEach(slot => {
                  if (!combinedTimeSlots[slot]) {
                    combinedTimeSlots[slot] = evaluation.time_slots[slot];
                  }
                });
              }
            });

            timeSlots.forEach(slot => {
              const slotData = combinedTimeSlots[slot.key] || {};
              const getValue = (section) => {
                const raw = slotData[section];
                if (raw !== undefined && raw !== null && `${raw}`.trim().length > 0) {
                  const value = `${raw}`.trim();
                  // Handle all possible rating values including AB and NS
                  if (['AB', 'NS', '4', '3', '2', '1'].includes(value)) {
                    return value;
                  }
                  // Handle legacy A/B format
                  if (value === 'A/B') {
                    return 'AB';
                  }
                  return value;
                }
                const fallback = typeof slotData.rating === 'number' ? slotData.rating :
                               (typeof slotData.score === 'number' ? slotData.score : '');
                return fallback !== '' ? `${fallback}` : '';
              };

              content += `
                <tr>
                  <td class="time-cell">${slot.label}</td>
                  <td class="score-cell">${getValue('ai')}</td>
                  <td class="score-cell">${getValue('pi')}</td>
                  <td class="score-cell">${getValue('ce')}</td>
                  <td class="comment-cell">${slotData.comment || slotData.notes || ''}</td>
                </tr>`;
            });

            content += `
                  </tbody>
                </table>`;

            // Add general comments if any
            const generalComments = dayEvaluations
              .map(e => e.general_comments)
              .filter(c => c && c.trim())
              .join(' • ');
            
            if (generalComments) {
              content += `<div class="general-comments"><strong>General Comments:</strong> ${generalComments}</div>`;
            }

            content += `
                <div class="scale">
                  <b>BEHAVIOR RATING SCALE</b>
                  4 = Exceeds expectations<br/>
                  3 = Meets expectations<br/>
                  2 = Needs Improvement / Work in progress<br/>
                  1 = Unsatisfactory Behavior<br/>
                  AB / NS = Program-specific codes
                </div>
              </div>`;
          });
        }
      }

      // Incident Reports - Each incident gets its own page
      if (reportTypes.includes("incidents") && data.incidents) {
        console.log("Processing incidents for student:", student.student_name);
        const studentIncidents = data.incidents.filter(i => normalizeId(i.student_id) === normalizeId(student.id));
        console.log("Student incidents found:", studentIncidents.length);
        
        if (studentIncidents.length > 0) {
          studentIncidents.forEach(incident => {
            if (!isFirstPage) content += '<div class="page-break"></div>';
            isFirstPage = false;
            hasStudentContent = true;

            content += `
              <div class="report-header">
                <img src="${BEST_LOGO_URL}" alt="BEST Logo" class="report-logo" />
                <div class="report-title">Incident Report</div>
                <div class="report-subtitle">
                  ${student.student_name} • ${formatDate(incident.incident_date, 'EEEE, MMMM d, yyyy')}
                  ${incident.incident_time ? ` at ${incident.incident_time}` : ''}
                </div>
                <div class="report-subtitle">
                  ${settings?.school_name || 'School'} • Generated by ${settings?.teacher_name || 'Teacher'}
                </div>
              </div>

              <div class="incident-content">
                <div class="incident-report-full">
                  <div class="incident-details-grid">
                    <div class="incident-field"><strong>Type:</strong> ${incident.incident_type || 'Not specified'}</div>
                    <div class="incident-field"><strong>Location:</strong> ${incident.location || 'Not specified'}</div>
                    <div class="incident-field"><strong>Severity:</strong> ${incident.severity_level || 'Not specified'}</div>
                    <div class="incident-field"><strong>Reported by:</strong> ${incident.reported_by || 'Not specified'}</div>
                  </div>
                  
                  ${incident.description ? `
                    <div class="incident-section">
                      <strong>Description:</strong><br/>
                      <div class="incident-text">${incident.description.replace(/\n/g, '<br/>')}</div>
                    </div>
                  ` : ''}
                  
                  ${incident.action_taken ? `
                    <div class="incident-section">
                      <strong>Action Taken:</strong><br/>
                      <div class="incident-text">${incident.action_taken.replace(/\n/g, '<br/>')}</div>
                    </div>
                  ` : ''}
                  
                  ${incident.follow_up_required && incident.follow_up_notes ? `
                    <div class="incident-section">
                      <strong>Follow-up Required:</strong><br/>
                      <div class="incident-text">${incident.follow_up_notes.replace(/\n/g, '<br/>')}</div>
                    </div>
                  ` : ''}
                </div>
              </div>`;
          });
        }
      }

      // Heartland Boys Home Behavior Report
      if (reportTypes.includes("heartlandBehavior") && data.heartlandEvaluations) {
        console.log("Processing Heartland behavior for student:", student.student_name);
        const studentEvaluations = data.heartlandEvaluations.filter(e => normalizeId(e.student_id) === normalizeId(student.id));
        console.log("Heartland evaluations found:", studentEvaluations.length);
        
        if (studentEvaluations.length > 0) {
          // Group evaluations by date
          const evaluationsByDate = {};
          studentEvaluations.forEach(evaluation => {
            if (!evaluationsByDate[evaluation.date]) {
              evaluationsByDate[evaluation.date] = [];
            }
            evaluationsByDate[evaluation.date].push(evaluation);
          });

          Object.keys(evaluationsByDate).sort().forEach(date => {
            if (!isFirstPage) content += '<div class="page-break"></div>';
            isFirstPage = false;
            hasStudentContent = true;

            const dayEvaluations = evaluationsByDate[date];

            const pickLatestSlotData = (slotKey) => {
              let latest = null;
              dayEvaluations.forEach(evaluation => {
                const slotData = evaluation?.time_slots?.[slotKey];
                if (!slotData) return;
                const timestamp = new Date(evaluation.updated_at || evaluation.created_at || evaluation.date || date).getTime();
                if (!latest || timestamp >= latest.timestamp) {
                  latest = {
                    data: slotData,
                    timestamp,
                    generalComments: evaluation.general_comments || ''
                  };
                }
              });
              return latest;
            };

            // Using the escapeHtml function defined earlier

            // Generate rows for time slots
            const timeSlots = TIME_SLOTS;
            const rowsHtml = timeSlots.map(slot => {
              const latest = pickLatestSlotData(slot.key);
              const slotData = latest?.data || {};
              const overall = calculateAverageFromSlots({ [slot.key]: slotData });
              let avgDisplay = '';
              if (overall.count > 0 && typeof overall.average === 'number' && !isNaN(overall.average)) {
                const rounded = applyHeartlandRounding(overall.average);
                avgDisplay = Number.isFinite(rounded) ? rounded : '';
              }
              const comment = escapeHtml(slotData.comment || '');
              return `
                <tr>
                  <td style="width: 20%; text-align: center; font-weight: 600; padding: 12px;">${escapeHtml(slot.label)}</td>
                  <td style="width: 20%; text-align: center; font-size: 16px; font-weight: bold; padding: 12px;">${avgDisplay}</td>
                  <td style="width: 60%; padding: 12px; line-height: 1.5;">${comment}</td>
                </tr>`;
            }).join('');

            // Combine general comments
            const latestGeneral = dayEvaluations.reduce((acc, evaluation) => {
              const timestamp = new Date(evaluation.updated_at || evaluation.created_at || evaluation.date || date).getTime();
              if (!acc || timestamp >= acc.timestamp) {
                return { value: evaluation.general_comments || '', timestamp };
              }
              return acc;
            }, null);
            const commentsHtml = escapeHtml(latestGeneral?.value || '');

            const formattedDate = formatDate(date, 'MMMM d, yyyy');

            content += `
              <div style="width: 8.5in; min-height: 11in; margin: 0 auto; padding: 0.5in; font-family: Arial, sans-serif; color: #000; background: white; page-break-after: always;">
                <div style="margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 15px;">
                  ${renderHeartlandHeader('BEHAVIOR MONITORING SCHEDULE', defaultDashboardName || 'Heartland Boys Home')}
                </div>
                <div style="margin-bottom: 20px; font-size: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div><span style="font-weight: bold;">Student Name:</span> ${escapeHtml(student.student_name)}</div>
                  <div><span style="font-weight: bold;">Date:</span> ${escapeHtml(formattedDate)}</div>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                  <thead>
                    <tr style="background: #f4f4f4;">
                      <th style="border: 1px solid #000; padding: 12px; text-align: center; font-weight: bold;">Time</th>
                      <th style="border: 1px solid #000; padding: 12px; text-align: center; font-weight: bold;">Overall Period Avg.</th>
                      <th style="border: 1px solid #000; padding: 12px; text-align: center; font-weight: bold;">Observation / Notes / Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
                <div style="margin-bottom: 20px; padding: 15px; background: #f8f8f8; border: 1px solid #ddd; font-size: 12px;">
                  <strong>BEHAVIOR RATING SCALE</strong><br/>
                  4 = Exceeds expectations<br/>
                  3 = Meets expectations<br/>
                  2 = Needs Improvement / Does not meet expectations<br/>
                  1 = Unsatisfactory Behavior
                </div>
                <div style="margin-top: 20px;">
                  <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">COMMENTS:</div>
                  <div style="border: 1px solid #000; min-height: 60px; padding: 10px; background: white;">${commentsHtml || '&nbsp;'}</div>
                </div>
              </div>`;
          });
        }
      }

      // Weekly End of Day Averages Report
      if (reportTypes.includes("weeklyAverages") && data.weeklyEvaluations) {
        console.log("Processing weekly averages for student:", student.student_name);
        const studentEvaluations = data.weeklyEvaluations.filter(e => normalizeId(e.student_id) === normalizeId(student.id));
        console.log("Weekly evaluations found:", studentEvaluations.length);
        
        if (studentEvaluations.length > 0) {
          if (!isFirstPage) content += '<div class="page-break"></div>';
          isFirstPage = false;
          hasStudentContent = true;

          // Group evaluations by date and calculate daily averages
          const evaluationsByDate = {};
          studentEvaluations.forEach(evaluation => {
            if (!evaluationsByDate[evaluation.date]) {
              evaluationsByDate[evaluation.date] = [];
            }
            evaluationsByDate[evaluation.date].push(evaluation);
          });

          // Calculate daily averages for each date
          const dailyAverages = [];
          Object.keys(evaluationsByDate).sort().forEach(date => {
            const dayEvaluations = evaluationsByDate[date];
            
            // Combine all time slots for this date
            const combinedTimeSlots = {};
            dayEvaluations.forEach(evaluation => {
              if (evaluation.time_slots) {
                Object.keys(evaluation.time_slots).forEach(slot => {
                  if (!combinedTimeSlots[slot]) {
                    combinedTimeSlots[slot] = evaluation.time_slots[slot];
                  }
                });
              }
            });

            // Calculate averages for this date
            const sections = calculateSectionAverages(combinedTimeSlots);
            const overall = calculateAverageFromSlots(combinedTimeSlots);

            dailyAverages.push({
              date,
              sections,
              overall,
              hasData: overall.count > 0 || BEHAVIOR_SECTION_KEYS.some(key => sections[key]?.count > 0)
            });
          });

          // Calculate overall weekly averages
          const weeklyAggregates = dailyAverages.reduce((acc, day) => {
            BEHAVIOR_SECTION_KEYS.forEach(key => {
              const section = day.sections[key];
              if (section?.count) {
                acc.sections[key].sum += section.average * section.count;
                acc.sections[key].count += section.count;
              }
            });
            if (day.overall.count) {
              acc.overall.sum += day.overall.average * day.overall.count;
              acc.overall.count += day.overall.count;
            }
            return acc;
          }, {
            sections: BEHAVIOR_SECTION_KEYS.reduce((acc, key) => {
              acc[key] = { sum: 0, count: 0 };
              return acc;
            }, {}),
            overall: { sum: 0, count: 0 }
          });

          const SECTION_LABELS = {
            ai: "Adult Interaction (AI)",
            pi: "Peer Interaction (PI)",
            ce: "Classroom Expectations (CE)"
          };

          const roundDisplay = (average, count) => {
            if (!count || Number.isNaN(average) || typeof average !== 'number') return "--";
            return average.toFixed(1);
          };

          content += `
            <div class="report-header">
              <img src="${BEST_LOGO_URL}" alt="BEST Logo" class="report-logo" />
              <div class="report-title">Weekly End of Day Averages</div>
              <div class="report-subtitle">
                ${student.student_name} • ${formatDate(dateRange.start, 'MMMM d, yyyy')} - ${formatDate(dateRange.end, 'MMMM d, yyyy')}
              </div>
              <div class="report-subtitle">
                ${settings?.school_name || 'School'} • Generated by ${settings?.teacher_name || 'Teacher'}
              </div>
            </div>

            <div class="evaluation-content">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    ${BEHAVIOR_SECTION_KEYS.map(key => `<th>${SECTION_LABELS[key]}</th>`).join('')}
                    <th>Overall Average</th>
                  </tr>
                </thead>
                <tbody>
                  ${dailyAverages.map(day => `
                    <tr>
                      <td style="text-align: left; font-weight: 600;">${formatDate(day.date, 'EEEE, MMM d')}</td>
                      ${BEHAVIOR_SECTION_KEYS.map(key => `
                        <td style="text-align: center;">${roundDisplay(day.sections[key]?.average, day.sections[key]?.count)}</td>
                      `).join('')}
                      <td style="text-align: center; font-weight: 600;">${roundDisplay(day.overall.average, day.overall.count)}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="background: #f1f5f9; font-weight: 700;">
                    <td style="text-align: left;">Weekly Average</td>
                    ${BEHAVIOR_SECTION_KEYS.map(key => {
                      const data = weeklyAggregates.sections[key];
                      const average = data.count ? (data.sum / data.count).toFixed(1) : "--";
                      return `<td style="text-align: center;">${average}</td>`;
                    }).join('')}
                    <td style="text-align: center;">${weeklyAggregates.overall.count ? (weeklyAggregates.overall.sum / weeklyAggregates.overall.count).toFixed(1) : "--"}</td>
                  </tr>
                </tfoot>
              </table>
              
              <div class="scale">
                <b>Behavior Rating Scale:</b>
                <strong>4 - Exceeds Expectations:</strong> Student consistently demonstrates exceptional behavior and goes above and beyond expectations.<br/>
                <strong>3 - Meets Expectations:</strong> Student demonstrates appropriate behavior and follows guidelines consistently.<br/>
                <strong>2 - Needs Improvement:</strong> Student shows some behavioral issues that require attention and support.<br/>
                <strong>1 - Does Not Meet Expectations:</strong> Student demonstrates significant behavioral concerns requiring immediate intervention.
              </div>
            </div>`;
        }
      }

      // Daily Averages Combined Report - will be handled after the student loop
      if (reportTypes.includes("dailyAverages") && data.dailyAveragesEvaluations) {
        // This will be handled after the student loop to create a combined table
        hasStudentContent = true;
      }

      // If no content was generated for this student, add a "no data" page
      if (!hasStudentContent) {
        if (!isFirstPage) content += '<div class="page-break"></div>';
        isFirstPage = false;

        content += `
          <div class="report-header">
            <img src="${BEST_LOGO_URL}" alt="BEST Logo" class="report-logo" />
            <div class="report-title">Student Reports</div>
            <div class="report-subtitle">
              ${student.student_name} • ${formatDate(dateRange.start, 'MMMM d, yyyy')} - ${formatDate(dateRange.end, 'MMMM d, yyyy')}
            </div>
            <div class="report-subtitle">
              ${settings?.school_name || 'School'} • Generated by ${settings?.teacher_name || 'Teacher'}
            </div>
          </div>
          <div class="no-data">No data found for this student in the selected date range</div>`;
      }
    });

    // Generate Combined Daily Averages Report (all students in one table)
    if (reportTypes.includes("dailyAverages") && data.dailyAveragesEvaluations) {
      console.log("Generating daily averages report with", data.dailyAveragesEvaluations.length, "evaluations");
      if (!isFirstPage) content += '<div class="page-break"></div>';
      
      // Group all evaluations by date and student
      const evaluationsByDateAndStudent = {};
      data.dailyAveragesEvaluations.forEach(evaluation => {
        if (!evaluationsByDateAndStudent[evaluation.date]) {
          evaluationsByDateAndStudent[evaluation.date] = {};
        }
        if (!evaluationsByDateAndStudent[evaluation.date][evaluation.student_id]) {
          evaluationsByDateAndStudent[evaluation.date][evaluation.student_id] = [];
        }
        evaluationsByDateAndStudent[evaluation.date][evaluation.student_id].push(evaluation);
      });

      console.log("Grouped evaluations by date:", Object.keys(evaluationsByDateAndStudent));

      // Get all unique dates and sort them
      const allDates = Object.keys(evaluationsByDateAndStudent).sort();
      
      // Calculate daily averages for each student on each date
      const studentDailyAverages = {};
      const studentOverallAverages = {};
      
      selectedStudentData.forEach(student => {
        studentDailyAverages[student.id] = {};
        const allStudentScores = { sections: {}, overall: { sum: 0, count: 0 } };
        
        // Initialize section accumulators
        BEHAVIOR_SECTION_KEYS.forEach(key => {
          allStudentScores.sections[key] = { sum: 0, count: 0 };
        });
        
        allDates.forEach(date => {
          const dayEvaluations = evaluationsByDateAndStudent[date]?.[student.id] || [];
          
          if (dayEvaluations.length > 0) {
            // Combine all time slots for this date
            const combinedTimeSlots = {};
            dayEvaluations.forEach(evaluation => {
              if (evaluation.time_slots) {
                Object.keys(evaluation.time_slots).forEach(slot => {
                  if (!combinedTimeSlots[slot]) {
                    combinedTimeSlots[slot] = evaluation.time_slots[slot];
                  }
                });
              }
            });

            // Calculate averages for this date
            const sections = calculateSectionAverages(combinedTimeSlots);
            const overall = calculateAverageFromSlots(combinedTimeSlots);
            
            studentDailyAverages[student.id][date] = { sections, overall };
            
            // Accumulate for overall averages
            BEHAVIOR_SECTION_KEYS.forEach(key => {
              if (sections[key]?.count > 0) {
                allStudentScores.sections[key].sum += sections[key].average * sections[key].count;
                allStudentScores.sections[key].count += sections[key].count;
              }
            });
            
            if (overall.count > 0) {
              allStudentScores.overall.sum += overall.average * overall.count;
              allStudentScores.overall.count += overall.count;
            }
          } else {
            studentDailyAverages[student.id][date] = null;
          }
        });
        
        // Calculate overall averages for this student
        studentOverallAverages[student.id] = {
          sections: {},
          overall: allStudentScores.overall.count > 0 ? 
            allStudentScores.overall.sum / allStudentScores.overall.count : 0
        };
        
        BEHAVIOR_SECTION_KEYS.forEach(key => {
          const sectionData = allStudentScores.sections[key];
          studentOverallAverages[student.id].sections[key] = sectionData.count > 0 ? 
            sectionData.sum / sectionData.count : 0;
        });
      });

      // Calculate column averages (averages for each category across all students)
      const columnAverages = {
        sections: {},
        overall: { sum: 0, count: 0 }
      };
      
      BEHAVIOR_SECTION_KEYS.forEach(key => {
        columnAverages.sections[key] = { sum: 0, count: 0 };
      });
      
      selectedStudentData.forEach(student => {
        const studentOverall = studentOverallAverages[student.id];
        
        BEHAVIOR_SECTION_KEYS.forEach(key => {
          if (studentOverall.sections[key] > 0) {
            columnAverages.sections[key].sum += studentOverall.sections[key];
            columnAverages.sections[key].count += 1;
          }
        });
        
        if (studentOverall.overall > 0) {
          columnAverages.overall.sum += studentOverall.overall;
          columnAverages.overall.count += 1;
        }
      });

      const SECTION_LABELS = {
        ai: "Adult Interaction (AI)",
        pi: "Peer Interaction (PI)",
        ce: "Classroom Expectations (CE)"
      };

      const roundDisplay = (value) => {
        if (value === null || value === undefined || Number.isNaN(value) || typeof value !== 'number') {
          return "--";
        }
        return value.toFixed(1);
      };

      // Get the weekdays (Monday-Friday) from the selected date range
      const getWeekdaysFromRange = (startDate, endDate) => {
        const days = [];
        const dayLabels = [];
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');

        const current = new Date(start);
        while (current <= end) {
          const dayOfWeek = current.getDay();
          // Only include Monday (1) through Friday (5)
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            days.push(format(current, 'yyyy-MM-dd'));
            dayLabels.push(format(current, 'EEEE')); // Full day name
          }
          current.setDate(current.getDate() + 1);
        }
        return { days, dayLabels };
      };

      const { days: weekdays, dayLabels } = getWeekdaysFromRange(dateRange.start, dateRange.end);

      content += `
        <div class="report-header">
          <img src="${BEST_LOGO_URL}" alt="BEST Logo" class="report-logo" />
          <div class="report-title">Combined Daily Averages Report</div>
          <div class="report-subtitle">
            All Students • ${formatDate(dateRange.start, 'MMMM d, yyyy')} - ${formatDate(dateRange.end, 'MMMM d, yyyy')}
          </div>
          <div class="report-subtitle">
            ${settings?.school_name || 'School'} • Generated by ${settings?.teacher_name || 'Teacher'}
          </div>
        </div>

        <div class="evaluation-content">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
            <thead>
              <tr>
                <th style="border: 1px solid #000; padding: 8px; background: #f4f4f4; text-align: left; font-size: 11px; width: 150px;">Student Name</th>
                ${dayLabels.map(day => `<th style="border: 1px solid #000; padding: 8px; background: #f4f4f4; text-align: center; font-size: 11px; width: 80px;">${day}</th>`).join('')}
                <th style="border: 1px solid #000; padding: 8px; background: #f4f4f4; text-align: center; font-size: 11px; width: 80px;">Week</th>
              </tr>
            </thead>
            <tbody>
              ${selectedStudentData.map(student => {
                const studentOverall = studentOverallAverages[student.id];

                // Calculate daily averages for each weekday
                const dailyValues = weekdays.map(date => {
                  const dayData = studentDailyAverages[student.id][date];
                  if (dayData && dayData.overall.count > 0) {
                    return dayData.overall.average;
                  }
                  return null;
                });

                return `
                  <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: left; font-weight: 600; font-size: 11px;">${student.student_name}</td>
                    ${dailyValues.map(value => `<td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 11px;">${roundDisplay(value)}</td>`).join('')}
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: 600; font-size: 11px;">${roundDisplay(studentOverall.overall)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="scale">
            <b>Behavior Rating Scale:</b>
            <strong>4 - Exceeds Expectations:</strong> Student consistently demonstrates exceptional behavior and goes above and beyond expectations.<br/>
            <strong>3 - Meets Expectations:</strong> Student demonstrates appropriate behavior and follows guidelines consistently.<br/>
            <strong>2 - Needs Improvement:</strong> Student shows some behavioral issues that require attention and support.<br/>
            <strong>1 - Does Not Meet Expectations:</strong> Student demonstrates significant behavioral concerns requiring immediate intervention.
          </div>
        </div>`;
    }



    return content;
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading print reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-2 sm:gap-3">
                <Printer className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                <span className="hidden sm:inline">Print Reports</span>
                <span className="sm:hidden">Print</span>
              </h1>
              <p className="text-slate-600 flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                Generate and print behavior sheets and incident reports for selected date ranges
              </p>
              <p className="text-slate-500 text-sm mt-1">Dashboard: {currentDashboardName}</p>
            </div>
          </div>
        </div>

        {dashboardsSupported && (
          <DashboardTabsBar
            dashboards={dashboards}
            defaultDashboardName={defaultDashboardName}
            selectedDashboardId={selectedDashboardId}
            onSelect={setSelectedDashboardId}
            isLoading={dashboardsLoading}
            className="mb-4"
          />
        )}

        {selectedDashboardId === DEFAULT_DASHBOARD_ID && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base sm:text-lg">
                <span>Heartland Boys Home Behavior Sheet</span>
                <Button
                  onClick={handlePrintHeartlandSheet}
                  disabled={!heartlandStudentId || isPrintingHeartland}
                  className="w-full sm:w-auto"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {isPrintingHeartland ? 'Generating…' : 'Print Behavior Sheet'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Student</label>
                  {students.length > 0 ? (
                    <Select
                      value={heartlandStudentId || undefined}
                      onValueChange={setHeartlandStudentId}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(student => (
                          <SelectItem key={student.id} value={String(student.id)}>
                            {student.student_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input disabled value="" placeholder="No students available" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <Input
                    type="date"
                    value={heartlandDate}
                    onChange={(event) => setHeartlandDate(event.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <p className="text-sm text-slate-500">
                The sheet pulls Quick Score time-slot averages for the selected day and rounds to whole numbers.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Date Range Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Date Range
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Quick Select</label>
                  <Select value={datePreset} onValueChange={setDatePreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map(preset => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDatePreset("custom");
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDatePreset("custom");
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Report Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {REPORT_TYPES.map(type => (
                    <div key={type.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={type.id}
                        checked={selectedReportTypes.includes(type.id)}
                        onCheckedChange={() => handleReportTypeToggle(type.id)}
                      />
                      <label htmlFor={type.id} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Student Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Students ({selectedStudents.length} of {students.length} selected)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllStudents}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllStudents}
                    >
                      Clear All
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {students.map(student => (
                    <div key={student.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => handleStudentToggle(student.id)}
                      />
                      <label 
                        htmlFor={`student-${student.id}`} 
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {student.student_name}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={generatePreview}
                  disabled={isGenerating || !startDate || !endDate || selectedStudents.length === 0}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Preview
                    </>
                  )}
                </Button>

                {previewData && (
                  <Button
                    onClick={printReports}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Reports
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Preview Summary */}
            {previewData && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Date Range:</span>
                      <span>{formatDate(previewData.dateRange.start, 'MMM d')} - {formatDate(previewData.dateRange.end, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Students:</span>
                      <span>{previewData.students.length}</span>
                    </div>
                    {previewData.reportTypes.includes("behavior") && (
                      <div className="flex justify-between">
                        <span className="font-medium">Behavior Sheets:</span>
                        <span>{previewData.data.evaluations?.length || 0} evaluations</span>
                      </div>
                    )}
                    {previewData.reportTypes.includes("incidents") && (
                      <div className="flex justify-between">
                        <span className="font-medium">Incident Reports:</span>
                        <span>{previewData.data.incidents?.length || 0} incidents</span>
                      </div>
                    )}
                    {previewData.reportTypes.includes("heartlandBehavior") && (
                      <div className="flex justify-between">
                        <span className="font-medium">Heartland Boys Home Reports:</span>
                        <span>{previewData.data.heartlandEvaluations?.length || 0} evaluations</span>
                      </div>
                    )}
                    {previewData.reportTypes.includes("weeklyAverages") && (
                      <div className="flex justify-between">
                        <span className="font-medium">Weekly Averages:</span>
                        <span>{previewData.data.weeklyEvaluations?.length || 0} evaluations</span>
                      </div>
                    )}
                    {previewData.reportTypes.includes("dailyAverages") && (
                      <div className="flex justify-between">
                        <span className="font-medium">Daily Averages Combined:</span>
                        <span>{previewData.data.dailyAveragesEvaluations?.length || 0} evaluations</span>
                      </div>
                    )}
                    {previewData.reportTypes.includes("hbhBestPrintout") && (
                      <div className="flex justify-between">
                        <span className="font-medium">HBH BEST Print out:</span>
                        <span>{previewData.data.hbhBestEvaluations?.length || 0} evaluations</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="text-xs text-slate-600">
                      <strong>Selected Students:</strong>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {previewData.students.map(student => (
                          <Badge key={student.id} variant="secondary" className="text-xs">
                            {student.student_name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
