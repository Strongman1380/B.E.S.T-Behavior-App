import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Test if jsPDF is working
console.log('jsPDF loaded:', typeof jsPDF);
console.log('jsPDF version:', jsPDF.version || 'unknown');

// Color scheme for the PDF
const COLORS = {
  primary: '#1e40af',
  secondary: '#64748b',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  light: '#f8fafc',
  dark: '#0f172a'
};

export class KPIPDFExporter {
  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
    this.pageNumber = 1;
  }

  // Add header to each page
  addHeader(title, subtitle) {
    this.doc.setFillColor(COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, 30, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, 20);
    
    if (subtitle) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.margin, 26);
    }
    
    // Add export date and page number
    const exportDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    this.doc.setFontSize(8);
    this.doc.text(`Generated: ${exportDate}`, this.pageWidth - 60, 20);
    this.doc.text(`Page ${this.pageNumber}`, this.pageWidth - 30, 26);
    
    this.currentY = 40;
    this.doc.setTextColor(0, 0, 0);
  }

  // Add footer
  addFooter() {
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.secondary);
    this.doc.text('Bright Track - Student Behavior Tracking System', this.margin, this.pageHeight - 10);
  }

  // Check if we need a new page
  checkPageBreak(requiredHeight = 20) {
    if (this.currentY + requiredHeight > this.pageHeight - 30) {
      this.addFooter();
      this.doc.addPage();
      this.pageNumber++;
      this.addHeader('KPI Dashboard Report', 'Continued');
      return true;
    }
    return false;
  }

  // Add section title
  addSectionTitle(title, color = COLORS.primary) {
    this.checkPageBreak(25);
    
    this.doc.setFillColor(color);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 15, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin + 5, this.currentY + 10);
    
    this.currentY += 20;
    this.doc.setTextColor(0, 0, 0);
  }

  // Add key metrics cards
  addMetricsCards(metrics) {
    this.addSectionTitle('Overall Performance Metrics');
    
    const cardWidth = (this.pageWidth - 2 * this.margin - 15) / 4;
    const cardHeight = 35;
    
    const cards = [
      { title: 'Average Rating', value: `${metrics.avgRating}/4`, color: COLORS.primary },
      { title: "4's Rate", value: `${metrics.smileyRate}%`, color: COLORS.success },
      { title: 'Total Incidents', value: metrics.totalIncidents, color: COLORS.warning },
      { title: 'Students Tracked', value: metrics.studentsEvaluated, color: COLORS.secondary }
    ];
    
    this.checkPageBreak(cardHeight + 10);
    
    cards.forEach((card, index) => {
      const x = this.margin + index * (cardWidth + 5);
      
      // Card background
      this.doc.setFillColor(card.color);
      this.doc.rect(x, this.currentY, cardWidth, cardHeight, 'F');
      
      // Card content
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(card.title, x + 3, this.currentY + 8);
      
      this.doc.setFontSize(16);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(String(card.value), x + 3, this.currentY + 22);
    });
    
    this.currentY += cardHeight + 15;
    this.doc.setTextColor(0, 0, 0);
  }

  // Add data table
  addTable(title, headers, data, options = {}) {
    this.addSectionTitle(title);
    
    if (!data || data.length === 0) {
      this.doc.setFontSize(10);
      this.doc.text('No data available for this section.', this.margin, this.currentY);
      this.currentY += 15;
      return;
    }

    const tableOptions = {
      startY: this.currentY,
      head: [headers],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: COLORS.dark
      },
      alternateRowStyles: {
        fillColor: COLORS.light
      },
      margin: { left: this.margin, right: this.margin },
      ...options
    };

    this.doc.autoTable(tableOptions);
    this.currentY = this.doc.lastAutoTable.finalY + 10;
  }

  // Add chart placeholder (since we can't easily embed actual charts)
  addChartPlaceholder(title, description) {
    this.addSectionTitle(title);
    
    this.checkPageBreak(60);
    
    // Chart placeholder box
    this.doc.setDrawColor(COLORS.secondary);
    this.doc.setFillColor(COLORS.light);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 50, 'FD');
    
    // Chart description
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.secondary);
    this.doc.text(description, this.margin + 10, this.currentY + 25);
    this.doc.text('(Visual chart available in the web dashboard)', this.margin + 10, this.currentY + 35);
    
    this.currentY += 60;
    this.doc.setTextColor(0, 0, 0);
  }

  // Generate the complete PDF
  generateKPIPDF(data) {
    const {
      overallMetrics,
      behaviorTrendData,
      incidentStats,
      ratingDistribution,
      studentComparison,
      timeSlotAnalysis,
      weeklyTrends,
      stepsSummary,
      gradesSummary,
      gpaSummary,
      studentImprovementStatus,
      dateRange,
      selectedStudent,
      exportDate
    } = data;

    // Page 1: Header and Overview
    this.addHeader(
      'KPI Dashboard Report',
      `Date Range: ${dateRange === 'all' ? 'All Time' : `Last ${dateRange} days`} | Student: ${selectedStudent}`
    );

    // Overall metrics cards
    this.addMetricsCards(overallMetrics);

    // Student Performance Table
    if (studentComparison && studentComparison.length > 0) {
      const studentHeaders = ['Student Name', 'Avg Rating', "4's Rate %", 'Incidents', 'Evaluations'];
      const studentData = studentComparison.map(student => [
        student.name,
        student.avgRating.toString(),
        `${student.smileyRate}%`,
        student.incidents.toString(),
        student.evaluations.toString()
      ]);
      
      this.addTable('Student Performance Overview', studentHeaders, studentData);
    }

    // Incident Statistics
    if (incidentStats && incidentStats.length > 0) {
      const incidentHeaders = ['Incident Type', 'Count', 'Percentage'];
      const incidentData = incidentStats.map(stat => [
        stat.type,
        stat.count.toString(),
        `${stat.percentage}%`
      ]);
      
      this.addTable('Incident Statistics', incidentHeaders, incidentData);
    }

    // Rating Distribution
    if (ratingDistribution && ratingDistribution.length > 0) {
      const ratingHeaders = ['Rating', 'Count', 'Percentage'];
      const ratingData = ratingDistribution.map(rating => [
        rating.rating,
        rating.count.toString(),
        `${rating.percentage}%`
      ]);
      
      this.addTable('Rating Distribution', ratingHeaders, ratingData);
    }

    // Time Slot Analysis
    if (timeSlotAnalysis && timeSlotAnalysis.length > 0) {
      const timeHeaders = ['Time Slot', 'Avg Rating', "4's Rate %", 'Total Evaluations'];
      const timeData = timeSlotAnalysis.map(slot => [
        slot.timeSlot,
        slot.avgRating.toString(),
        `${slot.smileyRate}%`,
        slot.evaluations.toString()
      ]);
      
      this.addTable('Time Slot Analysis', timeHeaders, timeData);
    }

    // Academic KPIs Section
    if (stepsSummary || gradesSummary || gpaSummary) {
      this.addSectionTitle('Academic Performance Metrics', COLORS.success);
      
      const academicMetrics = [];
      if (stepsSummary) {
        academicMetrics.push(['Total Steps Completed', stepsSummary.totalSteps || 0]);
        academicMetrics.push(['Average Steps per Student', stepsSummary.avgStepsPerStudent || 0]);
      }
      if (gradesSummary) {
        academicMetrics.push(['Total Grades Recorded', gradesSummary.totalGrades || 0]);
        academicMetrics.push(['Average Grade', gradesSummary.avgGrade || 'N/A']);
      }
      if (gpaSummary) {
        academicMetrics.push(['Average GPA', gpaSummary.avgGPA || 'N/A']);
      }
      
      if (academicMetrics.length > 0) {
        this.addTable('Academic Summary', ['Metric', 'Value'], academicMetrics);
      }
    }

    // Student Improvement Status
    if (studentImprovementStatus) {
      const improvementData = [];
      if (studentImprovementStatus.improvementCategories) {
        const cats = studentImprovementStatus.improvementCategories;
        improvementData.push(['Needs Improvement', cats.needsImprovement || 0]);
        improvementData.push(['Average', cats.average || 0]);
        improvementData.push(['Excellent', cats.excellent || 0]);
        improvementData.push(['Outstanding', cats.outstanding || 0]);
      }
      
      if (improvementData.length > 0) {
        this.addTable('Student Improvement Categories', ['Category', 'Count'], improvementData);
      }
    }

    // Chart placeholders
    this.addChartPlaceholder(
      'Behavior Trend Chart',
      'Shows daily behavior rating trends over the selected time period.'
    );

    this.addChartPlaceholder(
      'Weekly Trends',
      'Displays weekly behavior patterns and trends.'
    );

    // Add footer to last page
    this.addFooter();

    return this.doc;
  }
}

