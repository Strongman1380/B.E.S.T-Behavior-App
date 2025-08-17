import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetDialog({ open, onOpenChange, onReset, count }) {
  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
            <RotateCcw className="w-5 h-5" />
            Reset All Evaluations
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              This will permanently delete all evaluation data for today ({count} students). 
              Make sure you have printed any reports you need before resetting.
            </AlertDescription>
          </Alert>
          
          <p className="text-slate-600">
            This action cannot be undone. All students will return to their initial state 
            and you can start fresh evaluations.
          </p>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}