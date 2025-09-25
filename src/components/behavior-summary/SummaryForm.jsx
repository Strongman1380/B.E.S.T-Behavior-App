import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, Sparkles, Loader2, Printer, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { parseYmd, formatDateRange } from "@/utils";
import { DailyEvaluation, IncidentReport, ContactLog } from "@/api/entities";
import { toast } from 'sonner';
import { aiService } from '@/services/aiService';
import { TIME_SLOT_LABELS } from "@/config/timeSlots";
import { getEnhancedPrintStyles, getPrintHeader, getPrintFooter } from '@/utils/printStyles';

export default function SummaryForm({ summary, settings, onSave, isSaving, studentId, student, onFormDataChange, onUnsavedChanges }) {
  const [formData, setFormData] = useState({
    date_range_start: new Date(),
    date_range_end: new Date(),
    prepared_by: '',
    general_behavior_overview: '',
    strengths: '',
    improvements_needed: '',
    behavioral_incidents: '',
    summary_recommendations: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [lastSaved, setLastSaved] = useState(null);

  // Debounce helper reused from evaluation form
  const useDebounce = (callback, delay) => {
    const [debounceTimer, setDebounceTimer] = useState(null);
    const debouncedCallback = useCallback((...args) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      const newTimer = setTimeout(() => { callback(...args); }, delay);
      setDebounceTimer(newTimer);
    }, [callback, delay, debounceTimer]);
    return debouncedCallback;
  };

  useEffect(() => {
    const newFormData = {
      date_range_start: summary?.date_range_start ? parseYmd(summary.date_range_start) : new Date(),
      date_range_end: summary?.date_range_end ? parseYmd(summary.date_range_end) : new Date(),
      prepared_by: summary?.prepared_by || settings?.teacher_name || '',
      general_behavior_overview: summary?.general_behavior_overview || '',
      strengths: summary?.strengths || '',
      improvements_needed: summary?.improvements_needed || '',
      behavioral_incidents: summary?.behavioral_incidents || '',
      summary_recommendations: summary?.summary_recommendations || ''
    };
    setFormData(newFormData);
    setHasUnsavedChanges(false);
    setAutoSaveStatus('saved');
    if (summary) {
      setLastSaved(new Date());
    }
    
    // Notify parent about initial form data
    if (onFormDataChange) {
      const payload = {
        ...newFormData,
        date_range_start: format(newFormData.date_range_start, 'yyyy-MM-dd'),
        date_range_end: format(newFormData.date_range_end, 'yyyy-MM-dd')
      };
      onFormDataChange(payload);
    }
    if (onUnsavedChanges) {
      onUnsavedChanges(false);
    }
  }, [summary, settings]);

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    setHasUnsavedChanges(true);
    setAutoSaveStatus('saving');
    
    // Notify parent component about form data changes
    const payload = {
      ...newData,
      date_range_start: format(newData.date_range_start, 'yyyy-MM-dd'),
      date_range_end: format(newData.date_range_end, 'yyyy-MM-dd')
    };
    
    if (onFormDataChange) {
      onFormDataChange(payload);
    }
    if (onUnsavedChanges) {
      onUnsavedChanges(true);
    }
    
    // Debounced auto-save, silent
    debouncedSave(payload);
  };

  const debouncedSave = useDebounce(async (data) => {
    if (!studentId) return;

    try {
      // Ensure behavior summaries are saved with proper date range and student ID
      const summaryData = {
        ...data,
        student_id: studentId,
        summary_data: {
          general_behavior_overview: data.general_behavior_overview || '',
          strengths: data.strengths || '',
          improvements_needed: data.improvements_needed || '',
          behavioral_incidents: data.behavioral_incidents || '',
          summary_recommendations: data.summary_recommendations || '',
          prepared_by: data.prepared_by || ''
        }
      };

      await onSave(summaryData, { silent: true });
      setHasUnsavedChanges(false);
      setAutoSaveStatus('saved');
      setLastSaved(new Date());

      // Notify parent that changes are saved
      if (onUnsavedChanges) {
        onUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
      // Don't show toast for auto-save errors to avoid spam, but keep the error state
    }
  }, 2000);

  // Immediate save function for navigation events
  const saveImmediately = async () => {
    if (!hasUnsavedChanges || !studentId) return;
    
    const dataToSave = {
      ...formData,
      date_range_start: format(formData.date_range_start, 'yyyy-MM-dd'),
      date_range_end: format(formData.date_range_end, 'yyyy-MM-dd')
    };
    
    try {
      await onSave(dataToSave, { silent: true });
      setHasUnsavedChanges(false);
      setAutoSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Immediate save failed:', error);
      setAutoSaveStatus('error');
    }
  };

  // Add beforeunload event listener to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Save immediately when component unmounts or student changes
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges) {
        saveImmediately();
      }
    };
  }, [hasUnsavedChanges, studentId]);

  // Clear AI cache when student changes to prevent cross-contamination
  useEffect(() => {
    if (studentId) {
      console.log(`[SummaryForm] Student changed to ${studentId}, clearing AI cache`);
      // Clear the entire cache to ensure no cross-student contamination
      aiService.clearCache();
    }
  }, [studentId]);

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      student_id: studentId,
      date_range_start: format(formData.date_range_start, 'yyyy-MM-dd'),
      date_range_end: format(formData.date_range_end, 'yyyy-MM-dd'),
      summary_data: {
        general_behavior_overview: formData.general_behavior_overview || '',
        strengths: formData.strengths || '',
        improvements_needed: formData.improvements_needed || '',
        behavioral_incidents: formData.behavioral_incidents || '',
        summary_recommendations: formData.summary_recommendations || '',
        prepared_by: formData.prepared_by || ''
      }
    };
    onSave(dataToSave);
  };

  const handlePrintCurrent = () => {
    // Ensure all fields have content before printing
    const ensureContent = (field, fallback) => field && field.trim() ? field : fallback;

    const data = {
      ...formData,
      date_range_start: format(formData.date_range_start, 'yyyy-MM-dd'),
      date_range_end: format(formData.date_range_end, 'yyyy-MM-dd'),
      // Ensure no blank fields in print output
      general_behavior_overview: ensureContent(formData.general_behavior_overview, 'Behavioral overview for the selected period.'),
      strengths: ensureContent(formData.strengths, 'Student strengths to be documented.'),
      improvements_needed: ensureContent(formData.improvements_needed, 'Areas for improvement to be assessed.'),
      behavioral_incidents: ensureContent(formData.behavioral_incidents, 'No behavioral incidents reported for this period.'),
      summary_recommendations: ensureContent(formData.summary_recommendations, 'Recommendations to be developed based on observations.')
    };
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;
    const studentName = student?.student_name || '';
    const preparedBy = data.prepared_by || settings?.teacher_name || '';
    const schoolName = settings?.school_name || '';
    const dateRangeStr = formatDateRange(data.date_range_start, data.date_range_end);
    const contentHtml = `
      <div class="behavior-form">
        <div class="form-title">Student Behavior Summary Report</div>
        <div class="header-info">
          <div class="info-row">
            <span class="info-label">Student Name:</span>
            <div class="info-box">${studentName}</div>
          </div>
          <div class="info-row">
            <span class="info-label">Report Period:</span>
            <div class="info-box">${dateRangeStr}</div>
          </div>
          <div class="info-row">
            <span class="info-label">Prepared By:</span>
            <div class="info-box">${preparedBy}</div>
          </div>
          <div class="info-row">
            <span class="info-label">School:</span>
            <div class="info-box">${schoolName}</div>
          </div>
        </div>
        <div class="content-sections">
          <div class="content-section">
            <div class="section-label">General Behavior Overview</div>
            <div class="content-box large-content-box">${(data.general_behavior_overview || '').toString().replace(/</g,'&lt;')}</div>
          </div>
          <div class="two-column">
            <div class="column">
              <div class="content-section">
                <div class="section-label">Strengths</div>
                <div class="content-box">${(data.strengths || '').toString().replace(/</g,'&lt;')}</div>
              </div>
            </div>
            <div class="column">
              <div class="content-section">
                <div class="section-label">Areas for Improvement</div>
                <div class="content-box">${(data.improvements_needed || '').toString().replace(/</g,'&lt;')}</div>
              </div>
            </div>
          </div>
          <div class="content-section">
            <div class="section-label">Behavioral Incident Summary</div>
            <div class="content-box">${data.behavioral_incidents.toString().replace(/</g,'<')}</div>
          </div>
          <div class="content-section">
            <div class="section-label">Recommendations</div>
            <div class="content-box large-content-box">${(data.summary_recommendations || '').toString().replace(/</g,'&lt;')}</div>
          </div>
        </div>
        <div class="signature-section">
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-text">Teacher Signature</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-text">Date</div>
          </div>
        </div>
      </div>`;
    printWindow.document.write(`
      <html>
        <head>
          <title>Behavior Summary Report - ${studentName}</title>
          <style>
            ${getEnhancedPrintStyles()}

            /* Behavior Summary specific styles */
            .behavior-form {
              margin-bottom: 0;
              background: white;
              min-height: 9in;
              display: flex;
              flex-direction: column;
            }
            .form-title {
              font-size: 24px;
              font-weight: 800;
              text-align: center;
              margin: 20px 0 30px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #1f2937;
              background: linear-gradient(135deg, #f8fafc, #e2e8f0);
              padding: 15px;
              border-radius: 8px;
              border: 2px solid #e5e7eb;
            }
            .header-info {
              margin-bottom: 25px;
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              padding: 15px;
              background: #f8fafc;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-weight: 700;
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .info-box {
              font-size: 14px;
              font-weight: 600;
              color: #1f2937;
              padding: 8px 12px;
              background: white;
              border-radius: 4px;
              border: 1px solid #d1d5db;
            }
            .content-sections {
              flex-grow: 1;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            .large-content-box {
              min-height: 120px;
            }
            .two-column {
              display: flex;
              gap: 20px;
              margin-bottom: 20px;
            }
            .column {
              flex: 1;
            }
          </style>
        </head>
        <body>
          ${getPrintHeader(schoolName, "Student Behavior Summary Report", new Date())}
          ${contentHtml}
          ${getPrintFooter(`Student: ${studentName} | Period: ${dateRangeStr} | Prepared by: ${preparedBy}`)}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  };

  const generateSummaryFromComments = async () => {
    if (!studentId) {
      toast.error('No student selected');
      return;
    }

    setIsGenerating(true);
    try {
      // Fetch evaluations for the date range
      const startDate = format(formData.date_range_start, 'yyyy-MM-dd');
      const endDate = format(formData.date_range_end, 'yyyy-MM-dd');

      // Validate date range
      if (startDate > endDate) {
        toast.error('Invalid date range: Start date must be before or equal to end date');
        setIsGenerating(false);
        return;
      }

      console.log(`Fetching data for student ${studentId} from ${startDate} to ${endDate}`);

      // If the user selected a single date (start === end) prefer to use
      // only that QuickScore DailyEvaluation as the single source of truth
      // for AI summary generation. This prevents mixing in other incident
      // or contact records when the intent is to summarize the QuickScore.
      let evaluations = [];
      let incidents = [];
      let contacts = [];

      if (startDate === endDate) {
        // Try to fetch a single DailyEvaluation for this student/date
        const singleEval = await DailyEvaluation.filter({
          student_id: studentId,
          date_from: startDate,
          date_to: endDate
        });
        evaluations = singleEval || [];

        // Still fetch incidents/contacts but we'll prefer the single evaluation
        // for the AI input. Keep them available for fallbacks or incident summaries.
        [incidents, contacts] = await Promise.all([
          IncidentReport.filter({
            student_id: studentId,
            incident_date_from: startDate,
            incident_date_to: endDate
          }),
          ContactLog.filter({
            student_id: studentId,
            contact_date_from: startDate,
            contact_date_to: endDate
          })
        ]);
      } else {
        // Multi-day selection - preserve previous behavior and gather all sources
        [evaluations, incidents, contacts] = await Promise.all([
          DailyEvaluation.filter({
            student_id: studentId,
            date_from: startDate,
            date_to: endDate
          }),
          IncidentReport.filter({
            student_id: studentId,
            incident_date_from: startDate,
            incident_date_to: endDate
          }),
          ContactLog.filter({
            student_id: studentId,
            contact_date_from: startDate,
            contact_date_to: endDate
          })
        ]);
      }

  console.log(`Found ${evaluations.length} evaluations, ${incidents.length} incidents, ${contacts.length} contacts`);

      if (evaluations.length === 0 && incidents.length === 0 && contacts.length === 0) {
        toast.error(`No behavioral data found for the selected date range (${startDate} to ${endDate}). Please verify that evaluations, incidents, or contact logs exist for this student within these dates.`);
        return;
      }

      // Build AI input. If a single-day was selected and at least one evaluation
      // exists, prefer that single evaluation as the primary source with incidents/contacts as secondary.
      // For multi-day selections, aggregate all sources equally.
      let allComments = [];

      if (startDate === endDate && evaluations.length > 0) {
        // Single day with evaluation data - prioritize the evaluation
        const evaluation = evaluations[0];

        // Add general comments from evaluation
        if (evaluation.general_comments && evaluation.general_comments.trim()) {
          allComments.push({
            type: 'general',
            date: evaluation.date,
            content: evaluation.general_comments.trim(),
            context: 'Overall daily evaluation summary',
            source: 'daily_evaluation'
          });
        }

        // Add time slot comments from evaluation
        if (evaluation.time_slots) {
          Object.entries(evaluation.time_slots).forEach(([slot, data]) => {
            if (data && (data.comment || data.rating)) {
              allComments.push({
                type: 'time_slot',
                date: evaluation.date,
                slot: slot,
                slotLabel: TIME_SLOT_LABELS[slot] || slot,
                rating: data.rating,
                content: data.comment ? data.comment.trim() : '',
                context: `Time slot: ${TIME_SLOT_LABELS[slot] || slot}`,
                source: 'daily_evaluation'
              });
            }
          });
        }

        // Add incidents and contacts as supplementary information for the same day
        incidents.forEach(incident => {
          if (incident.incident_description) {
            allComments.push({
              type: 'incident',
              date: incident.incident_date,
              content: incident.incident_description,
              context: `Incident Report - ${incident.incident_type || 'General Incident'}`,
              source: 'incident_report'
            });
          }
        });

        contacts.forEach(contact => {
          if (contact.outcome_of_contact) {
            allComments.push({
              type: 'contact',
              date: contact.contact_date,
              content: contact.outcome_of_contact,
              context: `Contact with ${contact.contact_person_name} - ${contact.contact_category}`,
              source: 'contact_log'
            });
          }
          if (contact.purpose_of_contact) {
            allComments.push({
              type: 'contact_purpose',
              date: contact.contact_date,
              content: contact.purpose_of_contact,
              context: `Contact purpose with ${contact.contact_person_name}`,
              source: 'contact_log'
            });
          }
        });
      } else {
        // Multi-day aggregation - include all sources equally
        evaluations.forEach(evaluation => {
          if (evaluation.general_comments && evaluation.general_comments.trim()) {
            allComments.push({
              type: 'general',
              date: evaluation.date,
              content: evaluation.general_comments.trim(),
              context: 'Overall daily evaluation summary',
              source: 'daily_evaluation'
            });
          }
          if (evaluation.time_slots) {
            Object.entries(evaluation.time_slots).forEach(([slot, data]) => {
              if (data && data.comment && data.comment.trim()) {
                allComments.push({
                  type: 'time_slot',
                  date: evaluation.date,
                  slot: slot,
                  slotLabel: TIME_SLOT_LABELS[slot] || slot,
                  rating: data.rating,
                  content: data.comment.trim(),
                  context: `Time slot: ${TIME_SLOT_LABELS[slot] || slot}`,
                  source: 'daily_evaluation'
                });
              }
            });
          }
        });

        incidents.forEach(incident => {
          if (incident.incident_description) {
            allComments.push({
              type: 'incident',
              date: incident.incident_date,
              content: incident.incident_description,
              context: `Incident Report - ${incident.incident_type || 'General Incident'}`,
              source: 'incident_report'
            });
          }
        });

        contacts.forEach(contact => {
          if (contact.outcome_of_contact) {
            allComments.push({
              type: 'contact',
              date: contact.contact_date,
              content: contact.outcome_of_contact,
              context: `Contact with ${contact.contact_person_name} - ${contact.contact_category}`,
              source: 'contact_log'
            });
          }
          if (contact.purpose_of_contact) {
            allComments.push({
              type: 'contact_purpose',
              date: contact.contact_date,
              content: contact.purpose_of_contact,
              context: `Contact purpose with ${contact.contact_person_name}`,
              source: 'contact_log'
            });
          }
        });
      }

      if (allComments.length === 0) {
        toast.error('No behavioral information found in evaluations, incidents, or contacts for the selected date range');
        return;
      }

      // Use optimized AI service to analyze and generate comprehensive summaries
      console.log(`[SummaryForm] Generating behavior summary for student:`, {
        studentId,
        studentName: student?.student_name,
        startDate,
        endDate,
        commentCount: allComments.length,
        commentSources: allComments.reduce((acc, comment) => {
          acc[comment.source] = (acc[comment.source] || 0) + 1;
          return acc;
        }, {}),
        commentTypes: allComments.reduce((acc, comment) => {
          acc[comment.type] = (acc[comment.type] || 0) + 1;
          return acc;
        }, {})
      });

      // Generate AI summary with student-specific data (force refresh to ensure latest data)
      const analysis = await aiService.generateBehaviorSummary(
        allComments,
        { startDate, endDate },
        {
          studentId,
          studentName: student?.student_name,
          gradeLevel: student?.grade_level,
          schoolName: settings?.school_name,
          teacherName: settings?.teacher_name,
          forceRefresh: true
        }
      );

      // Ensure all fields have content with fallbacks
      const updatedData = {
        general_behavior_overview: analysis.general_overview || 'Based on available data, behavioral observations will be documented.',
        strengths: analysis.strengths || 'Student strengths will be identified based on evaluation data.',
        improvements_needed: analysis.improvements || 'Areas for improvement will be assessed based on behavioral observations.',
        behavioral_incidents: analysis.incidents || (incidents.length > 0 ? `${incidents.length} incident(s) occurred during this period.` : ''),
        summary_recommendations: analysis.recommendations || 'Recommendations will be developed based on behavioral patterns and observations.'
      };

      // Update form data with AI-generated content
      setFormData(prev => ({
        ...prev,
        ...updatedData
      }));

      // Also trigger form change to ensure parent knows about the update
      if (onFormDataChange) {
        const payload = {
          ...formData,
          ...updatedData,
          date_range_start: startDate,
          date_range_end: endDate
        };
        onFormDataChange(payload);
      }

      // Set unsaved changes to trigger auto-save
      setHasUnsavedChanges(true);
      if (onUnsavedChanges) {
        onUnsavedChanges(true);
      }

      const dateRangeText = startDate === endDate ? `${startDate}` : `${startDate} to ${endDate}`;
      toast.success(`AI summary generated from ${allComments.length} behavioral records for ${dateRangeText}!`);

    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast.error('Failed to generate AI summary. Please check your OpenAI API key.');
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Date Range Start</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date_range_start, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date_range_start}
                  onSelect={(date) => handleChange('date_range_start', date)}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label>Date Range End</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date_range_end, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date_range_end}
                  onSelect={(date) => handleChange('date_range_end', date)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Prepared By</Label>
          <Input
            value={formData.prepared_by}
            onChange={(e) => handleChange('prepared_by', e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className="space-y-2">
          <Label>General Behavior Overview</Label>
          <Textarea
            value={formData.general_behavior_overview}
            onChange={(e) => handleChange('general_behavior_overview', e.target.value)}
            placeholder="Provide an overall description of the student's behavior during this period..."
            className="min-h-[100px]"
          />
        </div>

        {/* Strengths and Improvements */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Strengths</Label>
            <Textarea
              value={formData.strengths}
              onChange={(e) => handleChange('strengths', e.target.value)}
              placeholder="Describe the student's behavioral strengths and positive qualities..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Improvements Needed</Label>
            <Textarea
              value={formData.improvements_needed}
              onChange={(e) => handleChange('improvements_needed', e.target.value)}
              placeholder="Identify areas where the student needs behavioral improvement..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Behavioral Incidents</Label>
          <Textarea
            value={formData.behavioral_incidents}
            onChange={(e) => handleChange('behavioral_incidents', e.target.value)}
            placeholder="Document any specific behavioral incidents during this period..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Summary & Recommendations</Label>
          <Textarea
            value={formData.summary_recommendations}
            onChange={(e) => handleChange('summary_recommendations', e.target.value)}
            placeholder="Provide a summary and any recommendations for the student..."
            className="min-h-[120px]"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button 
            onClick={generateSummaryFromComments} 
            disabled={isGenerating || !studentId} 
            variant="outline"
            className="bg-purple-50 hover:bg-purple-100 border-purple-200"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Analyzing...' : 'Generate from Comments'}
          </Button>
          <Button onClick={handlePrintCurrent} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print Current
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Summary'}
          </Button>
        </div>

        {/* Auto-save status indicator */}
        <div className="flex justify-between items-center text-xs mt-1">
          <div></div>
          <div className="flex items-center gap-2">
            {autoSaveStatus === 'saving' && (
              <div className="flex items-center gap-1 text-blue-600">
                <Clock className="w-3 h-3 animate-pulse" />
                <span>Auto-saving...</span>
              </div>
            )}
            {autoSaveStatus === 'saved' && lastSaved && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </div>
            )}
            {autoSaveStatus === 'error' && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span>Auto-save failed - click Save to retry</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
