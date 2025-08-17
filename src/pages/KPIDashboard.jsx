import { useState, useEffect } from "react";
import { Student, DailyEvaluation, IncidentReport, BehaviorSummary } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, AlertTriangle, Smile, 
  Calendar, Target, Award, Activity, BarChart3, RefreshCw, Download
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";
import { toast } from 'sonner';

const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

const INCIDENT_TYPE_COLORS = {
  "Aggressive Behavior": "#EF4444",
  "Disruptive Behavior": "#F59E0B", 
  "Destruction of Property": "#8B5CF6",
  "Cheating": "#F59E0B",
  "Refusing Redirection": "#3B82F6",
  "Property Destruction": "#8B5CF6",
  "Theft": "#EF4444"
};

export default function KPIDashboard() {
  const [students, setStudents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [behaviorSummaries, setBehaviorSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7'); // days
  const [selectedStudent, setSelectedStudent] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Reload data when filters change
    if (!isLoading) {
      loadData();
    }
  }, [dateRange, selectedStudent]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [studentsData, evaluationsData, incidentsData, summariesData] = await Promise.all([
        Student.filter({ active: true }),
        DailyEvaluation.list('date'),
        IncidentReport.list('incident_date'),
        BehaviorSummary.list('date_range_start')
      ]);
      
      setStudents(studentsData);
      setEvaluations(evaluationsData);
      setIncidents(incidentsData);
      setBehaviorSummaries(summariesData);
    } catch (error) {
      console.error("Error loading KPI data:", error);
      toast.error("Failed to load KPI data.");
    }
    setIsLoading(false);
  };

  // Filter data based on date range and selected student
  const getFilteredData = () => {
    const daysBack = parseInt(dateRange);
    const cutoffDate = subDays(new Date(), daysBack);
    
    let filteredEvaluations = evaluations.filter(evaluation => 
      new Date(evaluation.date) >= cutoffDate
    );
    
    let filteredIncidents = incidents.filter(incident => 
      new Date(incident.incident_date) >= cutoffDate
    );

    if (selectedStudent !== 'all') {
      filteredEvaluations = filteredEvaluations.filter(evaluation => evaluation.student_id === selectedStudent);
      filteredIncidents = filteredIncidents.filter(incident => incident.student_id === selectedStudent);
    }

    return { filteredEvaluations, filteredIncidents };
  };

  // Calculate behavior ratings trend (1-4 scale + smiley faces)
  const getBehaviorTrendData = () => {
    const { filteredEvaluations } = getFilteredData();
    const daysBack = parseInt(dateRange);
    const dates = eachDayOfInterval({
      start: subDays(new Date(), daysBack - 1),
      end: new Date()
    });

    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayEvaluations = filteredEvaluations.filter(evaluation => evaluation.date === dateStr);
      
      let totalRatings = 0;
      let ratingCount = 0;
      let smileyCount = 0;
      let totalSlots = 0;

      dayEvaluations.forEach(evaluation => {
        if (evaluation.time_slots) {
          Object.values(evaluation.time_slots).forEach(slot => {
            totalSlots++;
            if (slot.rating) {
              totalRatings += slot.rating;
              ratingCount++;
            }
            if (slot.has_smiley) {
              smileyCount++;
            }
          });
        }
      });

      const avgRating = ratingCount > 0 ? (totalRatings / ratingCount) : 0;
      const smileyPercentage = totalSlots > 0 ? (smileyCount / totalSlots) * 100 : 0;

      return {
        date: format(date, 'MMM dd'),
        fullDate: dateStr,
        avgRating: Math.round(avgRating * 100) / 100,
        smileyPercentage: Math.round(smileyPercentage * 100) / 100,
        evaluationCount: dayEvaluations.length
      };
    });
  };

  // Calculate incident statistics
  const getIncidentStats = () => {
    const { filteredIncidents } = getFilteredData();
    
    // Group by incident type
    const incidentsByType = filteredIncidents.reduce((acc, incident) => {
      acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
      return acc;
    }, {});

    const total = filteredIncidents.length;
    
    return Object.entries(incidentsByType).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: INCIDENT_TYPE_COLORS[type] || '#6B7280'
    }));
  };

  // Calculate rating distribution (1s, 2s, 3s, 4s)
  const getRatingDistribution = () => {
    const { filteredEvaluations } = getFilteredData();
    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0 };
    let totalRatings = 0;

    filteredEvaluations.forEach(evaluation => {
      if (evaluation.time_slots) {
        Object.values(evaluation.time_slots).forEach(slot => {
          if (slot.rating) {
            distribution[slot.rating.toString()]++;
            totalRatings++;
          }
        });
      }
    });

    return Object.entries(distribution).map(([rating, count]) => ({
      rating: `${rating}'s`,
      count,
      percentage: totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0
    }));
  };

  // Calculate overall KPI metrics
  const getOverallMetrics = () => {
    const { filteredEvaluations, filteredIncidents } = getFilteredData();
    
    let totalRatings = 0;
    let ratingSum = 0;
    let smileyCount = 0;
    let totalSlots = 0;
    let studentsWithEvaluations = new Set();

    filteredEvaluations.forEach(evaluation => {
      studentsWithEvaluations.add(evaluation.student_id);
      if (evaluation.time_slots) {
        Object.values(evaluation.time_slots).forEach(slot => {
          totalSlots++;
          if (slot.rating) {
            totalRatings++;
            ratingSum += slot.rating;
          }
          if (slot.has_smiley) {
            smileyCount++;
          }
        });
      }
    });

    const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
    const smileyRate = totalSlots > 0 ? (smileyCount / totalSlots) * 100 : 0;
    const incidentRate = studentsWithEvaluations.size > 0 ? (filteredIncidents.length / studentsWithEvaluations.size) : 0;

    return {
      avgRating: Math.round(avgRating * 100) / 100,
      smileyRate: Math.round(smileyRate * 100) / 100,
      totalIncidents: filteredIncidents.length,
      incidentRate: Math.round(incidentRate * 100) / 100,
      studentsEvaluated: studentsWithEvaluations.size,
      totalEvaluations: filteredEvaluations.length
    };
  };

  // Get student performance comparison
  const getStudentComparison = () => {
    const { filteredEvaluations, filteredIncidents } = getFilteredData();
    
    return students.map(student => {
      const studentEvals = filteredEvaluations.filter(evaluation => evaluation.student_id === student.id);
      const studentIncidents = filteredIncidents.filter(incident => incident.student_id === student.id);
      
      let totalRatings = 0;
      let ratingSum = 0;
      let smileyCount = 0;
      let totalSlots = 0;

      studentEvals.forEach(evaluation => {
        if (evaluation.time_slots) {
          Object.values(evaluation.time_slots).forEach(slot => {
            totalSlots++;
            if (slot.rating) {
              totalRatings++;
              ratingSum += slot.rating;
            }
            if (slot.has_smiley) {
              smileyCount++;
            }
          });
        }
      });

      const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
      const smileyRate = totalSlots > 0 ? (smileyCount / totalSlots) * 100 : 0;

      return {
        name: student.student_name,
        avgRating: Math.round(avgRating * 100) / 100,
        smileyRate: Math.round(smileyRate * 100) / 100,
        incidents: studentIncidents.length,
        evaluations: studentEvals.length
      };
    }).filter(student => student.evaluations > 0); // Only show students with data
  };

  // Get time slot performance analysis
  const getTimeSlotAnalysis = () => {
    const { filteredEvaluations } = getFilteredData();
    const timeSlots = ['8:30', '9:10', '9:50', '10:30', '11:10', '1:10', '1:50'];
    
    return timeSlots.map(slot => {
      let totalRatings = 0;
      let ratingSum = 0;
      let smileyCount = 0;
      let evaluationCount = 0;

      filteredEvaluations.forEach(evaluation => {
        if (evaluation.time_slots && evaluation.time_slots[slot]) {
          evaluationCount++;
          const slotData = evaluation.time_slots[slot];
          if (slotData.rating) {
            totalRatings++;
            ratingSum += slotData.rating;
          }
          if (slotData.has_smiley) {
            smileyCount++;
          }
        }
      });

      const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
      const smileyRate = evaluationCount > 0 ? (smileyCount / evaluationCount) * 100 : 0;

      return {
        timeSlot: slot,
        avgRating: Math.round(avgRating * 100) / 100,
        smileyRate: Math.round(smileyRate * 100) / 100,
        evaluationCount
      };
    });
  };

  // Get weekly progress trends
  const getWeeklyTrends = () => {
    const { filteredEvaluations } = getFilteredData();
    const weeks = [];
    const now = new Date();
    
    // Get last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7));
      const weekEnd = endOfWeek(weekStart);
      
      const weekEvals = filteredEvaluations.filter(evaluation => {
        const evalDate = new Date(evaluation.date);
        return evalDate >= weekStart && evalDate <= weekEnd;
      });

      let totalRatings = 0;
      let ratingSum = 0;
      let smileyCount = 0;
      let totalSlots = 0;

      weekEvals.forEach(evaluation => {
        if (evaluation.time_slots) {
          Object.values(evaluation.time_slots).forEach(slot => {
            totalSlots++;
            if (slot.rating) {
              totalRatings++;
              ratingSum += slot.rating;
            }
            if (slot.has_smiley) {
              smileyCount++;
            }
          });
        }
      });

      const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
      const smileyRate = totalSlots > 0 ? (smileyCount / totalSlots) * 100 : 0;

      weeks.push({
        week: `Week of ${format(weekStart, 'MMM dd')}`,
        avgRating: Math.round(avgRating * 100) / 100,
        smileyRate: Math.round(smileyRate * 100) / 100,
        evaluations: weekEvals.length
      });
    }

    return weeks;
  };

  // Export KPI data as CSV
  const exportKPIData = () => {
    const data = {
      overallMetrics,
      behaviorTrendData: getBehaviorTrendData(),
      incidentStats: getIncidentStats(),
      ratingDistribution: getRatingDistribution(),
      studentComparison: getStudentComparison(),
      timeSlotAnalysis: getTimeSlotAnalysis(),
      weeklyTrends: getWeeklyTrends(),
      exportDate: new Date().toISOString(),
      dateRange,
      selectedStudent: selectedStudent === 'all' ? 'All Students' : students.find(s => s.id === selectedStudent)?.student_name
    };

    const csvContent = [
      'KPI Dashboard Export',
      `Export Date: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
      `Date Range: Last ${dateRange} days`,
      `Student Filter: ${data.selectedStudent}`,
      '',
      'Overall Metrics:',
      `Average Rating: ${overallMetrics.avgRating}/4`,
      `Smiley Rate: ${overallMetrics.smileyRate}%`,
      `Total Incidents: ${overallMetrics.totalIncidents}`,
      `Students Tracked: ${overallMetrics.studentsEvaluated}`,
      `Total Evaluations: ${overallMetrics.totalEvaluations}`,
      '',
      'Student Performance:',
      'Name,Avg Rating,Smiley Rate %,Incidents,Evaluations',
      ...studentComparison.map(s => `${s.name},${s.avgRating},${s.smileyRate},${s.incidents},${s.evaluations}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-dashboard-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('KPI data exported successfully!');
  };

  const behaviorTrendData = getBehaviorTrendData();
  const incidentStats = getIncidentStats();
  const ratingDistribution = getRatingDistribution();
  const overallMetrics = getOverallMetrics();
  const studentComparison = getStudentComparison();
  const timeSlotAnalysis = getTimeSlotAnalysis();
  const weeklyTrends = getWeeklyTrends();

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading KPI Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-2 sm:gap-3">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                <span>KPI Dashboard</span>
              </h1>
              <p className="text-slate-600 flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Evidence-based insights and performance metrics</span>
                <span className="sm:hidden">Performance insights</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <Button onClick={exportKPIData} variant="outline" className="h-10 sm:h-auto">
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export Data</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button onClick={loadData} variant="outline" disabled={isLoading} className="h-10 sm:h-auto">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="h-10 sm:h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Student Filter</label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="h-10 sm:h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.student_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallMetrics.avgRating}/4</div>
              <p className="text-xs text-muted-foreground">
                From {overallMetrics.totalEvaluations} evaluations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Smiley Rate</CardTitle>
              <Smile className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallMetrics.smileyRate}%</div>
              <p className="text-xs text-muted-foreground">
                Positive behavior recognition
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallMetrics.totalIncidents}</div>
              <p className="text-xs text-muted-foreground">
                {overallMetrics.incidentRate} per student avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students Tracked</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallMetrics.studentsEvaluated}</div>
              <p className="text-xs text-muted-foreground">
                Active in selected period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Behavior Trend Line Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Behavior Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={behaviorTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    yAxisId="rating" 
                    domain={[0, 4]} 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    yAxisId="smiley" 
                    orientation="right" 
                    domain={[0, 100]} 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Line 
                    yAxisId="rating"
                    type="monotone" 
                    dataKey="avgRating" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Avg Rating (1-4)"
                  />
                  <Line 
                    yAxisId="smiley"
                    type="monotone" 
                    dataKey="smileyPercentage" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    name="Smiley Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Incident Types Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Incident Types Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {incidentStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={incidentStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="type" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={9}
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis 
                      fontSize={10}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="percentage" fill="#EF4444" name="Percentage %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-slate-500">
                  <div className="text-center">
                    <Award className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-green-500" />
                    <p className="text-sm sm:text-base">No incidents in selected period!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution and Student Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Rating Distribution Pie Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={ratingDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ rating, percentage }) => `${rating}: ${percentage}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {ratingDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Student Performance Comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Student Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {studentComparison.map((student, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 bg-slate-50 rounded-lg gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm sm:text-base">{student.name}</p>
                      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
                        <span>Avg: {student.avgRating}/4</span>
                        <span>😊 {student.smileyRate}%</span>
                        <span>Incidents: {student.incidents}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 self-start sm:self-center">
                      {student.avgRating >= 3.5 && (
                        <Badge className="bg-green-100 text-green-800 text-xs">Excellent</Badge>
                      )}
                      {student.avgRating >= 2.5 && student.avgRating < 3.5 && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">Good</Badge>
                      )}
                      {student.avgRating < 2.5 && (
                        <Badge className="bg-red-100 text-red-800 text-xs">Needs Support</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Slot Analysis and Weekly Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Time Slot Performance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Performance by Time of Day</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeSlotAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timeSlot" 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    yAxisId="rating" 
                    domain={[0, 4]} 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    yAxisId="smiley" 
                    orientation="right" 
                    domain={[0, 100]} 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Bar yAxisId="rating" dataKey="avgRating" fill="#3B82F6" name="Avg Rating" />
                  <Bar yAxisId="smiley" dataKey="smileyRate" fill="#F59E0B" name="Smiley Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Progress Trends */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Weekly Progress Trends</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={weeklyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="week" 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    yAxisId="rating" 
                    domain={[0, 4]} 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    yAxisId="smiley" 
                    orientation="right" 
                    domain={[0, 100]} 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Area 
                    yAxisId="rating"
                    type="monotone" 
                    dataKey="avgRating" 
                    stackId="1"
                    stroke="#3B82F6" 
                    fill="#3B82F6"
                    fillOpacity={0.6}
                    name="Avg Rating"
                  />
                  <Area 
                    yAxisId="smiley"
                    type="monotone" 
                    dataKey="smileyRate" 
                    stackId="2"
                    stroke="#F59E0B" 
                    fill="#F59E0B"
                    fillOpacity={0.6}
                    name="Smiley Rate %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Additional KPI Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Behavior Trends</h4>
                <p className="text-sm text-blue-800">
                  {overallMetrics.avgRating >= 3 ? 
                    "Overall behavior is trending positively. Continue current strategies." :
                    "Behavior scores indicate need for intervention strategies."
                  }
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Recognition Rate</h4>
                <p className="text-sm text-green-800">
                  {overallMetrics.smileyRate >= 20 ? 
                    "Good positive reinforcement rate. Students are receiving recognition." :
                    "Consider increasing positive behavior recognition opportunities."
                  }
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-900 mb-2">Incident Prevention</h4>
                <p className="text-sm text-orange-800">
                  {overallMetrics.totalIncidents === 0 ? 
                    "Excellent! No incidents recorded in this period." :
                    `${overallMetrics.totalIncidents} incidents recorded. Review patterns for prevention strategies.`
                  }
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Data Quality</h4>
                <p className="text-sm text-purple-800">
                  {overallMetrics.totalEvaluations >= (overallMetrics.studentsEvaluated * parseInt(dateRange) * 0.8) ? 
                    "Good data coverage for reliable insights." :
                    "Consider increasing evaluation frequency for better insights."
                  }
                </p>
              </div>
            </div>

            {/* Action Items */}
            <div className="mt-6 p-4 bg-slate-100 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-3">Recommended Action Items</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-slate-800 mb-2">🎯 Focus Areas</h5>
                  <ul className="text-sm text-slate-700 space-y-1">
                    {overallMetrics.avgRating < 3 && <li>• Implement targeted behavior interventions</li>}
                    {overallMetrics.smileyRate < 20 && <li>• Increase positive reinforcement strategies</li>}
                    {overallMetrics.totalIncidents > 0 && <li>• Review incident patterns for prevention</li>}
                    {timeSlotAnalysis.some(slot => slot.avgRating < 2.5) && <li>• Address challenging time periods</li>}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-slate-800 mb-2">📈 Celebrate Successes</h5>
                  <ul className="text-sm text-slate-700 space-y-1">
                    {overallMetrics.avgRating >= 3.5 && <li>• Excellent overall behavior ratings!</li>}
                    {overallMetrics.smileyRate >= 30 && <li>• High positive recognition rate!</li>}
                    {overallMetrics.totalIncidents === 0 && <li>• Zero incidents - great classroom management!</li>}
                    {studentComparison.filter(s => s.avgRating >= 3.5).length > 0 && 
                      <li>• {studentComparison.filter(s => s.avgRating >= 3.5).length} students showing excellent progress!</li>}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}