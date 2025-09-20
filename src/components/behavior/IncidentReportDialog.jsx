import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, FileText, Printer } from "lucide-react";
import { format } from "date-fns";
import { parseYmd } from "@/utils";
import { toast } from 'sonner';

const PROBLEM_BEHAVIORS = [
  "Physical aggression",
  "Self-injury",
  "Disruption/tantrum",
  "Inconsolable crying",
  "Inappropriate language",
  "Verbal aggressive",
  "Non-compliance",
  "Social withdrawal/isolation",
  "Elopement",
  "Property damage",
  "Unsafe behaviors",
  "Other:"
];

const ACTIVITIES = [
  "Arrival",
  "Departure",
  "Classroom jobs",
  "Group activity",
  "Indoor play",
  "Lunch time",
  "Quiet time",
  "Outdoor play",
  "Field trip",
  "Bathroom",
  "Transition",
  "Clean-up",
  "Therapy",
  "Individual activity",
  "Other:"
];

const OTHERS_INVOLVED = [
  "Teacher",
  "Paraeducator",
  "Therapist",
  "Support Staff",
  "Peer(s)",
  "None",
  "Other:"
];

const STRATEGY_RESPONSES = [
  "Verbal reminder",
  "Move within group",
  "Remove from activity",
  "Remove from area",
  "Time with staff",
  "Re-teach/practice expected behavior",
  "Time in different classroom",
  "Time with support staff",
  "Redirect to different activity",
  "Family contact",
  "Loss of item/privilege",
  "Safety intervention hold",
  "Physical guidance",
  "Other:"
];

const FOLLOW_UP_OPTIONS = [
  "Not applicable",
  "Talk with student",
  "Contact family",
  "Family meeting/phone conference",
  "Behavior consult",
  "Targeted group intervention",
  "Consult LMHP, if applicable",
  "Consult with case manager",
  "Other:"
];

