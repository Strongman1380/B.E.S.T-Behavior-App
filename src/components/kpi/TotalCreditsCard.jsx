import { Award, TrendingUp } from 'lucide-react';
import { formatTruncated } from '@/utils';

export default function TotalCreditsCard({ data }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[120px] text-gray-500">
        No data available
      </div>
    );
  }

  const { topStudent, avgCreditsPerStudent, totalCredits, studentTotals = [] } = data;
  const hasData = Boolean(topStudent);
  const displayList = studentTotals.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Award className="h-8 w-8 text-yellow-600" />
        </div>
        {hasData ? (
          <>
            <p className="text-xs uppercase tracking-wide text-slate-500">Top Earner</p>
            <div className="text-xl font-bold text-slate-900">{topStudent.fullName}</div>
            <p className="text-sm text-slate-600 mt-1">
              {formatTruncated(topStudent.credits ?? 0, 2)} credits earned
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-600">No credits recorded yet.</p>
        )}
      </div>

      <div className="pt-4 border-t space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Average per Student</span>
          <span className="font-semibold text-slate-900">
            {hasData ? formatTruncated(avgCreditsPerStudent ?? 0, 2) : 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Total Credits Logged</span>
          <span className="font-semibold text-slate-900">
            {hasData ? formatTruncated(totalCredits ?? 0, 2) : '0'}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            <TrendingUp className="h-3 w-3" />
            Student Totals
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {displayList.length === 0 ? (
              <p className="text-xs text-slate-500">No student credits recorded in this view.</p>
            ) : (
              displayList.map(student => (
                <div key={student.studentId} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{student.fullName}</p>
                    {student.grade && (
                      <p className="text-xs text-slate-500">{student.grade}</p>
                    )}
                  </div>
                  <span className="font-semibold text-slate-800">
                    {formatTruncated(student.credits ?? 0, 2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
