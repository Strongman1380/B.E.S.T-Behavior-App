import { useEffect, useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { IncidentReport } from '@/api/entities'

export default function IncidentsCountCard({ startDate, endDate }) {
  const initialStart = useMemo(() => (startDate ? new Date(startDate) : subDays(new Date(), 6)), [startDate])
  const initialEnd = useMemo(() => (endDate ? new Date(endDate) : new Date()), [endDate])
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sDate, setSDate] = useState(initialStart)
  const [eDate, setEDate] = useState(initialEnd)

  useEffect(() => {
    let mounted = true
    const fetchCount = async () => {
      if (loading) return // Prevent multiple concurrent requests
      setLoading(true)
      setError(null)
      try {
        const rows = await IncidentReport.filter({
          incident_date_from: sDate ? format(sDate, 'yyyy-MM-dd') : undefined,
          incident_date_to: eDate ? format(eDate, 'yyyy-MM-dd') : undefined,
        })
        if (!mounted) return
        setCount(Array.isArray(rows) ? rows.length : 0)
      } catch (e) {
        if (!mounted) return
        setError(e.message)
        setCount(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchCount()
    return () => { mounted = false }
  }, [sDate, eDate])

  const exportCsv = async () => {
    try {
      const rows = await IncidentReport.filter({
        incident_date_from: sDate ? format(sDate, 'yyyy-MM-dd') : undefined,
        incident_date_to: eDate ? format(eDate, 'yyyy-MM-dd') : undefined,
      })
      const headers = ['id','student_id','incident_date','incident_time','location','incident_type','severity_level','description','action_taken','reported_by','follow_up_required','follow_up_notes']
      const csv = [headers.join(',')]
      rows.forEach(r => {
        const vals = [
          r.id,
          r.student_id,
          r.incident_date,
          r.incident_time ?? '',
          r.location ?? '',
          r.incident_type ?? '',
          r.severity_level ?? '',
          (r.description ?? '').replaceAll('\n',' '),
          r.action_taken ?? '',
          r.reported_by ?? '',
          r.follow_up_required ?? false,
          (r.follow_up_notes ?? '').replaceAll('\n',' ')
        ].map(v => `"${String(v ?? '').replaceAll('"','""')}"`)
        csv.push(vals.join(','))
      })
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `incidents-${format(sDate,'yyyy-MM-dd')}_to_${format(eDate,'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Incidents (Range)</CardTitle>
        <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-slate-500 text-sm">Loading…</div>
        ) : error ? (
          <div className="text-red-600 text-xs">{error}</div>
        ) : (
          <div className="text-2xl font-bold">{count ?? '—'}</div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal text-xs px-2">
                <CalendarIcon className="mr-1 h-3 w-3" />
                {sDate ? format(sDate, 'M/d/yy') : 'Start'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={sDate} onSelect={(d) => d && setSDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal text-xs px-2">
                <CalendarIcon className="mr-1 h-3 w-3" />
                {eDate ? format(eDate, 'M/d/yy') : 'End'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={eDate} onSelect={(d) => d && setEDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  )
}
