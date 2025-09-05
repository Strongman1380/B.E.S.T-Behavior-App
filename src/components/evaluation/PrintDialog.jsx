import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { formatDate } from "@/utils";
import { TIME_SLOTS } from "@/config/timeSlots";

export default function PrintDialog({ open, onOpenChange, student, evaluation, settings, date }) {
  const generatePrintContent = () => {
    if (!evaluation) return '';

    const rows = TIME_SLOTS;
    return `
      <div style="padding: 16px; font-family: Arial, sans-serif; color: #000;">
        <div style="text-align:center; font-size:22px; font-weight:800; letter-spacing:.5px; margin-bottom:6px; text-transform:uppercase;">BEHAVIOR MONITORING SCHEDULE</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px;">
          <div><span style="font-weight:600;">Student Name:</span> ${student.name}</div>
          <div><span style="font-weight:600;">Date:</span> ${formatDate(date, 'MMMM d, yyyy')}</div>
        </div>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="border:1px solid #000; padding:10px; background:#f4f4f4;">Time</th>
              <th style="border:1px solid #000; padding:10px; background:#f4f4f4;">Rating</th>
              <th style="border:1px solid #000; padding:10px; background:#f4f4f4;">Observation/Notes/Comments</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              const d = (evaluation.time_slots || {})[r.key] || {};
              const selected = typeof d.rating === 'number' ? d.rating : null;
              return `
                <tr>
                  <td style="border:1px solid #000; padding:10px; vertical-align:top; text-align:center; width:28%; font-size:12px;">${r.label}</td>
                  <td style="border:1px solid #000; padding:10px; vertical-align:top; text-align:center; width:18%; font-size:16px; font-weight:700; letter-spacing:2px;">
                    ${[1,2,3,4].map(n => `<span style=\"display:inline-block; width:24px; height:24px; line-height:20px; text-align:center; border-radius:50%; border:4px solid ${'${selected===n?\'#000\':\'transparent\'}'}; margin:0 6px; font-weight:700;\">${n}</span>`).join('')}
                  </td>
                  <td style="border:1px solid #000; padding:10px; vertical-align:top; width:54%; font-size:12px;">${d.comment || ''}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
        <div style="margin-top:12px; font-size:12px;">
          <b style="display:block; margin-bottom:4px;">BEHAVIOR RATING SCALE</b>
          4 = Exceeds expectations<br/>
          3 = Meets expectations<br/>
          2 = Needs Improvement/Does not meet expectations<br/>
          1 = Unsatisfactory Behavior
        </div>
        <div style="margin-top:12px;">
          <div style="font-weight:700; margin-bottom:4px;">COMMENTS:</div>
          <div style="border:2px solid #cfcfcf; background:#f3f3f3; padding:10px; min-height:90px; font-size:12px;">${evaluation.general_comments || ''}</div>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${student.name} - ${formatDate(date, 'MMMM d, yyyy')}</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
            <FileText className="w-5 h-5" />
            Print Evaluation
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-slate-600">
            Print the evaluation for <strong>{student.name}</strong> on {formatDate(date, 'MMMM d, yyyy')}.
          </p>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Print PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
