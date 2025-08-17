import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RotateCcw, Loader2 } from 'lucide-react';

export default function ResetDialog({ open, onOpenChange, onConfirm, count }) {
    const [isResetting, setIsResetting] = useState(false);

    const handleConfirm = async () => {
        try {
            setIsResetting(true);
            await onConfirm();
            onOpenChange(false); // Close dialog after successful reset
        } catch (error) {
            console.error("Error during reset:", error);
            // Keep dialog open if there's an error so user can try again
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RotateCcw className="text-orange-500"/>
                        Reset Today's Evaluations?
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete all {count} of today's evaluations? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button 
                        variant="outline" 
                        onClick={() => onOpenChange(false)}
                        disabled={isResetting}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleConfirm}
                        disabled={isResetting}
                    >
                        {isResetting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Resetting...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Yes, Reset
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}