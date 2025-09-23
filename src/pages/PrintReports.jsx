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
import { BEHAVIOR_SECTION_KEYS, calculateAverageFromSlots, calculateSectionAverages } from "@/utils/behaviorMetrics";
import { TIME_SLOTS } from "@/config/timeSlots";

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
  { id: "weeklyBehavior", label: "Weekly Behavior Tracking", icon: Calendar },
  { id: "weeklyAverages", label: "Weekly End of Day Averages", icon: BarChart3 },
  { id: "dailyAverages", label: "Daily Averages Combined", icon: BarChart3 }
];

export default function PrintReports() {
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
    try {
      setIsLoading(true);
      const [studentsData, settingsData] = await Promise.all([
        Student.filter({ active: true }, 'student_name'),
        Settings.list()
      ]);
      
      setStudents(studentsData);
      setSettings(settingsData[0] || null);
      
      // Select all students by default
      setSelectedStudents(studentsData.map(s => s.id));
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data. Please try again.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      const selectedSet = new Set(selectedStudents.map(id => Number(id)));
      const preview = {
        dateRange: { start: startDate, end: endDate },
        students: students.filter(s => selectedSet.has(Number(s.id))),
        reportTypes: selectedReportTypes,
        data: {}
      };

      // Fetch data for preview
      if (selectedReportTypes.includes("behavior")) {
        const evaluations = await DailyEvaluation.filter({
          date_from: startDate,
          date_to: endDate
        });
        preview.data.evaluations = evaluations.filter(e => 
          selectedSet.has(Number(e.student_id))
        );
      }

      if (selectedReportTypes.includes("incidents")) {
        const incidents = await IncidentReport.filter({
          incident_date_from: startDate,
          incident_date_to: endDate
        });
        console.log("Raw incidents fetched:", incidents.length);
        console.log("Selected students:", selectedSet);
        preview.data.incidents = incidents.filter(i => 
          selectedSet.has(Number(i.student_id))
        );
        console.log("Filtered incidents:", preview.data.incidents.length);
      }

      if (selectedReportTypes.includes("weeklyAverages")) {
        const evaluations = await DailyEvaluation.filter({
          date_from: startDate,
          date_to: endDate
        });
        preview.data.weeklyEvaluations = evaluations.filter(e => 
          selectedSet.has(Number(e.student_id))
        );
      }

      if (selectedReportTypes.includes("dailyAverages")) {
        const evaluations = await DailyEvaluation.filter({
          date_from: startDate,
          date_to: endDate
        });
        console.log("Daily Averages - Raw evaluations:", evaluations.length);
        console.log("Daily Averages - Selected students:", selectedSet);
        preview.data.dailyAveragesEvaluations = evaluations.filter(e => 
          selectedSet.has(Number(e.student_id))
        );
        console.log("Daily Averages - Filtered evaluations:", preview.data.dailyAveragesEvaluations.length);
      }

      if (selectedReportTypes.includes("weeklyBehavior")) {
        const evaluations = await DailyEvaluation.filter({
          date_from: startDate,
          date_to: endDate
        });
        preview.data.weeklyBehaviorEvaluations = evaluations.filter(e => 
          selectedSet.has(Number(e.student_id))
        );
      }

      setPreviewData(preview);
      toast.success("Preview generated successfully!");
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Failed to generate preview. Please try again.");
    }
    setIsGenerating(false);
  };

  // BEST Logo as base64 data URL for print reports
  const BEST_LOGO_DATA_URL = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="bestIconTitle">
  <title id="bestIconTitle">BEST Hub icon</title>
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f3f8ff" />
      <stop offset="100%" stop-color="#dff3ff" />
    </linearGradient>
    <linearGradient id="textStroke" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f6db4" />
      <stop offset="100%" stop-color="#0a4f82" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#bgGrad)" />
  <rect x="64" y="96" width="384" height="240" rx="48" fill="#cdecff" />
  <ellipse cx="256" cy="332" rx="150" ry="52" fill="#1c9de0" opacity="0.85" />
  <g fill="#ff9d2a">
    <polygon points="148,84 164,62 184,92" />
    <polygon points="208,60 224,30 248,76" />
    <polygon points="308,60 332,30 348,76" />
    <polygon points="368,84 352,58 328,98" />
  </g>
  <g>
    <text x="256" y="274" text-anchor="middle" font-family="'Nunito', 'Nunito Sans', 'Helvetica', sans-serif" font-size="170" font-weight="800" fill="#c5ec3c" stroke="url(#textStroke)" stroke-width="14" paint-order="stroke fill">
      BEST
    </text>
  </g>
  <g fill="#18a164">
    <circle cx="120" cy="366" r="32" />
    <circle cx="392" cy="366" r="32" />
  </g>
