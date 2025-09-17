import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function EditStudentDialog({ open, onOpenChange, student, onUpdateStudent }) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');

  useEffect(() => {
    if (student) {
      setName(student.student_name);
      setGrade(student.grade_level || '');
    } else {
      setName('');
      setGrade('');
    }
  }, [student]);

  const handleSubmit = () => {
    if (name.trim() && student) {
      const trimmedName = name.trim();
      const trimmedGrade = grade.trim();
      onUpdateStudent(student.id, { 
        student_name: trimmedName, 
        grade_level: trimmedGrade || null
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Student Details</DialogTitle>
          <DialogDescription>Update the student’s name and grade below.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Label htmlFor="student-name-edit">Student Name</Label>
          <Input id="student-name-edit" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <Label htmlFor="student-grade-edit">Student Grade</Label>
            <Input 
              id="student-grade-edit" 
              value={grade} 
              onChange={(e) => setGrade(e.target.value)} 
              placeholder="e.g., 8th Grade"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
