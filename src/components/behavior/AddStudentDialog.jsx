import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function AddStudentDialog({ open, onOpenChange, onAddStudent }) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onAddStudent({ student_name: name.trim(), active: true });
      setName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>Enter the student’s name to add them to the behavior dashboard.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="student-name">Student Name</Label>
          <Input id="student-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g., John Doe" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Student</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
