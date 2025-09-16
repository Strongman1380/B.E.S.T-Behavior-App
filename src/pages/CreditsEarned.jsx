import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Student, CreditsEarned as CreditsEarnedEntity, ClassesNeeded as ClassesNeededEntity } from '@/api/entities';

export default function CreditsEarned() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [credits, setCredits] = useState([]);
  const [classes, setClasses] = useState([]);
  const [newCredit, setNewCredit] = useState({ course_name: '', credit_value: '', date_earned: '', grade: '' });
  const [newClass, setNewClass] = useState({ course_name: '', priority_level: '' });

  useEffect(() => {
    async function fetchStudents() {
      const allStudents = await Student.all();
      setStudents(allStudents);
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
    try {
      await CreditsEarnedEntity.create({ ...newCredit, student_id: selectedStudent });
      toast.success('Credit added successfully!');
      fetchStudentData(selectedStudent);
      setNewCredit({ course_name: '', credit_value: '', date_earned: '', grade: '' });
    } catch (error) {
      toast.error('Error adding credit.');
      console.error(error);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Credits Earned</h1>
      <div className="mb-4">
        <Label htmlFor="student">Select Student</Label>
        <Select onValueChange={handleStudentChange}>
          <SelectTrigger id="student">
            <SelectValue placeholder="Select a student" />
          </SelectTrigger>
          <SelectContent>
            {students.map(student => (
              <SelectItem key={student.id} value={student.id}>
                {student.student_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedStudent && (
        <div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold mb-2">Credits Earned</h2>
              <div className="mb-4 p-4 border rounded-lg">
                <h3 className="font-bold mb-2">Add New Credit</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input name="course_name" placeholder="Course Name" value={newCredit.course_name} onChange={handleCreditChange} />
                  <Input name="credit_value" placeholder="Credit Value" value={newCredit.credit_value} onChange={handleCreditChange} />
                  <Input name="date_earned" type="date" value={newCredit.date_earned} onChange={handleCreditChange} />
                  <Input name="grade" placeholder="Grade" value={newCredit.grade} onChange={handleCreditChange} />
                </div>
                <Button onClick={addCredit} className="mt-2">Add Credit</Button>
              </div>
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
                      <TableCell>{credit.course_name}</TableCell>
                      <TableCell>{credit.credit_value}</TableCell>
                      <TableCell>{credit.date_earned}</TableCell>
                      <TableCell>{credit.grade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2">Classes Needed</h2>
              <div className="mb-4 p-4 border rounded-lg">
                <h3 className="font-bold mb-2">Add New Class</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input name="course_name" placeholder="Course Name" value={newClass.course_name} onChange={handleClassChange} />
                  <Input name="priority_level" placeholder="Priority Level" value={newClass.priority_level} onChange={handleClassChange} />
                </div>
                <Button onClick={addClass} className="mt-2">Add Class</Button>
              </div>
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
                      <TableCell>{klass.priority_level}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}