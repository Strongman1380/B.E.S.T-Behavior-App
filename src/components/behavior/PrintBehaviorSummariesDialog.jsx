
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BehaviorSummary } from "@/api/entities";
import { format } from 'date-fns';
import { formatDateRange } from '@/utils';
import { Printer, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function PrintBehaviorSummariesDialog({ open, onOpenChange, students, settings, currentStudentId = null }) {
  const [summaries, setSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [studentMode, setStudentMode] = useState('all'); // 'all' | 'current'
  const [filterStart, setFilterStart] = useState(''); // yyyy-MM-dd
  const [filterEnd, setFilterEnd] = useState(''); // yyyy-MM-dd

  useEffect(() => {
    if (open) {
      loadSummaries();
      // Reset filters on open
      setStudentMode('all');
      setFilterStart('');
      setFilterEnd('');
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

  // Allow printing summaries even if some fields are blank, as long as they have student and date range
  const printableSummaries = summaries.filter(s => s && s.student_id && s.date_range_start && s.date_range_end);

  // Apply student filter (all or current)
  const byStudent = printableSummaries.filter(s => {
    if (studentMode === 'current' && currentStudentId) return s.student_id === currentStudentId;
    if (studentMode === 'current' && !currentStudentId) return false; // no current context
    return true;
  });

  // Apply date range overlap filter if provided
  const overlapsRange = (s) => {
    if (!filterStart && !filterEnd) return true;
    const start = s.date_range_start; // 'yyyy-MM-dd'
    const end = s.date_range_end;
    if (filterStart && end < filterStart) return false; // entirely before range
    if (filterEnd && start > filterEnd) return false; // entirely after range
    return true;
  };

  const filteredSummaries = byStudent.filter(overlapsRange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between pr-10">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Print Behavior Summaries ({filteredSummaries.length})
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} disabled={filteredSummaries.length === 0 || isLoading}>
              <Printer className="w-4 h-4 mr-2"/>Print
            </Button>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="px-4 pb-2">
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Students:</label>
              <label className="text-sm flex items-center gap-1">
                <input
                  type="radio"
                  name="studentMode"
                  value="all"
                  checked={studentMode === 'all'}
                  onChange={() => setStudentMode('all')}
                />
                All
              </label>
              <label className={`text-sm flex items-center gap-1 ${!currentStudentId ? 'opacity-50' : ''}`}>
                <input
                  type="radio"
                  name="studentMode"
                  value="current"
                  disabled={!currentStudentId}
                  checked={studentMode === 'current'}
                  onChange={() => setStudentMode('current')}
                />
                Current{!currentStudentId ? ' (N/A here)' : ''}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Date range:</label>
              <input
                type="date"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              />
              {(filterStart || filterEnd || studentMode !== 'all') && (
                <Button variant="ghost" onClick={() => { setFilterStart(''); setFilterEnd(''); setStudentMode('all'); }} className="h-8">
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <div id="print-summaries-area" className="flex-grow overflow-y-auto p-4 bg-slate-50">
          {isLoading ? (
            <div className="text-center py-10">Loading summaries...</div>
          ) : filteredSummaries.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Behavior Summaries</h3>
              <p className="text-slate-500">Create behavior summaries from the Behavior Summary Reports page to print them here.</p>
            </div>
          ) : (
            filteredSummaries.map((summary) => (
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
                      {formatDateRange(summary.date_range_start, summary.date_range_end)}
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
