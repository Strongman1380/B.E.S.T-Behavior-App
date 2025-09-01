import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'

const TABLES = [
  'students',
  'daily_evaluations',
  'contact_logs',
  'incident_reports',
  'settings',
  'behavior_summaries',
  'users',
]

export default function SupabaseHealth() {
  const [open, setOpen] = useState(false)
  const [checks, setChecks] = useState(null)

  const env = useMemo(() => ({
    url: import.meta?.env?.VITE_SUPABASE_URL || import.meta?.env?.NEXT_PUBLIC_SUPABASE_URL || '',
    key: import.meta?.env?.VITE_SUPABASE_ANON_KEY || import.meta?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }), [])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      const out = {
        env: {
          urlPresent: Boolean(env.url),
          keyPresent: Boolean(env.key),
        },
        clientPresent: Boolean(supabase),
        tables: {},
      }
      if (!supabase) { if (mounted) setChecks(out); return }
      for (const t of TABLES) {
        try {
          const res = await supabase.from(t).select('id', { count: 'exact', head: true })
          out.tables[t] = {
            ok: !res.error,
            count: res.count ?? null,
            error: res.error?.message || null,
          }
        } catch (e) {
          out.tables[t] = { ok: false, count: null, error: e?.message || 'unknown error' }
        }
      }
      if (mounted) setChecks(out)
    }
    run()
    // no interval; manual view for troubleshooting
    return () => { mounted = false }
  }, [env.url, env.key])

  const mask = (s) => (s ? `${s.slice(0, 6)}…${s.slice(-4)}` : '—')

  const allOk = Boolean(checks?.clientPresent) && Object.values(checks?.tables || {}).every(v => v.ok)

  return (
    <div className="border rounded-md p-2 text-xs text-slate-600 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${allOk ? 'bg-green-500' : 'bg-amber-500'}`} />
          <span>Supabase Health {allOk ? '(ok)' : '(check config)'}</span>
        </div>
        <button className="text-slate-500 hover:text-slate-800" onClick={() => setOpen(v => !v)}>
          {open ? 'Hide' : 'Details'}
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-2">
          <div>
            <div>URL present: {checks?.env?.urlPresent ? 'yes' : 'no'}</div>
            <div>Anon key present: {checks?.env?.keyPresent ? 'yes' : 'no'}</div>
            <div>Client created: {checks?.clientPresent ? 'yes' : 'no'}</div>
            <div className="text-[10px] text-slate-400 mt-1">{env.url || '—'} | {mask(env.key)}</div>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {Object.entries(checks?.tables || {}).map(([name, info]) => (
              <div key={name} className="flex items-center justify-between">
                <div>{name}</div>
                <div className={info.ok ? 'text-green-700' : 'text-amber-700'}>{info.ok ? `ok${info.count != null ? ` (${info.count})` : ''}` : (info.error || 'error')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

