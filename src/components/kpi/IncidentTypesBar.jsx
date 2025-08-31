import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { Award } from 'lucide-react';

export default function IncidentTypesBar({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-slate-500">
        <div className="text-center">
          <Award className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-green-500" />
          <p className="text-sm sm:text-base">No incidents in selected period!</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} fontSize={9} tick={{ fontSize: 9 }} />
        <YAxis fontSize={10} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: '12px' }} />
        <Bar dataKey="percentage" fill="#EF4444" name="Percentage %" />
      </BarChart>
    </ResponsiveContainer>
  );
}
