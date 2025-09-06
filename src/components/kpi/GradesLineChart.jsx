import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

function defaultColors(n) {
  const palette = [
    '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#22C55E', '#A855F7', '#64748B'
  ];
  return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
}

export default function GradesLineChart({ data, seriesKeys }) {
  const colors = defaultColors(seriesKeys.length);
  const hasMulti = seriesKeys.length > 1;
  if (!Array.isArray(seriesKeys) || seriesKeys.length === 0) {
    return <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">No grade data in range</div>;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" interval={'preserveStartEnd'} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v) => `${v?.toFixed ? v.toFixed(1) : v}%`} />
          {hasMulti && <Legend />}
          {seriesKeys.map((key, idx) => (
            <Line key={key} type="monotone" dataKey={key} stroke={colors[idx]} dot={false} isAnimationActive={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
