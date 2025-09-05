import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, FileText, Printer, X } from "lucide-react";
import { format, parse } from "date-fns";
import { parseYmd } from "@/utils";
import { toast } from 'sonner';

const INCIDENT_TYPES = [
  "Aggressive Behavior",
  "Disruptive Behavior", 
  "Destruction of Property",
  "Cheating",
  "Refusing Redirection",
  "Property Destruction",
  "Theft"
];

export default function IncidentReportDialog({ open, onOpenChange, student, settings, onSave, initialData = null, readOnly = false }) {
  const [formData, setFormData] = useState({
    student_name: '',
    incident_date: new Date(),
    incident_type: '',
    incident_summary: '',
    staff_name: '',
    staff_signature: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        // Load existing report data
        setFormData({
          student_name: initialData.student_name || '',
          incident_date: typeof initialData.incident_date === 'string' 
            ? parseYmd(initialData.incident_date) 
            : new Date(initialData.incident_date),
          incident_type: initialData.incident_type || '',
          incident_summary: initialData.incident_summary || '',
          staff_name: initialData.staff_name || '',
          staff_signature: initialData.staff_signature || ''
        });
      } else if (student) {
        // Create new report
        setFormData({
          student_name: student.student_name || '',
          incident_date: new Date(),
          incident_type: '',
          incident_summary: '',
          staff_name: settings?.teacher_name || '',
          staff_signature: settings?.teacher_name || ''
        });
      }
    }
  }, [open, student, settings, initialData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.incident_type || !formData.incident_summary.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const reportData = {
        ...formData,
        student_id: student?.id,
        incident_date: format(formData.incident_date, 'yyyy-MM-dd'),
        created_at: new Date().toISOString()
      };
      
      await onSave(reportData);
      toast.success("Incident report saved successfully!");
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
            {readOnly ? 'View' : 'Create'} Incident Report - {formData.student_name || student?.student_name}
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
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 max-w-3xl mx-auto">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Student Name</Label>
                    <Input
                      value={formData.student_name}
                      onChange={(e) => handleChange('student_name', e.target.value)}
                      placeholder="Student name"
                      readOnly={readOnly}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Incident Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.incident_date, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.incident_date}
                          onSelect={(date) => handleChange('incident_date', date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Incident Type *</Label>
                  <Select value={formData.incident_type} onValueChange={(value) => handleChange('incident_type', value)} disabled={readOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select incident type" />
                    </SelectTrigger>
                    <SelectContent>
                      {INCIDENT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Incident Summary *</Label>
                  <Textarea
                    value={formData.incident_summary}
                    onChange={(e) => handleChange('incident_summary', e.target.value)}
                    placeholder="Provide a detailed description of the incident..."
                    className="min-h-[150px]"
                    readOnly={readOnly}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Staff Name</Label>
                    <Input
                      value={formData.staff_name}
                      onChange={(e) => handleChange('staff_name', e.target.value)}
                      placeholder="Your name"
                      readOnly={readOnly}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Electronic Signature</Label>
                    <Input
                      value={formData.staff_signature}
                      onChange={(e) => handleChange('staff_signature', e.target.value)}
                      placeholder="Type your name for signature"
                      className="font-serif italic"
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
