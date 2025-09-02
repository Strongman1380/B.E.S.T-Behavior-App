import { useEffect, useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ContactLog } from '@/api/entities'

export default function ContactLogsCountCard({ startDate, endDate }) {
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
        const rows = await ContactLog.filter({
          contact_date_from: sDate ? format(sDate, 'yyyy-MM-dd') : undefined,
          contact_date_to: eDate ? format(eDate, 'yyyy-MM-dd') : undefined,
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
      const rows = await ContactLog.filter({
        contact_date_from: sDate ? format(sDate, 'yyyy-MM-dd') : undefined,
        contact_date_to: eDate ? format(eDate, 'yyyy-MM-dd') : undefined,
      })
      const headers = ['id','student_id','contact_date','contact_person_name','contact_category','purpose_of_contact','outcome_of_contact']
      const csv = [headers.join(',')]
      rows.forEach(r => {
        const vals = [
          r.id,
          r.student_id,
          r.contact_date,
          r.contact_person_name ?? '',
          r.contact_category ?? '',
          (r.purpose_of_contact ?? '').replaceAll('\n',' '),
          (r.outcome_of_contact ?? '').replaceAll('\n',' ')
        ].map(v => `"${String(v ?? '').replaceAll('"','""')}"`)
        csv.push(vals.join(','))
      })
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contact-logs-${format(sDate,'yyyy-MM-dd')}_to_${format(eDate,'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Contact Logs (Range)</CardTitle>
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
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {sDate ? format(sDate, 'PPP') : 'Start'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={sDate} onSelect={(d) => d && setSDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {eDate ? format(eDate, 'PPP') : 'End'}
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
