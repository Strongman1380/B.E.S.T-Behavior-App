
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Printer } from 'lucide-react';

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
            table.schedule th { background: #f4f4f4; text-align: center; font-weight: 700; }
            .time-cell { width: 28%; text-align: center; font-size: 12px; }
            .rating-cell { width: 18%; text-align: center; font-size: 16px; font-weight: 700; letter-spacing: 2px; }
            .comment-cell { width: 54%; font-size: 12px; min-height: 48px; }
            .rating-cell .num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; border: 1px solid transparent; margin: 0 6px; font-weight: 700; }
            .rating-cell .num.selected { border-color: #000; border-width: 4px; }
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
            students.map((student, index) => {
              const evaluation = getEvaluationForStudent(student.id);
              if (!evaluation) return null;
              return (
                <div key={student.id} className={`sheet p-8 bg-white shadow-sm ${index > 0 ? 'page-break' : 'no-page-break'}`}>
                  <div className="title">BEHAVIOR MONITORING SCHEDULE</div>
                  <div className="meta">
                    <div><span class="label">Student Name:</span> {student.student_name}</div>
                    <div><span class="label">Date:</span> {format(new Date(date), 'MMMM d, yyyy')}</div>
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
