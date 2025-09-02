import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function TimeSlotAnalysisBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timeSlot" fontSize={10} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="rating" domain={[0, 4]} fontSize={10} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="smiley" orientation="right" domain={[0, 100]} fontSize={10} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar yAxisId="rating" dataKey="avgRating" fill="#3B82F6" name="Avg Rating" />
        <Bar yAxisId="smiley" dataKey="smileyRate" fill="#F59E0B" name="4's Rate %" />
      </BarChart>
    </ResponsiveContainer>
  );
}
