import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'

const TABLES = [
  'students',
  'daily_evaluations',
  'contact_logs',
  'incident_reports',
  'settings',
  'behavior_summaries',
]

export default function SupabaseHealth() {
  const [open, setOpen] = useState(false)
  const [checks, setChecks] = useState(null)
  const [cfgOpen, setCfgOpen] = useState(false)
  const [tmpUrl, setTmpUrl] = useState('')
  const [tmpKey, setTmpKey] = useState('')

  const env = useMemo(() => {
    let url = import.meta?.env?.VITE_SUPABASE_URL || import.meta?.env?.NEXT_PUBLIC_SUPABASE_URL || import.meta?.env?.SUPABASE_URL || ''
    let key = import.meta?.env?.VITE_SUPABASE_ANON_KEY || import.meta?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta?.env?.SUPABASE_ANON_KEY || ''
    try {
      if ((!url || !key) && typeof window !== 'undefined' && window.localStorage) {
        url = url || window.localStorage.getItem('SUPABASE_URL') || ''
        key = key || window.localStorage.getItem('SUPABASE_ANON_KEY') || ''
      }
    } catch (err) {
      console.warn('Failed to read Supabase overrides from localStorage', err)
    }
    return { url, key }
  }, [])

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
        <div className="flex items-center gap-2">
          {!allOk && (
            <button className="text-slate-500 hover:text-slate-800" onClick={() => setCfgOpen(v => !v)}>
              {cfgOpen ? 'Close' : 'Configure'}
            </button>
          )}
          <button className="text-slate-500 hover:text-slate-800" onClick={() => setOpen(v => !v)}>
            {open ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>
      {cfgOpen && (
        <div className="mt-2 space-y-2">
          <div className="text-[11px] text-slate-500">Runtime override (local only). Values are stored in your browser and used if envs are missing.</div>
          <input
            className="w-full border rounded p-1 text-[12px]"
            placeholder="https://<project-ref>.supabase.co"
            value={tmpUrl}
            onChange={e => setTmpUrl(e.target.value)}
          />
          <input
            className="w-full border rounded p-1 text-[12px]"
            placeholder="anon public key"
            value={tmpKey}
            onChange={e => setTmpKey(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="px-2 py-1 border rounded bg-white hover:bg-slate-100"
              onClick={() => {
                try {
                  if (tmpUrl && tmpKey) {
                    window.localStorage.setItem('SUPABASE_URL', tmpUrl)
                    window.localStorage.setItem('SUPABASE_ANON_KEY', tmpKey)
                    window.location.reload()
                  }
                } catch (err) {
                  console.warn('Failed to persist Supabase overrides', err)
                }
              }}
            >
              Save & Reload
            </button>
            <button
              className="px-2 py-1 border rounded bg-white hover:bg-slate-100"
              onClick={() => {
                try {
                  window.localStorage.removeItem('SUPABASE_URL')
                  window.localStorage.removeItem('SUPABASE_ANON_KEY')
                  window.location.reload()
                } catch (err) {
                  console.warn('Failed to clear Supabase overrides', err)
                }
              }}
            >
              Clear Override
            </button>
          </div>
        </div>
      )}
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
