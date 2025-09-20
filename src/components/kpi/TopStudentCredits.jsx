import { Trophy, Award, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatTruncated } from '@/utils';

export default function TopStudentCredits({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500">
        <div className="text-center">
          <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No credits data available</p>
        </div>
      </div>
    );
  }

  // Sort students by credits (descending) and take top 5
  const topStudents = [...data]
    .sort((a, b) => b.credits - a.credits)
    .slice(0, 5);

  const topStudent = topStudents[0];

  return (
    <div className="space-y-4">
      {/* Top Student Highlight */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-6 w-6 text-yellow-600" />
          <h3 className="font-semibold text-slate-900">Most Credits Earned</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg text-slate-900">{topStudent.fullName}</p>
            <p className="text-sm text-slate-600">Grade {topStudent.grade}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-600">{formatTruncated(topStudent.credits ?? 0, 2)}</div>
            <p className="text-xs text-slate-600">Credits</p>
          </div>
        </div>
        {topStudent.recentCourse && (
          <div className="mt-2 pt-2 border-t border-yellow-200">
            <p className="text-xs text-slate-600">
              Latest: <span className="font-medium">{topStudent.recentCourse}</span>
            </p>
          </div>
        )}
      </div>

      {/* Top 5 Leaderboard */}
      <div className="space-y-2">
        <h4 className="font-medium text-slate-900 flex items-center gap-2">
          <Star className="h-4 w-4" />
          Top Performers
        </h4>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {topStudents.map((student, index) => (
            <div 
              key={student.studentId} 
              className={`flex items-center justify-between p-2 rounded-lg ${
                index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                index === 1 ? 'bg-gray-50 border border-gray-200' :
                index === 2 ? 'bg-orange-50 border border-orange-200' :
                'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-500 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-orange-500 text-white' :
                  'bg-slate-400 text-white'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{student.fullName}</p>
                  <p className="text-xs text-slate-600">{student.initials}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {formatTruncated(student.credits ?? 0, 2)} credits
                </Badge>
                {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
