import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Download, Users, Printer, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Student, DailyEvaluation } from '@/api/entities';
import { aiService } from '@/services/aiService';

export default function SummaryReports() {
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [reportType, setReportType] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleStudentToggle = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const handleReportTypeChange = (type) => {
    setReportType(type);
    
    // Update default date ranges based on report type
    if (!useCustomDates) {
      const end = new Date();
      const start = new Date();
      
      if (type === 'weekly') {
        start.setDate(end.getDate() - 7);
      } else if (type === 'monthly') {
        start.setDate(end.getDate() - 30);
      }
      
      setEndDate(end.toISOString().split('T')[0]);
      setStartDate(start.toISOString().split('T')[0]);
    }
  };

  const generateAISummary = async (studentData, evaluations, dateRange) => {
    if (!evaluations || evaluations.length === 0) {
      return {
        overallSummary: `No evaluations found for ${studentData.student_name} during the selected period (${dateRange.start} to ${dateRange.end}).`,
        behaviorAnalysis: 'No behavioral data available for analysis.',
        recommendations: 'Recommend collecting behavioral data to provide meaningful insights.',
        keyMetrics: {
          totalEvaluations: 0,
          averageScore: 'N/A',
          trendAnalysis: 'Insufficient data'
        }
      };
    }

    try {
      // Prepare evaluation data for AI analysis
      const evaluationSummary = evaluations.map(evaluation => ({
        date: evaluation.evaluation_date || evaluation.date,
        comments: evaluation.time_slots?.map(slot => slot.comments).filter(Boolean).join(' ') || 'No comments',
        scores: evaluation.time_slots?.map(slot => ({
          peer_interaction: slot.peer_interaction,
          adult_interaction: slot.adult_interaction,
          classroom_expectations: slot.classroom_expectations
        })) || []
      }));

      // Calculate basic metrics
      const totalSlots = evaluations.reduce((sum, evaluation) => sum + (evaluation.time_slots?.length || 0), 0);
      const allScores = evaluations.flatMap(evaluation => 
        evaluation.time_slots?.flatMap(slot => [
          slot.peer_interaction,
          slot.adult_interaction,
          slot.classroom_expectations
        ]).filter(score => score && score > 0) || []
      );
      const averageScore = allScores.length > 0 ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(2) : 'N/A';

      // Generate AI-powered analysis
      const commentsData = evaluations.flatMap(evaluation => 
        evaluation.time_slots?.map(slot => ({
          content: slot.comments || 'No comments',
          type: 'evaluation',
          source: 'Daily Evaluation',
          date: evaluation.evaluation_date || evaluation.date,
          rating: slot.peer_interaction || slot.adult_interaction || slot.classroom_expectations || 3
        })) || []
      ).filter(comment => comment.content !== 'No comments');

      const analysis = await aiService.generateBehaviorSummary(
        commentsData,
        dateRange,
        {
          studentId: studentData.id,
          studentName: studentData.student_name,
          forceRefresh: true
        }
      );

      return {
        overallSummary: analysis.general_overview || `Summary for ${studentData.student_name} during ${dateRange.start} to ${dateRange.end}. ${evaluations.length} evaluation(s) recorded.`,
        behaviorAnalysis: analysis.strengths || 'Behavioral analysis based on evaluation data.',
        recommendations: analysis.recommendations || 'Continue monitoring behavioral progress and maintain consistent evaluation practices.',
        keyMetrics: {
          totalEvaluations: evaluations.length,
          averageScore: averageScore,
          trendAnalysis: analysis.incidents || 'Stable behavioral patterns observed'
        }
      };

    } catch (error) {
      console.error('Error generating AI summary:', error);
      return {
        overallSummary: `Summary for ${studentData.student_name} during ${dateRange.start} to ${dateRange.end}. ${evaluations.length} evaluation(s) recorded.`,
        behaviorAnalysis: 'AI analysis temporarily unavailable. Manual review of evaluation data recommended.',
        recommendations: 'Continue monitoring behavioral progress and maintain consistent evaluation practices.',
        keyMetrics: {
          totalEvaluations: evaluations.length,
          averageScore: 'Manual calculation needed',
          trendAnalysis: 'Manual analysis required'
        }
      };
    }
  };

  const generateBulkReports = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!reportType) {
      toast.error('Please select a report type (Weekly or Monthly)');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    setIsGenerating(true);

    try {
      toast.info(`Generating AI-powered ${reportType} reports for ${selectedStudents.length} student(s)...`);

      const dateRange = {
        start: startDate,
        end: endDate
      };

      // Generate HTML content for PDF
      let reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bulk ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Summary Reports</title>
          <style>
            @media print {
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: 'Arial', sans-serif; 
                font-size: 12px;
                line-height: 1.4;
              }
              .report-page { 
                page-break-after: always; 
                margin-bottom: 40px; 
                min-height: 100vh;
              }
              .report-page:last-child { 
                page-break-after: avoid; 
              }
              .report-header { 
                display: flex; 
                align-items: flex-start; 
                margin-bottom: 30px; 
                position: relative;
                padding-left: 110px;
                min-height: 120px;
              }
              .report-logo { 
                position: absolute; 
                top: -10px; 
                left: 0; 
                width: 100px; 
                height: 120px; 
              }
              .report-title { 
                font-size: 24px; 
                font-weight: bold; 
                margin: 0; 
                text-align: left;
                color: #2c3e50;
              }
              .report-subtitle { 
                font-size: 16px; 
                color: #7f8c8d; 
                margin: 5px 0 0 0; 
                text-align: left;
              }
              .student-info { 
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 20px; 
                border-radius: 12px; 
                margin-bottom: 25px;
                border-left: 5px solid #3498db;
              }
              .student-name {
                font-size: 20px;
                font-weight: bold;
                color: #2c3e50;
                margin: 0 0 10px 0;
              }
              .date-range { 
                font-size: 14px;
                color: #34495e; 
                margin-bottom: 8px;
                font-weight: 500;
              }
              .summary-section { 
                margin-bottom: 25px; 
                padding: 20px; 
                border: 1px solid #e0e0e0; 
                border-radius: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .summary-title { 
                font-size: 16px; 
                font-weight: bold; 
                margin: 0 0 15px 0; 
                color: #2c3e50;
                border-bottom: 2px solid #3498db;
                padding-bottom: 5px;
              }
              .summary-content { 
                line-height: 1.6; 
                color: #555;
                font-size: 12px;
              }
              .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
              }
              .metric-item {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 8px;
                text-align: center;
                border: 1px solid #dee2e6;
              }
              .metric-value {
                font-size: 18px;
                font-weight: bold;
                color: #3498db;
                display: block;
              }
              .metric-label {
                font-size: 11px;
                color: #6c757d;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .recommendations {
                background: #e8f5e8;
                border-left: 4px solid #28a745;
              }
              .analysis {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
              }
              .overview {
                background: #d1ecf1;
                border-left: 4px solid #17a2b8;
              }
            }
            @page {
              margin: 0.5in;
            }
          </style>
        </head>
        <body>
      `;

      // Process each selected student
      for (let i = 0; i < selectedStudents.length; i++) {
        const studentId = selectedStudents[i];
        const student = students.find(s => s.id === studentId);
        
        if (!student) continue;

        try {
          // Fetch evaluations for this student
          const evaluations = await DailyEvaluation.filter({
            student_id: studentId,
            evaluation_date: { $gte: startDate, $lte: endDate }
          });

          // Generate AI summary for this student
          const aiAnalysis = await generateAISummary(student, evaluations, dateRange);

          // Create student report HTML
          const studentReportHTML = `
            <div class="report-page">
              <div class="report-header">
                <img src="/best-logo.svg" alt="BEST Logo" class="report-logo" />
                <div>
                  <h1 class="report-title">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Behavior Summary Report</h1>
                  <p class="report-subtitle">Berniklau Education Solutions Team</p>
                </div>
              </div>
              
              <div class="student-info">
                <h2 class="student-name">${student.student_name}</h2>
                <p class="date-range">📅 Report Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
                <p class="date-range">📊 Total Evaluations: ${evaluations?.length || 0}</p>
                <p class="date-range">📋 Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Summary</p>
                <p class="date-range">📅 Generated: ${new Date().toLocaleDateString()}</p>
              </div>

              <div class="summary-section overview">
                <h3 class="summary-title">📝 Overall Summary</h3>
                <div class="summary-content">
                  ${aiAnalysis.overallSummary}
                </div>
              </div>

              <div class="summary-section analysis">
                <h3 class="summary-title">🔍 Behavioral Analysis</h3>
                <div class="summary-content">
                  ${aiAnalysis.behaviorAnalysis}
                </div>
              </div>

              <div class="summary-section">
                <h3 class="summary-title">📈 Key Metrics</h3>
                <div class="metrics-grid">
                  <div class="metric-item">
                    <span class="metric-value">${aiAnalysis.keyMetrics.totalEvaluations}</span>
                    <span class="metric-label">Total Evaluations</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value">${aiAnalysis.keyMetrics.averageScore}</span>
                    <span class="metric-label">Average Score</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value">${aiAnalysis.keyMetrics.trendAnalysis}</span>
                    <span class="metric-label">Trend Analysis</span>
                  </div>
                </div>
              </div>

              <div class="summary-section recommendations">
                <h3 class="summary-title">💡 Recommendations</h3>
                <div class="summary-content">
                  ${aiAnalysis.recommendations}
                </div>
              </div>
            </div>
          `;

          reportHTML += studentReportHTML;

          // Update progress
          const progress = Math.round(((i + 1) / selectedStudents.length) * 100);
          toast.info(`Processing... ${progress}% complete (${i + 1}/${selectedStudents.length} students)`);

        } catch (studentError) {
          console.error(`Error processing student ${student.student_name}:`, studentError);
          toast.error(`Error processing ${student.student_name}, continuing with others...`);
        }
      }

      reportHTML += `
        </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open('', '_blank');
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      setTimeout(() => {
        printWindow.print();
        toast.success(`Successfully generated AI-powered ${reportType} reports for ${selectedStudents.length} student(s)!`);
      }, 2000);

    } catch (error) {
      console.error('Error generating bulk reports:', error);
      toast.error(`Failed to generate bulk ${reportType} reports`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI-Powered Bulk Summary Reports</h1>
          <p className="text-muted-foreground">Generate comprehensive behavior summary reports with AI analysis</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Report Generator
          </CardTitle>
          <CardDescription>
            Select students, choose report type, set date range, and generate AI-powered PDF reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Student Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Select Students ({selectedStudents.length}/{students.length} selected)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-2"
              >
                {selectedStudents.length === students.length ? (
                  <>
                    <Square className="h-4 w-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Select All
                  </>
                )}
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
              {students.map((student) => (
                <div key={student.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`student-${student.id}`}
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => handleStudentToggle(student.id)}
                  />
                  <Label
                    htmlFor={`student-${student.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {student.student_name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Report Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Report Type</Label>
              <Select value={reportType} onValueChange={handleReportTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose report type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly Summary (Past 7 Days)</SelectItem>
                  <SelectItem value="monthly">Monthly Summary (Past 30 Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="custom-dates"
                  checked={useCustomDates}
                  onCheckedChange={setUseCustomDates}
                />
                <Label htmlFor="custom-dates" className="text-base font-semibold">
                  Use Custom Date Range
                </Label>
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!useCustomDates}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!useCustomDates}
              />
            </div>
          </div>

          {/* Generate Report Button */}
          <div className="pt-4 border-t">
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                <strong>Report Summary:</strong> 
                {selectedStudents.length > 0 && reportType && (
                  <>
                    {' '}Generate {reportType} reports for {selectedStudents.length} student(s) 
                    from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                  </>
                )}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Each report will include AI-powered behavioral analysis, key metrics, and personalized recommendations.
              </p>
            </div>

            <Button 
              onClick={generateBulkReports}
              disabled={isGenerating || selectedStudents.length === 0 || !reportType}
              className="w-full"
              size="lg"
            >
              <Printer className="h-5 w-5 mr-2" />
              {isGenerating 
                ? `Generating AI Reports... Please wait` 
                : `Generate & Print ${reportType ? reportType.charAt(0).toUpperCase() + reportType.slice(1) : ''} Reports (${selectedStudents.length} students)`
              }
            </Button>

            {isGenerating && (
              <div className="bg-yellow-50 p-4 rounded-lg mt-4">
                <p className="text-sm text-yellow-800">
                  🤖 AI is analyzing behavioral data and generating comprehensive reports... 
                  This may take a few minutes depending on the amount of data and number of students selected.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
              });
            }
          }
        });

        if (!hasSectionData) {
          const fallbackValue = typeof slot?.rating === 'number' ? slot.rating : (typeof slot?.score === 'number' ? slot.score : null);
          if (typeof fallbackValue === 'number') {
            totalScore += fallbackValue;
            scoreCount++;
            if (fallbackValue === 4) count4++;
            if (fallbackValue === 3) count3++;
            if (fallbackValue === 2) count2++;
            if (fallbackValue === 1) count1++;
            if (fallbackValue === 2 || fallbackValue === 1) {
              problematicBehaviors.push({
                date: ev.date,
                slot: slotName,
                rating: fallbackValue,
                notes: slot?.comment || slot?.notes || '',
              });
            }
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
          const { average, count } = calculateAverageFromSlots(ev.time_slots || {});
          return count ? average : null;
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

      // Compose summary with accurate rating terminology
      progressSummary = `During the reporting period from ${start} to ${end}, ${student.student_name} received an average behavioral rating of ${avgScore} out of 4. ${trend} The student received ${count4} ratings of 4 (exceeds expectations), indicating exceptional performance and going above and beyond expectations. There were ${count3} ratings of 3 (meets expectations), showing appropriate behavior and following guidelines. The student received ${count2} ratings of 2 (needs improvement), suggesting some behavioral issues requiring attention, and ${count1} ratings of 1 (does not meet expectations), indicating significant concerns needing intervention.`;
      
      if (problematicBehaviors.length) {
        progressSummary += ` There were ${problematicBehaviors.length} specific instances where behaviors were rated as needing improvement (2) or not meeting expectations (1), documented on the following dates: ${problematicBehaviors.map(pb => pb.date).join(', ')}.`;
      }
      if (summaryIncidents.length) {
        progressSummary += ` Additional behavioral concerns were documented in summary reports during this period.`;
      }
      if (allIncidents.length === 0) {
        progressSummary += ` No major incidents or problematic behaviors were recorded during this reporting period.`;
      }
    }

    // Compose report
    const summary = `Summary for ${student.student_name} (${start} to ${end}):\n\nAverage Score: ${avgScore}\nNumber of 4's: ${count4} (4 = Exceeds expectations)\nNumber of 3's: ${count3} (3 = Meets expectations)\nNumber of 2's: ${count2} (2 = Needs Improvement)\nNumber of 1's: ${count1} (1 = Does not meet expectations)\n\nIncidents:\n${allIncidents.length ? allIncidents.join('\n') : 'None'}\n\nBehavioral Progress:\n${progressSummary}\n`;
    setReport(summary);
    // HTML for PDF/print
    const html = `
    <html>
      <head>
        <title>Student Behavioral Summary Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50;
            background: #fff;
            padding: 20px;
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
            text-align: center;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
          }
          .header-logo {
            width: 64px;
            height: 64px;
            flex-shrink: 0;
          }
          .header-content {
            flex: 1;
          }
          .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
          }
          .header h1 { 
            font-size: 28px; 
            font-weight: 300; 
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .header h2 { 
            font-size: 24px; 
            font-weight: 600; 
            margin-bottom: 4px;
          }
          .header .period { 
            font-size: 16px; 
            opacity: 0.9;
            font-weight: 300;
          }
          .content { 
            padding: 40px; 
          }
          .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
            gap: 20px; 
            margin-bottom: 40px;
          }
          .stat-card { 
            background: #f8f9fa;
            border-radius: 12px;
            padding: 24px 20px;
            text-align: center;
            border-left: 4px solid;
            transition: transform 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .stat-card:hover { 
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
          .stat-card.excellent { border-left-color: #27ae60; background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; }
          .stat-card.good { border-left-color: #3498db; background: linear-gradient(135deg, #3498db, #2980b9); color: white; }
          .stat-card.improvement { border-left-color: #f39c12; background: linear-gradient(135deg, #f39c12, #e67e22); color: white; }
          .stat-card.concern { border-left-color: #e74c3c; background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; }
          .stat-card.average { border-left-color: #9b59b6; background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white; }
          .stat-number { 
            font-size: 36px; 
            font-weight: 700; 
            margin-bottom: 8px;
            display: block;
          }
          .stat-label { 
            font-size: 14px; 
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.9;
          }
          .stat-description { 
            font-size: 12px; 
            margin-top: 4px;
            opacity: 0.8;
          }
          .section { 
            margin-bottom: 35px;
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
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <img src="/best-logo.png" alt="BEST Logo" class="header-logo" />
            <div class="header-content">
              <h1>Behavioral Summary Report</h1>
              <h2>${student.student_name}</h2>
              <div class="period">${start} to ${end}</div>
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
      </body>
    </html>`;
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
