import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_CLASSES = [
  'Math', 'English', 'Science', 'Social Studies', 'History', 'PE', 'Art', 'Music', 'Technology'
];

function letterFromPercent(pct) {
  const v = Number(pct);
  if (Number.isNaN(v)) return '';
  if (v >= 90) return 'A';
  if (v >= 80) return 'B';
  if (v >= 70) return 'C';
  if (v >= 60) return 'D';
  return 'F';
}

export default function AddGradeDialog({ open, onOpenChange, onAdd }) {
  const [classMode, setClassMode] = useState('select'); // 'select' | 'custom'
  const [className, setClassName] = useState('Math');
  const [customClass, setCustomClass] = useState('');
  const [percent, setPercent] = useState('');

  const selectedClass = classMode === 'select' ? className : customClass.trim();
  const letter = useMemo(() => letterFromPercent(percent), [percent]);

  const canSubmit = selectedClass && percent !== '' && !Number.isNaN(Number(percent));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onAdd({ class_name: selectedClass, percentage: Number(percent), letter_grade: letter });
    setPercent('');
    setCustomClass('');
    setClassName('Math');
    setClassMode('select');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Grade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Class</Label>
            <div className="flex items-center gap-3">
              <label className="text-sm flex items-center gap-1">
                <input type="radio" name="classMode" value="select" checked={classMode === 'select'} onChange={() => setClassMode('select')} />
                Select
              </label>
              <label className="text-sm flex items-center gap-1">
                <input type="radio" name="classMode" value="custom" checked={classMode === 'custom'} onChange={() => setClassMode('custom')} />
                Custom
              </label>
            </div>
            {classMode === 'select' ? (
              <select value={className} onChange={(e) => setClassName(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-2">
                {DEFAULT_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <Input value={customClass} onChange={(e) => setCustomClass(e.target.value)} placeholder="Enter class name" />
            )}
          </div>

          <div className="space-y-2">
            <Label>Percentage</Label>
            <Input type="number" min="0" max="100" step="0.1" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="e.g., 87" />
            <p className="text-xs text-slate-500">Letter grade: <span className="font-semibold text-slate-700">{letter || '—'}</span></p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>Add Grade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

