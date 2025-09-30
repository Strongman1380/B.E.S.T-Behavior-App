import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Line, ReferenceArea } from 'recharts'

export default function WeeklyProgressChart({ data }) {
  const hasData = Array.isArray(data) && data.some(d => (d?.avgRating ?? 0) > 0)
  if (!hasData) {
    return (
      <div className="h-[250px] flex items-center justify-center text-sm text-slate-500">
        No weekly data in the selected range
      </div>
    )
  }

  // Compute a simple moving average (3-point) for the line
  const ma = (arr, n = 3) => arr.map((_, i) => {
    const start = Math.max(0, i - (n - 1))
    const slice = arr.slice(start, i + 1)
    const sum = slice.reduce((s, x) => s + (x?.avgRating ?? 0), 0)
    return Number((sum / slice.length).toFixed(2))
  })

  const avgSeries = data.map(d => ({ week: d.week, avgRating: d.avgRating }))
  const maValues = ma(avgSeries, 3)
  const chartData = avgSeries.map((d, i) => ({ ...d, ma3: maValues[i] }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" fontSize={10} tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 4]} fontSize={10} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {/* Target performance band (3.5 - 4.0) */}
        <ReferenceArea y1={3.5} y2={4} fill="#D1FAE5" fillOpacity={0.5} ifOverflow="extendDomain" />
        <Bar dataKey="avgRating" name="Avg Rating" fill="#3B82F6" radius={[4,4,0,0]} />
        <Line type="monotone" dataKey="ma3" name="3‑wk Avg" stroke="#111827" dot={false} strokeWidth={2} />
      </BarChart>
    </ResponsiveContainer>
  )
}

