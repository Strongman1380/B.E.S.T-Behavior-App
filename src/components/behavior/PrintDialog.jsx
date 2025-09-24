import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { formatDate } from '@/utils';
import { Printer, X } from 'lucide-react';
import { TIME_SLOTS } from "@/config/timeSlots";
import { getEnhancedPrintStyles, getPrintHeader, getRatingScale, getPrintFooter } from '@/utils/printStyles';

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
    const schoolName = settings?.school_name || "BEST Ed School";

    printWindow.document.write(`
      <html>
        <head>
          <title>Behavior Monitoring Schedule - ${student?.student_name}</title>
          <style>
            ${getEnhancedPrintStyles()}
          </style>
        </head>
        <body>
          ${getPrintHeader(schoolName, "Behavior Monitoring Schedule", new Date())}
          ${printContent}
          ${getPrintFooter(`Student: ${student?.student_name} | Date: ${formatDate(date, 'MMM d, yyyy')}`)}
        </body>
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

  const rows = TIME_SLOTS;

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
          <div className="report-title">Behavior Monitoring Schedule</div>
          <div className="meta-info">
            <div className="meta-item">
              <div className="meta-label">Student Name</div>
              <div className="meta-value">{student?.student_name}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Date</div>
              <div className="meta-value">{formatDate(date, 'MMMM d, yyyy')}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Teacher</div>
              <div className="meta-value">{settings?.teacher_name || 'Not specified'}</div>
            </div>
          </div>
          <table className="schedule">
            <thead>
              <tr>
                <th>Time</th>
                <th>Adult Interaction (AI)</th>
                <th>Peer Interaction (PI)</th>
                <th>Classroom Expectations (CE)</th>
                <th>Observation/Notes/Comments</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const data = evaluation?.time_slots?.[r.key] || {};
                const fallback = typeof data?.rating === 'number'
                  ? data.rating
                  : (typeof data?.score === 'number' ? data.score : '');
                const getValue = (section) => {
                  const raw = data?.[section];
                  if (raw !== undefined && raw !== null && `${raw}`.trim().length > 0) {
                    const value = `${raw}`;
                    return value === 'A/B' ? 'AB' : value;
                  }
                  return fallback !== '' ? `${fallback}` : '';
                };
                const getScoreClass = (value) => {
                  const num = parseInt(value);
                  if (num === 4) return 'score-cell score-4';
                  if (num === 3) return 'score-cell score-3';
                  if (num === 2) return 'score-cell score-2';
                  if (num === 1) return 'score-cell score-1';
                  return 'score-cell';
                };

                return (
                  <tr key={r.key}>
                    <td className="time-cell">{r.label}</td>
                    <td className={getScoreClass(getValue('ai'))}>{getValue('ai')}</td>
                    <td className={getScoreClass(getValue('pi'))}>{getValue('pi')}</td>
                    <td className={getScoreClass(getValue('ce'))}>{getValue('ce')}</td>
                    <td className="comment-cell">{data?.comment || data?.notes || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div dangerouslySetInnerHTML={{ __html: getRatingScale() }}></div>
          <div className="comments-section">
            <div className="comments-label">Additional Comments</div>
            <div className="comments-box">{evaluation?.general_comments || 'No additional comments provided.'}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
