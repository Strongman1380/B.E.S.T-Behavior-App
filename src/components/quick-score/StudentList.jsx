import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Circle } from "lucide-react";

export default function StudentList({ students, evaluations, currentIndex, onSelectStudent, collapsed = false }) {
  if (collapsed) {
    return (
      <aside className="w-16 bg-white border-r border-slate-200 flex flex-col">
        <ScrollArea className="flex-1">
          <nav className="p-1">
            {students.map((student, index) => {
              const hasEvaluation = evaluations.some(e => e.student_id === student.id);
              return (
                <button
                  key={student.id}
                  onClick={() => onSelectStudent(index)}
                  className={`w-full text-center p-2 rounded-lg flex flex-col items-center transition-colors duration-150 ${
                    currentIndex === index
                      ? 'bg-blue-100 text-blue-600'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title={student.student_name}
                >
                  <span className="text-xs font-medium truncate w-full">{student.student_name.split(' ').map(n => n[0]).join('')}</span>
                  {hasEvaluation ? (
                    <CheckCircle className="w-3 h-3 text-green-500 mt-1" />
                  ) : (
                    <Circle className="w-3 h-3 text-slate-300 mt-1" />
                  )}
                </button>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">All Students</h2>
        <p className="text-sm text-slate-500">{students.length} total</p>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-2">
          {students.map((student, index) => {
            const hasEvaluation = evaluations.some(e => e.student_id === student.id);
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
                {hasEvaluation ? (
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
