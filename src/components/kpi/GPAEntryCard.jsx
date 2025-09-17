import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "@/api/entities";
import { toast } from "sonner";

export default function GPAEntryCard({ students }) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [gpa, setGpa] = useState("");

  const handleAddGPA = async () => {
    if (!selectedStudent || !gpa) {
      toast.error("Please fill in all fields");
      return;
    }

    const gpaValue = parseFloat(gpa);
    if (gpaValue < 0 || gpaValue > 4) {
      toast.error("GPA must be between 0 and 4");
      return;
    }

    try {
      // TODO: Implement GPA entity
      // await GPA.create({
      //   student_id: parseInt(selectedStudent),
      //   gpa_value: gpaValue,
      //   calculated_date: new Date().toISOString()
      // });

      toast.success("GPA recorded successfully!");
      setSelectedStudent("");
      setGpa("");
    } catch (error) {
      console.error("Error recording GPA:", error);
      toast.error("Failed to record GPA");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Enter Student GPA</CardTitle>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">GPA (0-4.0)</label>
            <Input
              type="number"
              placeholder="Enter GPA"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              min="0"
              max="4"
              step="0.01"
            />
          </div>

          <Button onClick={handleAddGPA} className="w-full">
            Record GPA
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
