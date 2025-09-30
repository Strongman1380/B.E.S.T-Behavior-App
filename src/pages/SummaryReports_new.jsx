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

      // Calculate basic metrics
      const allScores = evaluations.flatMap(evaluation => 
        evaluation.time_slots?.flatMap(slot => [
          slot.peer_interaction,
          slot.adult_interaction,
          slot.classroom_expectations
        ]).filter(score => score && score > 0) || []
      );
      const averageScore = allScores.length > 0 ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(2) : 'N/A';

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
