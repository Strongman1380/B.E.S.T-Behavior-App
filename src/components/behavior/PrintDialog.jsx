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
            body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #000; }
            .title { text-align: center; font-size: 22px; font-weight: 800; letter-spacing: .5px; margin-bottom: 6px; text-transform: uppercase; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .meta .label { font-weight: 600; }
            table.schedule { width: 100%; border-collapse: collapse; margin-top: 8px; }
            table.schedule th, table.schedule td { border: 1px solid #000; padding: 10px; vertical-align: top; }
            table.schedule th { background: #f4f4f4; text-align: center; font-weight: 700; }
            .time-cell { width: 28%; text-align: center; font-size: 12px; }
            .rating-cell { width: 25%; text-align: center; font-size: 16px; font-weight: 700; letter-spacing: 2px; }
            .comment-cell { width: 47%; font-size: 12px; min-height: 48px; }
            .rating-cell .num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; border: 1px solid transparent; margin: 0 6px; font-weight: 700; }
            .rating-cell .num.selected { border-color: #000; border-width: 4px; }
            .scale { margin-top: 12px; font-size: 12px; }
            .scale b { display: block; margin-bottom: 4px; }
            .comments { margin-top: 12px; }
            .comments .box { border: 2px solid #cfcfcf; background: #f3f3f3; padding: 10px; min-height: 90px; font-size: 12px; }
            .comments .label { font-weight: 700; margin-bottom: 4px; }
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

  const rows = [
    { key: '8:30', label: '8:30 a.m. to 9:10 a.m.' },
    { key: '9:10', label: '9:10 AM to 9:50 AM' },
    { key: '9:50', label: '9:50 AM to 10:30 AM' },
    { key: '10:30', label: '10:30 AM to 11:10 AM' },
    { key: '11:10', label: '11:10 AM to lunch' },
    { key: '1:10', label: 'after lunch to 1:10 PM' },
    { key: '1:50', label: '1:10 PM to 1:50 PM' },
    { key: '2:30', label: '1:50 PM to 2:30 PM' },
  ];

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
        <DialogHeader className="flex-row items-center justify-between pr-10">
          <DialogTitle>Print Report for {student?.student_name}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2"/>Print</Button>
          </div>
        </DialogHeader>
        <div id="single-print-area" className="p-4 max-h-[75vh] overflow-y-auto">
          <div className="title">BEHAVIOR MONITORING SCHEDULE</div>
          <div className="meta">
            <div><span class="label">Student Name:</span> {student?.student_name}</div>
            <div><span class="label">Date:</span> {formatDate(date, 'MMMM d, yyyy')}</div>
          </div>
          <table className="schedule">
            <thead>
              <tr>
                <th>Time</th>
                <th>Rating</th>
                <th>Observation/Notes/Comments</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const data = evaluation?.time_slots?.[r.key] || {};
                const selected = typeof data?.rating === 'number' ? data.rating : null;
                return (
                  <tr key={r.key}>
                    <td className="time-cell">{r.label}</td>
                    <td className="rating-cell">
                      {[1,2,3,4].map(n => (
                        <span key={n} className={`num ${selected === n ? 'selected' : ''}`}>{n}</span>
                      ))}
                    </td>
                    <td className="comment-cell">{data?.comment || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="scale">
            <b>BEHAVIOR RATING SCALE</b>
            4 = Exceeds expectations<br/>
            3 = Meets expectations<br/>
            2 = Needs Improvement/Does not meet expectations<br/>
            1 = Unsatisfactory Behavior
          </div>
          <div className="comments">
            <div className="label">COMMENTS:</div>
            <div className="box">{evaluation?.general_comments || ''}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
