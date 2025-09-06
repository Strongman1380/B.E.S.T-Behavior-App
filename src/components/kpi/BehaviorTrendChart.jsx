import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';

export default function BehaviorTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" fontSize={10} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="rating" domain={[0, 4]} fontSize={10} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="smiley" orientation="right" domain={[0, 100]} fontSize={10} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Line yAxisId="rating" type="monotone" dataKey="avgRating" stroke="#3B82F6" strokeWidth={2} name="Avg Rating (1-4)" />
        <Line yAxisId="smiley" type="monotone" dataKey="smileyPercentage" stroke="#F59E0B" strokeWidth={2} name="4's Rate (%)" />
      </LineChart>
    </ResponsiveContainer>
  );
}
