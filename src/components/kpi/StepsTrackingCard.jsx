import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepsCompleted } from "@/api/entities";
import { format } from "date-fns";
import { toast } from "sonner";

export default function StepsTrackingCard({ students, onSaved }) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [stepsCount, setStepsCount] = useState("");

  const handleAddSteps = async () => {
    if (!selectedStudent || !date || !stepsCount) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await StepsCompleted.create({
        student_id: Number(selectedStudent),
        date_completed: date,
        steps_count: Number(stepsCount)
      });

      toast.success("Steps recorded successfully!");
      setSelectedStudent("");
      setStepsCount("");
      if (typeof onSaved === 'function') {
        onSaved();
      }
    } catch (error) {
      console.error("Error recording steps:", error);
      const message = typeof error?.message === 'string' ? error.message : '';
      if (message.includes('Could not find the table')) {
        toast.error('Steps tracking table is missing. Run the steps_completed SQL migration to enable this feature.');
      } else {
        toast.error("Failed to record steps");
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Record Daily Steps</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Student</label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id.toString()}>
                    {student.student_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Steps Completed</label>
            <Input
              type="number"
              placeholder="Enter steps count"
              value={stepsCount}
              onChange={(e) => setStepsCount(e.target.value)}
              min="0"
            />
          </div>

          <Button onClick={handleAddSteps} className="w-full">
            Record Steps
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
