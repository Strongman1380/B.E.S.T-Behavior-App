import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { formatDate } from '@/utils';
import { Printer, X } from 'lucide-react';

export default function PrintDialog({ open, onOpenChange, student, evaluation, settings, date }) {
  
  useEffect(() => {
    if (open) {
      console.log("=== PrintDialog opened ===");
      console.log("Student:", student);
      console.log("Evaluation:", evaluation);
      console.log("Time slots:", evaluation?.time_slots);
      console.log("Has evaluation data:", !!evaluation);
      console.log("Evaluation keys:", evaluation ? Object.keys(evaluation) : 'none');
      console.log("==========================");
    }
  }, [open, student, evaluation]);

  const handlePrint = () => {
    const printContent = document.getElementById('single-print-area').innerHTML;
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 10px; 
              font-size: 10px;
              line-height: 1.2;
            }
            .rating-circle { 
              display: inline-block; 
              width: 18px; 
              height: 18px; 
              border: 1.5px solid #666; 
              border-radius: 50%; 
              text-align: center; 
              line-height: 15px; 
              margin-right: 4px; 
              font-size: 9px;
              font-weight: bold;
            }
            .rating-circle.selected { 
              background-color: #333; 
              color: white; 
              border-color: #333; 
            }
            /* Smiley removed: 4's represent recognition */
            .time-slot { 
              display: flex;
              border: 1px solid #ddd; 
              padding: 6px; 
              margin: 2px 0; 
              border-radius: 3px; 
              page-break-inside: avoid;
              align-items: flex-start;
            }
            .time-section {
              width: 45px;
              flex-shrink: 0;
            }
            .rating-section {
              width: 120px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
            }
            .comment-section {
              flex: 1;
              margin-left: 8px;
              padding: 4px 6px;
              background-color: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 2px;
              min-height: 20px;
              font-size: 9px;
            }
            .header { 
              margin-bottom: 12px; 
              text-align: center;
            }
            .time-header {
              font-size: 11px;
              font-weight: bold;
            }
            .general-comments {
              margin-top: 12px;
              page-break-inside: avoid;
            }
            .general-comments-box {
              padding: 6px;
              border: 1px solid #ddd;
              border-radius: 3px;
              min-height: 30px;
              font-size: 9px;
              background-color: #f8f9fa;
            }
            h1 { 
              font-size: 16px; 
              font-weight: bold; 
              margin: 0 0 4px 0; 
            }
            h2 { 
              font-size: 12px; 
              font-weight: bold; 
              margin: 8px 0 4px 0; 
            }
            .date-teacher { 
              font-size: 11px; 
              margin: 1px 0; 
              color: #666; 
            }
            @media print {
              body { 
                font-size: 9px !important; 
                padding: 8px !important;
              }
              .time-slot {
                margin: 1px 0 !important;
                padding: 4px !important;
              }
              .comment-section {
                min-height: 18px !important;
                font-size: 8px !important;
              }
              .general-comments-box {
                min-height: 25px !important;
                font-size: 8px !important;
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

  const sortTimeSlots = (a, b) => {
    const parseTime = (timeStr) => {
        let [hours, minutes] = timeStr.split(':').map(Number);
        if (hours < 8) hours += 12;
        return hours * 60 + minutes;
    };
    return parseTime(a[0]) - parseTime(b[0]);
  };

  // Define valid time slots to prevent phantom slots
  const validTimeSlots = ["8:30", "9:10", "9:50", "10:30", "11:10", "1:10", "1:50", "2:30"];

  // Filter time slots to only show valid ones
  const getValidTimeSlots = (timeSlots) => {
    if (!timeSlots) return [];
    return Object.entries(timeSlots)
      .filter(([time]) => validTimeSlots.includes(time))
      .sort(sortTimeSlots);
  };

  if (!evaluation || !evaluation.time_slots || Object.keys(evaluation.time_slots).length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No Data to Print</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="mb-4">No evaluation data found for {student?.student_name}.</p>
            <p className="text-sm text-slate-500">
              Make sure you have completed at least one time slot evaluation for this student before printing.
            </p>
          </div>
          <div className="flex justify-end p-4">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Print Report for {student?.student_name}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2"/>Print</Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="w-4 h-4"/></Button>
          </div>
        </DialogHeader>
        <div id="single-print-area" className="p-4 max-h-[75vh] overflow-y-auto">
          <div className="header">
            <h1>{student?.student_name}’s Daily Report</h1>
            <div className="date-teacher">Date: {formatDate(date, 'MMMM d, yyyy')}</div>
            <div className="date-teacher">Teacher: {evaluation.teacher_name || settings?.teacher_name || 'Not Set'}</div>
          </div>
          
          <div>
            {getValidTimeSlots(evaluation.time_slots).map(([time, data]) => {
              const isDismissed = time === "2:30";
              return (
                <div key={time} className="time-slot">
                  <div className="time-section">
                    <div className="time-header">{time}</div>
                  </div>
                  <div className="rating-section">
                    {isDismissed ? (
                      <span style={{fontWeight: 'bold', fontSize: '10px'}}>{data?.status || 'N/A'}</span>
                    ) : (
                      <span>
                        {[4, 3, 2, 1].map(rating => (
                          <span 
                            key={rating} 
                            className={`rating-circle ${data?.rating === rating ? 'selected' : ''}`}
                          >
                            {rating}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="comment-section">
                    {data?.comment || 'No comment'}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="general-comments">
            <h2>General Comments</h2>
            <div className="general-comments-box">
              {evaluation.general_comments || 'No general comments'}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
