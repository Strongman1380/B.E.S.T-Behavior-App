import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle } from 'lucide-react';

export default function DeleteConfirmationDialog({ open, onOpenChange, onConfirm, count, actionText = "delete", description }) {
  const finalDescription = description || `This action cannot be undone. This will permanently ${actionText} ${count} student(s) and all of their associated evaluation data.`;
  const confirmText = actionText.charAt(0).toUpperCase() + actionText.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-red-500" /> Are you sure?</DialogTitle>
          <DialogDescription>
            {finalDescription}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Yes, {confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}