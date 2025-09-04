import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { formatDate } from '@/utils';
import { Printer, X } from 'lucide-react';

export default function PrintContactLogsDialog({ open, onOpenChange, student, logs }) {
  const handlePrint = () => {
    const printContent = document.getElementById('print-logs-area');
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Contact Logs for ${student.student_name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  };

  if (!student || !logs) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between no-print">
            <DialogTitle>Print Contact Logs for {student.student_name}</DialogTitle>
            <div className="flex items-center gap-2">
                <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                <DialogClose asChild><Button variant="ghost" size="icon"><X/></Button></DialogClose>
            </div>
        </DialogHeader>
        <div id="print-logs-area" className="flex-grow overflow-y-auto p-2 bg-slate-100">
            <div className="p-8 bg-white shadow-sm">
                <h1 className="text-3xl font-bold mb-2">Contact Log Report</h1>
                <h2 className="text-xl text-slate-700 mb-6">{student.student_name}</h2>
                
                <div className="space-y-6">
                  {logs.map(log => (
                    <div key={log.id} className="border border-slate-300 p-4 rounded-lg break-inside-avoid">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                        <div className="font-medium">Date: <span className="font-normal">{formatDate(log.contact_date, 'MMMM d, yyyy')}</span></div>
                        <div className="font-medium">Category: <span className="font-normal">{log.contact_category}</span></div>
                        <div className="col-span-2 font-medium">Contact Person: <span className="font-normal">{log.contact_person_name}</span></div>
                      </div>
                      <div className="mt-2">
                        <h3 className="font-semibold text-md text-slate-800 border-b pb-1 mb-2">Purpose of Contact</h3>
                        <p className="text-slate-700 p-2 bg-slate-50 rounded min-h-[40px]">{log.purpose_of_contact}</p>
                      </div>
                       <div className="mt-4">
                        <h3 className="font-semibold text-md text-slate-800 border-b pb-1 mb-2">Outcome / Action Items</h3>
                        <p className="text-slate-700 p-2 bg-slate-50 rounded min-h-[40px]">{log.outcome_of_contact || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                   {logs.length === 0 && <p className="text-slate-500 text-center py-10">No contact logs to print for this student.</p>}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
