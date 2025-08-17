import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Circle } from "lucide-react";

export default function StudentList({ students, summaries, currentIndex, onSelectStudent }) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">Behavior Summaries</h2>
        <p className="text-sm text-slate-500">{students.length} students</p>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-2">
          {students.map((student, index) => {
            const hasSummary = summaries.some(s => s.student_id === student.id);
            return (
              <button
                key={student.id}
                onClick={() => onSelectStudent(index)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors duration-150 ${
                  currentIndex === index
                    ? 'bg-blue-100 text-blue-800 font-semibold'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>{student.student_name}</span>
                {hasSummary ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300" />
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}