import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

export default function SupabaseStatus() {
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(true)
  const [counts, setCounts] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        const res = await fetch('/api/supabase-status')
        if (!res.ok) throw new Error('status failed')
        const json = await res.json()
        if (!mounted) return
        setReady(Boolean(json?.ready))
        setCounts(json?.counts || null)
      } catch {
        if (!mounted) return
        setReady(false)
        setCounts(null)
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  if (!visible) return null

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Badge className={`${ready ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-900 border-amber-200'}`}>
          Supabase {ready ? 'Connected' : 'Unavailable'}
        </Badge>
        <div className="flex items-center gap-2">
          {counts && (
            <button className="text-xs text-slate-500 hover:text-slate-700" onClick={() => setShowDetails(v => !v)}>
              {showDetails ? 'Hide details' : 'Details'}
            </button>
          )}
          <button className="text-xs text-slate-500 hover:text-slate-700" onClick={() => setVisible(false)}>Hide</button>
        </div>
      </div>
      {showDetails && counts && (
        <div className="text-xs text-slate-600 space-y-1">
          <div>students: {counts.students ?? '—'}, evals: {counts.daily_evaluations ?? '—'}, incidents: {counts.incident_reports ?? '—'}, logs: {counts.contact_logs ?? '—'}</div>
          <Ranges />
        </div>
      )}
    </div>
  )
}

function Ranges() {
  const [ranges, setRanges] = useState(null)
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/supabase-status')
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        setRanges(json?.ranges || null)
      } catch {
        // ignore
      }
    }
    load()
    return () => { mounted = false }
  }, [])
  if (!ranges) return null
  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '—')
  return (
    <div className="text-[11px] text-slate-500">
      <div>evals: {fmt(ranges?.daily_evaluations?.min)} → {fmt(ranges?.daily_evaluations?.max)}</div>
      <div>logs: {fmt(ranges?.contact_logs?.min)} → {fmt(ranges?.contact_logs?.max)}</div>
      <div>incidents: {fmt(ranges?.incident_reports?.min)} → {fmt(ranges?.incident_reports?.max)}</div>
    </div>
  )
}
