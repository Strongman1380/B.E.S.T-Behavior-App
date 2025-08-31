
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Printer, X } from 'lucide-react';

export default function PrintAllDialog({ open, onOpenChange, students, evaluations, settings, date }) {
  const handlePrint = () => {
    const printContent = document.getElementById('print-all-area').innerHTML;
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print All Daily Reports</title>
          <script src="https://cdn.tailwindcss.com"></script>
           <style>
            @media print { 
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
              .page-break { page-break-before: always; } 
              .no-page-break { page-break-before: avoid; }
            }
            body { font-size: 10px; }
            .rating-option { 
              display: inline-flex; 
              align-items: center; 
              justify-content: center; 
              width: 1.5rem; 
              height: 1.5rem; 
              font-weight: 500; 
              border: 1.5px solid #94a3b8; 
              border-radius: 9999px; 
              margin-right: 0.25rem;
              font-size: 9px;
            }
            .rating-option.selected { 
              background-color: #1e293b !important; 
              color: #ffffff !important; 
              border-color: #1e293b !important; 
            }
            .smiley-icon-container { 
              width: 1.5rem; 
              height: 1.5rem; 
              display: inline-flex; 
              align-items: center; 
              justify-content: center; 
              border: 1.5px solid #cbd5e1; 
              border-radius: 9999px; 
              margin-left: 0.5rem;
            }
            .smiley-icon-container.selected { 
              background-color: #facc15 !important; 
              border-color: #ca8a04 !important; 
            }
            .smiley-svg { 
              width: 1rem; 
              height: 1rem; 
              color: #9ca3af; 
            }
            .smiley-svg.selected { 
              color: #ffffff !important; 
            }
            .break-inside-avoid { 
              break-inside: avoid; 
            }
            .time-slot-row {
              display: flex;
              align-items: flex-start;
              padding: 4px 8px;
              margin: 2px 0;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
            }
            .time-col { width: 40px; flex-shrink: 0; font-weight: bold; font-size: 11px; }
            .rating-col { width: 140px; flex-shrink: 0; display: flex; align-items: center; }
            .comment-col { 
              flex: 1; 
              margin-left: 8px; 
              padding: 3px 6px; 
              background-color: #f8fafc; 
              border: 1px solid #e2e8f0; 
              border-radius: 3px; 
              min-height: 20px; 
              font-size: 9px;
            }
            h1 { font-size: 18px !important; margin-bottom: 8px !important; }
            h2 { font-size: 14px !important; margin: 10px 0 4px 0 !important; }
            .student-header { margin-bottom: 12px !important; }
            .general-comments { margin-top: 12px !important; }
            .general-comments-box { 
              padding: 6px !important; 
              font-size: 9px !important; 
              min-height: 30px !important; 
            }
          </style>
        </head>
        <body><div class="p-6">${printContent}</div></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const getEvaluationForStudent = (studentId) => evaluations.find(e => e.student_id === studentId);
  
  // Define the correct time slots to prevent phantom slots
  const validTimeSlots = ["8:30", "9:10", "9:50", "10:30", "11:10", "1:10", "1:50", "2:30"];
  
  const sortTimeSlots = (a, b) => {
    const parseTime = (timeStr) => {
        let [hours, minutes] = timeStr.split(':').map(Number);
        if (hours < 8) hours += 12;
        return hours * 60 + minutes;
    };
    return parseTime(a[0]) - parseTime(b[0]);
  };

  // Filter time slots to only show valid ones
  const getValidTimeSlots = (timeSlots) => {
    if (!timeSlots) return [];
    return Object.entries(timeSlots)
      .filter(([time]) => validTimeSlots.includes(time))
      .sort(sortTimeSlots);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle>Print All Daily Reports</DialogTitle>
            <div className="flex items-center gap-2">
                <Button onClick={handlePrint} disabled={evaluations.length === 0}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                <DialogClose asChild><Button variant="ghost" size="icon"><X/></Button></DialogClose>
            </div>
        </DialogHeader>
        <div id="print-all-area" className="flex-grow overflow-y-auto p-2 bg-slate-100">
          {students.length > 0 ? (
            students.map((student, index) => {
              const evaluation = getEvaluationForStudent(student.id);
              if (!evaluation) return null;
              return (
                <div key={student.id} className={`p-8 bg-white shadow-sm ${index > 0 ? 'page-break' : 'no-page-break'}`}>
                  <h1 className="text-3xl font-bold mb-1">{student.student_name}’s Daily Report</h1>
                  <p className="text-xl text-slate-600 mb-2">Date: {format(new Date(date), 'MMMM d, yyyy')}</p>
                  <p className="text-lg text-slate-500 mb-8">Teacher: {evaluation.teacher_name || settings?.teacher_name}</p>

                  <div className="space-y-1">
                    {getValidTimeSlots(evaluation.time_slots).map(([time, data]) => {
                      const isDismissed = time === "2:30";
                      return (
                        <div key={time} className="time-slot-row break-inside-avoid">
                          <div className="time-col">{time}</div>
                          <div className="rating-col">
                            {isDismissed ? (
                              <span className="font-semibold text-slate-700" style={{fontSize: '10px'}}>{data?.status || 'N/A'}</span>
                            ) : (
                              <div className="flex items-center">
                                {[4, 3, 2, 1].map(r => (
                                  <div key={r} className={`rating-option ${data?.rating === r ? 'selected' : ''}`}>{r}</div>
                                ))}
                              </div>
                            )}
                            <div className={`smiley-icon-container ${data?.has_smiley ? 'selected' : ''}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`smiley-svg ${data?.has_smiley ? 'selected' : ''}`}>
                                <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>
                              </svg>
                            </div>
                          </div>
                          <div className="comment-col">
                            {data?.comment || <span className="text-slate-400">No comment</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="general-comments break-inside-avoid">
                    <h2 className="font-bold">General Comments</h2>
                    <div className="general-comments-box p-3 border-2 border-slate-200 mt-2 rounded-xl">
                      {evaluation.general_comments || <span className="text-slate-400">No general comments</span>}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center h-full flex items-center justify-center"><p className="text-slate-500">No student evaluations to print for this date.</p></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
