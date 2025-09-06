import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

export default function RatingDistributionPie({ data }) {
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
      <PieChart>
        <Pie
          data={displayData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ rating, percentage }) => `${rating}: ${percentage}%`}
          outerRadius={60}
          fill="#8884d8"
          dataKey="count"
        >
          {displayData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ fontSize: '12px' }}
          formatter={(value, _, props) => [
            `${value} ratings (${props.payload.percentage}%)`, 
            props.payload.rating
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
