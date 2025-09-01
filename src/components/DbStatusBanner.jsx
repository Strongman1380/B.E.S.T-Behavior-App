import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/config/supabase'

export default function DbStatusBanner() {
  const [down, setDown] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState('Database issue detected. Some data may be unavailable.');

  const env = useMemo(() => ({
    url: import.meta?.env?.VITE_SUPABASE_URL || import.meta?.env?.NEXT_PUBLIC_SUPABASE_URL || '',
    key: import.meta?.env?.VITE_SUPABASE_ANON_KEY || import.meta?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }), [])

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        // Missing env at build time
        if (!env.url || !env.key) {
          if (!mounted) return
          setDown(true)
          setMessage('Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
          return
        }
        // Client not initialized
        if (!supabase) {
          if (!mounted) return
          setDown(true)
          setMessage('Supabase client not initialized. Check env names and rebuild.')
          return
        }
        // Head select for connectivity
        const res = await supabase.from('settings').select('id', { count: 'exact', head: true })
        if (!mounted) return
        if (res.error) {
          setDown(true)
          setMessage('Database unreachable or RLS misconfigured. See Supabase Health for details.')
        } else {
          setDown(false)
        }
      } catch {
        if (!mounted) return
        setDown(true)
        setMessage('Database issue detected. Some data may be unavailable.')
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  if (!down || hidden) return null;

  return (
    <div className="w-full bg-amber-100 text-amber-900 border-b border-amber-200 px-3 py-2 text-sm flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
        <span>Database issue detected. Some data may be unavailable.</span>
      </div>
      <button onClick={() => setHidden(true)} className="text-amber-800 hover:text-amber-900">Dismiss</button>
    </div>
  );
}
