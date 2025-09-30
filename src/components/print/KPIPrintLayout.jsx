import React from 'react';
import { formatTruncated } from '@/utils';

/**
 * Print-friendly layout rendered off-screen and consumed by react-to-print.
 */
const KPIPrintLayout = React.forwardRef(({ data, schoolName, dateRange }, ref) => {
  const {
    overallMetrics,
    studentComparison,
    ratingDistribution,
    incidentStats,
    timeSlotAnalysis,
    weeklyTrends,
    studentImprovementStatus,
    stepsSummary,
    gradesSummary,
    gpaSummary,
  } = data || {};

  const fmt = (value, digits = 2, fallback = '0.00') => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback;
    return formatTruncated(value, digits);
  };

  const sectionHeading = {
    fontSize: '18px',
    borderBottom: '1px solid #cbd5f5',
    paddingBottom: '6px',
    marginTop: '32px',
    color: '#1e3a8a',
  };

  const tableStyles = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
  };

  const thStyles = {
    border: '1px solid #d1d5db',
    padding: '8px',
    textAlign: 'left',
    backgroundColor: '#e0e7ff',
    fontSize: '12px',
    fontWeight: 600,
    color: '#1f2937',
  };

  const tdStyles = {
    border: '1px solid #e5e7eb',
    padding: '8px',
    fontSize: '12px',
    color: '#111827',
  };

  return (
    <div
      ref={ref}
      style={{
        fontFamily: 'Inter, Arial, sans-serif',
        color: '#111827',
        padding: '24px',
        maxWidth: '960px',
        margin: '0 auto',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px solid #2563eb', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
          <div style={{ 
            width: '80px', 
            height: '60px', 
            backgroundImage: 'url(/best-logo.png)', 
            backgroundSize: 'contain', 
            backgroundRepeat: 'no-repeat', 
            backgroundPosition: 'center',
            borderRadius: '8px'
          }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', margin: '0' }}>{schoolName}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>Behavioral Excellence in Student Tracking</div>
          </div>
        </div>
        <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>KPI Dashboard Report</h1>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>{dateRange}</div>
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '5px' }}>
          Generated: {new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date())}
        </div>
      </header>

      <section>
        <h2 style={sectionHeading}>Overall Performance Snapshot</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '16px',
          }}
        >
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Behavior Metrics</h3>
            <p style={{ margin: '4px 0' }}>Average Rating: {fmt(overallMetrics?.avgRating)}</p>
            <p style={{ margin: '4px 0' }}>4's Rate: {fmt(overallMetrics?.smileyRate)}%</p>
            <p style={{ margin: '4px 0' }}>Total Incidents: {overallMetrics?.totalIncidents ?? 0}</p>
            <p style={{ margin: '4px 0' }}>Students Tracked: {overallMetrics?.studentsEvaluated ?? 0}</p>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Academic Metrics</h3>
            <p style={{ margin: '4px 0' }}>Average GPA: {gpaSummary?.avgGPA != null ? formatTruncated(gpaSummary.avgGPA, 2) : 'N/A'}</p>
            <p style={{ margin: '4px 0' }}>Average Grade: {gradesSummary?.totalGrades ? `${formatTruncated(gradesSummary.avgGrade, 2)}%` : 'N/A'}</p>
            <p style={{ margin: '4px 0' }}>Total Steps Logged: {stepsSummary?.hasData ? formatTruncated(stepsSummary.totalSteps, 2) : 'N/A'}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 style={sectionHeading}>Student Performance Overview</h2>
        <table style={tableStyles}>
          <thead>
            <tr>
              <th style={thStyles}>Student</th>
              <th style={thStyles}>Avg Rating</th>
              <th style={thStyles}>Behavior</th>
              <th style={thStyles}>Academic</th>
              <th style={thStyles}>4's Rate</th>
              <th style={thStyles}>Incidents</th>
              <th style={thStyles}>Evaluations</th>
            </tr>
          </thead>
          <tbody>
            {(studentComparison || []).map((student) => (
              <tr key={student.name}>
                <td style={tdStyles}>{student.name}</td>
                <td style={tdStyles}>{fmt(student.avgRating)}</td>
                <td style={tdStyles}>{fmt(student.behavioralAvg)}</td>
                <td style={tdStyles}>{fmt(student.academicAvg)}</td>
                <td style={tdStyles}>{fmt(student.smileyRate)}%</td>
                <td style={tdStyles}>{student.incidents ?? 0}</td>
                <td style={tdStyles}>{student.evaluations ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={sectionHeading}>Rating & Incident Distribution</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: '16px' }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Rating Distribution</h3>
            <table style={tableStyles}>
              <thead>
                <tr>
                  <th style={thStyles}>Rating</th>
                  <th style={thStyles}>Count</th>
                  <th style={thStyles}>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {(ratingDistribution || []).map((item) => (
                  <tr key={item.rating}>
                    <td style={tdStyles}>{item.rating}</td>
                    <td style={tdStyles}>{item.count}</td>
                    <td style={tdStyles}>{fmt(item.percentage)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Incidents by Type</h3>
            <table style={tableStyles}>
              <thead>
                <tr>
                  <th style={thStyles}>Type</th>
                  <th style={thStyles}>Count</th>
                  <th style={thStyles}>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {(incidentStats || []).map((item) => (
                  <tr key={item.type}>
                    <td style={tdStyles}>{item.type}</td>
                    <td style={tdStyles}>{item.count}</td>
                    <td style={tdStyles}>{fmt(item.percentage)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h2 style={sectionHeading}>Performance by Time of Day</h2>
        <table style={tableStyles}>
          <thead>
            <tr>
              <th style={thStyles}>Time Slot</th>
              <th style={thStyles}>Avg Rating</th>
              <th style={thStyles}>4's Rate</th>
              <th style={thStyles}>Eval Count</th>
            </tr>
          </thead>
          <tbody>
            {(timeSlotAnalysis || []).map((slot) => (
              <tr key={slot.timeSlot}>
                <td style={tdStyles}>{slot.timeSlot}</td>
                <td style={tdStyles}>{fmt(slot.avgRating)}</td>
                <td style={tdStyles}>{fmt(slot.smileyRate)}%</td>
                <td style={tdStyles}>{slot.evaluationCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={sectionHeading}>Weekly Trends</h2>
        <table style={tableStyles}>
          <thead>
            <tr>
              <th style={thStyles}>Week</th>
              <th style={thStyles}>Avg Rating</th>
              <th style={thStyles}>4's Rate</th>
              <th style={thStyles}>Evaluations</th>
            </tr>
          </thead>
          <tbody>
            {(weeklyTrends || []).map((week) => (
              <tr key={week.week}>
                <td style={tdStyles}>{week.week}</td>
                <td style={tdStyles}>{fmt(week.avgRating)}</td>
                <td style={tdStyles}>{fmt(week.smileyRate)}%</td>
                <td style={tdStyles}>{week.evaluations ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={sectionHeading}>Student Improvement & Credits</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: '16px' }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Improvement Categories</h3>
            <table style={tableStyles}>
              <tbody>
                <tr><td style={tdStyles}>Needs Improvement</td><td style={tdStyles}>{studentImprovementStatus?.improvementCategories?.needsImprovement ?? 0}</td></tr>
                <tr><td style={tdStyles}>Average</td><td style={tdStyles}>{studentImprovementStatus?.improvementCategories?.average ?? 0}</td></tr>
                <tr><td style={tdStyles}>Excellent</td><td style={tdStyles}>{studentImprovementStatus?.improvementCategories?.excellent ?? 0}</td></tr>
                <tr><td style={tdStyles}>Outstanding</td><td style={tdStyles}>{studentImprovementStatus?.improvementCategories?.outstanding ?? 0}</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Credits Progress</h3>
            <p style={{ margin: '4px 0' }}>Fast Earners: {studentImprovementStatus?.creditsPerformance?.fastEarners ?? 0}</p>
            <p style={{ margin: '4px 0' }}>Average Steps / Student: {stepsSummary?.hasData ? formatTruncated(stepsSummary.avgStepsPerStudent, 2) : 'N/A'}</p>
            <p style={{ margin: '4px 0' }}>Total Grades Recorded: {gradesSummary?.totalGrades ?? 0}</p>
          </div>
        </div>
      </section>
    </div>
  );
});

KPIPrintLayout.displayName = 'KPIPrintLayout';

export default KPIPrintLayout;
