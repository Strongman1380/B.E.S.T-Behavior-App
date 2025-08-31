// Supabase storage layer used by the browser build
// Implements the same interface as the PostgreSQL storage
import { supabase } from '@/config/supabase'

const isBrowser = typeof window !== 'undefined'

function assertSupabase() {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }
}

function normalizeError(res) {
  if (res?.error) throw res.error
}

class SupabaseEntity {
  constructor(table, options = {}) {
    this.table = table
    this.options = options
  }

  async list(orderBy) {
    assertSupabase()
    let q = supabase.from(this.table).select('*')
    if (orderBy) q = q.order(orderBy, { ascending: true, nullsFirst: false })
    const res = await q
    normalizeError(res)
    return res.data || []
  }

  async get(id) {
    assertSupabase()
    const res = await supabase.from(this.table).select('*').eq('id', id).maybeSingle()
    normalizeError(res)
    return res.data || null
  }

  async create(data) {
    assertSupabase()
    const res = await supabase.from(this.table).insert(data).select('*').single()
    normalizeError(res)
    return res.data
  }

  async update(id, data) {
    assertSupabase()
    const res = await supabase.from(this.table).update(data).eq('id', id).select('*').single()
    normalizeError(res)
    return res.data
  }

  async delete(id) {
    assertSupabase()
    const res = await supabase.from(this.table).delete().eq('id', id)
    normalizeError(res)
    return true
  }

  async filter(criteria = {}) {
    assertSupabase()
    let q = supabase.from(this.table).select('*')

    // Common range filters
    const rangeMap = {
      daily_evaluations: { from: 'date_from', to: 'date', toKey: 'date_to' },
      contact_logs: { from: 'contact_date_from', to: 'contact_date', toKey: 'contact_date_to' },
      incident_reports: { from: 'incident_date_from', to: 'incident_date', toKey: 'incident_date_to' },
    }

    const rm = rangeMap[this.table]
    if (rm) {
      if (criteria[rm.from]) q = q.gte(rm.to, criteria[rm.from])
      if (criteria[rm.toKey]) q = q.lte(rm.to, criteria[rm.toKey])
    }

    // Equality filters for remaining keys
    Object.entries(criteria).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      if (rm && (k === rm.from || k === rm.toKey)) return
      q = q.eq(k, v)
    })

    const res = await q
    normalizeError(res)
    return res.data || []
  }

  async save(data) {
    return data?.id ? this.update(data.id, data) : this.create(data)
  }

  async saveAll(rows) {
    const out = []
    for (const r of rows) out.push(await this.save(r))
    return out
  }

  onSnapshot(cb) {
    // No realtime by default; return current list
    this.list().then(cb).catch(() => cb([]))
    return () => {}
  }

  onDocSnapshot(id, cb) {
    this.get(id).then(cb).catch(() => cb(null))
    return () => {}
  }

  async clearAll() {
    assertSupabase()
    const res = await supabase.from(this.table).delete().neq('id', 0)
    normalizeError(res)
    return true
  }
}

// Entities
export const Student = new SupabaseEntity('students')
export const DailyEvaluation = new SupabaseEntity('daily_evaluations')
export const Settings = new SupabaseEntity('settings')
export const ContactLog = new SupabaseEntity('contact_logs')
export const BehaviorSummary = new SupabaseEntity('behavior_summaries')
export const IncidentReport = new SupabaseEntity('incident_reports')
export const User = new SupabaseEntity('users')

export const getStorageType = async () => (supabase ? 'supabase' : 'error')

export const initializeSampleData = async () => {
  // For Supabase + anon key and RLS, sample data creation is usually blocked.
  // No-op in browser.
  return false
}

