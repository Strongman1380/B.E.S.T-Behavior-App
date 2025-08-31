
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BehaviorSummary } from "@/api/entities";
import { format } from 'date-fns';
import { Printer, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function PrintBehaviorSummariesDialog({ open, onOpenChange, students, settings }) {
  const [summaries, setSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadSummaries();
    }
  }, [open]);

  const loadSummaries = async () => {
    setIsLoading(true);
    try {
      const summariesData = await BehaviorSummary.list('-date_range_end');
      setSummaries(summariesData);
    } catch (error) {
      toast.error("Failed to load behavior summaries.");
      console.error("Error loading summaries:", error);
    }
    setIsLoading(false);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('print-summaries-area').innerHTML;
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print All Behavior Summaries</title>
          <style>
            @page { 
              size: letter; 
              margin: 0.6in; 
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              font-size: 11px;
              line-height: 1.3;
              color: #000;
            }
            .page-break { 
              page-break-before: always; 
            }
            .no-page-break { 
              page-break-before: avoid; 
            }
            .behavior-form { 
              page-break-after: always;
              margin-bottom: 0;
              background: white;
              min-height: 9in;
              display: flex;
              flex-direction: column;
            }
            .behavior-form:last-child {
              page-break-after: avoid;
            }
            .form-title {
              font-size: 18px;
              font-weight: bold;
              text-align: center;
              margin: 0 0 18px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header-info {
              margin-bottom: 20px;
              flex-shrink: 0;
            }
            .info-row {
              display: flex;
              align-items: center;
              margin-bottom: 10px;
              gap: 8px;
            }
            .info-label {
              font-weight: bold;
              min-width: 110px;
              font-size: 11px;
            }
            .info-box {
              border: 1px solid #000;
              padding: 5px 8px;
              min-width: 180px;
              background-color: #fff;
              font-size: 11px;
            }
            .content-sections {
              flex-grow: 1;
              display: flex;
              flex-direction: column;
            }
            .content-section {
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            .section-label {
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 6px;
              text-align: left;
              color: #000;
            }
            .content-box {
              border: 2px solid #000;
              padding: 10px;
              min-height: 60px;
              background-color: #fff;
              font-size: 10px;
              line-height: 1.4;
            }
            .large-content-box {
              min-height: 80px;
            }
            .two-column {
              display: flex;
              gap: 15px;
              margin-bottom: 15px;
            }
            .column {
              flex: 1;
            }
            .signature-section {
              margin-top: auto;
              padding-top: 20px;
              display: flex;
              justify-content: space-between;
              gap: 50px;
              flex-shrink: 0;
            }
            .signature-block {
              flex: 1;
            }
            .signature-line {
              border-bottom: 2px solid #000;
              height: 20px;
              margin-bottom: 5px;
            }
            .signature-text {
              font-size: 10px;
              text-align: center;
              font-weight: bold;
            }
            
            /* Responsive content sizing */
            .content-box.auto-size {
              min-height: auto;
              height: auto;
            }
            
            /* Ensure content fits on page */
            .fit-page {
              max-height: 8.5in;
              overflow: visible;
            }
            
            @media print {
              body { 
                font-size: 10px !important; 
              }
              .behavior-form {
                min-height: 9.5in !important;
                max-height: 9.5in !important;
              }
              .form-title {
                font-size: 16px !important;
                margin-bottom: 15px !important;
              }
              .content-box {
                min-height: 50px !important;
                font-size: 9px !important;
                padding: 8px !important;
              }
              .large-content-box {
                min-height: 70px !important;
              }
              .info-box {
                font-size: 10px !important;
                padding: 4px 6px !important;
              }
              .signature-section {
                padding-top: 15px !important;
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

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.student_name : 'Unknown Student';
  };

  // Removed formatCheckboxOption - no longer using checkboxes

  const completedSummaries = summaries.filter(s => 
    s.general_behavior_overview && 
    s.strengths && 
    s.improvements_needed
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Print All Behavior Summaries ({completedSummaries.length})
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} disabled={completedSummaries.length === 0 || isLoading}>
              <Printer className="w-4 h-4 mr-2"/>Print All
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon"><X className="w-4 h-4"/></Button>
            </DialogClose>
          </div>
        </DialogHeader>
        
        <div id="print-summaries-area" className="flex-grow overflow-y-auto p-4 bg-slate-50">
          {isLoading ? (
            <div className="text-center py-10">Loading summaries...</div>
          ) : completedSummaries.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Completed Summaries</h3>
              <p className="text-slate-500">Complete behavior summaries from the Behavior Summary Reports page to print them here.</p>
            </div>
          ) : (
            completedSummaries.map((summary) => (
              <div key={summary.id} className="behavior-form">
                
                <div className="form-title">Student Behavior Summary Report</div>
                
                <div className="header-info">
                  <div className="info-row">
                    <span className="info-label">Student Name:</span>
                    <div className="info-box">{getStudentName(summary.student_id)}</div>
                  </div>
                  
                  <div className="info-row">
                    <span className="info-label">Report Period:</span>
                    <div className="info-box">
                      {format(new Date(summary.date_range_start), 'MMM d, yyyy')} - {format(new Date(summary.date_range_end), 'MMM d, yyyy')}
                    </div>
                  </div>
                  
                  <div className="info-row">
                    <span className="info-label">Prepared By:</span>
                    <div className="info-box">{summary.prepared_by || settings?.teacher_name || ''}</div>
                  </div>
                  
                  <div className="info-row">
                    <span className="info-label">School:</span>
                    <div className="info-box">{settings?.school_name || ''}</div>
                  </div>
                </div>

                <div className="content-sections">
                  <div className="content-section">
                    <div className="section-label">General Behavior Overview</div>
                    <div className="content-box large-content-box">{summary.general_behavior_overview || ''}</div>
                  </div>

                  <div className="two-column">
                    <div className="column">
                      <div className="content-section">
                        <div className="section-label">Strengths</div>
                        <div className="content-box">{summary.strengths || ''}</div>
                      </div>
                    </div>
                    <div className="column">
                      <div className="content-section">
                        <div className="section-label">Areas for Improvement</div>
                        <div className="content-box">{summary.improvements_needed || ''}</div>
                      </div>
                    </div>
                  </div>

                  {(summary.behavioral_incidents && summary.behavioral_incidents.trim()) && (
                    <div className="content-section">
                      <div className="section-label">Behavioral Incident Summary</div>
                      <div className="content-box">{summary.behavioral_incidents}</div>
                    </div>
                  )}

                  <div className="content-section">
                    <div className="section-label">Recommendations</div>
                    <div className="content-box large-content-box">{summary.summary_recommendations || ''}</div>
                  </div>
                </div>

                <div className="signature-section">
                  <div className="signature-block">
                    <div className="signature-line"></div>
                    <div className="signature-text">Teacher Signature</div>
                  </div>
                  <div className="signature-block">
                    <div className="signature-line"></div>
                    <div className="signature-text">Date</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
