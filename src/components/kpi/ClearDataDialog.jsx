import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ClearDataDialog({ open, onOpenChange, onClearData, dataCount }) {
  const handleClearData = () => {
    onClearData();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
            <Trash2 className="w-5 h-5 text-red-600" />
            Clear All Data
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              This will permanently delete ALL data including:
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>All daily evaluations ({dataCount.evaluations} records)</li>
                <li>All incident reports ({dataCount.incidents} records)</li>
                <li>All behavior summaries ({dataCount.summaries} records)</li>
                <li>All contact logs ({dataCount.contacts} records)</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <p className="text-slate-600">
            <strong>Warning:</strong> This action cannot be undone. All historical data and reports 
            will be permanently lost. Make sure you have exported any data you need before proceeding.
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
              onClick={handleClearData}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}