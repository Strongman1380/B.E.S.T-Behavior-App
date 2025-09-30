import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Printer, ChevronLeft, ChevronRight, User, Edit3, Save, X } from 'lucide-react';
import { Student, DailyEvaluation, Settings } from '@/api/entities';
import { TIME_SLOTS } from '@/config/timeSlots';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BEST_LOGO_URL = "/best-logo.png";

export default function BestInteractiveGrid() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [weekData, setWeekData] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editingComments, setEditingComments] = useState(null);
  const [commentsValue, setCommentsValue] = useState('');
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(today);

    // Always find the Monday of the current week
    if (dayOfWeek === 0) {
      // If today is Sunday, go back 6 days to get Monday
      monday.setDate(today.getDate() - 6);
    } else {
      // For all other days, go back (dayOfWeek - 1) days to get Monday
      monday.setDate(today.getDate() - (dayOfWeek - 1));
    }

    return format(monday, 'yyyy-MM-dd');
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadWeekData();
    }
  }, [selectedStudent, currentWeek]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [studentsData, settingsData] = await Promise.all([
        Student.filter({ active: true }, 'student_name'),
        Settings.list()
      ]);
      
      setStudents(studentsData);
      setSettings(settingsData[0] || null);
      
      // Auto-select first student
      if (studentsData.length > 0 && !selectedStudent) {
        setSelectedStudent(studentsData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWeekData = async () => {
    if (!selectedStudent) return;

    try {
      // Get the Monday for this week
      const monday = getMondayForWeek(currentWeek);

      // Generate Monday through Friday dates
      const weekDates = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        weekDates.push(format(date, 'yyyy-MM-dd'));
      }

      // Load evaluations for this week
      const evaluations = await DailyEvaluation.filter({
        student_id: selectedStudent.id
      });

      // Group by date
      const weekEvaluations = {};
      weekDates.forEach(date => {
        const dayEvals = evaluations.filter(e => e.date === date);
        weekEvaluations[date] = dayEvals.length > 0 ? dayEvals[0] : null;
      });

      setWeekData(weekEvaluations);
    } catch (error) {
      console.error('Error loading week data:', error);
    }
  };

  const getMondayForWeek = (weekDate) => {
    const weekStart = new Date(weekDate);
    const dayOfWeek = weekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(weekStart);

    if (dayOfWeek === 0) {
      // If weekDate is Sunday, go back 6 days to get Monday
      monday.setDate(weekStart.getDate() - 6);
    } else if (dayOfWeek !== 1) {
      // If weekDate is not Monday, adjust to get Monday
      monday.setDate(weekStart.getDate() - (dayOfWeek - 1));
    }

    return monday;
  };

  const getWeekDates = () => {
    const monday = getMondayForWeek(currentWeek);

    // Generate Monday through Friday (5 weekdays)
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push({
        date: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEEE'),
        shortDay: format(date, 'EE')
      });
    }
    return dates;
  };

  const navigateWeek = (direction) => {
    const current = new Date(currentWeek);
    // Simply add/subtract 7 days since currentWeek should already be a Monday
    current.setDate(current.getDate() + (direction * 7));
    setCurrentWeek(format(current, 'yyyy-MM-dd'));
  };

  const getScoreValue = (timeSlots, slotKey, section) => {
    if (!timeSlots || !timeSlots[slotKey]) return '--';
    const value = timeSlots[slotKey][section];
    return value !== undefined && value !== null && value !== '' ? value : '--';
  };

  const getScoreColor = (score) => {
    if (score === '--' || score === 'AB' || score === 'NS') return 'bg-gray-100 text-gray-500';
    const num = Number(score);
    if (num >= 4) return 'bg-green-100 text-green-800';
    if (num >= 3) return 'bg-yellow-100 text-yellow-800';
    if (num >= 2) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const calculateDailyAverage = (timeSlots, section) => {
    if (!timeSlots) return '--';
    
    const scores = [];
    
    TIME_SLOTS.forEach(slot => {
      const value = getScoreValue(timeSlots, slot.key, section);
      if (value !== '--' && value !== 'AB' && value !== 'NS') {
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 4) {
          scores.push(num);
        }
      }
    });
    
    if (scores.length === 0) return '--';
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return avg.toFixed(1);
  };

  const calculateTimeSlotAverage = (timeSlots, slotKey) => {
    if (!timeSlots || !timeSlots[slotKey]) return '--';

    const scores = [];
    ['ai', 'pi', 'ce'].forEach(section => {
      const value = getScoreValue(timeSlots, slotKey, section);
      if (value !== '--' && value !== 'AB' && value !== 'NS') {
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 4) {
          scores.push(num);
        }
      }
    });

    if (scores.length === 0) return '--';
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return avg.toFixed(1);
  };

  const handleCellEdit = (date, slotKey, section, currentValue) => {
    const cellId = `${date}-${slotKey}-${section}`;
    setEditingCell(cellId);
    setEditValue(currentValue === '--' ? '' : currentValue);
  };

  const handleCellSave = async (date, slotKey, section) => {
    try {
      // Validate input
      const value = editValue.trim();
      if (value !== '' && value !== 'AB' && value !== 'NS') {
        const num = Number(value);
        if (isNaN(num) || num < 1 || num > 4) {
          toast.error('Score must be between 1-4, AB, NS, or empty');
          return;
        }
      }

      // Find or create evaluation for this date
      let evaluation = weekData[date];
      if (!evaluation) {
        // Create new evaluation
        evaluation = await DailyEvaluation.create({
          student_id: selectedStudent.id,
          date: date,
          time_slots: {},
          general_comments: ''
        });
      }

      // Update the time slot data
      const timeSlots = evaluation.time_slots || {};
      if (!timeSlots[slotKey]) {
        timeSlots[slotKey] = {};
      }
      timeSlots[slotKey][section] = value === '' ? null : value;

      // Save the evaluation
      await DailyEvaluation.update(evaluation.id, {
        time_slots: timeSlots
      });

      // Update local state
      setWeekData(prev => ({
        ...prev,
        [date]: {
          ...evaluation,
          time_slots: timeSlots
        }
      }));

      setEditingCell(null);
      setEditValue('');
      toast.success('Score updated successfully');
    } catch (error) {
      console.error('Error saving score:', error);
      toast.error('Failed to save score');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleCommentsEdit = (date, currentComments) => {
    setEditingComments(date);
    setCommentsValue(currentComments || '');
  };

  const handleCommentsSave = async (date) => {
    try {
      // Find or create evaluation for this date
      let evaluation = weekData[date];
      if (!evaluation) {
        // Create new evaluation
        evaluation = await DailyEvaluation.create({
          student_id: selectedStudent.id,
          date: date,
          time_slots: {},
          general_comments: commentsValue.trim()
        });
      } else {
        // Update existing evaluation
        await DailyEvaluation.update(evaluation.id, {
          general_comments: commentsValue.trim()
        });
      }

      // Update local state
      setWeekData(prev => ({
        ...prev,
        [date]: {
          ...evaluation,
          general_comments: commentsValue.trim()
        }
      }));

      setEditingComments(null);
      setCommentsValue('');
      toast.success('Comments updated successfully');
    } catch (error) {
      console.error('Error saving comments:', error);
      toast.error('Failed to save comments');
    }
  };

  const handleCommentsCancel = () => {
    setEditingComments(null);
    setCommentsValue('');
  };

  const handleCommentsKeyPress = (e, date) => {
    if (e.key === 'Escape') {
      handleCommentsCancel();
    }
    // Note: We don't save on Enter for textarea since users might want line breaks
  };

  const handleKeyPress = (e, date, slotKey, section) => {
    if (e.key === 'Enter') {
      handleCellSave(date, slotKey, section);
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const EditableCell = ({ date, slotKey, section, timeSlots }) => {
    const cellId = `${date}-${slotKey}-${section}`;
    const score = getScoreValue(timeSlots, slotKey, section);
    const isEditing = editingCell === cellId;

    if (isEditing) {
      return (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleCellSave(date, slotKey, section)}
          onKeyDown={(e) => handleKeyPress(e, date, slotKey, section)}
          className="w-12 h-8 text-center text-xs p-1 border"
          placeholder="1-4"
          autoFocus
        />
      );
    }

    return (
      <div
        className="group relative cursor-pointer"
        onClick={() => handleCellEdit(date, slotKey, section, score)}
      >
        <Badge className={cn("text-xs hover:opacity-80 transition-opacity", getScoreColor(score))}>
          {score}
        </Badge>
        <Edit3 className="absolute -top-1 -right-1 h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  const handlePrint = () => {
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }

    const weekDates = getWeekDates();

    // Generate print content that exactly matches the grid layout
    let printContent = `
      <div class="report-header">
        <img src="${BEST_LOGO_URL}" alt="BEST Logo" class="report-logo" />
        <div class="header-content">
          <div class="report-title">Berniklau Education - Solutions Team</div>
          <div class="report-subtitle">Weekly Behavior Tracking</div>
          <div class="student-info">Student: ${selectedStudent.student_name}</div>
          <div class="week-info">Week of ${format(getMondayForWeek(currentWeek), 'MMMM d, yyyy')}</div>
        </div>
      </div>

      <div class="categories-scoring">
        <div class="category-section">
          <div class="category-title">ADULT INTERACTIONS</div>
          <div>Being respectful to adults</div>
          <div>Following directions</div>
          <div>Accepts feedback/accountability</div>
        </div>
        <div class="category-section">
          <div class="category-title">PEER INTERACTIONS</div>
          <div>Appropriate communication</div>
          <div>Respects peers and their property</div>
          <div>Resolves conflict appropriately</div>
        </div>
        <div class="category-section">
          <div class="category-title">CLASSROOM EXPECTATIONS</div>
          <div>On task during instruction</div>
          <div>Participating appropriately</div>
          <div>Organized and prepared for class</div>
        </div>
        <div class="category-section">
          <div class="category-title">SCORING:</div>
          <div>4 = Exceeds expectations</div>
          <div>3 = Meets expectations</div>
          <div>2 = Below expectations</div>
          <div>1 = Unsatisfactory</div>
        </div>
      </div>

      <!-- Daily Averages Summary -->
      <table class="daily-avg-table">
        <thead>
          <tr>
            <th>Daily Averages</th>
            <th>Monday</th>
            <th>Tuesday</th>
            <th>Wednesday</th>
            <th>Thursday</th>
            <th>Friday</th>
            <th>Week Average</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: left; font-weight: bold;"></td>
            ${weekDates.map(day => {
              const evaluation = weekData[day.date];
              const dailyScores = [];
              if (evaluation?.time_slots) {
                ['ai', 'pi', 'ce'].forEach(section => {
                  const avg = calculateDailyAverage(evaluation.time_slots, section);
                  if (avg !== '--') {
                    dailyScores.push(parseFloat(avg));
                  }
                });
              }
              const dayAvg = dailyScores.length > 0
                ? (dailyScores.reduce((sum, score) => sum + score, 0) / dailyScores.length).toFixed(1)
                : 'N/A';

              return `<td>${dayAvg}</td>`;
            }).join('')}
            <td style="font-weight: bold;">
              ${(() => {
                const weekScores = [];
                weekDates.forEach(day => {
                  const evaluation = weekData[day.date];
                  if (evaluation?.time_slots) {
                    ['ai', 'pi', 'ce'].forEach(section => {
                      const avg = calculateDailyAverage(evaluation.time_slots, section);
                      if (avg !== '--') {
                        weekScores.push(parseFloat(avg));
                      }
                    });
                  }
                });
                return weekScores.length > 0
                  ? (weekScores.reduce((sum, score) => sum + score, 0) / weekScores.length).toFixed(1)
                  : '2.8';
              })()}
            </td>
          </tr>
        </tbody>
      </table>
    `;

    // Add each day's grid
    weekDates.forEach(day => {
      const evaluation = weekData[day.date];
      const timeSlots = evaluation?.time_slots || {};

      printContent += `
        <div class="day-section">
          <div class="day-title">${day.dayName.toUpperCase()}</div>
          <table class="grid-table">
            <thead>
              <tr>
                <th style="text-align: left; width: 120px;"></th>
                ${TIME_SLOTS.map(slot => `
                  <th style="width: 80px;">${slot.label.replace(' AM', '').replace(' PM', '').replace(' - ', '-')}</th>
                `).join('')}
                <th style="width: 80px;">Daily Average</th>
              </tr>
            </thead>
            <tbody>
              <!-- Adult Interactions Row -->
              <tr>
                <td class="row-label">Adult Interactions</td>
                ${TIME_SLOTS.map(slot => {
                  const score = getScoreValue(timeSlots, slot.key, 'ai');
                  return `<td>${score}</td>`;
                }).join('')}
                <td style="font-weight: bold;">${calculateDailyAverage(timeSlots, 'ai')}</td>
              </tr>

              <!-- Peer Interactions Row -->
              <tr>
                <td class="row-label">Peer Interactions</td>
                ${TIME_SLOTS.map(slot => {
                  const score = getScoreValue(timeSlots, slot.key, 'pi');
                  return `<td>${score}</td>`;
                }).join('')}
                <td style="font-weight: bold;">${calculateDailyAverage(timeSlots, 'pi')}</td>
              </tr>

              <!-- Classroom Expectations Row -->
              <tr>
                <td class="row-label">Classroom Expectations</td>
                ${TIME_SLOTS.map(slot => {
                  const score = getScoreValue(timeSlots, slot.key, 'ce');
                  return `<td>${score}</td>`;
                }).join('')}
                <td style="font-weight: bold;">${calculateDailyAverage(timeSlots, 'ce')}</td>
              </tr>

              <!-- Daily Averages Row -->
              <tr class="average-row">
                <td class="row-label">Daily Averages</td>
                ${TIME_SLOTS.map(slot => {
                  const avg = calculateTimeSlotAverage(timeSlots, slot.key);
                  return `<td style="font-weight: bold;">${avg}</td>`;
                }).join('')}
                <td style="font-weight: bold;">
                  ${(() => {
                    const allScores = ['ai', 'pi', 'ce'].map(section =>
                      calculateDailyAverage(timeSlots, section)
                    ).filter(score => score !== '--').map(score => parseFloat(score));
                    return allScores.length > 0
                      ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(1)
                      : '--';
                  })()}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Comments Section -->
          <div class="comments-section">
            <div class="comments-title">Comments:</div>
            <div class="comments-box">${evaluation?.general_comments || ''}</div>
          </div>
        </div>
      `;
    });

    const printWindow = window.open('', '', 'width=1200,height=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Weekly Behavior Tracking - ${selectedStudent.student_name}</title>
          <style>
            @page { size: landscape; margin: 0.5in; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 16px;
              font-size: 10px;
              line-height: 1.2;
              color: #000;
            }
            .report-header {
              display: flex;
              align-items: flex-start;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
            }
            .report-logo {
              width: 80px;
              height: 80px;
              margin-right: 20px;
            }
            .header-content {
              flex: 1;
            }
            .report-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .report-subtitle {
              font-size: 12px;
              color: #666;
              margin-bottom: 8px;
            }
            .student-info {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .week-info {
              font-size: 12px;
              color: #666;
            }
            .categories-scoring {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              font-size: 8px;
            }
            .category-section {
              flex: 1;
              margin-right: 15px;
            }
            .category-section:last-child {
              margin-right: 0;
            }
            .category-title {
              font-weight: bold;
              font-size: 9px;
              margin-bottom: 4px;
            }
            .daily-avg-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 10px;
            }
            .daily-avg-table th,
            .daily-avg-table td {
              border: 1px solid #000;
              padding: 6px;
              text-align: center;
            }
            .daily-avg-table th {
              background: #f4f4f4;
              font-weight: bold;
            }
            .grid-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
              margin-bottom: 8px;
            }
            .grid-table th,
            .grid-table td {
              border: 1px solid #000;
              padding: 4px;
              text-align: center;
            }
            .grid-table th {
              background: #f4f4f4;
              font-weight: bold;
              font-size: 8px;
            }
            .day-section {
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .day-title {
              background: #f4f4f4;
              padding: 8px;
              border: 1px solid #000;
              text-align: center;
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 0;
            }
            .row-label {
              background: #f4f4f4;
              font-weight: bold;
              text-align: left;
              padding-left: 8px !important;
              font-size: 9px;
            }
            .average-row {
              background: #f0f0f0;
              font-weight: bold;
            }
            .comments-section {
              margin-top: 8px;
            }
            .comments-title {
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 4px;
            }
            .comments-box {
              border: 1px solid #000;
              min-height: 30px;
              padding: 6px;
              font-size: 9px;
              background: white;
            }
            @media print {
              body { padding: 12px; }
              .day-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      toast.success('Grid sent to printer!');
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading students...</p>
        </div>
      </div>
    );
  }

  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-slate-200 transition-all duration-300",
        isSidebarOpen ? "w-80" : "w-16"
      )}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {isSidebarOpen && (
              <h2 className="text-lg font-semibold text-slate-900">Students</h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <div className="p-2">
          {isSidebarOpen ? (
            <div className="space-y-2">
              {students.map(student => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={cn(
                    "w-full p-3 text-left rounded-lg transition-colors border",
                    selectedStudent?.id === student.id
                      ? "bg-blue-50 border-blue-200 text-blue-900"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      selectedStudent?.id === student.id
                        ? "bg-blue-100"
                        : "bg-slate-100"
                    )}>
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{student.student_name}</div>
                      {student.grade_level && (
                        <div className="text-xs text-slate-500">{student.grade_level}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {students.map(student => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center transition-colors border",
                    selectedStudent?.id === student.id
                      ? "bg-blue-50 border-blue-200 text-blue-900"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                  title={student.student_name}
                >
                  <User className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-full">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  B.E.S.T Interactive Grid
                </h1>
                <p className="text-slate-600">
                  {selectedStudent ? `Viewing ${selectedStudent.student_name}` : 'Select a student to view their weekly behavior tracking'}
                </p>
              </div>
              {selectedStudent && (
                <Button onClick={handlePrint} className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Print Grid
                </Button>
              )}
            </div>

            {/* Week Navigation */}
            {selectedStudent && (
              <div className="flex items-center justify-center gap-4 mb-6">
                <Button variant="outline" onClick={() => navigateWeek(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous Week
                </Button>
                <div className="text-lg font-semibold">
                  Week of {format(getMondayForWeek(currentWeek), 'MMMM d, yyyy')}
                </div>
                <Button variant="outline" onClick={() => navigateWeek(1)}>
                  Next Week
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Grid Content */}
          {selectedStudent ? (
            <div>

              {/* Daily Averages Summary */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Daily Averages</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 daily-avg-table">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 p-2 text-left">Daily Averages</th>
                          {weekDates.map(day => (
                            <th key={day.date} className="border border-slate-300 p-2 text-center">
                              {day.shortDay}
                            </th>
                          ))}
                          <th className="border border-slate-300 p-2 text-center">Week Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 p-2 font-semibold"></td>
                          {weekDates.map(day => {
                            const evaluation = weekData[day.date];
                            const dailyScores = [];
                            if (evaluation?.time_slots) {
                              ['ai', 'pi', 'ce'].forEach(section => {
                                const avg = calculateDailyAverage(evaluation.time_slots, section);
                                if (avg !== '--') {
                                  dailyScores.push(parseFloat(avg));
                                }
                              });
                            }
                            const dayAvg = dailyScores.length > 0 
                              ? (dailyScores.reduce((sum, score) => sum + score, 0) / dailyScores.length).toFixed(1)
                              : 'N/A';
                            
                            return (
                              <td key={day.date} className="border border-slate-300 p-2 text-center">
                                {dayAvg}
                              </td>
                            );
                          })}
                          <td className="border border-slate-300 p-2 text-center font-semibold">
                            {(() => {
                              const weekScores = [];
                              weekDates.forEach(day => {
                                const evaluation = weekData[day.date];
                                if (evaluation?.time_slots) {
                                  ['ai', 'pi', 'ce'].forEach(section => {
                                    const avg = calculateDailyAverage(evaluation.time_slots, section);
                                    if (avg !== '--') {
                                      weekScores.push(parseFloat(avg));
                                    }
                                  });
                                }
                              });
                              return weekScores.length > 0 
                                ? (weekScores.reduce((sum, score) => sum + score, 0) / weekScores.length).toFixed(1)
                                : '2.8';
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Day Grids */}
              <div className="space-y-6">
                {weekDates.map(day => {
                  const evaluation = weekData[day.date];
                  const timeSlots = evaluation?.time_slots || {};
                  
                  return (
                    <Card key={day.date} className="day-section">
                      <div className="day-title bg-slate-100 p-3 border-b">
                        <h3 className="text-lg font-bold text-center">{day.dayName.toUpperCase()}</h3>
                      </div>
                      <CardContent className="p-4">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-slate-300 grid-table">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border border-slate-300 p-2 text-left w-32">Time</th>
                                {TIME_SLOTS.map(slot => (
                                  <th key={slot.key} className="border border-slate-300 p-1 text-center text-xs">
                                    {slot.label.replace(' AM', '').replace(' PM', '').replace(' - ', '-')}
                                  </th>
                                ))}
                                <th className="border border-slate-300 p-1 text-center">Daily Average</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Adult Interactions Row */}
                              <tr>
                                <td className="border border-slate-300 p-2 font-semibold row-label">Adult Interactions</td>
                                {TIME_SLOTS.map(slot => (
                                  <td key={slot.key} className="border border-slate-300 p-1 text-center">
                                    <EditableCell
                                      date={day.date}
                                      slotKey={slot.key}
                                      section="ai"
                                      timeSlots={timeSlots}
                                    />
                                  </td>
                                ))}
                                <td className="border border-slate-300 p-1 text-center font-semibold">
                                  <Badge className={cn("text-xs", getScoreColor(calculateDailyAverage(timeSlots, 'ai')))}>
                                    {calculateDailyAverage(timeSlots, 'ai')}
                                  </Badge>
                                </td>
                              </tr>
                              
                              {/* Peer Interactions Row */}
                              <tr>
                                <td className="border border-slate-300 p-2 font-semibold row-label">Peer Interactions</td>
                                {TIME_SLOTS.map(slot => (
                                  <td key={slot.key} className="border border-slate-300 p-1 text-center">
                                    <EditableCell
                                      date={day.date}
                                      slotKey={slot.key}
                                      section="pi"
                                      timeSlots={timeSlots}
                                    />
                                  </td>
                                ))}
                                <td className="border border-slate-300 p-1 text-center font-semibold">
                                  <Badge className={cn("text-xs", getScoreColor(calculateDailyAverage(timeSlots, 'pi')))}>
                                    {calculateDailyAverage(timeSlots, 'pi')}
                                  </Badge>
                                </td>
                              </tr>
                              
                              {/* Classroom Expectations Row */}
                              <tr>
                                <td className="border border-slate-300 p-2 font-semibold row-label">Classroom Expectations</td>
                                {TIME_SLOTS.map(slot => (
                                  <td key={slot.key} className="border border-slate-300 p-1 text-center">
                                    <EditableCell
                                      date={day.date}
                                      slotKey={slot.key}
                                      section="ce"
                                      timeSlots={timeSlots}
                                    />
                                  </td>
                                ))}
                                <td className="border border-slate-300 p-1 text-center font-semibold">
                                  <Badge className={cn("text-xs", getScoreColor(calculateDailyAverage(timeSlots, 'ce')))}>
                                    {calculateDailyAverage(timeSlots, 'ce')}
                                  </Badge>
                                </td>
                              </tr>
                              
                              {/* Daily Averages Row */}
                              <tr className="average-row bg-slate-50">
                                <td className="border border-slate-300 p-2 font-semibold row-label">Daily Averages</td>
                                {TIME_SLOTS.map(slot => {
                                  const avg = calculateTimeSlotAverage(timeSlots, slot.key);
                                  return (
                                    <td key={slot.key} className="border border-slate-300 p-1 text-center font-semibold">
                                      <Badge className={cn("text-xs", getScoreColor(avg))}>
                                        {avg}
                                      </Badge>
                                    </td>
                                  );
                                })}
                                <td className="border border-slate-300 p-1 text-center font-semibold">
                                  <Badge className={cn("text-xs", getScoreColor(
                                    (() => {
                                      const allScores = ['ai', 'pi', 'ce'].map(section => 
                                        calculateDailyAverage(timeSlots, section)
                                      ).filter(score => score !== '--').map(score => parseFloat(score));
                                      return allScores.length > 0 
                                        ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(1)
                                        : '--';
                                    })()
                                  ))}>
                                    {(() => {
                                      const allScores = ['ai', 'pi', 'ce'].map(section => 
                                        calculateDailyAverage(timeSlots, section)
                                      ).filter(score => score !== '--').map(score => parseFloat(score));
                                      return allScores.length > 0 
                                        ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(1)
                                        : '--';
                                    })()}
                                  </Badge>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Comments Section */}
                        <div className="comments-section mt-4">
                          <div className="comments-title font-semibold text-sm mb-2 flex items-center justify-between">
                            <span>Comments:</span>
                            {editingComments !== day.date && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCommentsEdit(day.date, evaluation?.general_comments)}
                                className="h-6 px-2 text-xs"
                              >
                                <Edit3 className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            )}
                          </div>
                          {editingComments === day.date ? (
                            <div className="space-y-2">
                              <Textarea
                                value={commentsValue}
                                onChange={(e) => setCommentsValue(e.target.value)}
                                onKeyDown={(e) => handleCommentsKeyPress(e, day.date)}
                                className="min-h-[80px] text-sm"
                                placeholder="Enter general comments for this day..."
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleCommentsSave(day.date)}
                                  className="h-7 px-3 text-xs"
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCommentsCancel}
                                  className="h-7 px-3 text-xs"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="comments-box border border-slate-300 min-h-[60px] p-3 bg-white rounded text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => handleCommentsEdit(day.date, evaluation?.general_comments)}
                            >
                              {evaluation?.general_comments || (
                                <span className="text-slate-400 italic">Click to add comments...</span>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-16 w-16 text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Select a Student
                </h3>
                <p className="text-slate-500 text-center max-w-md">
                  Choose a student from the sidebar to view their weekly behavior tracking grid.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
