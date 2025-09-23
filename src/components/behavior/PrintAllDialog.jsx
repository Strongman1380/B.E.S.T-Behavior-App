
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import { TIME_SLOTS } from "@/config/timeSlots";

export default function PrintAllDialog({ open, onOpenChange, students, evaluations, settings, date }) {
  const handlePrint = () => {
    const printContent = document.getElementById('print-all-area').innerHTML;
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print All Daily Reports</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #000; }
            .sheet { page-break-after: always; }
            .sheet:last-child { page-break-after: auto; }
            .title { text-align: center; font-size: 22px; font-weight: 800; letter-spacing: .5px; margin-bottom: 6px; text-transform: uppercase; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .meta .label { font-weight: 600; }
            table.schedule { width: 100%; border-collapse: collapse; margin-top: 8px; }
            table.schedule th, table.schedule td { border: 1px solid #000; padding: 10px; vertical-align: top; }
            table.schedule th { background: #f4f4f4; text-align: center; font-weight: 700; font-size: 12px; }
            .time-cell { width: 22%; text-align: center; font-size: 12px; font-weight: 600; }
            .score-cell { width: 10%; text-align: center; font-size: 14px; font-weight: 700; letter-spacing: 1px; }
            .comment-cell { width: 48%; font-size: 12px; min-height: 48px; }
            .scale { margin-top: 12px; font-size: 12px; }
            .scale b { display: block; margin-bottom: 4px; }
            .comments { margin-top: 12px; }
            .comments .box { border: 2px solid #cfcfcf; background: #f3f3f3; padding: 10px; min-height: 90px; font-size: 12px; }
            .comments .label { font-weight: 700; margin-bottom: 4px; }
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
  
  const rows = TIME_SLOTS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between pr-10">
            <DialogTitle>Print All Daily Reports</DialogTitle>
            <div className="flex items-center gap-2">
                <Button onClick={handlePrint} disabled={evaluations.length === 0}><Printer className="w-4 h-4 mr-2"/>Print</Button>
            </div>
        </DialogHeader>
        <div id="print-all-area" className="flex-grow overflow-y-auto p-2 bg-slate-100">
          {students.length > 0 ? (
            [...students].sort((a, b) => a.student_name.localeCompare(b.student_name)).map((student, index) => {
              const evaluation = getEvaluationForStudent(student.id);
              if (!evaluation) return null;
              return (
                <div key={student.id} className={`sheet p-8 bg-white shadow-sm ${index > 0 ? 'page-break' : 'no-page-break'}`}>
                  <div className="title">BEHAVIOR MONITORING SCHEDULE</div>
                  <div className="meta">
                    <div><span className="label">Student Name:</span> {student.student_name}</div>
                    <div><span className="label">Date:</span> {format(new Date(date), 'MMMM d, yyyy')}</div>
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
                        return (
                          <tr key={r.key}>
                            <td className="time-cell">{r.label}</td>
                            <td className="score-cell">{getValue('ai')}</td>
                            <td className="score-cell">{getValue('pi')}</td>
                            <td className="score-cell">{getValue('ce')}</td>
                            <td className="comment-cell">{data?.comment || data?.notes || ''}</td>
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
                    1 = Unsatisfactory Behavior<br/>
                    AB / NS = Program-specific codes
                  </div>
                  <div className="comments">
                    <div className="label">COMMENTS:</div>
                    <div className="box">{evaluation?.general_comments || ''}</div>
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
