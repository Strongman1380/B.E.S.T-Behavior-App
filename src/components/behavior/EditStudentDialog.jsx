import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function EditStudentDialog({ open, onOpenChange, student, onUpdateStudent }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (student) {
      setName(student.student_name);
    }
  }, [student]);

  const handleSubmit = () => {
    if (name.trim() && student) {
      onUpdateStudent(student.id, { student_name: name.trim() });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Student Name</DialogTitle>
          <DialogDescription>Update the student's name below.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="student-name-edit">Student Name</Label>
          <Input id="student-name-edit" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}