export default function IncidentReportDialog({ open, onOpenChange, student, settings, onSave, students = [], initialData = null, readOnly = false }) {
  const [formData, setFormData] = useState({
    student_name: '',
    staff_reporting: '',
    date_of_incident: new Date(),
    time_of_incident: format(new Date(), 'HH:mm'),
    problem_behavior: {},
    description_problem_behavior: '',
    activity: {},
    description_activity: '',
    others_involved: {},
    description_others_involved: '',
    strategy_response: {},
    description_strategy_response: '',
    follow_up: {},
    description_follow_up: '',
    narrative: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        // Load existing report data - convert checkbox arrays to objects
        const problemBehaviorObj = {};
        const activityObj = {};
        const othersInvolvedObj = {};
        const strategyResponseObj = {};
        const followUpObj = {};

        if (initialData.problem_behavior && Array.isArray(initialData.problem_behavior)) {
          initialData.problem_behavior.forEach(item => {
            problemBehaviorObj[item] = true;
          });
        } else if (initialData.problem_behavior) {
          // Handle string format if stored differently
          const behaviors = initialData.problem_behavior.split(', ');
          behaviors.forEach(item => {
            problemBehaviorObj[item] = true;
          });
        }

        if (initialData.activity && Array.isArray(initialData.activity)) {
          initialData.activity.forEach(item => {
            activityObj[item] = true;
          });
        } else if (initialData.activity) {
          const activities = initialData.activity.split(', ');
          activities.forEach(item => {
            activityObj[item] = true;
          });
        }

        if (initialData.others_involved && Array.isArray(initialData.others_involved)) {
          initialData.others_involved.forEach(item => {
            othersInvolvedObj[item] = true;
          });
        } else if (initialData.others_involved) {
          const others = initialData.others_involved.split(', ');
          others.forEach(item => {
            othersInvolvedObj[item] = true;
          });
        }

        if (initialData.strategy_response && Array.isArray(initialData.strategy_response)) {
          initialData.strategy_response.forEach(item => {
            strategyResponseObj[item] = true;
          });
        } else if (initialData.strategy_response) {
          const strategies = initialData.strategy_response.split(', ');
          strategies.forEach(item => {
            strategyResponseObj[item] = true;
          });
        }

        if (initialData.follow_up && Array.isArray(initialData.follow_up)) {
          initialData.follow_up.forEach(item => {
            followUpObj[item] = true;
          });
        } else if (initialData.follow_up) {
          const followups = initialData.follow_up.split(', ');
          followups.forEach(item => {
            followUpObj[item] = true;
          });
        }

        setFormData({
          student_name: initialData.student_name || '',
          staff_reporting: initialData.staff_reporting || '',
          date_of_incident: typeof initialData.date_of_incident === 'string'
            ? parseYmd(initialData.date_of_incident)
            : new Date(initialData.date_of_incident || new Date()),
          time_of_incident: initialData.time_of_incident
            ? String(initialData.time_of_incident).slice(0, 5)
            : format(new Date(), 'HH:mm'),
          problem_behavior: problemBehaviorObj,
          description_problem_behavior: initialData.description_problem_behavior || '',
          activity: activityObj,
          description_activity: initialData.description_activity || '',
          others_involved: othersInvolvedObj,
          description_others_involved: initialData.description_others_involved || '',
          strategy_response: strategyResponseObj,
          description_strategy_response: initialData.description_strategy_response || '',
          follow_up: followUpObj,
          description_follow_up: initialData.description_follow_up || '',
          narrative: initialData.narrative || ''
        });
      } else if (student) {
        // Create new report
        setFormData({
          student_name: student.student_name || '',
          staff_reporting: settings?.teacher_name || '',
          date_of_incident: new Date(),
          time_of_incident: format(new Date(), 'HH:mm'),
          problem_behavior: {},
          description_problem_behavior: '',
          activity: {},
          description_activity: '',
          others_involved: {},
          description_others_involved: '',
          strategy_response: {},
          description_strategy_response: '',
          follow_up: {},
          description_follow_up: '',
          narrative: ''
        });
      } else {
        setFormData({
          student_name: '',
          staff_reporting: settings?.teacher_name || '',
          date_of_incident: new Date(),
          time_of_incident: format(new Date(), 'HH:mm'),
          problem_behavior: {},
          description_problem_behavior: '',
          activity: {},
          description_activity: '',
          others_involved: {},
          description_others_involved: '',
          strategy_response: {},
          description_strategy_response: '',
          follow_up: {},
          description_follow_up: '',
          narrative: ''
        });
      }
    }
  }, [open, student, students, settings, initialData]);

  const handleChange = (field, value, checkboxField = null, checkboxValue = null) => {
    if (checkboxField !== null && checkboxValue !== null) {
      // Handle checkbox changes
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [checkboxValue]: !prev[field][checkboxValue]
        }
      }));
    } else {
      // Handle regular input changes
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleStudentChange = (value) => {
    const selected = students.find(s => String(s.id) === value) || null;
    setFormData(prev => ({
      ...prev,
      student_name: selected?.student_name || value
    }));
  };

  const handleSave = async () => {
    if (!formData.student_name?.trim()) {
      toast.error('Please enter a student name.');
      return;
    }

    if (!formData.staff_reporting?.trim()) {
      toast.error("Please fill in the staff reporting field.");
      return;
    }

    setIsSaving(true);
    try {
      // Convert checkbox objects to arrays
      const problemBehaviorArray = Object.keys(formData.problem_behavior).filter(key => formData.problem_behavior[key]);
      const activityArray = Object.keys(formData.activity).filter(key => formData.activity[key]);
      const othersInvolvedArray = Object.keys(formData.others_involved).filter(key => formData.others_involved[key]);
      const strategyResponseArray = Object.keys(formData.strategy_response).filter(key => formData.strategy_response[key]);
      const followUpArray = Object.keys(formData.follow_up).filter(key => formData.follow_up[key]);

      const reportPayload = {
        student_name: formData.student_name.trim(),
        staff_reporting: formData.staff_reporting.trim(),
        date_of_incident: format(formData.date_of_incident, 'yyyy-MM-dd'),
        time_of_incident: formData.time_of_incident || null,
        problem_behavior: problemBehaviorArray,
        description_problem_behavior: formData.description_problem_behavior?.trim() || '',
        activity: activityArray,
        description_activity: formData.description_activity?.trim() || '',
        others_involved: othersInvolvedArray,
        description_others_involved: formData.description_others_involved?.trim() || '',
        strategy_response: strategyResponseArray,
        description_strategy_response: formData.description_strategy_response?.trim() || '',
        follow_up: followUpArray,
        description_follow_up: formData.description_follow_up?.trim() || '',
        narrative: formData.narrative?.trim() || ''
      };

      await onSave(reportPayload);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving incident report:", error);
      toast.error("Failed to save incident report.");
    }
    setIsSaving(false);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('incident-print-area').innerHTML;
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Incident Report</title>
          <style>
            @page { 
              size: letter; 
              margin: 0.75in; 
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              font-size: 12px;
              line-height: 1.4;
              color: #000;
            }
            .incident-form { 
              background: white;
              min-height: 9in;
              display: flex;
              flex-direction: column;
            }
            .form-title {
              font-size: 20px;
              font-weight: bold;
              text-align: center;
              margin: 0 0 25px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header-info {
              margin-bottom: 25px;
            }
            .info-row {
              display: flex;
              align-items: center;
              margin-bottom: 15px;
              gap: 10px;
            }
            .info-label {
              font-weight: bold;
              min-width: 120px;
              font-size: 12px;
            }
            .info-box {
              border: 1px solid #000;
              padding: 6px 10px;
              min-width: 200px;
              background-color: #fff;
              font-size: 12px;
            }
            .incident-types {
              margin-bottom: 25px;
            }
            .types-label {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 10px;
              color: #000;
            }
            .types-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              border: 2px solid #000;
              padding: 15px;
              background-color: #fff;
            }
            .type-option {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 11px;
            }
            .checkbox {
              width: 16px;
              height: 16px;
              border: 2px solid #000;
              display: inline-block;
              text-align: center;
              line-height: 12px;
              font-weight: bold;
            }
            .checkbox.selected {
              background-color: #000;
              color: white;
            }
            .content-section {
              margin-bottom: 25px;
              flex-grow: 1;
            }
            .section-label {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 8px;
              color: #000;
            }
            .content-box {
              border: 2px solid #000;
              padding: 12px;
              min-height: 120px;
              background-color: #fff;
              font-size: 11px;
              line-height: 1.5;
            }
            .signature-section {
              margin-top: auto;
              padding-top: 25px;
              display: flex;
              justify-content: space-between;
              gap: 60px;
            }
            .signature-block {
              flex: 1;
            }
            .signature-line {
              border-bottom: 2px solid #000;
              height: 25px;
              margin-bottom: 6px;
              padding: 0 5px;
              display: flex;
              align-items: center;
              font-family: 'Brush Script MT', cursive;
              font-size: 16px;
              font-style: italic;
            }
            .signature-text {
              font-size: 11px;
              text-align: center;
              font-weight: bold;
            }
            @media print {
              body { 
                font-size: 11px !important; 
              }
              .content-box {
                min-height: 100px !important;
                font-size: 10px !important;
              }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between pr-10">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {readOnly ? 'View' : 'Create'} Incident Report - {formData.student_name.trim() || 'New Report'}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowPrintPreview(!showPrintPreview)} variant="outline">
              <Printer className="w-4 h-4 mr-2"/>
              {showPrintPreview ? 'Edit' : 'Preview'}
            </Button>
            {!readOnly && (
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2"/>
                {isSaving ? 'Saving...' : 'Save Report'}
              </Button>
            )}
            {/* Default DialogContent provides a close button; avoid duplicate X */}
          </div>
        </DialogHeader>
        
        {showPrintPreview ? (
          <div className="flex-grow overflow-y-auto">
            <div className="flex justify-end mb-4">
              <Button onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2"/>Print Report
              </Button>
            </div>
            <div id="incident-print-area" className="bg-white p-8">
              <div className="incident-form">
                <div className="form-title">Incident Report</div>
                
                <div className="header-info">
                  <div className="info-row">
                    <span className="info-label">Student Name:</span>
                    <div className="info-box">{formData.student_name}</div>
                  </div>
                  
                  <div className="info-row">
                    <span className="info-label">Date:</span>
                    <div className="info-box">{format(formData.incident_date, 'MMMM d, yyyy')}</div>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Time:</span>
                    <div className="info-box">{formData.incident_time || '—'}</div>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Location:</span>
                    <div className="info-box">{formData.location || 'Not specified'}</div>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Severity:</span>
                    <div className="info-box">{formData.severity_level || 'Unspecified'}</div>
                  </div>
                </div>

                <div className="incident-types">
                  <div className="types-label">Incident Type</div>
                  <div className="types-grid">
                    {INCIDENT_TYPES.map(type => (
                      <div key={type} className="type-option">
                        <span className={`checkbox ${formData.incident_type === type ? 'selected' : ''}`}>
                          {formData.incident_type === type ? '✓' : ''}
                        </span>
                        <span>{type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="content-section">
                  <div className="section-label">Incident Summary</div>
                  <div className="content-box">{formData.incident_summary}</div>
                </div>

                <div className="content-section">
                  <div className="section-label">Description of Incident</div>
                  <div className="content-box">{formData.description || 'No additional description provided.'}</div>
                </div>

                {formData.other_participants && (
                  <div className="content-section">
                    <div className="section-label">Other Youth Present</div>
                    <div className="content-box">{formData.other_participants}</div>
                  </div>
                )}

                <div className="content-section">
                  <div className="section-label">Interventions Used</div>
                  <div className="content-box">{formData.interventions || 'Not documented.'}</div>
                </div>

                <div className="content-section">
                  <div className="section-label">Outcome</div>
                  <div className="content-box">{formData.outcome || 'Not documented.'}</div>
                </div>

                <div className="content-section">
                  <div className="section-label">Follow-Up / Recommendations</div>
                  <div className="content-box">
                    {formData.follow_up_notes || 'Not documented.'}
                    <br />
                    <br />
                    <strong>Follow-Up Required:</strong> {formData.follow_up_required ? 'Yes' : 'No'}
                  </div>
                </div>

                <div className="signature-section">
                  <div className="signature-block">
                    <div className="signature-line">{formData.staff_signature}</div>
                    <div className="signature-text">Staff Signature</div>
                  </div>
                  <div className="signature-block">
                    <div className="signature-line">{format(new Date(), 'MM/dd/yyyy')}</div>
                    <div className="signature-text">Date</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto p-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 max-w-4xl mx-auto">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Student's Name *</Label>
                    <Input
                      value={formData.student_name}
                      onChange={(e) => handleChange('student_name', e.target.value)}
                      placeholder="Enter student's name"
                      readOnly={readOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Staff Reporting *</Label>
                    <Input
                      value={formData.staff_reporting}
                      onChange={(e) => handleChange('staff_reporting', e.target.value)}
                      placeholder="Enter staff name"
                      readOnly={readOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Date of Incident</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start" disabled={readOnly}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.date_of_incident, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.date_of_incident}
                          onSelect={(date) => date && handleChange('date_of_incident', date)}
                          disabled={readOnly}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Time of Incident</Label>
                    <Input
                      type="time"
                      value={formData.time_of_incident}
                      onChange={(e) => handleChange('time_of_incident', e.target.value)}
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </div>
                </div>

                {/* Problem Behavior */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Problem Behavior</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PROBLEM_BEHAVIORS.map(behavior => (
                      <div key={behavior} className="flex items-center space-x-2">
                        <Checkbox
                          id={`problem-${behavior}`}
                          checked={formData.problem_behavior[behavior] || false}
                          onCheckedChange={(checked) => handleChange('problem_behavior', checked, 'problem_behavior', behavior)}
                          disabled={readOnly}
                        />
                        <Label htmlFor={`problem-${behavior}`} className="text-sm">{behavior}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Description of Problem Behavior</Label>
                    <Textarea
                      value={formData.description_problem_behavior}
                      onChange={(e) => handleChange('description_problem_behavior', e.target.value)}
                      placeholder="Describe the problem behavior..."
                      className="min-h-[80px]"
                      readOnly={readOnly}
                    />
                  </div>
                </div>

                {/* Activity */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Activity</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ACTIVITIES.map(activity => (
                      <div key={activity} className="flex items-center space-x-2">
                        <Checkbox
                          id={`activity-${activity}`}
                          checked={formData.activity[activity] || false}
                          onCheckedChange={(checked) => handleChange('activity', checked, 'activity', activity)}
                          disabled={readOnly}
                        />
                        <Label htmlFor={`activity-${activity}`} className="text-sm">{activity}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Description of Activity</Label>
                    <Textarea
                      value={formData.description_activity}
                      onChange={(e) => handleChange('description_activity', e.target.value)}
                      placeholder="Describe the activity..."
                      className="min-h-[80px]"
                      readOnly={readOnly}
                    />
                  </div>
                </div>

                {/* Others Involved */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Others Involved</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {OTHERS_INVOLVED.map(person => (
                      <div key={person} className="flex items-center space-x-2">
                        <Checkbox
                          id={`others-${person}`}
                          checked={formData.others_involved[person] || false}
                          onCheckedChange={(checked) => handleChange('others_involved', checked, 'others_involved', person)}
                          disabled={readOnly}
                        />
                        <Label htmlFor={`others-${person}`} className="text-sm">{person}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Description of Others Involved</Label>
                    <Textarea
                      value={formData.description_others_involved}
                      onChange={(e) => handleChange('description_others_involved', e.target.value)}
                      placeholder="Describe who else was involved..."
                      className="min-h-[80px]"
                      readOnly={readOnly}
                    />
                  </div>
                </div>

                {/* Strategy/Response */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Strategy/Response</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {STRATEGY_RESPONSES.map(strategy => (
                      <div key={strategy} className="flex items-center space-x-2">
                        <Checkbox
                          id={`strategy-${strategy}`}
                          checked={formData.strategy_response[strategy] || false}
                          onCheckedChange={(checked) => handleChange('strategy_response', checked, 'strategy_response', strategy)}
                          disabled={readOnly}
                        />
                        <Label htmlFor={`strategy-${strategy}`} className="text-sm">{strategy}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Description of Strategy/Response</Label>
                    <Textarea
                      value={formData.description_strategy_response}
                      onChange={(e) => handleChange('description_strategy_response', e.target.value)}
                      placeholder="Describe the strategy or response used..."
                      className="min-h-[80px]"
                      readOnly={readOnly}
                    />
                  </div>
                </div>

                {/* Follow-Up */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Follow-Up (if applicable)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {FOLLOW_UP_OPTIONS.map(option => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`followup-${option}`}
                          checked={formData.follow_up[option] || false}
                          onCheckedChange={(checked) => handleChange('follow_up', checked, 'follow_up', option)}
                          disabled={readOnly}
                        />
                        <Label htmlFor={`followup-${option}`} className="text-sm">{option}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Description of Follow-Up</Label>
                    <Textarea
                      value={formData.description_follow_up}
                      onChange={(e) => handleChange('description_follow_up', e.target.value)}
                      placeholder="Describe the follow-up needed..."
                      className="min-h-[80px]"
                      readOnly={readOnly}
                    />
                  </div>
                </div>

                {/* Narrative */}
                <div className="space-y-2">
                  <Label>Narrative (if more detail is needed)</Label>
                  <Textarea
                    value={formData.narrative}
                    onChange={(e) => handleChange('narrative', e.target.value)}
                    placeholder="Provide any additional details about the incident..."
                    className="min-h-[120px]"
                    readOnly={readOnly}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
