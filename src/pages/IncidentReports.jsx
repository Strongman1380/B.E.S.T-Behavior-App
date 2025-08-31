import { useState, useEffect, useCallback } from "react";
import { IncidentReport, Student, Settings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Search, Calendar, User, Plus, Eye, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from 'sonner';
import IncidentReportDialog from "../components/behavior/IncidentReportDialog";

const INCIDENT_TYPES = [
  "Aggressive Behavior",
  "Disruptive Behavior", 
  "Destruction of Property",
  "Cheating",
  "Refusing Redirection",
  "Property Destruction",
  "Theft"
];

const INCIDENT_TYPE_COLORS = {
  "Aggressive Behavior": "bg-red-100 text-red-800 border-red-200",
  "Disruptive Behavior": "bg-orange-100 text-orange-800 border-orange-200",
  "Destruction of Property": "bg-purple-100 text-purple-800 border-purple-200",
  "Cheating": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Refusing Redirection": "bg-blue-100 text-blue-800 border-blue-200",
  "Property Destruction": "bg-purple-100 text-purple-800 border-purple-200",
  "Theft": "bg-red-100 text-red-800 border-red-200"
};

export default function IncidentReports() {
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStudent, setFilterStudent] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [reportsData, studentsData, settingsData] = await Promise.all([
        IncidentReport.list('incident_date'),
        Student.filter({ active: true }),
        Settings.list()
      ]);
      
      setReports(reportsData.reverse()); // Most recent first
      setStudents(studentsData);
      setSettings(settingsData[0] || null);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load incident reports.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filterReports = useCallback(() => {
    let filtered = reports;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.incident_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.staff_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter(report => report.incident_type === filterType);
    }

    // Student filter
    if (filterStudent !== "all") {
      filtered = filtered.filter(report => report.student_id === filterStudent);
    }

    setFilteredReports(filtered);
  }, [reports, searchTerm, filterType, filterStudent]);

  useEffect(() => {
    filterReports();
  }, [filterReports]);

  

  const handleSaveReport = async (reportData) => {
    try {
      await IncidentReport.create(reportData);
      toast.success("Incident report created successfully!");
      await loadData();
    } catch (error) {
      console.error("Error saving incident report:", error);
      throw error;
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm("Are you sure you want to delete this incident report?")) return;
    
    try {
      await IncidentReport.delete(reportId);
      toast.success("Incident report deleted successfully!");
      await loadData();
    } catch (error) {
      console.error("Error deleting incident report:", error);
      toast.error("Failed to delete incident report.");
    }
  };

  const handleCreateReport = (student = null) => {
    setSelectedStudent(student);
    setShowCreateDialog(true);
  };

  const handleViewReport = (report) => {
    setViewingReport(report);
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.student_name || 'Unknown Student';
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading incident reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-2 sm:gap-3">
                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                <span className="hidden sm:inline">Incident Reports</span>
                <span className="sm:hidden">Incidents</span>
              </h1>
              <p className="text-slate-600 flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
                <span className="sm:hidden">{format(new Date(), 'MMM d, yyyy')}</span>
              </p>
            </div>
            <Button 
              onClick={() => handleCreateReport()} 
              className="bg-red-600 hover:bg-red-700 h-10 sm:h-11 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Incident Report</span>
              <span className="sm:hidden">New Report</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 sm:h-11"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-10 sm:h-11">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {INCIDENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStudent} onValueChange={setFilterStudent}>
                  <SelectTrigger className="h-10 sm:h-11">
                    <SelectValue placeholder="Filter by student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>{student.student_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-base sm:text-lg">
                <span className="hidden sm:inline">Incident Reports ({filteredReports.length})</span>
                <span className="sm:hidden">Reports ({filteredReports.length})</span>
              </span>
              {filteredReports.length > 0 && (
                <Badge variant="outline" className="text-slate-600 text-xs">
                  {filteredReports.length} of {reports.length} reports
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredReports.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <AlertTriangle className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">
                  {reports.length === 0 ? "No Incident Reports" : "No Reports Match Filters"}
                </h3>
                <p className="text-slate-500 mb-4 text-sm sm:text-base">
                  {reports.length === 0 
                    ? "Create your first incident report to get started." 
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
                {reports.length === 0 && (
                  <Button onClick={() => handleCreateReport()} className="bg-red-600 hover:bg-red-700 h-10 sm:h-11">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Report
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Incident Type</TableHead>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map(report => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            {format(parseISO(report.incident_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              {getStudentName(report.student_id)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={INCIDENT_TYPE_COLORS[report.incident_type] || "bg-slate-100 text-slate-800"}>
                              {report.incident_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{report.staff_name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewReport(report)}
                                className="text-slate-500 hover:text-slate-800"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteReport(report.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-200">
                  {filteredReports.map(report => (
                    <div key={report.id} className="p-4">
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-slate-400" />
                            <p className="font-semibold text-slate-900 text-sm">{getStudentName(report.student_id)}</p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {format(parseISO(report.incident_date), 'MMM d, yyyy')} • {report.staff_name}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewReport(report)}
                            className="w-8 h-8 text-slate-500"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReport(report.id)}
                            className="w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <Badge className={`${INCIDENT_TYPE_COLORS[report.incident_type] || "bg-slate-100 text-slate-800"} text-xs`}>
                        {report.incident_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Report Dialog */}
      <IncidentReportDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        student={selectedStudent}
        settings={settings}
        onSave={handleSaveReport}
      />

      {/* View Report Dialog */}
      {viewingReport && (
        <IncidentReportDialog
          open={!!viewingReport}
          onOpenChange={() => setViewingReport(null)}
          student={students.find(s => s.id === viewingReport.student_id)}
          settings={settings}
          onSave={() => {}} // Read-only mode
          initialData={viewingReport}
          readOnly={true}
        />
      )}
    </div>
  );
}
