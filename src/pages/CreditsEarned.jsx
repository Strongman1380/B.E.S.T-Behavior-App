import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Student, CreditsEarned as CreditsEarnedEntity, ClassesNeeded as ClassesNeededEntity } from '@/api/entities';
import { User, Plus, Calendar, BookOpen, Award } from 'lucide-react';

export default function CreditsEarned() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [credits, setCredits] = useState([]);
  const [classes, setClasses] = useState([]);
  const [newCredit, setNewCredit] = useState({ course_name: '', credit_value: '', date_earned: '', grade: '' });
  useEffect(() => {
    if (selectedStudent) {
      const studentObj = students.find(s => s.id === selectedStudent);
      if (studentObj && studentObj.grade_level) {
        setNewCredit(credit => ({ ...credit, grade: studentObj.grade_level }));
      }
    }
  }, [selectedStudent, students]);
  const [newClass, setNewClass] = useState({ course_name: '', priority_level: '' });

  useEffect(() => {
    async function fetchStudents() {
      try {
        // Load active students, ordered by name
        const allStudents = await Student.filter({ active: true }, 'student_name');
        setStudents(allStudents || []);
      } catch (error) {
        console.error('Error loading students:', error);
        toast.error('Failed to load students');
        setStudents([]);
      }
    }
    fetchStudents();
  }, []);

  async function fetchStudentData(studentId) {
    const [creditsData, classesData] = await Promise.all([
      CreditsEarnedEntity.filter({ student_id: studentId }),
      ClassesNeededEntity.filter({ student_id: studentId })
    ]);
    setCredits(creditsData);
    setClasses(classesData);
  }

  function handleStudentChange(studentId) {
    setSelectedStudent(studentId);
    fetchStudentData(studentId);
  }

  function handleCreditChange(e) {
    const { name, value } = e.target;
    setNewCredit({ ...newCredit, [name]: value });
  }

  function handleClassChange(e) {
    const { name, value } = e.target;
    setNewClass({ ...newClass, [name]: value });
  }

  async function addCredit() {
    if (!selectedStudent) {
      toast.error('Please select a student first.');
      return;
    }
    
    // Validate required fields
    if (!newCredit.course_name.trim()) {
      toast.error('Please enter a course name.');
      return;
    }
    if (!newCredit.credit_value || parseFloat(newCredit.credit_value) <= 0) {
      toast.error('Please enter a valid credit value.');
      return;
    }
    if (!newCredit.date_earned) {
      toast.error('Please select the date when the credit was earned.');
      return;
    }
    
    try {
      const creditData = {
        ...newCredit,
        student_id: parseInt(selectedStudent),
        credit_value: parseFloat(newCredit.credit_value)
      };
      
      await CreditsEarnedEntity.create(creditData);
      toast.success('Credit added successfully!');
      fetchStudentData(selectedStudent);
      setNewCredit({ course_name: '', credit_value: '', date_earned: '', grade: '' });
    } catch (error) {
      toast.error('Error adding credit: ' + (error.message || 'Unknown error'));
      console.error('Error adding credit:', error);
    }
  }

  async function addClass() {
    if (!selectedStudent) {
      toast.error('Please select a student first.');
      return;
    }
    try {
      await ClassesNeededEntity.create({ ...newClass, student_id: selectedStudent });
      toast.success('Class added successfully!');
      fetchStudentData(selectedStudent);
      setNewClass({ course_name: '', priority_level: '' });
    } catch (error) {
      toast.error('Error adding class.');
      console.error(error);
    }
  }

  const selectedStudentData = students.find(s => s.id === selectedStudent);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Award className="h-6 w-6" />
        Credits Earned
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Student List - Left Side */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Students
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {students.map(student => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentChange(student.id)}
                    className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedStudent === student.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{student.student_name}</p>
                        <p className="text-xs text-gray-500">Grade {student.grade_level}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Details and Credits - Right Side */}
        <div className="lg:col-span-3">
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Selected Student Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedStudentData?.student_name}
                    <span className="text-sm font-normal text-gray-500">
                      - Grade {selectedStudentData?.grade_level}
                    </span>
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Add New Credit Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Credit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="course_name" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Course Name
                      </Label>
                      <Input 
                        id="course_name"
                        name="course_name" 
                        placeholder="Enter course name" 
                        value={newCredit.course_name} 
                        onChange={handleCreditChange} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="credit_value">Credit Value</Label>
                      <Input 
                        id="credit_value"
                        name="credit_value" 
                        placeholder="e.g., 1.0" 
                        type="number"
                        step="0.1"
                        value={newCredit.credit_value} 
                        onChange={handleCreditChange} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="date_earned" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date Earned
                      </Label>
                      <Input 
                        id="date_earned"
                        name="date_earned" 
                        type="date" 
                        value={newCredit.date_earned} 
                        onChange={handleCreditChange} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="grade">Grade Level</Label>
                      <select
                        id="grade"
                        name="grade"
                        value={newCredit.grade}
                        onChange={handleCreditChange}
                        className="border rounded px-2 py-1 w-full"
                      >
                        <option value="">Select grade</option>
                        <option value="8th grade">8th grade</option>
                        <option value="freshman">Freshman</option>
                        <option value="sophomore">Sophomore</option>
                        <option value="junior">Junior</option>
                        <option value="senior">Senior</option>
                      </select>
                    </div>
                  </div>
                  <Button onClick={addCredit} className="mt-4 w-full md:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Credit
                  </Button>
                </CardContent>
              </Card>

              {/* Credits Earned Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Credits Earned History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {credits.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course Name</TableHead>
                          <TableHead>Credit Value</TableHead>
                          <TableHead>Date Earned</TableHead>
                          <TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {credits.map(credit => (
                          <TableRow key={credit.id}>
                            <TableCell className="font-medium">{credit.course_name}</TableCell>
                            <TableCell>{credit.credit_value}</TableCell>
                            <TableCell>{new Date(credit.date_earned).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                {credit.grade}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No credits recorded yet</p>
                      <p className="text-sm">Add the first credit above</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Classes Needed Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Classes Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-medium mb-3">Add New Class Needed</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        name="course_name" 
                        placeholder="Course Name" 
                        value={newClass.course_name} 
                        onChange={handleClassChange} 
                      />
                      <Input 
                        name="priority_level" 
                        placeholder="Priority Level (High, Medium, Low)" 
                        value={newClass.priority_level} 
                        onChange={handleClassChange} 
                      />
                    </div>
                    <Button onClick={addClass} className="mt-3">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Class
                    </Button>
                  </div>
                  
                  {classes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course Name</TableHead>
                          <TableHead>Priority Level</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classes.map(klass => (
                          <TableRow key={klass.id}>
                            <TableCell>{klass.course_name}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-sm ${
                                klass.priority_level?.toLowerCase() === 'high' ? 'bg-red-100 text-red-800' :
                                klass.priority_level?.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {klass.priority_level}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No classes needed recorded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Student</h3>
                <p className="text-gray-500">Choose a student from the list to view and manage their credits</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}