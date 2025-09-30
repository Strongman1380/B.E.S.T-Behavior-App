import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Download, Users, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Student, DailyEvaluation } from '@/api/entities';
import { aiService } from '@/services/aiService';

export default function SummaryReports() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState('');
  const [reportHtml, setReportHtml] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
    setDefaultDates();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await Student.filter({ active: true });
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    }
  };

  const setDefaultDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7); // Default to past week
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const handleGenerateReport = async (studentId, reportType) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    setLoading(true);
    setReport('');
    setReportHtml('');
    
    try {
      // Set date range based on report type
      const end = new Date();
      const start = new Date();
      
      if (reportType === 'weekly') {
        start.setDate(end.getDate() - 7);
      } else if (reportType === 'monthly') {
        start.setDate(end.getDate() - 30);
      } else if (reportType === 'custom') {
        start.setTime(new Date(startDate).getTime());
        end.setTime(new Date(endDate).getTime());
      }

      const startDateString = start.toISOString().split('T')[0];
      const endDateString = end.toISOString().split('T')[0];

      // Fetch evaluations for this student
      const evaluations = await DailyEvaluation.filter({
        student_id: studentId,
        evaluation_date: { $gte: startDateString, $lte: endDateString }
      });

      // Generate AI summary
      let aiSummary = '';
      try {
        const commentsData = evaluations.flatMap(evaluation => 
          evaluation.time_slots?.map(slot => ({
            content: slot.comments || 'No comments',
            type: 'evaluation',
            source: 'Daily Evaluation',
            date: evaluation.evaluation_date || evaluation.date,
          })) || []
        ).filter(comment => comment.content !== 'No comments');

        const analysis = await aiService.generateBehaviorSummary(
          commentsData,
          { start: startDateString, end: endDateString },
          {
            studentId: studentId,
            studentName: student.student_name,
            forceRefresh: true
          }
        );

        aiSummary = analysis.general_overview || analysis.strengths || analysis.recommendations || 'AI analysis completed successfully.';
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        aiSummary = 'AI analysis temporarily unavailable. Manual review of evaluation data is recommended.';
      }

      // Calculate statistics
      const allScores = evaluations.flatMap(evaluation => 
        evaluation.time_slots?.flatMap(slot => [
          slot.peer_interaction,
          slot.adult_interaction,
          slot.classroom_expectations
        ]).filter(score => score && score > 0) || []
      );

      const avgScore = allScores.length > 0 ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(2) : 'N/A';
      const count4 = allScores.filter(score => score === 4).length;
      const count3 = allScores.filter(score => score === 3).length;
      const count2 = allScores.filter(score => score === 2).length;
      const count1 = allScores.filter(score => score === 1).length;

      // Collect incidents
      const allIncidents = evaluations.flatMap(evaluation => 
        evaluation.time_slots?.map(slot => slot.comments).filter(comment => 
          comment && comment.trim().length > 0 && 
          (comment.toLowerCase().includes('incident') || comment.toLowerCase().includes('issue') || comment.toLowerCase().includes('problem'))
        ) || []
      );

      const progressSummary = aiSummary;

      // Generate text report
      const textReport = `
BEHAVIORAL SUMMARY REPORT
Student: ${student.student_name}
Period: ${startDateString} to ${endDateString}
Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}

PERFORMANCE SUMMARY:
- Average Score: ${avgScore}
- Excellent (4): ${count4}
- Good (3): ${count3} 
- Needs Work (2): ${count2}
- Concern (1): ${count1}
- Total Evaluations: ${evaluations.length}

BEHAVIORAL ANALYSIS:
${progressSummary}

INCIDENTS:
${allIncidents.length > 0 ? allIncidents.map((incident, i) => `${i + 1}. ${incident}`).join('\n') : 'No behavioral incidents reported during this period.'}
      `;

      setReport(textReport);

      // Generate HTML for PDF
      const html = `
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6; 
            color: #333;
          }
          .report-container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 30px; 
            display: flex; 
            align-items: center;
          }
          .header-logo { 
            width: 80px; 
            height: 80px; 
            margin-right: 20px; 
            background: white;
            border-radius: 12px;
            padding: 8px;
          }
          .header-content h1 { 
            font-size: 28px; 
            margin: 0; 
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .header-content h2 { 
            font-size: 20px; 
            margin: 8px 0 0 0; 
            font-weight: 400;
            opacity: 0.9;
          }
          .period { 
            font-size: 16px; 
            margin-top: 8px;
            opacity: 0.8;
          }
          .content { 
            padding: 40px; 
          }
          .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 20px; 
            margin-bottom: 40px;
          }
          .stat-card { 
            background: white;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            border: 1px solid #e1e8ed;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
          }
          .stat-card.average::before { background: linear-gradient(90deg, #3498db, #2980b9); }
          .stat-card.excellent::before { background: linear-gradient(90deg, #27ae60, #229954); }
          .stat-card.good::before { background: linear-gradient(90deg, #f39c12, #e67e22); }
          .stat-card.improvement::before { background: linear-gradient(90deg, #e74c3c, #c0392b); }
          .stat-card.concern::before { background: linear-gradient(90deg, #8e44ad, #7d3c98); }
          .stat-card:hover { 
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          }
          .stat-number { 
            display: block; 
            font-size: 36px; 
            font-weight: 800; 
            margin-bottom: 8px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .stat-label { 
            font-weight: 600; 
            color: #2c3e50;
            font-size: 14px;
            margin-bottom: 4px;
          }
          .stat-description { 
            font-size: 12px; 
            color: #7f8c8d;
            font-style: italic;
          }
          .section { 
            margin-bottom: 40px; 
            background: #f8f9fa;
            border-radius: 12px;
            padding: 30px;
            border: 1px solid #e9ecef;
          }
          .section-title { 
            font-size: 20px; 
            font-weight: 600; 
            color: #2c3e50;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #ecf0f1;
            display: flex;
            align-items: center;
          }
          .section-title::before {
            content: '';
            width: 4px;
            height: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            margin-right: 12px;
            border-radius: 2px;
          }
          .incidents-list { 
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #e74c3c;
          }
          .incidents-list ul { 
            list-style: none; 
          }
          .incidents-list li { 
            padding: 8px 0;
            border-bottom: 1px solid #ecf0f1;
            position: relative;
            padding-left: 20px;
          }
          .incidents-list li::before {
            content: '⚠';
            position: absolute;
            left: 0;
            color: #e74c3c;
            font-weight: bold;
          }
          .incidents-list li:last-child { 
            border-bottom: none; 
          }
          .no-incidents {
            text-align: center;
            color: #27ae60;
            font-weight: 600;
            padding: 20px;
            background: linear-gradient(135deg, #d5f4e6, #fafbfc);
            border-radius: 8px;
            border-left: 4px solid #27ae60;
          }
          .no-incidents::before {
            content: '✓';
            font-size: 24px;
            display: block;
            margin-bottom: 8px;
          }
          .progress-summary { 
            background: linear-gradient(135deg, #f8f9fa, #ffffff);
            border-radius: 12px;
            padding: 25px;
            border: 1px solid #e9ecef;
            line-height: 1.8;
            font-size: 15px;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
          }
          @media print {
            body { padding: 0; }
            .report-container { 
              box-shadow: none; 
              border-radius: 0;
              max-width: none;
            }
            .stat-card:hover { 
              transform: none;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            @page { 
              margin: 0.5in;
              size: A4;
            }
          }
        </style>
        <div class="report-container">
          <div class="header">
            <img src="/best-logo.png" alt="BEST Logo" class="header-logo" />
            <div class="header-content">
              <h1>Behavioral Summary Report</h1>
              <h2>${student.student_name}</h2>
              <div class="period">${startDateString} to ${endDateString}</div>
            </div>
          </div>
          
          <div class="content">
            <div class="stats-grid">
              <div class="stat-card average">
                <span class="stat-number">${avgScore}</span>
                <div class="stat-label">Average Score</div>
                <div class="stat-description">Overall Performance</div>
              </div>
              <div class="stat-card excellent">
                <span class="stat-number">${count4}</span>
                <div class="stat-label">Excellent (4)</div>
                <div class="stat-description">Exceeds Expectations</div>
              </div>
              <div class="stat-card good">
                <span class="stat-number">${count3}</span>
                <div class="stat-label">Good (3)</div>
                <div class="stat-description">Meets Expectations</div>
              </div>
              <div class="stat-card improvement">
                <span class="stat-number">${count2}</span>
                <div class="stat-label">Needs Work (2)</div>
                <div class="stat-description">Needs Improvement</div>
              </div>
              <div class="stat-card concern">
                <span class="stat-number">${count1}</span>
                <div class="stat-label">Concern (1)</div>
                <div class="stat-description">Does Not Meet Expectations</div>
              </div>
            </div>
            
            <div class="section">
              <h3 class="section-title">Behavioral Incidents</h3>
              ${allIncidents.length ? `
                <div class="incidents-list">
                  <ul>
                    ${allIncidents.map(incident => `<li>${incident}</li>`).join('')}
                  </ul>
                </div>
              ` : `
                <div class="no-incidents">
                  No behavioral incidents reported during this period
                </div>
              `}
            </div>
            
            <div class="section">
              <h3 class="section-title">Behavioral Progress Analysis</h3>
              <div class="progress-summary">
                ${progressSummary}
              </div>
            </div>
          </div>
        </div>
      `;
      setReportHtml(html);
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
    
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
