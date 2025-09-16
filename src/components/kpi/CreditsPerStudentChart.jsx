import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';

export default function CreditsPerStudentChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-gray-500">
        No credits data available
      </div>
    );
  }

  // Custom tooltip to show full name on hover
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.fullName}</p>
          <p className="text-blue-600">
            Credits: <span className="font-semibold">{data.credits}</span>
          </p>
          {data.courses && (
            <p className="text-sm text-gray-600">
              Courses: {data.courses}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="initials" 
          fontSize={10} 
          tick={{ fontSize: 10 }}
          interval={0}
        />
        <YAxis fontSize={10} tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="credits" 
          fill="#F59E0B" 
          radius={[4, 4, 0, 0]}
          name="Credits Earned"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
