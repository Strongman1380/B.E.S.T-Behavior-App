import { Award } from 'lucide-react';
import { formatTruncated } from '@/utils';

export default function TotalCreditsCard({ data }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[100px] text-gray-500">
        No data available
      </div>
    );
  }

  const { totalCredits, totalStudents, avgCreditsPerStudent } = data;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Award className="h-8 w-8 text-yellow-600" />
        </div>
        <div className="text-3xl font-bold text-slate-900">{totalStudents > 0 ? formatTruncated(totalCredits ?? 0, 2) : 'N/A'}</div>
        <p className="text-sm text-slate-600">Total Credits Earned</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">{totalStudents}</div>
          <p className="text-xs text-slate-600">Students with Credits</p>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">{totalStudents > 0 ? formatTruncated(avgCreditsPerStudent ?? 0, 2) : 'N/A'}</div>
          <p className="text-xs text-slate-600">Avg per Student</p>
        </div>
      </div>
    </div>
  );
}
