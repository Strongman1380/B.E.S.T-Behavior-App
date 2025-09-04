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
    if (typeof orderBy === 'string' && orderBy.length > 0) {
      const desc = orderBy.startsWith('-')
      const col = desc ? orderBy.slice(1) : orderBy
      if (col) q = q.order(col, { ascending: !desc, nullsFirst: false })
    }
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

  async filter(criteria = {}, order) {
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

    // Ordering
    if (typeof order === 'string' && order.length > 0) {
      const desc = order.startsWith('-')
      const col = desc ? order.slice(1) : order
      if (col) q = q.order(col, { ascending: !desc })
    }

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
// BehaviorSummary entity with schema mapping
class SupabaseBehaviorSummaryEntity extends SupabaseEntity {
  constructor() {
    super('behavior_summaries')
  }

  // Map UI shape -> DB row
  mapToDb(row) {
    if (!row) return row
    const {
      date_range_start,
      date_range_end,
      prepared_by,
      general_behavior_overview,
      strengths,
      improvements_needed,
      behavioral_incidents,
      summary_recommendations,
      // passthroughs
      id,
      student_id,
      created_at,
      updated_at,
      ...rest
    } = row
    const out = {
      ...(id ? { id } : {}),
      student_id,
      // UI uses date_range_* but DB schema is date_from/date_to
      date_from: date_range_start || row.date_from || row.date_start || null,
      date_to: date_range_end || row.date_to || row.date_end || null,
      summary_data: {
        ...(typeof row.summary_data === 'object' && row.summary_data ? row.summary_data : {}),
        ...(prepared_by != null ? { prepared_by } : {}),
        ...(general_behavior_overview != null ? { general_behavior_overview } : {}),
        ...(strengths != null ? { strengths } : {}),
        ...(improvements_needed != null ? { improvements_needed } : {}),
        ...(behavioral_incidents != null ? { behavioral_incidents } : {}),
        ...(summary_recommendations != null ? { summary_recommendations } : {}),
      },
      ...(created_at ? { created_at } : {}),
      ...(updated_at ? { updated_at } : {}),
      // Keep any unknown fields (ignored by DB)
      ...rest,
    }
    return out
  }

  // Map DB row -> UI shape
  mapFromDb(row) {
    if (!row) return row
    const sd = row.summary_data || {}
    return {
      id: row.id,
      student_id: row.student_id,
      date_range_start: row.date_from,
      date_range_end: row.date_to,
      prepared_by: sd.prepared_by || null,
      general_behavior_overview: sd.general_behavior_overview || null,
      strengths: sd.strengths || null,
      improvements_needed: sd.improvements_needed || null,
      behavioral_incidents: sd.behavioral_incidents || null,
      summary_recommendations: sd.summary_recommendations || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Keep original for debugging if needed
      // _raw: row,
    }
  }

  normalizeOrder(orderBy) {
    if (!orderBy) return orderBy
    const desc = orderBy.startsWith('-')
    const col = desc ? orderBy.slice(1) : orderBy
    // Map UI alias to DB column
    const mapped = col === 'date_range_end' ? 'date_to' : (col === 'date_range_start' ? 'date_from' : col)
    return (desc ? '-' : '') + mapped
  }

  async list(orderBy) {
    assertSupabase()
    const order = this.normalizeOrder(orderBy)
    let q = supabase.from(this.table).select('*')
    if (typeof order === 'string' && order.length > 0) {
      const desc = order.startsWith('-')
      const col = desc ? order.slice(1) : order
      if (col) q = q.order(col, { ascending: !desc })
    }
    const res = await q
    normalizeError(res)
    return (res.data || []).map(r => this.mapFromDb(r))
  }

  async get(id) {
    assertSupabase()
    const res = await supabase.from(this.table).select('*').eq('id', id).maybeSingle()
    normalizeError(res)
    return res.data ? this.mapFromDb(res.data) : null
  }

  async create(data) {
    assertSupabase()
    const toInsert = this.mapToDb(data)
    const res = await supabase.from(this.table).insert(toInsert).select('*').single()
    normalizeError(res)
    return this.mapFromDb(res.data)
  }

  async update(id, data) {
    assertSupabase()
    const toUpdate = this.mapToDb({ ...data, id })
    const res = await supabase.from(this.table).update(toUpdate).eq('id', id).select('*').single()
    normalizeError(res)
    return this.mapFromDb(res.data)
  }
}

export const BehaviorSummary = new SupabaseBehaviorSummaryEntity()
export const IncidentReport = new SupabaseEntity('incident_reports')
export const User = new SupabaseEntity('users')

export const getStorageType = async () => (supabase ? 'supabase' : 'error')

export const initializeSampleData = async () => {
  // For Supabase + anon key and RLS, sample data creation is usually blocked.
  // No-op in browser.
  return false
}
