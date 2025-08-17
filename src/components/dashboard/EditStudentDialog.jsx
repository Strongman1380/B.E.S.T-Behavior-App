import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EditStudentDialog({ student, open, onOpenChange, onUpdateStudent }) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      setName(student.name || '');
      setIsActive(student.active);
    }
  }, [student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !student) return;

    setIsSubmitting(true);
    try {
      await onUpdateStudent(student.id, { name: name.trim(), active: isActive });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating student:", error);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">Edit Student Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-sm font-medium text-slate-700">
              Student Name
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter student's full name"
              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="active-status" className="text-sm font-medium text-slate-700">
              Active Student
            </Label>
            <Switch
              id="active-status"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          <p className="text-xs text-slate-500 -mt-4">
            Inactive students will not appear on the dashboard.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}