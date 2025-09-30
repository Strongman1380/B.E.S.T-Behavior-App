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
  const [currentReportStudent, setCurrentReportStudent] = useState(null);
  const [currentReportType, setCurrentReportType] = useState('');
  const [currentReportStats, setCurrentReportStats] = useState(null);
  const [currentAiAnalysis, setCurrentAiAnalysis] = useState(null);
  const [currentIncidents, setCurrentIncidents] = useState([]);
  const [currentEvaluations, setCurrentEvaluations] = useState([]);

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
    console.log(`🚀 Starting report generation for student ${studentId}, type: ${reportType}`);
    
    const student = students.find(s => s.id === studentId);
    if (!student) {
      console.error('❌ Student not found:', studentId);
      toast.error('Student not found');
      return;
    }

    console.log(`👤 Generating report for: ${student.student_name}`);
    
    setLoading(true);
    setCurrentReportStudent(student);
    setCurrentReportType(reportType);
    setReport('');
    setReportHtml('');
    
    toast.info(`Generating ${reportType} report for ${student.student_name}...`);
    
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

      console.log(`📅 Fetching evaluations for student ${studentId} from ${startDateString} to ${endDateString}`);

      // Fetch evaluations for this student - try multiple approaches to ensure we get data
      let evaluations = [];
      try {
        // First try: fetch all evaluations for this student, then filter manually
        const allEvaluations = await DailyEvaluation.filter({ student_id: studentId });
        console.log(`📊 Found ${allEvaluations.length} total evaluations for student ${studentId}`);
        
        // Filter evaluations by date range manually
        evaluations = allEvaluations.filter(evaluation => {
          const evalDate = evaluation.evaluation_date || evaluation.date;
          if (!evalDate) return false;
          
          const evalDateString = new Date(evalDate).toISOString().split('T')[0];
          return evalDateString >= startDateString && evalDateString <= endDateString;
        });
        
        console.log(`📊 Filtered to ${evaluations.length} evaluations in date range ${startDateString} to ${endDateString}`);
      } catch (fetchError) {
        console.error('Error fetching evaluations:', fetchError);
        // If the above fails, try a simpler approach
        try {
          evaluations = await DailyEvaluation.filter({ student_id: studentId });
          console.log(`📊 Fallback: Got ${evaluations.length} evaluations (no date filtering)`);
        } catch (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError);
          evaluations = [];
        }
      }

      console.log(`📊 Processing ${evaluations.length} evaluations for analysis`);
      console.log('📋 Sample evaluation structure:', evaluations.slice(0, 2).map(e => ({
        id: e.id,
        date: e.evaluation_date || e.date,
        time_slots_type: typeof e.time_slots,
        time_slots_is_array: Array.isArray(e.time_slots),
        time_slots_length: e.time_slots?.length || 'N/A',
        sample_slot: e.time_slots ? (Array.isArray(e.time_slots) ? e.time_slots[0] : Object.values(e.time_slots)[0]) : 'No slots',
        direct_fields: {
          pi: e.pi,
          ai: e.ai,
          ce: e.ce,
          peer_interaction: e.peer_interaction,
          adult_interaction: e.adult_interaction,
          classroom_expectations: e.classroom_expectations
        }
      })));

      // Generate comprehensive AI analysis
      let aiAnalysis = {
        overallSummary: '',
        behaviorAnalysis: '',
        recommendations: '',
        insights: ''
      };

      if (evaluations.length === 0) {
        console.log('⚠️ No evaluations found, using fallback content');      
        aiAnalysis = {
          overallSummary: `No evaluations found for ${student.student_name} during the selected ${reportType} period (${startDateString} to ${endDateString}). This student may need more consistent behavioral tracking to provide meaningful insights.`,
          behaviorAnalysis: 'No behavioral data available for analysis during this reporting period. Student may have been absent, in transition, or behavioral tracking systems may need to be implemented more consistently.',
          recommendations: 'Recommend establishing consistent daily evaluation protocols and ensuring regular behavioral data collection for comprehensive future reporting.',
          insights: 'Insufficient data to provide behavioral insights. Consider implementing structured observation schedules and regular check-ins.'
        };
      } else {
        // Prepare detailed comments for AI analysis (outside try block for scoping)
        let commentsData = [];
        try {
          commentsData = evaluations.flatMap(evaluation => {
            // Handle different possible data structures for time_slots
            let timeSlots = [];
            if (Array.isArray(evaluation.time_slots)) {
              timeSlots = evaluation.time_slots;
            } else if (evaluation.time_slots && typeof evaluation.time_slots === 'object') {
              // If it's an object, try to convert to array
              timeSlots = Object.values(evaluation.time_slots);
            } else {
              // Fallback: create a single slot from the evaluation itself
              timeSlots = [{
                comments: evaluation.comments || 'No comments',
                peer_interaction: evaluation.peer_interaction,
                adult_interaction: evaluation.adult_interaction,
                classroom_expectations: evaluation.classroom_expectations
              }];
            }

            return timeSlots.map(slot => ({
              content: slot.comments || slot.comment || 'No comments provided',
              type: 'evaluation',
              source: 'Daily Evaluation',
              date: evaluation.evaluation_date || evaluation.date,
              scores: {
                peer_interaction: slot.peer_interaction,
                adult_interaction: slot.adult_interaction,
                classroom_expectations: slot.classroom_expectations
              }
            })) || [];
          }).filter(comment => comment.content !== 'No comments provided' && comment.content.trim().length > 0);

          console.log(`🤖 Preparing AI analysis for ${student.student_name}`, {
            evaluationsCount: evaluations.length,
            commentsCount: commentsData.length,
            dateRange: { start: startDateString, end: endDateString },
            sampleComments: commentsData.slice(0, 3)
          });

          // If no comments data, use basic analysis
          if (commentsData.length === 0) {
            console.log('⚠️ No comments data available, using basic analysis');
            aiAnalysis = {
              overallSummary: `${student.student_name} completed ${evaluations.length} behavioral evaluations during this ${reportType} reporting period from ${startDateString} to ${endDateString}. The data shows behavioral patterns with an average score of ${avgScore}.`,
              behaviorAnalysis: `Based on ${evaluations.length} evaluations, ${student.student_name} demonstrates behavioral patterns with ${count4} excellent performances, ${count3} good performances, ${count2} areas needing improvement, and ${count1} areas of concern.`,
              recommendations: `Continue monitoring ${student.student_name}'s behavioral progress. ${avgScore >= 3 ? 'Maintain current support strategies' : 'Consider additional support in areas showing lower performance'}.`,
              insights: `Key insights: ${evaluations.length} evaluations completed with average score of ${avgScore}. ${allIncidents.length > 0 ? `Behavioral incidents requiring attention: ${allIncidents.map(incident => `${incident.date} (${incident.period}) - ${incident.category}: Score ${incident.score}${incident.comments && incident.comments.trim() ? ` - ${incident.comments}` : ''}`).join('; ')}.` : 'No significant behavioral incidents (scores ≤ 2) reported'}.`
            };
          } else {
            console.log('🔗 Calling aiService.generateBehaviorSummary...');
            
            const analysis = await aiService.generateBehaviorSummary(
              commentsData,
              { start: startDateString, end: endDateString },
              {
                studentId: studentId,
                studentName: student.student_name,
                forceRefresh: true
              }
            );

            console.log('✅ AI Analysis completed:', analysis);

            // Process AI response with comprehensive fallbacks
            aiAnalysis = {
              overallSummary: analysis?.general_overview || analysis?.summary || `${student.student_name} completed ${evaluations.length} behavioral evaluations during this ${reportType} reporting period from ${startDateString} to ${endDateString}. The data shows behavioral patterns across ${allScores.length} individual assessment points covering peer interactions, adult interactions, and classroom expectations.`,
              
              behaviorAnalysis: analysis?.strengths || analysis?.behavioral_patterns || analysis?.behavior_analysis || `Based on ${evaluations.length} evaluations, ${student.student_name} demonstrates behavioral patterns with an average score of ${avgScore}. The student shows ${count4} excellent performances, ${count3} good performances, ${count2} areas needing improvement, and ${count1} areas of concern. This indicates ${avgScore >= 3 ? 'generally positive' : 'developing'} behavioral engagement.`,
              
              recommendations: analysis?.recommendations || analysis?.suggestions || analysis?.action_items || `Continue monitoring ${student.student_name}'s behavioral progress with consistent evaluation practices. ${avgScore >= 3 ? 'Maintain current support strategies while encouraging continued growth' : 'Increase targeted support in areas showing lower performance scores'}. Focus on ${count2 + count1 > 0 ? 'improving areas of concern through individualized interventions' : 'sustaining positive behavioral patterns'}.`,
              
              insights: analysis?.incidents || analysis?.concerns || analysis?.observations || `Key behavioral insights for ${student.student_name}: ${commentsData.length} documented observations provide evidence of behavioral patterns. ${allIncidents.length > 0 ? `Behavioral incidents requiring attention: ${allIncidents.map(incident => `${incident.date} (${incident.period}) - ${incident.category}: Score ${incident.score}${incident.comments && incident.comments.trim() ? ` - ${incident.comments}` : ''}`).join('; ')}.` : 'No significant behavioral incidents (scores ≤ 2) reported, indicating stable behavioral performance'}. Recommend ${evaluations.length < 5 ? 'more frequent' : 'continued'} behavioral monitoring.`
            };

            console.log('📋 Final AI analysis structure:', aiAnalysis);
          }

        } catch (aiError) {
          console.error('🚨 AI analysis error:', aiError);
          console.error('AI Error details:', {
            message: aiError.message,
            stack: aiError.stack,
            evaluationsCount: evaluations.length,
            commentsCount: commentsData.length
          });
          
          aiAnalysis = {
            overallSummary: `${student.student_name} completed ${evaluations.length} behavioral evaluations during this ${reportType} period. Manual analysis of the behavioral data shows consistent patterns that can be reviewed for progress tracking.`,
            behaviorAnalysis: `AI analysis temporarily unavailable due to: ${aiError.message || 'Unknown error'}. Manual review shows behavioral data has been collected consistently and can be analyzed for patterns in peer interaction, adult interaction, and classroom expectations.`,
            recommendations: 'Continue current behavioral monitoring practices. Recommend manual review of evaluation scores and comments to identify trends and areas for continued support.',
            insights: 'Technical analysis services temporarily unavailable. Recommend consulting with behavioral specialists for detailed pattern analysis based on collected evaluation data.'
          };
        }
      }

      // Collect incidents with robust data structure handling FIRST
      // Incidents are defined as any score of 2 or below
      const allIncidents = evaluations.flatMap(evaluation => {
        const evalDate = evaluation.evaluation_date || evaluation.date;
        const formattedDate = evalDate ? new Date(evalDate).toLocaleDateString() : 'Unknown date';

        // Handle different possible data structures for time_slots
        let timeSlots = [];
        if (Array.isArray(evaluation.time_slots)) {
          timeSlots = evaluation.time_slots;
        } else if (evaluation.time_slots && typeof evaluation.time_slots === 'object') {
          // If it's an object, convert to array with period information
          timeSlots = Object.entries(evaluation.time_slots).map(([period, slot]) => ({
            ...slot,
            period: period.replace('period_', '') // Remove 'period_' prefix if present
          }));
        } else {
          // Fallback: create a single slot from the evaluation itself
          timeSlots = [{
            peer_interaction: evaluation.peer_interaction,
            adult_interaction: evaluation.adult_interaction,
            classroom_expectations: evaluation.classroom_expectations,
            comments: evaluation.comments || '',
            period: 'Full Day'
          }];
        }

        // Group incidents by time period to avoid duplicates
        const incidentsByPeriod = new Map();

        timeSlots.forEach(slot => {
          const periodKey = `${formattedDate}_${slot.period || 'Unknown period'}`;
          const scores = [
            { category: 'peer_interaction', score: slot.pi || slot.peer_interaction },
            { category: 'adult_interaction', score: slot.ai || slot.adult_interaction },
            { category: 'classroom_expectations', score: slot.ce || slot.classroom_expectations }
          ];

          // Collect all low-scoring categories for this period
          const lowScoreCategories = scores.filter(({ score }) => score && score <= 2);

          if (lowScoreCategories.length > 0) {
            if (!incidentsByPeriod.has(periodKey)) {
              incidentsByPeriod.set(periodKey, {
                date: formattedDate,
                period: slot.period || 'Unknown period',
                categories: [],
                scores: [],
                comments: slot.comments || slot.comment || 'No comments provided'
              });
            }

            const incident = incidentsByPeriod.get(periodKey);
            lowScoreCategories.forEach(({ category, score }) => {
              const categoryName = category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
              if (!incident.categories.includes(categoryName)) {
                incident.categories.push(categoryName);
                incident.scores.push(score);
              }
            });

            // Update comments if this slot has more detailed comments
            if ((slot.comments || slot.comment) && (!incident.comments || incident.comments === 'No comments provided')) {
              incident.comments = slot.comments || slot.comment;
            }
          }
        });

        // Convert grouped incidents back to array format
        return Array.from(incidentsByPeriod.values()).map(incident => ({
          date: incident.date,
          period: incident.period,
          category: incident.categories.join(', '),
          score: Math.min(...incident.scores), // Use the lowest score as the primary score
          comments: incident.comments
        }));
      });

      // Calculate statistics with robust data structure handling
      const allScores = evaluations.flatMap(evaluation => {
        // Handle different possible data structures for time_slots
        let timeSlots = [];
        if (Array.isArray(evaluation.time_slots)) {
          timeSlots = evaluation.time_slots;
        } else if (evaluation.time_slots && typeof evaluation.time_slots === 'object') {
          // If it's an object, try to convert to array
          timeSlots = Object.values(evaluation.time_slots);
        } else {
          // Fallback: create a single slot from the evaluation itself
          timeSlots = [{
            pi: evaluation.pi || evaluation.peer_interaction,
            ai: evaluation.ai || evaluation.adult_interaction,
            ce: evaluation.ce || evaluation.classroom_expectations,
            comments: evaluation.comments || ''
          }];
        }

        const rawScores = timeSlots.flatMap(slot => [
          slot.pi || slot.peer_interaction,
          slot.ai || slot.adult_interaction,
          slot.ce || slot.classroom_expectations
        ]);

        console.log('🔍 Raw scores from evaluation:', rawScores);

        const scores = rawScores.filter(score => {
          if (score === null || score === undefined || score === '') return false;
          const numScore = parseFloat(score);
          const isValid = !isNaN(numScore) && numScore >= 1 && numScore <= 4;
          console.log(`🔍 Score "${score}" -> ${numScore}, valid: ${isValid}`);
          return isValid;
        }).map(score => parseFloat(score));

        console.log('✅ Filtered scores for this evaluation:', scores);

        return scores;
      });

      console.log('🎯 All scores collected:', allScores);

      const avgScore = allScores.length > 0 ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(2) : 'N/A';
      const count4 = allScores.filter(score => score === 4).length;
      const count3 = allScores.filter(score => score === 3).length;
      const count2 = allScores.filter(score => score === 2).length;
      const count1 = allScores.filter(score => score === 1).length;

      console.log(`📊 Statistics calculated:`, {
        totalScores: allScores.length,
        avgScore,
        count4, count3, count2, count1,
        incidentsFound: allIncidents.length
      });

      // Store current report data for print functionality
      setCurrentReportStats({ avgScore, count4, count3, count2, count1, totalEvaluations: evaluations.length });
      setCurrentAiAnalysis(aiAnalysis);
      setCurrentIncidents(allIncidents);
      setCurrentEvaluations(evaluations);

      // Generate comprehensive text report
      const textReport = `
BEHAVIORAL SUMMARY REPORT
Student: ${student.student_name}
Period: ${startDateString} to ${endDateString}
Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}
Generated: ${new Date().toLocaleDateString()}

PERFORMANCE METRICS:
• Average Score: ${avgScore}
• Excellent Performance (4): ${count4} instances
• Good Performance (3): ${count3} instances
• Needs Improvement (2): ${count2} instances
• Areas of Concern (1): ${count1} instances
• Total Evaluations: ${evaluations.length}

OVERALL SUMMARY:
${aiAnalysis.overallSummary}

BEHAVIORAL ANALYSIS:
${aiAnalysis.behaviorAnalysis}

INSIGHTS & OBSERVATIONS:
${aiAnalysis.insights}

RECOMMENDATIONS:
${aiAnalysis.recommendations}

DOCUMENTED INCIDENTS:
${allIncidents.length > 0 ? allIncidents.map((incident, i) => `${i + 1}. ${incident.date} (${incident.period}) - ${incident.category}: Score ${incident.score}${incident.comments && incident.comments.trim() ? ` - ${incident.comments}` : ''}`).join('\n') : 'No behavioral incidents (scores ≤ 2) reported during this period.'}
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
            <img src="/best-logo.png" alt="BEST Logo" class="header-logo" onerror="this.style.display='none'" />
            <div class="header-content">
              <h1>B.E.S.T Behavioral Summary Report</h1>
              <h2>${student.student_name}</h2>
              <div class="period">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report: ${startDateString} to ${endDateString}</div>
              <div class="generated">Generated: ${new Date().toLocaleDateString()}</div>
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
              <h3 class="section-title">📝 Overall Summary</h3>
              <div class="progress-summary">
                ${aiAnalysis.overallSummary}
              </div>
            </div>

            <div class="section">
              <h3 class="section-title">🔍 Behavioral Analysis</h3>
              <div class="progress-summary">
                ${aiAnalysis.behaviorAnalysis}
              </div>
            </div>

            <div class="section">
              <h3 class="section-title">💡 Insights & Observations</h3>
              <div class="progress-summary">
                ${aiAnalysis.insights}
              </div>
            </div>

            <div class="section">
              <h3 class="section-title">📋 Recommendations</h3>
              <div class="progress-summary">
                ${aiAnalysis.recommendations}
              </div>
            </div>

            <div class="section">
              <h3 class="section-title">⚠️ Documented Incidents</h3>
              ${allIncidents.length ? `
                <div class="incidents-list">
                  <ul>
                    ${allIncidents.map(incident => `<li><strong>${incident.date} (${incident.period})</strong> - ${incident.category}: Score ${incident.score}${incident.comments && incident.comments.trim() ? ` - ${incident.comments}` : ''}</li>`).join('')}
                  </ul>
                </div>
              ` : `
                <div class="no-incidents">
                  No behavioral incidents (scores ≤ 2) reported during this period
                </div>
              `}
            </div>
          </div>
        </div>
      `;
      setReportHtml(html);
      
      console.log(`✅ Report generation completed successfully for ${student.student_name}`);
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully for ${student.student_name}!`);
      
    } catch (error) {
      console.error('🚨 Error generating report:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        studentId,
        reportType,
        studentName: student.student_name
      });
      
      toast.error(`Failed to generate ${reportType} report for ${student.student_name}: ${error.message || 'Unknown error'}`);
      setReport('');
      setReportHtml('');
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
                    <div className="flex items-center gap-2">
                      <span className={`${currentReportStudent?.id === student.id && loading ? 'text-blue-600 font-semibold' : ''}`}>
                        {student.student_name}
                      </span>
                      {currentReportStudent?.id === student.id && loading && (
                        <div className="flex items-center gap-1 text-blue-600 text-sm">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          Generating...
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleGenerateReport(student.id, "weekly")}
                        disabled={loading}
                        variant={currentReportStudent?.id === student.id && loading ? "secondary" : "default"}
                      >
                        Weekly
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleGenerateReport(student.id, "monthly")}
                        disabled={loading}
                        variant={currentReportStudent?.id === student.id && loading ? "secondary" : "default"}
                      >
                        Monthly
                      </Button>
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
              {loading && (
                <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                    <span>Generating AI-powered behavioral report...</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Analyzing behavioral data and generating comprehensive insights...
                  </p>
                </div>
              )}
              
              {report && !loading && (
                <div className="mt-4">
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                      <FileText className="h-4 w-4" />
                      Report Generated Successfully
                    </div>
                    <p className="text-green-600 text-sm mt-1">
                      {currentReportStudent ? `Report ready for ${currentReportStudent.student_name}` : 'Report is ready for viewing'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded border max-h-64 overflow-y-auto whitespace-pre-line text-sm">
                    {report}
                  </div>
                </div>
              )}
              
              {reportHtml && !loading && (
                <div className="mt-4 space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      console.log('🖨️ Print initiated, reportHtml length:', reportHtml?.length);
                      console.log('🖨️ Current report student:', currentReportStudent);
                      
                      if (!reportHtml || reportHtml.trim().length === 0) {
                        toast.error('No report content available. Please generate a report first.');
                        return;
                      }
                      
                      try {
                        const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                        if (printWindow) {
                          // Write the complete HTML document with all styling
                          printWindow.document.write(`
                            <!DOCTYPE html>
                            <html lang="en">
                              <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>B.E.S.T Behavioral Summary Report - ${currentReportStudent?.student_name || 'Student'}</title>
                                <style>
                                  /* Import fonts for better rendering */
                                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

                                  /* Reset and base styles */
                                  * {
                                    box-sizing: border-box;
                                  }

                                  body {
                                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                    margin: 0;
                                    padding: 0;
                                    background: #ffffff;
                                    color: #333;
                                    line-height: 1.6;
                                  }

                                  /* Report container and layout */
                                  .report-container {
                                    max-width: 800px;
                                    margin: 0 auto;
                                    background: white;
                                    border-radius: 8px;
                                    overflow: hidden;
                                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                                  }

                                  .header {
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                    color: white;
                                    padding: 30px;
                                    text-align: center;
                                  }

                                  .header h1 {
                                    margin: 0;
                                    font-size: 28px;
                                    font-weight: 700;
                                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                                  }

                                  .header .subtitle {
                                    margin: 10px 0 0 0;
                                    font-size: 16px;
                                    opacity: 0.9;
                                  }

                                  .logo-section {
                                    text-align: center;
                                    padding: 20px;
                                    background: #f8f9fa;
                                    border-bottom: 1px solid #e9ecef;
                                  }

                                  .logo {
                                    font-size: 24px;
                                    font-weight: bold;
                                    color: #667eea;
                                  }

                                  .content {
                                    padding: 30px;
                                  }

                                  /* Statistics cards */
                                  .stats-grid {
                                    display: grid;
                                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                                    gap: 20px;
                                    margin-bottom: 40px;
                                  }

                                  .stat-card {
                                    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                                    border: 1px solid #e9ecef;
                                    border-radius: 12px;
                                    padding: 20px;
                                    text-align: center;
                                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                                  }

                                  .stat-value {
                                    font-size: 32px;
                                    font-weight: 700;
                                    color: #2c3e50;
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

                                  /* Section styling */
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

                                  /* Progress summary */
                                  .progress-summary {
                                    background: linear-gradient(135deg, #f8f9fa, #ffffff);
                                    border-radius: 12px;
                                    padding: 25px;
                                    border: 1px solid #e9ecef;
                                    line-height: 1.8;
                                    font-size: 15px;
                                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
                                  }

                                  /* Incidents styling */
                                  .incidents-list {
                                    background: #f8f9fa;
                                    border-radius: 8px;
                                    padding: 20px;
                                    border-left: 4px solid #e74c3c;
                                  }

                                  .incidents-list ul {
                                    list-style: none;
                                    margin: 0;
                                    padding: 0;
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

                                  /* Print-specific styles */
                                  @media print {
                                    body {
                                      background: white !important;
                                      color: black !important;
                                      -webkit-print-color-adjust: exact !important;
                                      print-color-adjust: exact !important;
                                    }

                                    .report-container {
                                      box-shadow: none !important;
                                      border-radius: 0 !important;
                                      max-width: none !important;
                                      margin: 0 !important;
                                    }

                                    .stat-card {
                                      break-inside: avoid;
                                      page-break-inside: avoid;
                                    }

                                    .section {
                                      break-inside: avoid;
                                      page-break-inside: avoid;
                                      margin-bottom: 20px !important;
                                    }

                                    .header {
                                      background: #667eea !important;
                                      -webkit-print-color-adjust: exact !important;
                                      print-color-adjust: exact !important;
                                    }

                                    .stat-value {
                                      background: transparent !important;
                                      -webkit-text-fill-color: #667eea !important;
                                      color: #667eea !important;
                                    }

                                    .section-title::before {
                                      background: #667eea !important;
                                      -webkit-print-color-adjust: exact !important;
                                      print-color-adjust: exact !important;
                                    }

                                    .incidents-list {
                                      border-left-color: #e74c3c !important;
                                      -webkit-print-color-adjust: exact !important;
                                      print-color-adjust: exact !important;
                                    }

                                    .no-incidents {
                                      border-left-color: #27ae60 !important;
                                      -webkit-print-color-adjust: exact !important;
                                      print-color-adjust: exact !important;
                                    }

                                    @page {
                                      margin: 0.5in;
                                      size: A4;
                                    }
                                  }

                                  /* Ensure gradients and colors print properly */
                                  @media print and (-webkit-min-device-pixel-ratio: 0) {
                                    .header {
                                      background: #667eea !important;
                                    }

                                    .stat-value {
                                      color: #667eea !important;
                                    }

                                    .section-title::before {
                                      background: #667eea !important;
                                    }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="report-container">
                                  <div class="header">
                                    <div class="header-content">
                                      <h1>B.E.S.T. Behavioral Summary Report</h1>
                                      <h2>${currentReportStudent?.student_name || 'Student'} - ${currentReportType.charAt(0).toUpperCase() + currentReportType.slice(1)} Report</h2>
                                      <p class="date">Generated: ${new Date().toLocaleDateString()}</p>
                                    </div>
                                  </div>

                                  <div class="content">
                                    <div class="stats-grid">
                                      <div class="stat-card">
                                        <div class="stat-value">${currentReportStats?.avgScore || 'N/A'}</div>
                                        <div class="stat-label">Average Score</div>
                                        <div class="stat-description">Overall behavioral performance</div>
                                      </div>
                                      <div class="stat-card">
                                        <div class="stat-value">${currentReportStats?.count4 || 0}</div>
                                        <div class="stat-label">Excellent</div>
                                        <div class="stat-description">Score of 4 instances</div>
                                      </div>
                                      <div class="stat-card">
                                        <div class="stat-value">${currentReportStats?.count3 || 0}</div>
                                        <div class="stat-label">Good</div>
                                        <div class="stat-description">Score of 3 instances</div>
                                      </div>
                                      <div class="stat-card">
                                        <div class="stat-value">${currentReportStats?.count2 || 0}</div>
                                        <div class="stat-label">Needs Improvement</div>
                                        <div class="stat-description">Score of 2 instances</div>
                                      </div>
                                      <div class="stat-card">
                                        <div class="stat-value">${currentReportStats?.count1 || 0}</div>
                                        <div class="stat-label">Areas of Concern</div>
                                        <div class="stat-description">Score of 1 instances</div>
                                      </div>
                                      <div class="stat-card">
                                        <div class="stat-value">${currentReportStats?.totalEvaluations || 0}</div>
                                        <div class="stat-label">Total Evaluations</div>
                                        <div class="stat-description">Evaluations processed</div>
                                      </div>
                                    </div>

                                    <div class="section">
                                      <h3 class="section-title">📊 Overall Summary</h3>
                                      <div class="progress-summary">
                                        ${currentAiAnalysis?.overallSummary || 'No analysis available'}
                                      </div>
                                    </div>

                                    <div class="section">
                                      <h3 class="section-title">🔍 Behavioral Analysis</h3>
                                      <div class="progress-summary">
                                        ${currentAiAnalysis?.behaviorAnalysis || 'No analysis available'}
                                      </div>
                                    </div>

                                    <div class="section">
                                      <h3 class="section-title">💡 Insights & Observations</h3>
                                      <div class="progress-summary">
                                        ${currentAiAnalysis?.insights || 'No analysis available'}
                                      </div>
                                    </div>

                                    <div class="section">
                                      <h3 class="section-title">📋 Recommendations</h3>
                                      <div class="progress-summary">
                                        ${currentAiAnalysis?.recommendations || 'No recommendations available'}
                                      </div>
                                    </div>

                                    <div class="section">
                                      <h3 class="section-title">⚠️ Documented Incidents</h3>
                                      ${currentIncidents.length ? `
                                        <div class="incidents-list">
                                          <ul>
                                            ${currentIncidents.map(incident => `<li><strong>${incident.date} (${incident.period})</strong> - ${incident.category}: Score ${incident.score}${incident.comments && incident.comments.trim() ? ` - ${incident.comments}` : ''}</li>`).join('')}
                                          </ul>
                                        </div>
                                      ` : `
                                        <div class="no-incidents">
                                          No behavioral incidents (scores ≤ 2) reported during this period
                                        </div>
                                      `}
                                    </div>
                                  </div>
                                </div>
                              </body>
                            </html>
                          `);

                          printWindow.document.close();

                          // Wait for content to render, then trigger print
                          setTimeout(() => {
                            try {
                              printWindow.focus();
                              printWindow.print();
                            } catch (printError) {
                              console.error('Print failed:', printError);
                              toast.error('Print failed. Please try again.');
                            }
                          }, 1000);

                          toast.success('Report opened for printing/saving with full formatting');
                        } else {
                          toast.error('Pop-up blocked. Please allow pop-ups and try again.');
                        }
                      } catch (error) {
                        console.error('Print error:', error);
                        toast.error('Failed to open print window');
                      }
                    }}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print / Save PDF Report
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => {
                      try {
                        const previewWindow = window.open('', '_blank', 'height=800,width=1000,scrollbars=yes');
                        if (previewWindow) {
                          previewWindow.document.write(`
                            <html>
                              <head>
                                <title>Report Preview - ${currentReportStudent?.student_name || 'Student'}</title>
                                <style>body { margin: 20px; font-family: Arial, sans-serif; }</style>
                              </head>
                              <body>${reportHtml}</body>
                            </html>
                          `);
                          previewWindow.document.close();
                        } else {
                          toast.error('Pop-up blocked. Please allow pop-ups and try again.');
                        }
                      } catch (error) {
                        console.error('Preview error:', error);
                        toast.error('Failed to open preview window');
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Preview Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
