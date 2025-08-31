import dotenv from 'dotenv';
import { applyCors } from './_cors.js';
import { supabaseAdmin } from './_supabase.js';

dotenv.config();

export default async function handler(req, res) {
  const allowed = applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(allowed ? 200 : 403).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const configured = Boolean(supabaseAdmin);
  if (!configured) {
    res.json({ configured: false, ready: false, error: 'Supabase not configured' });
    return;
  }

  try {
    // Quick ping
    const ping = await supabaseAdmin.from('settings').select('id', { count: 'exact', head: true });
    const ready = !ping.error;

    // Collect simple counts (ignore per-table errors)
    const tables = ['students', 'daily_evaluations', 'incident_reports', 'contact_logs', 'settings'];
    const counts = {};
    const ranges = {};
    for (const t of tables) {
      try {
        const { count, error } = await supabaseAdmin.from(t).select('id', { count: 'exact', head: true });
        counts[t] = error ? null : count ?? 0;
      } catch {
        counts[t] = null;
      }
    }

    // Ranges for key date-bearing tables
    const rangeSpecs = [
      { table: 'daily_evaluations', column: 'date' },
      { table: 'contact_logs', column: 'contact_date' },
      { table: 'incident_reports', column: 'incident_date' },
    ];
    for (const { table, column } of rangeSpecs) {
      try {
        const minQ = await supabaseAdmin.from(table).select(`${column}`).order(column, { ascending: true }).limit(1);
        const maxQ = await supabaseAdmin.from(table).select(`${column}`).order(column, { ascending: false }).limit(1);
        ranges[table] = {
          min: minQ?.data?.[0]?.[column] ?? null,
          max: maxQ?.data?.[0]?.[column] ?? null,
        }
      } catch {
        ranges[table] = { min: null, max: null };
      }
    }

    res.json({ configured: true, ready, counts, ranges });
  } catch (error) {
    res.json({ configured: true, ready: false, error: error.message });
  }
}
