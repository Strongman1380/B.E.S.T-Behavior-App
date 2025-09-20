import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grade } from "@/api/entities";
import { format } from "date-fns";
import { toast } from "sonner";

const toLetterGrade = (value) => {
  const score = Number(value);
  if (Number.isNaN(score)) return '';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

export default function GradesEntryCard({ students = [] }) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [courseName, setCourseName] = useState("");
  const [grade, setGrade] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const handleAddGrade = async () => {
    const trimmedCourse = courseName.trim();

    if (!selectedStudent || !trimmedCourse || !grade) {
      toast.error("Please fill in all fields");
      return;
    }

    const gradeValue = parseFloat(grade);
    if (gradeValue < 0 || gradeValue > 100) {
      toast.error("Grade must be between 0 and 100");
      return;
    }

    try {
      const letterGrade = toLetterGrade(gradeValue);
      await Grade.create({
        student_id: Number(selectedStudent),
        course_name: trimmedCourse,
        grade_value: gradeValue,
        letter_grade: letterGrade,
        date_entered: date
      });

      toast.success("Grade recorded successfully!");
      setSelectedStudent("");
      setCourseName("");
      setGrade("");
    } catch (error) {
      console.error("Error recording grade:", error);
      toast.error("Failed to record grade");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Enter Course Grade</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Student</label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id.toString()}>
                    {student.student_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Course Name</label>
            <Input
              type="text"
              placeholder="Enter course name"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Grade (%)</label>
            <Input
              type="number"
              placeholder="Enter grade percentage"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              min="0"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <Button onClick={handleAddGrade} className="w-full">
            Record Grade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
