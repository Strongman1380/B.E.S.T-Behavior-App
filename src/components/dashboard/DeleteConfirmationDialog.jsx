import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

export default function DeleteConfirmationDialog({ open, onOpenChange, onConfirm, count }) {
  if (count === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-red-600">
            <AlertTriangle className="w-6 h-6" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription className="pt-4 text-base text-slate-600">
            Are you sure you want to permanently delete <strong>{count} student(s)</strong>?
            This will also delete all of their associated evaluation data.
            <br/><br/>
            <strong>This action cannot be undone.</strong>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11">Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} className="h-11 font-semibold">Yes, Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}