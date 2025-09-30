import { Badge } from '@/components/ui/badge';

export default function StudentComparisonList({ data }) {
  return (
    <div className="space-y-3 max-h-[250px] overflow-y-auto">
      {data.map((student, index) => (
        <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 bg-slate-50 rounded-lg gap-2">
          <div className="flex-1">
            <p className="font-medium text-slate-900 text-sm sm:text-base">{student.name}</p>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
              <span>Avg: {student.avgRating}/4</span>
              {student.behavioralAvg !== undefined && (
                <span className={
                  student.behavioralAvg >= 3.5 ? 'text-green-600' :
                  student.behavioralAvg >= 2.5 ? 'text-yellow-600' :
                  student.behavioralAvg >= 2.0 ? 'text-orange-600' :
                  'text-red-600'
                }>
                  Behavioral: {student.behavioralAvg}/4
                </span>
              )}
              {student.academicAvg > 0 && (
                <span>Academic: {student.academicAvg}/4</span>
              )}
              <span>4's Rate: {student.smileyRate}%</span>
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2 self-start sm:self-center">
            {student.behavioralAvg >= 3.5 && (
              <Badge className="bg-green-100 text-green-800 text-xs">Excellent</Badge>
            )}
            {student.behavioralAvg >= 2.5 && student.behavioralAvg < 3.5 && (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">Meets Expectations</Badge>
            )}
            {student.behavioralAvg >= 2.0 && student.behavioralAvg < 2.5 && (
              <Badge className="bg-orange-100 text-orange-800 text-xs">Needs Improvement</Badge>
            )}
            {student.behavioralAvg < 2.0 && (
              <Badge className="bg-red-100 text-red-800 text-xs">Significant Concerns</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
