import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area } from 'recharts';

export default function WeeklyTrendsArea({ data }) {
  const hasData = Array.isArray(data) && data.some(d => (d?.avgRating ?? 0) > 0 || (d?.smileyRate ?? 0) > 0);
  if (!hasData) {
    return (
      <div className="h-[250px] flex items-center justify-center text-sm text-slate-500">
        No weekly data in the selected range
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" fontSize={10} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="rating" domain={[0, 4]} fontSize={10} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="smiley" orientation="right" domain={[0, 100]} fontSize={10} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Area yAxisId="rating" type="monotone" dataKey="avgRating" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Avg Rating" />
        <Area yAxisId="smiley" type="monotone" dataKey="smileyRate" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} name="4's Rate %" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
