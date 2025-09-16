import { useState, useEffect } from "react";
import { Student, DailyEvaluation, IncidentReport, BehaviorSummary } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function SummaryReports() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportType, setReportType] = useState("");
  const [report, setReport] = useState("");
  const [reportHtml, setReportHtml] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Student.filter({ active: true }, "student_name").then(setStudents);
  }, []);

  const handleGenerateReport = async (studentId, type) => {
    setSelectedStudent(studentId);
    setReportType(type);
    setLoading(true);
    let start, end;
    if (type === "weekly") {
      end = format(new Date(), "yyyy-MM-dd");
      start = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
    } else if (type === "monthly") {
      end = format(new Date(), "yyyy-MM-dd");
      start = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
    } else {
      start = startDate;
      end = endDate;
    }
    // Aggregate student data
    const student = students.find(s => s.id === studentId);
    const evaluations = await DailyEvaluation.filter({ student_id: studentId });
    const incidents = await IncidentReport.filter({ student_id: studentId });
    const summaries = await BehaviorSummary.filter({ student_id: studentId });
    // Filter by date range
    const evalsInRange = evaluations.filter(ev => ev.date >= start && ev.date <= end);
    const incidentsInRange = incidents.filter(inc => inc.incident_date >= start && inc.incident_date <= end);
    const summariesInRange = summaries.filter(s => s.date_range_start >= start && s.date_range_end <= end);

    // Calculate stats and collect problematic behaviors
    let totalScore = 0, scoreCount = 0, count4 = 0, count2 = 0, count1 = 0;
    let problematicBehaviors = [];
    evalsInRange.forEach(ev => {
      Object.entries(ev.time_slots || {}).forEach(([slotName, slot]) => {
        if (typeof slot.rating === 'number') {
          totalScore += slot.rating;
          scoreCount++;
          if (slot.rating === 4) count4++;
          if (slot.rating === 2) count2++;
          if (slot.rating === 1) count1++;
          if (slot.rating === 2 || slot.rating === 1) {
            problematicBehaviors.push({
              date: ev.date,
              slot: slotName,
              rating: slot.rating,
              notes: slot.notes || '',
            });
          }
        }
      });
    });
    const avgScore = scoreCount ? (totalScore / scoreCount).toFixed(2) : 'N/A';

    // Collect all behavioral incidents/issues from summaries
    const summaryIncidents = summariesInRange
      .map(s => s.behavioral_incidents)
      .filter(Boolean)
      .flat();

    // Compose incidents section
    let allIncidents = [];
    if (incidentsInRange.length) {
      allIncidents = allIncidents.concat(incidentsInRange.map(i => `- ${i.incident_date}: ${i.incident_type} (${i.incident_description})`));
    }
    if (summaryIncidents.length) {
      allIncidents = allIncidents.concat(summaryIncidents.map((issue, idx) => `- (Summary) ${issue}`));
    }
    // Add problematic behaviors rated 2 or 1
    if (problematicBehaviors.length) {
      allIncidents = allIncidents.concat(problematicBehaviors.map(pb => `- ${pb.date}: Behavior '${pb.slot}' rated ${pb.rating}${pb.notes ? ` (${pb.notes})` : ''}`));
    }

    // Enhanced behavioral progress summary
    let progressSummary = "";
    if (scoreCount === 0) {
      progressSummary = "No behavioral data available for this period.";
    } else {
      // Analyze trends
      const firstEval = evalsInRange[0];
      const lastEval = evalsInRange[evalsInRange.length - 1];
      let firstAvg = null, lastAvg = null;
      if (firstEval && lastEval) {
        const getAvg = ev => {
          let t = 0, c = 0;
          Object.values(ev.time_slots || {}).forEach(slot => {
            if (typeof slot.rating === 'number') {
              t += slot.rating;
              c++;
            }
          });
          return c ? t / c : null;
        };
        firstAvg = getAvg(firstEval);
        lastAvg = getAvg(lastEval);
      }
      let trend = "";
      if (firstAvg !== null && lastAvg !== null) {
        if (lastAvg > firstAvg) trend = "There is a positive trend in behavioral scores over the period.";
        else if (lastAvg < firstAvg) trend = "There is a negative trend in behavioral scores over the period.";
        else trend = "Behavioral scores remained stable over the period.";
      }

      // Compose summary
      progressSummary = `During this reporting period, ${student.student_name} received an average score of ${avgScore}. ${trend} The student received ${count4} ratings of 4 (exceeds expectations), ${count2} ratings of 2, and ${count1} ratings of 1 (does not meet expectations).`;
      if (problematicBehaviors.length) {
        progressSummary += ` There were ${problematicBehaviors.length} instances where behaviors were rated as needing improvement (2) or not meeting expectations (1).`;
      }
      if (summaryIncidents.length) {
        progressSummary += ` Additional behavioral concerns were noted in summary reports.`;
      }
      if (allIncidents.length === 0) {
        progressSummary += ` No major incidents or problematic behaviors were recorded.`;
      }
    }

    // Compose report
    const summary = `Summary for ${student.student_name} (${start} to ${end}):\n\nAverage Score: ${avgScore}\nNumber of 4's: ${count4} (4 = Exceeds expectations)\nNumber of 2's: ${count2} (2 = Needs Improvement)\nNumber of 1's: ${count1} (1 = Does not meet expectations)\n\nIncidents:\n${allIncidents.length ? allIncidents.join('\n') : 'None'}\n\nBehavioral Progress:\n${progressSummary}\n`;
    setReport(summary);
    // HTML for PDF/print
    const html = `<div style='font-family:Arial;padding:24px;max-width:700px;'>
      <h2>Summary Report</h2>
      <h3>${student.student_name}</h3>
      <p><b>Reporting Period:</b> ${start} to ${end}</p>
      <p><b>Average Score:</b> ${avgScore}</p>
      <p><b>Number of 4's:</b> ${count4} <span style='color:green;'>(4 = Exceeds expectations)</span></p>
      <p><b>Number of 2's:</b> ${count2} <span style='color:orange;'>(2 = Needs Improvement)</span></p>
      <p><b>Number of 1's:</b> ${count1} <span style='color:red;'>(1 = Does not meet expectations)</span></p>
      <h4>Incidents</h4>
      <ul>${allIncidents.length ? allIncidents.map(i => `<li>${i}</li>`).join('') : '<li>None</li>'}</ul>
      <h4>Behavioral Progress</h4>
      <p>${progressSummary}</p>
    </div>`;
    setReportHtml(html);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Summary Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {students.map(student => (
                  <div key={student.id} className="flex items-center justify-between border-b py-2">
                    <span>{student.student_name}</span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleGenerateReport(student.id, "weekly")}>Weekly</Button>
                      <Button size="sm" onClick={() => handleGenerateReport(student.id, "monthly")}>Monthly</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Custom Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <label>Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <label>End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                <Button disabled={!startDate || !endDate || !selectedStudent} onClick={() => handleGenerateReport(selectedStudent, "custom")}>Generate Custom Report</Button>
              </div>
              {loading && <div className="mt-4 text-blue-600">Generating report...</div>}
              {report && <div className="mt-4 p-4 bg-slate-100 rounded border whitespace-pre-line">{report}</div>}
              {reportHtml && (
                <Button className="mt-4" onClick={() => {
                  const printWindow = window.open('', '', 'height=800,width=800');
                  printWindow.document.write(`
                    <html><head><title>Summary Report</title></head><body>${reportHtml}</body></html>
                  `);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
                }}>Print / Save PDF</Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