// Simple test PDF function
export const testPDF = () => {
  try {
    console.log('Testing basic PDF creation...');
    const doc = new jsPDF();
    doc.text('Test PDF', 20, 20);
    const filename = `test-pdf-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    doc.save(filename);
    console.log('Test PDF created successfully:', filename);
    return filename;
  } catch (error) {
    console.error('Test PDF failed:', error);
    throw error;
  }
};

// Export function to be used in the component
export const exportKPIToPDF = (data) => {
  try {
    console.log('Creating PDF exporter...');
    
    // First test basic PDF functionality
    console.log('Testing basic PDF functionality...');
    const testDoc = new jsPDF();
    console.log('Basic jsPDF instance created successfully');
    
    const exporter = new KPIPDFExporter();
    
    console.log('Generating PDF document...');
    const doc = exporter.generateKPIPDF(data);
    
    const filename = `kpi-dashboard-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    console.log('Saving PDF as:', filename);
    
    // Ensure the document is properly saved as PDF
    doc.save(filename);
    
    console.log('PDF saved successfully');
    return filename;
  } catch (error) {
    console.error('Error in exportKPIToPDF:', error);
    console.error('Error stack:', error.stack);
    
    // Fallback: try creating a simple PDF
    try {
      console.log('Attempting fallback simple PDF...');
      const fallbackDoc = new jsPDF();
      fallbackDoc.text('KPI Dashboard Export Failed', 20, 20);
      fallbackDoc.text('Please check console for errors', 20, 30);
      const fallbackFilename = `kpi-error-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      fallbackDoc.save(fallbackFilename);
      throw new Error(`PDF generation failed, created error report: ${fallbackFilename}`);
    } catch (fallbackError) {
      console.error('Even fallback PDF failed:', fallbackError);
      throw new Error(`Complete PDF failure: ${error.message}`);
    }
  }
};

// Enhanced CSV export with better organization
export const exportEnhancedCSV = (data) => {
  const {
    overallMetrics,
    behaviorTrendData,
    incidentStats,
    ratingDistribution,
    studentComparison,
    timeSlotAnalysis,
    weeklyTrends,
    stepsSummary,
    gradesSummary,
    gpaSummary,
    studentImprovementStatus,
    dateRange,
    selectedStudent
  } = data;

  const sections = [];
  
  // Header section
  sections.push('=== KPI DASHBOARD EXPORT ===');
  sections.push(`Export Date: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
  sections.push(`Date Range: ${dateRange === 'all' ? 'All Time' : `Last ${dateRange} days`}`);
  sections.push(`Student Filter: ${selectedStudent}`);
  sections.push('');

  // Overall Metrics
  sections.push('=== OVERALL PERFORMANCE METRICS ===');
  sections.push(`Average Rating,${overallMetrics.avgRating}/4`);
  sections.push(`4's Rate,${overallMetrics.smileyRate}%`);
  sections.push(`Total Incidents,${overallMetrics.totalIncidents}`);
  sections.push(`Students Evaluated,${overallMetrics.studentsEvaluated}`);
  sections.push(`Total Evaluations,${overallMetrics.totalEvaluations}`);
  sections.push('');

  // Student Performance
  if (studentComparison && studentComparison.length > 0) {
    sections.push('=== STUDENT PERFORMANCE OVERVIEW ===');
    sections.push('Student Name,Average Rating,4\'s Rate %,Incidents,Evaluations');
    studentComparison.forEach(student => {
      sections.push(`"${student.name}",${student.avgRating},${student.smileyRate}%,${student.incidents},${student.evaluations}`);
    });
    sections.push('');
  }

  // Incident Statistics
  if (incidentStats && incidentStats.length > 0) {
    sections.push('=== INCIDENT STATISTICS ===');
    sections.push('Incident Type,Count,Percentage');
    incidentStats.forEach(stat => {
      sections.push(`"${stat.type}",${stat.count},${stat.percentage}%`);
    });
    sections.push('');
  }

  // Rating Distribution
  if (ratingDistribution && ratingDistribution.length > 0) {
    sections.push('=== RATING DISTRIBUTION ===');
    sections.push('Rating,Count,Percentage');
    ratingDistribution.forEach(rating => {
      sections.push(`${rating.rating},${rating.count},${rating.percentage}%`);
    });
    sections.push('');
  }

  // Time Slot Analysis
  if (timeSlotAnalysis && timeSlotAnalysis.length > 0) {
    sections.push('=== TIME SLOT ANALYSIS ===');
    sections.push('Time Slot,Average Rating,4\'s Rate %,Total Evaluations');
    timeSlotAnalysis.forEach(slot => {
      sections.push(`"${slot.timeSlot}",${slot.avgRating},${slot.smileyRate}%,${slot.evaluations}`);
    });
    sections.push('');
  }

  // Behavior Trend Data
  if (behaviorTrendData && behaviorTrendData.length > 0) {
    sections.push('=== BEHAVIOR TREND DATA ===');
    sections.push('Date,Average Rating,4\'s Percentage,Evaluation Count');
    behaviorTrendData.forEach(trend => {
      sections.push(`${trend.fullDate},${trend.avgRating},${trend.smileyPercentage}%,${trend.evaluationCount}`);
    });
    sections.push('');
  }

  // Academic KPIs
  sections.push('=== ACADEMIC PERFORMANCE METRICS ===');
  if (stepsSummary) {
    sections.push(`Total Steps Completed,${stepsSummary.totalSteps || 0}`);
    sections.push(`Average Steps per Student,${stepsSummary.avgStepsPerStudent || 0}`);
  }
  if (gradesSummary) {
    sections.push(`Total Grades Recorded,${gradesSummary.totalGrades || 0}`);
    sections.push(`Average Grade,${gradesSummary.avgGrade || 'N/A'}`);
  }
  if (gpaSummary) {
    sections.push(`Average GPA,${gpaSummary.avgGPA || 'N/A'}`);
  }
  sections.push('');

  // Student Improvement Status
  if (studentImprovementStatus) {
    sections.push('=== STUDENT IMPROVEMENT CATEGORIES ===');
    if (studentImprovementStatus.improvementCategories) {
      const cats = studentImprovementStatus.improvementCategories;
      sections.push(`Needs Improvement,${cats.needsImprovement || 0}`);
      sections.push(`Average,${cats.average || 0}`);
      sections.push(`Excellent,${cats.excellent || 0}`);
      sections.push(`Outstanding,${cats.outstanding || 0}`);
    }
    
    if (studentImprovementStatus.stepsCategories) {
      sections.push('');
      sections.push('=== STEPS PERFORMANCE CATEGORIES ===');
      const steps = studentImprovementStatus.stepsCategories;
      sections.push(`Exceeds Expectations,${steps.exceeds || 0}`);
      sections.push(`Meets Expectations,${steps.meets || 0}`);
      sections.push(`Needs Work,${steps.needsWork || 0}`);
    }
    
    if (studentImprovementStatus.creditsPerformance) {
      sections.push('');
      sections.push('=== CREDITS PERFORMANCE ===');
      const credits = studentImprovementStatus.creditsPerformance;
      sections.push(`Fast Credit Earners,${credits.fastEarners || 0}`);
    }
  }

  const csvContent = sections.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kpi-dashboard-enhanced-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  return a.download;
};