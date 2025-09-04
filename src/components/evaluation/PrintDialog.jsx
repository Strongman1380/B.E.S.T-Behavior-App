import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { formatDate } from "@/utils";

export default function PrintDialog({ open, onOpenChange, student, evaluation, settings, date }) {
  const generatePrintContent = () => {
    if (!evaluation) return '';

    return `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <strong>Student's Name:</strong> ${student.name}
          </div>
          <div>
            <strong>Date:</strong> ${formatDate(date, 'M/d/yy')}
          </div>
        </div>
        <div style="margin-bottom: 30px;">
          <strong>Teacher's Name:</strong> ${evaluation.teacher_name || settings?.teacher_name || ''}
          <span style="margin-left: 40px;"><strong>School:</strong> ${evaluation.school || settings?.school_name || ''}</span>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          ${Object.entries(evaluation.time_slots || {}).map(([time, data]) => {
            if (time === '2:30') {
              return `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ccc; width: 60px;">${time}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: center; width: 120px;">${data.status || ''}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ccc;">${data.comment || ''}</td>
                </tr>
              `;
            } else {
              return `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ccc; width: 60px;">${time}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: center; width: 120px;">
                    ${[1,2,3,4].map(num => 
                      `<span style="margin: 0 5px; ${data.rating === num ? 'background: #000; color: #fff; padding: 2px 6px; border-radius: 50%;' : ''}">${num}</span>`
                    ).join('')}
                  </td>
                  <td style="padding: 8px; border-bottom: 1px solid #ccc;">${data.comment || ''}</td>
                </tr>
              `;
            }
          }).join('')}
        </table>
        
        <div style="margin-bottom: 30px;">
          <div><strong>4 = Productive, cooperative and on task!</strong></div>
          <div><strong>3 = Needs to Show Improvement!</strong></div>
          <div><strong>2 = Showing Disruptive Behaviors!</strong></div>
          <div><strong>1 = Unable to redirect from negative behavior!</strong></div>
        </div>
        
        <div>
          <strong>COMMENTS:</strong>
          <div style="margin-top: 10px; padding: 10px; border: 1px solid #ccc; min-height: 100px;">
            ${evaluation.general_comments || ''}
          </div>
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
