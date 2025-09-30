import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BEHAVIOR_SECTION_KEYS, calculateAverageFromSlots, calculateSectionAverages } from "@/utils/behaviorMetrics";
import { format } from "date-fns";

const SECTION_LABELS = {
  ai: "Adult Interaction (AI)",
  pi: "Peer Interaction (PI)",
  ce: "Classroom Expectations (CE)"
};

const roundDisplay = (average, count) => {
  if (!count || Number.isNaN(average)) return "--";
  return average.toFixed(2);
};

export default function EndOfDayReportDialog({ open, onOpenChange, students, evaluations, date }) {
  const rows = students.map(student => {
    const evaluation = evaluations.find(e => e.student_id === student.id);
    if (!evaluation || !evaluation.time_slots) {
      return {
        id: student.id,
        name: student.student_name,
        sections: BEHAVIOR_SECTION_KEYS.reduce((acc, key) => {
          acc[key] = { average: 0, count: 0 };
          return acc;
        }, {}),
        overall: { average: 0, count: 0 },
        hasData: false
      };
    }

    const sections = calculateSectionAverages(evaluation.time_slots);
    const overall = calculateAverageFromSlots(evaluation.time_slots);

    return {
      id: student.id,
      name: student.student_name,
      sections,
      overall,
      hasData: overall.count > 0 || BEHAVIOR_SECTION_KEYS.some(key => sections[key]?.count > 0)
    };
  });

  const aggregates = rows.reduce((acc, row) => {
    BEHAVIOR_SECTION_KEYS.forEach(key => {
      const section = row.sections[key];
      if (section?.count) {
        acc.sections[key].sum += section.average * section.count;
        acc.sections[key].count += section.count;
      }
    });
    if (row.overall.count) {
      acc.overall.sum += row.overall.average * row.overall.count;
      acc.overall.count += row.overall.count;
    }
    return acc;
  }, {
    sections: BEHAVIOR_SECTION_KEYS.reduce((acc, key) => {
      acc[key] = { sum: 0, count: 0 };
      return acc;
    }, {}),
    overall: { sum: 0, count: 0 }
  });

  const overallRow = {
    sections: BEHAVIOR_SECTION_KEYS.reduce((acc, key) => {
      const data = aggregates.sections[key];
      if (!data.count) {
        acc[key] = "--";
      } else {
        const average = data.sum / data.count;
        acc[key] = average.toFixed(2);
      }
      return acc;
    }, {}),
    overall: aggregates.overall.count ? (aggregates.overall.sum / aggregates.overall.count).toFixed(2) : "--"
  };

  const handlePrint = () => {
    const printContent = document.getElementById("end-of-day-report");
    if (!printContent) return;

    const printWindow = window.open("", "", "height=800,width=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>End of Day Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
            h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
            p { text-align: center; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #CBD5F5; padding: 8px 10px; text-align: center; font-size: 12px; }
            th { background: #E2E8F0; font-weight: 600; }
            tfoot td { font-weight: 700; background: #F1F5F9; }
          </style>
        </head>
        <body>${printContent.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  };

  const reportDate = date ? format(new Date(date), "MMMM d, yyyy") : format(new Date(), "MMMM d, yyyy");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>End of Day Averages</DialogTitle>
          <Button onClick={handlePrint}>Print</Button>
        </DialogHeader>
        <div id="end-of-day-report" className="space-y-3">
          <div className="flex items-center gap-4 mb-4">
            <img src="/best-logo.png" alt="BEST Logo" className="w-16 h-16" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Daily Average Score Report</h1>
              <p className="text-sm text-slate-600">{reportDate}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-slate-200 text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left">Student</th>
                  {BEHAVIOR_SECTION_KEYS.map(key => (
                    <th key={key} className="px-3 py-2">{SECTION_LABELS[key]}</th>
                  ))}
                  <th className="px-3 py-2">Overall Average</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 text-left font-medium text-slate-800">{row.name}</td>
                    {BEHAVIOR_SECTION_KEYS.map(key => (
                      <td key={key} className="px-3 py-2 text-slate-700">
                        {roundDisplay(row.sections[key]?.average, row.sections[key]?.count)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-slate-900 font-semibold">
                      {roundDisplay(row.overall.average, row.overall.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-300">
                  <td className="px-3 py-2 text-left font-semibold text-slate-900">Overall Average</td>
                  {BEHAVIOR_SECTION_KEYS.map(key => (
                    <td key={key} className="px-3 py-2 font-semibold text-slate-900">{overallRow.sections[key]}</td>
                  ))}
                  <td className="px-3 py-2 font-semibold text-slate-900">{overallRow.overall}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
