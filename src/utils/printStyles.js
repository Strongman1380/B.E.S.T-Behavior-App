/**
 * Professional Print Styles with Logo Integration
 * Provides consistent, polished styling for all printable reports
 */

export const getEnhancedPrintStyles = () => `
  @page {
    size: letter;
    margin: 0.75in;
  }

  body {
    font-family: 'Segoe UI', 'Arial', sans-serif;
    margin: 0;
    padding: 0;
    font-size: 12px;
    line-height: 1.4;
    color: #000;
    background: #fff;
  }

  /* Header Section with Logo */
  .print-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 0;
    border-bottom: 3px solid #2563eb;
    margin-bottom: 25px;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .logo-placeholder {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    line-height: 1.1;
  }

  .school-info {
    display: flex;
    flex-direction: column;
  }

  .school-name {
    font-size: 18px;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }

  .school-subtitle {
    font-size: 12px;
    color: #6b7280;
    margin: 2px 0 0 0;
  }

  .print-date {
    text-align: right;
    font-size: 11px;
    color: #6b7280;
  }

  /* Title Section */
  .report-title {
    text-align: center;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 1px;
    margin: 20px 0 30px 0;
    text-transform: uppercase;
    color: #1f2937;
    background: linear-gradient(135deg, #f8fafc, #e2e8f0);
    padding: 15px;
    border-radius: 8px;
    border: 2px solid #e5e7eb;
  }

  /* Meta Information */
  .meta-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 25px;
    padding: 15px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
  }

  .meta-label {
    font-weight: 700;
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .meta-value {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  /* Enhanced Tables */
  table.schedule {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }

  table.schedule th {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
    text-align: center;
    font-weight: 700;
    font-size: 12px;
    padding: 12px 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  table.schedule td {
    border: 1px solid #d1d5db;
    padding: 12px 10px;
    vertical-align: top;
    background: #fff;
  }

  table.schedule tbody tr:nth-child(even) {
    background: #f8fafc;
  }

  table.schedule tbody tr:hover {
    background: #e0f2fe;
  }

  .time-cell {
    width: 22%;
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  .score-cell {
    width: 10%;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .score-4 { color: #059669; } /* Green for exceeds */
  .score-3 { color: #2563eb; } /* Blue for meets */
  .score-2 { color: #d97706; } /* Orange for needs improvement */
  .score-1 { color: #dc2626; } /* Red for does not meet */

  .comment-cell {
    width: 48%;
    font-size: 12px;
    min-height: 48px;
    line-height: 1.5;
    color: #374151;
  }

  /* Content Sections */
  .content-section {
    margin-bottom: 25px;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .section-title {
    font-size: 16px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e5e7eb;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-content {
    font-size: 12px;
    line-height: 1.6;
    color: #374151;
  }

  /* Rating Scale */
  .rating-scale {
    margin: 20px 0;
    padding: 15px;
    background: linear-gradient(135deg, #f8fafc, #e2e8f0);
    border-radius: 8px;
    border: 1px solid #d1d5db;
  }

  .rating-scale .title {
    font-weight: 700;
    margin-bottom: 10px;
    color: #1f2937;
    text-transform: uppercase;
    font-size: 13px;
    letter-spacing: 0.5px;
  }

  .rating-items {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .rating-item {
    font-size: 11px;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rating-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-weight: 700;
    font-size: 10px;
    color: white;
  }

  .rating-number.four { background: #059669; }
  .rating-number.three { background: #2563eb; }
  .rating-number.two { background: #d97706; }
  .rating-number.one { background: #dc2626; }

  /* Comments Section */
  .comments-section {
    margin-top: 20px;
  }

  .comments-box {
    border: 2px solid #d1d5db;
    background: #f8fafc;
    padding: 15px;
    min-height: 100px;
    font-size: 12px;
    line-height: 1.6;
    border-radius: 8px;
    color: #374151;
  }

  .comments-label {
    font-weight: 700;
    margin-bottom: 8px;
    color: #1f2937;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.5px;
  }

  /* Footer */
  .print-footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-info {
    font-size: 10px;
    color: #6b7280;
  }

  .page-number {
    font-size: 10px;
    color: #6b7280;
    text-align: right;
  }

  /* Signature Section */
  .signature-section {
    margin-top: 40px;
    padding-top: 20px;
    display: flex;
    justify-content: space-between;
    gap: 40px;
  }

  .signature-block {
    flex: 1;
    text-align: center;
  }

  .signature-line {
    border-bottom: 2px solid #374151;
    height: 30px;
    margin-bottom: 8px;
    padding: 0 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Segoe Script', cursive;
    font-size: 16px;
    font-style: italic;
    color: #1f2937;
  }

  .signature-label {
    font-size: 11px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Responsive adjustments for print */
  @media print {
    body {
      font-size: 11px !important;
    }

    .content-section {
      break-inside: avoid;
    }

    .report-title {
      font-size: 20px !important;
    }

    table.schedule {
      break-inside: avoid;
    }
  }
`;

export const getPrintHeader = (schoolName = "BEST Ed School", reportType = "Report", date = new Date()) => `
  <div class="print-header">
    <div class="logo-section">
      <div class="logo-placeholder">
        BEST<br/>ED
      </div>
      <div class="school-info">
        <div class="school-name">${schoolName}</div>
        <div class="school-subtitle">Behavioral Excellence in Student Tracking</div>
      </div>
    </div>
    <div class="print-date">
      Generated: ${new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)}
    </div>
  </div>
`;

export const getRatingScale = () => `
  <div class="rating-scale">
    <div class="title">Behavior Rating Scale</div>
    <div class="rating-items">
      <div class="rating-item">
        <span class="rating-number four">4</span>
        <span>Exceeds Expectations</span>
      </div>
      <div class="rating-item">
        <span class="rating-number three">3</span>
        <span>Meets Expectations</span>
      </div>
      <div class="rating-item">
        <span class="rating-number two">2</span>
        <span>Needs Improvement</span>
      </div>
      <div class="rating-item">
        <span class="rating-number one">1</span>
        <span>Does Not Meet</span>
      </div>
    </div>
  </div>
`;

export const getPrintFooter = (additionalInfo = "") => `
  <div class="print-footer">
    <div class="footer-info">
      BEST Ed App - Behavioral Excellence in Student Tracking
      ${additionalInfo ? ` | ${additionalInfo}` : ''}
    </div>
    <div class="page-number">
      Page 1 of 1
    </div>
  </div>
`;