import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Student } from '@/api/entities'

export default function ActiveStudentsCard() {
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await Student.filter({ active: true })
      setCount(Array.isArray(rows) ? rows.length : 0)
    } catch (e) {
      setError(e.message)
      setCount(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const exportCsv = async () => {
    try {
      const rows = await Student.filter({ active: true })
      const headers = ['id','student_name','grade_level','teacher_name','active']
      const csv = [headers.join(',')]
      rows.forEach(r => {
        const vals = [
          r.id,
          r.student_name ?? '',
          r.grade_level ?? '',
          r.teacher_name ?? '',
          r.active ?? true,
        ].map(v => `"${String(v ?? '').replaceAll('"','""')}"`)
        csv.push(vals.join(','))
      })
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `students-active.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Students (Active)</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>Refresh</Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-slate-500 text-sm">Loading…</div>
        ) : error ? (
          <div className="text-red-600 text-xs">{error}</div>
        ) : (
          <div className="text-2xl font-bold">{count ?? '—'}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">Currently active students</p>
      </CardContent>
    </Card>
  )
}
