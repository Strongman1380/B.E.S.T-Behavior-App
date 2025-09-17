import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

export default function RatingDistributionBar({ data }) {
  // Filter out entries with 0 count for display
  const displayData = data.filter(entry => entry.count > 0);

  if (displayData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-gray-500">
        <div className="text-center">
          <div className="text-lg font-semibold">No Rating Data</div>
          <div className="text-sm">No evaluations found for the selected period</div>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <XAxis
          dataKey="rating"
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          contentStyle={{ fontSize: '12px' }}
          formatter={(value, _, props) => [
            `${props.payload.count} ratings (${value}%)`,
            props.payload.rating
          ]}
        />
        <Bar
          dataKey="percentage"
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