</svg>`)}`;

  const printReports = () => {
    if (!previewData) {
      toast.error("Please generate a preview first");
      return;
    }

    const printContent = generatePrintContent();
    const printWindow = window.open('', '', 'height=800,width=1200');
    printWindow.document.write(`
      <html>
        <head>
          <title>Behavior Reports - ${formatDate(previewData.dateRange.start, 'MMM d')} to ${formatDate(previewData.dateRange.end, 'MMM d, yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #000; }
            .page-break { page-break-before: always; }
            .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; position: relative; }
            .report-logo { position: absolute; top: 0; left: 0; width: 60px; height: 60px; }
            .report-title { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
            .report-subtitle { font-size: 16px; color: #666; margin-bottom: 4px; }
            
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

  const generatePrintContent = () => {
    if (!previewData) return '';

    const { dateRange, students: selectedStudentData, reportTypes, data } = previewData;
    let content = '';
    let isFirstPage = true;

    selectedStudentData.forEach((student) => {
      let hasStudentContent = false;

      // Behavior Sheets - Each evaluation date gets its own page
      if (reportTypes.includes("behavior") && data.evaluations) {
        const studentEvaluations = data.evaluations.filter(e => e.student_id === student.id);
        
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
            
            content += `
              <div class="report-header">
                <img src="${BEST_LOGO_DATA_URL}" alt="BEST Hub Logo" class="report-logo" />
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
                  const value = `${raw}`;
                  return value === 'A/B' ? 'AB' : value;
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
        const studentIncidents = data.incidents.filter(i => Number(i.student_id) === Number(student.id));
        console.log("Student incidents found:", studentIncidents.length);
        
        if (studentIncidents.length > 0) {
          studentIncidents.forEach(incident => {
            if (!isFirstPage) content += '<div class="page-break"></div>';
            isFirstPage = false;
            hasStudentContent = true;

            content += `
              <div class="report-header">
                <img src="${BEST_LOGO_DATA_URL}" alt="BEST Hub Logo" class="report-logo" />
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

      // Weekly End of Day Averages Report
      if (reportTypes.includes("weeklyAverages") && data.weeklyEvaluations) {
        console.log("Processing weekly averages for student:", student.student_name);
        const studentEvaluations = data.weeklyEvaluations.filter(e => Number(e.student_id) === Number(student.id));
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
              <img src="${BEST_LOGO_DATA_URL}" alt="BEST Hub Logo" class="report-logo" />
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

      // Weekly Behavior Tracking - will be handled after the student loop 
      if (reportTypes.includes("weeklyBehavior") && data.weeklyBehaviorEvaluations) {
        // This will be handled after the student loop 
        hasStudentContent = true;
      }

      // If no content was generated for this student, add a "no data" page
      if (!hasStudentContent) {
        if (!isFirstPage) content += '<div class="page-break"></div>';
        isFirstPage = false;

        content += `
          <div class="report-header">
            <img src="${BEST_LOGO_DATA_URL}" alt="BEST Hub Logo" class="report-logo" />
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

    // Generate Weekly Behavior Tracking Reports (outside student loop)
    if (reportTypes.includes("weeklyBehavior") && data.weeklyBehaviorEvaluations) {
      console.log("Processing weekly behavior tracking with", data.weeklyBehaviorEvaluations.length, "evaluations");
      
      selectedStudentData.forEach(student => {
        if (!isFirstPage) content += '<div class="page-break"></div>';
        isFirstPage = false;

        // Get evaluations for this student
        const studentEvaluations = data.weeklyBehaviorEvaluations.filter(e => 
          Number(e.student_id) === Number(student.id)
        );
        console.log("Weekly behavior evaluations for", student.student_name, ":", studentEvaluations.length);
        console.log("Sample evaluation data structure:", studentEvaluations[0]);
        if (studentEvaluations[0] && studentEvaluations[0].time_slots) {
          console.log("Sample time_slots data:", JSON.stringify(studentEvaluations[0].time_slots, null, 2));
        }

        if (studentEvaluations.length > 0) {
          // Group evaluations by date
          const evaluationsByDate = {};
          studentEvaluations.forEach(evaluation => {
            console.log("Processing evaluation for date:", evaluation.date, "with time_slots:", evaluation.time_slots);
            if (!evaluationsByDate[evaluation.date]) {
              evaluationsByDate[evaluation.date] = evaluation;
            } else {
              // Merge time slots if multiple evaluations for the same date
              if (evaluation.time_slots && evaluationsByDate[evaluation.date].time_slots) {
                evaluationsByDate[evaluation.date].time_slots = {
                  ...evaluationsByDate[evaluation.date].time_slots,
                  ...evaluation.time_slots
                };
              }
            }
          });
          
          console.log("Evaluations grouped by date:", evaluationsByDate);

          // Get weekdays in range (Monday-Friday)
          const weekdays = [];
          const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          const start = new Date(dateRange.start + 'T00:00:00');
          const end = new Date(dateRange.end + 'T00:00:00');

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday (1) through Friday (5)
              weekdays.push({
                date: format(d, 'yyyy-MM-dd'),
                dayName: dayNames[dayOfWeek - 1],
                dayOfWeek: dayOfWeek
              });
            }
          }

          content += `
            <div class="report-header">
              <img src="${BEST_LOGO_DATA_URL}" alt="BEST Hub Logo" class="report-logo" />
              <div class="report-title">Weekly Behavior Tracking</div>
              <div class="report-subtitle">
                ${student.student_name} • ${formatDate(dateRange.start, 'MMMM d, yyyy')} - ${formatDate(dateRange.end, 'MMMM d, yyyy')}
              </div>
              <div class="report-subtitle">
                ${settings?.school_name || 'School'} • Generated by ${settings?.teacher_name || 'Teacher'}
              </div>
            </div>

            <div style="margin: 10px 0; font-family: Arial, sans-serif;">
              <!-- Header Section with School Info and Categories -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9px;">
                <tr>
                  <!-- School Info -->
                  <td style="width: 25%; vertical-align: top; padding: 5px;">
                    <div style="font-weight: bold; font-size: 10px; margin-bottom: 2px;">B.E.S.T Education</div>
                    <div style="font-size: 8px;">Kearney Public Schools</div>
                    <div style="font-size: 8px;">11417 South 76th St.</div>
                    <div style="font-size: 8px;">Lincoln, NE 68516</div>
                  </td>
                  
                  <!-- Adult Interactions -->
                  <td style="width: 25%; vertical-align: top; padding: 5px;">
                    <div style="font-weight: bold; font-size: 9px; margin-bottom: 3px;">ADULT INTERACTIONS</div>
                    <div style="font-size: 8px; line-height: 1.2;">Being respectful to adults</div>
                    <div style="font-size: 8px; line-height: 1.2;">Following directions</div>
                    <div style="font-size: 8px; line-height: 1.2;">Accepts feedback/accountability</div>
                  </td>
                  
                  <!-- Peer Interactions -->
                  <td style="width: 25%; vertical-align: top; padding: 5px;">
                    <div style="font-weight: bold; font-size: 9px; margin-bottom: 3px;">PEER INTERACTIONS</div>
                    <div style="font-size: 8px; line-height: 1.2;">Appropriate communication</div>
                    <div style="font-size: 8px; line-height: 1.2;">Respects peers and their property</div>
                    <div style="font-size: 8px; line-height: 1.2;">Resolves conflict appropriately</div>
                  </td>
                  
                  <!-- Classroom Expectations & Scoring -->
                  <td style="width: 25%; vertical-align: top; padding: 5px;">
                    <div style="font-weight: bold; font-size: 9px; margin-bottom: 3px;">CLASSROOM EXPECTATIONS</div>
                    <div style="font-size: 8px; line-height: 1.2;">On task during instruction</div>
                    <div style="font-size: 8px; line-height: 1.2;">Participating appropriately</div>
                    <div style="font-size: 8px; line-height: 1.2;">Organized and prepared for class</div>
                    <div style="font-weight: bold; font-size: 9px; margin-top: 8px; margin-bottom: 2px;">SCORING:</div>
                    <div style="font-size: 8px; line-height: 1.1;">4 = Exceeds expectations</div>
                    <div style="font-size: 8px; line-height: 1.1;">3 = Meets expectations</div>
                    <div style="font-size: 8px; line-height: 1.1;">2 = Below expectations</div>
                    <div style="font-size: 8px; line-height: 1.1;">1 = Unsatisfactory</div>
                  </td>
                </tr>
              </table>

              <!-- Daily Averages Summary Table -->
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px;">
                <thead>
                  <tr style="background: #f4f4f4;">
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 15%;">Daily Averages</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 14%;">Monday</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 14%;">Tuesday</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 14%;">Wednesday</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 14%;">Thursday</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 14%;">Friday</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 15%;">Week Average</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">2.8</td>
                    ${weekdays.map((day, index) => {
                      const evaluation = evaluationsByDate[day.date];
                      if (evaluation && evaluation.time_slots) {
                        const { average, count } = calculateAverageFromSlots(evaluation.time_slots);
                        const avgValue = count > 0 && typeof average === 'number' && !isNaN(average) ? average.toFixed(1) : 'N/A';
                        return `<td style="border: 1px solid #000; padding: 4px; text-align: center;">${avgValue}</td>`;
                      }
                      return `<td style="border: 1px solid #000; padding: 4px; text-align: center;">N/A</td>`;
                    }).join('')}
                    <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">
                      ${(() => {
                        // Calculate week average
                        const dailyAvgs = weekdays.map(day => {
                          const evaluation = evaluationsByDate[day.date];
                          if (evaluation && evaluation.time_slots) {
                            const { average, count } = calculateAverageFromSlots(evaluation.time_slots);
                            return count > 0 && typeof average === 'number' && !isNaN(average) ? average : null;
                          }
                          return null;
                        }).filter(avg => avg !== null);
                        
                        if (dailyAvgs.length > 0) {
                          const weekAvg = dailyAvgs.reduce((sum, avg) => sum + avg, 0) / dailyAvgs.length;
                          return weekAvg.toFixed(1);
                        }
                        return '2.8';
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- Individual Day Grids -->
              ${weekdays.map((day, dayIndex) => {
                const evaluation = evaluationsByDate[day.date];
                console.log(`Processing day ${day.dayName} (${day.date}):`, evaluation);
                const dayTimeSlots = evaluation && evaluation.time_slots ? evaluation.time_slots : {};
                console.log(`Time slots for ${day.dayName}:`, dayTimeSlots);
                
                // Define the specific time slots as shown in screenshot
                const timeSlots = [
                  { key: 'slot1', label: '8:30-9:30' },
                  { key: 'slot2', label: '9:30-10:30' },
                  { key: 'slot3', label: '10:30-11:30' },
                  { key: 'slot4', label: '11:30-12:30' },
                  { key: 'slot5', label: '12:30-1:30' },
                  { key: 'slot6', label: '1:30-2:30' },
                  { key: 'slot7', label: '2:30-3:30' }
                ];
                
                // Calculate end-of-day averages for each category
                const endOfDayAverages = {};
                ['ai', 'pi', 'ce'].forEach(sectionKey => {
                  const sectionScores = [];
                  Object.values(dayTimeSlots).forEach(slot => {
                    console.log(`Checking slot for ${sectionKey}:`, slot);
                    // Try to get the score for this section
                    let scoreValue = slot[sectionKey];
                    
                    // If direct field doesn't exist, try alternative names
                    if (scoreValue === undefined || scoreValue === null || scoreValue === '') {
                      if (sectionKey === 'ai') {
                        scoreValue = slot.AI || slot.adult_interaction || slot.adult_interactions;
                      } else if (sectionKey === 'pi') {
                        scoreValue = slot.PI || slot.peer_interaction || slot.peer_interactions;
                      } else if (sectionKey === 'ce') {
                        scoreValue = slot.CE || slot.classroom_expectations || slot.classroom_expectation;
                      }
                    }
                    
                    // Parse score and validate
                    if (scoreValue !== undefined && scoreValue !== null && scoreValue !== '' && scoreValue !== 'AB' && scoreValue !== 'NS') {
                      const score = Number(scoreValue);
                      if (!isNaN(score) && score >= 1 && score <= 4) {
                        sectionScores.push(score);
                      }
                    }
                  });
                  endOfDayAverages[sectionKey] = sectionScores.length > 0 
                    ? (sectionScores.reduce((sum, score) => sum + score, 0) / sectionScores.length).toFixed(1)
                    : '--';
                });
                
                console.log(`End of day averages for ${day.dayName}:`, endOfDayAverages);

                return `
                  <div style="margin-bottom: 20px; page-break-inside: avoid;">
                    <h3 style="background: #f4f4f4; padding: 6px; margin: 0 0 1px 0; border: 1px solid #000; text-align: center; font-size: 11px; font-weight: bold;">
                      ${day.dayName.toUpperCase()}
                    </h3>
                    
                    <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                      <thead>
                        <tr style="background: #f4f4f4;">
                          <th style="border: 1px solid #000; padding: 3px; text-align: center; width: 18%; font-size: 8px;">Time</th>
                          <th style="border: 1px solid #000; padding: 3px; text-align: center; width: 11%; font-size: 7px;">8:30-9:30</th>
                          <th style="border: 1px solid #000; padding: 3px; text-align: center; width: 11%; font-size: 7px;">9:30-10:30</th>
                          <th style="border: 1px solid #000; padding: 3px; text-align: center; width: 11%; font-size: 7px;">10:30-11:30</th>
                          <th style="border: 1px solid #000; padding: 3px; text-align: center; width: 11%; font-size: 7px;">11:30-12:30</th>
                          <th style="border: 1px solid #000; padding: 3px; text-align: center; width: 11%; font-size: 7px;">12:30-1:30</th>
                          <th style="border: 1px solid #000; padding: 3px; text-align: center; width: 11%; font-size: 7px;">1:30-2:30</th>
                          <th style="border: 1px solid #000; padding: 3px; text-align: center; width: 11%; font-size: 7px;">2:30-3:30</th>
                          <th style="border: 1px solid #000; padding: 3px; text-align: center; width: 11%; font-size: 7px;">Daily Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        <!-- Adult Interactions Row -->
                        <tr>
                          <td style="border: 1px solid #000; padding: 3px; text-align: left; font-weight: bold; font-size: 8px;">Adult Interactions</td>
                          ${timeSlots.map(timeSlot => {
                            const slotData = dayTimeSlots[timeSlot.key] || {};
                            console.log(`AI slot ${timeSlot.key} data:`, slotData);
                            // Get AI score with fallback options
                            let aiScore = slotData.ai || slotData.AI || slotData.adult_interaction;
                            // Display score if valid, otherwise show dash
                            if (aiScore === undefined || aiScore === null || aiScore === '' || aiScore === 'AB' || aiScore === 'NS') {
                              aiScore = '--';
                            }
                            return `<td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 9px;">${aiScore}</td>`;
                          }).join('')}
                          <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 9px; font-weight: bold;">${endOfDayAverages.ai}</td>
                        </tr>
                        
                        <!-- Peer Interactions Row -->
                        <tr>
                          <td style="border: 1px solid #000; padding: 3px; text-align: left; font-weight: bold; font-size: 8px;">Peer Interactions</td>
                          ${timeSlots.map(timeSlot => {
                            const slotData = dayTimeSlots[timeSlot.key] || {};
                            // Get PI score with fallback options
                            let piScore = slotData.pi || slotData.PI || slotData.peer_interaction;
                            // Display score if valid, otherwise show dash
                            if (piScore === undefined || piScore === null || piScore === '' || piScore === 'AB' || piScore === 'NS') {
                              piScore = '--';
                            }
                            return `<td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 9px;">${piScore}</td>`;
                          }).join('')}
                          <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 9px; font-weight: bold;">${endOfDayAverages.pi}</td>
                        </tr>
                        
                        <!-- Classroom Expectations Row -->
                        <tr>
                          <td style="border: 1px solid #000; padding: 3px; text-align: left; font-weight: bold; font-size: 8px;">Classroom Expectations</td>
                          ${timeSlots.map(timeSlot => {
                            const slotData = dayTimeSlots[timeSlot.key] || {};
                            // Get CE score with fallback options
                            let ceScore = slotData.ce || slotData.CE || slotData.classroom_expectations;
                            // Display score if valid, otherwise show dash
                            if (ceScore === undefined || ceScore === null || ceScore === '' || ceScore === 'AB' || ceScore === 'NS') {
                              ceScore = '--';
                            }
                            return `<td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 9px;">${ceScore}</td>`;
                          }).join('')}
                          <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 9px; font-weight: bold;">${endOfDayAverages.ce}</td>
                        </tr>
                        
                        <!-- Daily Averages Row -->
                        <tr style="background: #f0f0f0; font-weight: bold;">
                          <td style="border: 1px solid #000; padding: 3px; text-align: left; font-size: 8px;">Daily Averages</td>
                          ${timeSlots.map(timeSlot => {
                            const slotData = dayTimeSlots[timeSlot.key] || {};
                            
                            // Calculate average for this time slot across all categories
                            const slotScores = [];
                            ['ai', 'pi', 'ce'].forEach(sectionKey => {
                              // Get score with direct field access and fallbacks
                              let scoreValue = slotData[sectionKey];
                              if (scoreValue === undefined || scoreValue === null || scoreValue === '') {
                                if (sectionKey === 'ai') {
                                  scoreValue = slotData.AI || slotData.adult_interaction;
                                } else if (sectionKey === 'pi') {
                                  scoreValue = slotData.PI || slotData.peer_interaction;
                                } else if (sectionKey === 'ce') {
                                  scoreValue = slotData.CE || slotData.classroom_expectations;
                                }
                              }
                              
                              // Only include valid numeric scores
                              if (scoreValue !== undefined && scoreValue !== null && scoreValue !== '' && scoreValue !== 'AB' && scoreValue !== 'NS') {
                                const score = Number(scoreValue);
                                if (!isNaN(score) && score >= 1 && score <= 4) {
                                  slotScores.push(score);
                                }
                              }
                            });
                            const slotAvg = slotScores.length > 0 
                              ? (slotScores.reduce((sum, score) => sum + score, 0) / slotScores.length).toFixed(1)
                              : '--';
                              
                            return `<td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 9px;">${slotAvg}</td>`;
                          }).join('')}
                          <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 9px;">
                            ${(() => {
                              const avgValues = Object.values(endOfDayAverages).filter(val => val !== '--' && val !== 'N/A').map(val => parseFloat(val));
                              return avgValues.length > 0 
                                ? (avgValues.reduce((sum, val) => sum + val, 0) / avgValues.length).toFixed(1)
                                : '--';
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <!-- Comments Section -->
                    <div style="margin-top: 3px;">
                      <div style="font-weight: bold; font-size: 9px; margin-bottom: 2px;">Comments:</div>
                      <div style="border: 1px solid #000; min-height: 30px; padding: 4px; font-size: 8px; background: white; line-height: 1.3;">
                        ${(() => {
                          // Collect all comments for this day
                          const allComments = [];
                          
                          // Add general comments if any
                          if (evaluation && evaluation.general_comments && evaluation.general_comments.trim()) {
                            allComments.push(evaluation.general_comments.trim());
                          }
                          
                          // Add time slot comments with time labels
                          Object.entries(dayTimeSlots).forEach(([slotKey, slot]) => {
                            if (slot.comment && slot.comment.trim()) {
                              const timeSlot = timeSlots.find(ts => ts.key === slotKey);
                              const timeLabel = timeSlot ? timeSlot.label : slotKey;
                              allComments.push(`${timeLabel}: ${slot.comment.trim()}`);
                            }
                          });
                          
                          return allComments.length > 0 ? allComments.join(' • ') : '';
                        })()}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        } else {
          content += `
            <div class="report-header">
              <img src="${BEST_LOGO_DATA_URL}" alt="BEST Hub Logo" class="report-logo" />
              <div class="report-title">Weekly Behavior Tracking</div>
              <div class="report-subtitle">
                ${student.student_name} • ${formatDate(dateRange.start, 'MMMM d, yyyy')} - ${formatDate(dateRange.end, 'MMMM d, yyyy')}
              </div>
              <div class="report-subtitle">
                ${settings?.school_name || 'School'} • Generated by ${settings?.teacher_name || 'Teacher'}
              </div>
            </div>
            <div class="no-data">No behavior data found for this student in the selected date range</div>
          `;
        }
      });
    }

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
          <img src="${BEST_LOGO_DATA_URL}" alt="BEST Hub Logo" class="report-logo" />
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
            </div>
          </div>
        </div>

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
                    {previewData.reportTypes.includes("weeklyAverages") && (
                      <div className="flex justify-between">
                        <span className="font-medium">Weekly Averages:</span>
                        <span>{previewData.data.weeklyEvaluations?.length || 0} evaluations</span>
                      </div>
                    )}
                    {previewData.reportTypes.includes("weeklyBehavior") && (
                      <div className="flex justify-between">
                        <span className="font-medium">Weekly Behavior Tracking:</span>
                        <span>{previewData.data.weeklyBehaviorEvaluations?.length || 0} evaluations</span>
                      </div>
                    )}
                    {previewData.reportTypes.includes("dailyAverages") && (
                      <div className="flex justify-between">
                        <span className="font-medium">Daily Averages Combined:</span>
                        <span>{previewData.data.dailyAveragesEvaluations?.length || 0} evaluations</span>
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
