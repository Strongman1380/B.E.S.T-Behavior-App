import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase'

export default function DbStatusBanner() {
  const [down, setDown] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        if (!supabase) { if (mounted) setDown(true); return }
        const res = await supabase.from('settings').select('id', { count: 'exact', head: true })
        if (!mounted) return
        setDown(Boolean(res.error))
      } catch {
        if (!mounted) return
        setDown(true)
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
