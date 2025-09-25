// Supabase storage layer used by the browser build
// Implements the same interface as the PostgreSQL storage
import { supabase } from '@/config/supabase'
import { format as formatDateFns, isValid as isValidDateFns } from 'date-fns'
import {
  normalizeDailyEvaluation,
  prepareDailyEvaluationForSave,
} from '@/utils/dailyEvaluationNormalizer'

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
      incident_reports: { from: 'incident_date_from', to: 'date_of_incident', toKey: 'incident_date_to' },
    }

    const rm = rangeMap[this.table]
    if (rm) {
      if (criteria[rm.from]) q = q.gte(rm.to, criteria[rm.from])
      if (criteria[rm.toKey]) q = q.lte(rm.to, criteria[rm.toKey])
    }

    // Equality filters for remaining keys
    Object.entries(criteria).forEach(([k, v]) => {
      if (v === undefined || v === '') return
      if (rm && (k === rm.from || k === rm.toKey)) return

      if (v === null) {
        q = q.is(k, null)
        return
      }

      if (Array.isArray(v)) {
        if (v.length > 0) {
          q = q.in(k, v)
        }
        return
      }

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
class SupabaseDailyEvaluationEntity extends SupabaseEntity {
  constructor() {
    super('daily_evaluations')
  }

  sanitizeForSave(data = {}) {
    const prepared = prepareDailyEvaluationForSave(data) || {}
    const { id, created_at, updated_at, ...rest } = prepared
    return rest
  }

  normalizeRow(row) {
    return normalizeDailyEvaluation(row)
  }

  async list(orderBy) {
    const rows = await super.list(orderBy)
    return Array.isArray(rows) ? rows.map((row) => this.normalizeRow(row)) : []
  }

  async get(id) {
    const row = await super.get(id)
    return row ? this.normalizeRow(row) : row
  }

  async filter(criteria = {}, order) {
    const rows = await super.filter(criteria, order)
    return Array.isArray(rows) ? rows.map((row) => this.normalizeRow(row)) : []
  }

  async create(data) {
    const created = await super.create(this.sanitizeForSave(data))
    return this.normalizeRow(created)
  }

  async update(id, data) {
    const updated = await super.update(id, this.sanitizeForSave({ ...data, id }))
    return this.normalizeRow(updated)
  }
}
export const DailyEvaluation = new SupabaseDailyEvaluationEntity()
export const Settings = new SupabaseEntity('settings')
export const ContactLog = new SupabaseEntity('contact_logs')
export const CreditsEarned = new SupabaseEntity('credits_earned')
export const ClassesNeeded = new SupabaseEntity('classes_needed')
export const Grade = new SupabaseEntity('grades')
export const Dashboard = new SupabaseEntity('dashboards')
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
    const pick = (field) => {
      const value = sd[field] !== undefined ? sd[field] : row[field]
      if (value === undefined || value === null) return null
      if (Array.isArray(value)) return value
      if (typeof value === 'object') {
        return Object.keys(value).length > 0 ? value : null
      }
      const str = `${value}`.trim()
      return str.length > 0 ? value : null
    }
    return {
      id: row.id,
      student_id: row.student_id,
      date_range_start: row.date_from,
      date_range_end: row.date_to,
      prepared_by: pick('prepared_by'),
      general_behavior_overview: pick('general_behavior_overview'),
      strengths: pick('strengths'),
      improvements_needed: pick('improvements_needed'),
      behavioral_incidents: pick('behavioral_incidents'),
      summary_recommendations: pick('summary_recommendations'),
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
function normalizeNumericId(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

function toPlainStudentList(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) => {
      if (!entry) return null
      const id = normalizeNumericId(entry.id ?? entry.student_id ?? null)
      const name = entry.name ?? entry.student_name ?? ''
      if (!name) return null
      return { id, name }
    })
    .filter(Boolean)
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null)
  if (typeof value === 'string' && value.length > 0) {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function toDateString(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  const dateValue = value instanceof Date ? value : new Date(value)
  if (!isValidDateFns(dateValue)) return null
  return formatDateFns(dateValue, 'yyyy-MM-dd')
}

class SupabaseIncidentReportEntity extends SupabaseEntity {
  constructor() {
    super('incident_reports')
  }

  normalizeRow(row = {}) {
    const involvedStudents = toPlainStudentList(row.involved_students)
    const behaviors = toArray(row.problem_behavior)
    const activity = toArray(row.activity)
    const othersInvolved = toArray(row.others_involved)
    const strategyResponse = toArray(row.strategy_response)
    const followUp = toArray(row.follow_up)
    const incidentDate = row.date_of_incident ?? row.incident_date ?? null
    const incidentTime = row.time_of_incident ?? row.incident_time ?? null
    const staffReporting = row.staff_reporting ?? row.staff_name ?? row.reported_by ?? ''
    const narrative = row.narrative ?? ''
    const description = row.description_problem_behavior ?? row.incident_description ?? narrative ?? ''
    const primaryIncidentType = row.incident_type ?? behaviors[0] ?? 'Incident'

    return {
      ...row,
      involved_students: involvedStudents,
      problem_behavior: behaviors,
      activity,
      others_involved: othersInvolved,
      strategy_response: strategyResponse,
      follow_up: followUp,
      date_of_incident: incidentDate,
      time_of_incident: incidentTime,
      staff_reporting: staffReporting,
      incident_date: incidentDate,
      incident_time: incidentTime,
      staff_name: row.staff_name ?? staffReporting,
      reported_by: row.reported_by ?? staffReporting,
      incident_type: primaryIncidentType,
      incident_summary: row.incident_summary ?? description ?? narrative ?? '',
      incident_description: row.incident_description ?? description ?? narrative ?? ''
    }
  }

  prepareForSave(data = {}) {
    const incidentDate = toDateString(data.date_of_incident ?? data.incident_date ?? new Date())
    const incidentTime = data.time_of_incident ?? data.incident_time ?? null
    const staffReporting = data.staff_reporting ?? data.staff_name ?? data.reported_by ?? ''
    const involvedStudents = toPlainStudentList(data.involved_students)
    const behaviors = toArray(data.problem_behavior)
    const fallbackBehavior = data.incident_type ? [data.incident_type] : []
    const behaviorList = behaviors.length > 0 ? behaviors : fallbackBehavior
    const description =
      data.description_problem_behavior ??
      data.incident_description ??
      data.incident_summary ??
      data.narrative ??
      ''

    const studentName = data.student_name ?? (involvedStudents.length > 0 ? involvedStudents.map((s) => s.name).join(', ') : '')

    const studentId = normalizeNumericId(
      data.student_id ?? (involvedStudents.length > 0 ? involvedStudents[0].id ?? null : null)
    )

    return {
      student_id: studentId,
      student_name: studentName,
      staff_reporting: staffReporting,
      date_of_incident: incidentDate,
      time_of_incident: incidentTime,
      involved_students: involvedStudents,
      problem_behavior: behaviorList,
      description_problem_behavior: description,
      activity: toArray(data.activity),
      description_activity: data.description_activity ?? '',
      others_involved: toArray(data.others_involved),
      description_others_involved: data.description_others_involved ?? '',
      strategy_response: toArray(data.strategy_response),
      description_strategy_response: data.description_strategy_response ?? '',
      follow_up: toArray(data.follow_up),
      description_follow_up: data.description_follow_up ?? '',
      narrative: data.narrative ?? data.incident_summary ?? description ?? ''
    }
  }

  async list(orderBy) {
    const normalizedOrder = orderBy === 'incident_date' ? 'date_of_incident' : orderBy
    const rows = await super.list(normalizedOrder)
    return Array.isArray(rows) ? rows.map((row) => this.normalizeRow(row)) : []
  }

  async get(id) {
    const row = await super.get(id)
    return row ? this.normalizeRow(row) : row
  }

  async filter(criteria = {}, order) {
    const normalizedOrder = order === 'incident_date' ? 'date_of_incident' : order
    const rows = await super.filter(criteria, normalizedOrder)
    return Array.isArray(rows) ? rows.map((row) => this.normalizeRow(row)) : []
  }

  async create(data) {
    const payload = this.prepareForSave(data)
    const res = await supabase.from(this.table).insert(payload).select('*').single()
    normalizeError(res)
    return this.normalizeRow(res.data)
  }

  async update(id, data) {
    const payload = this.prepareForSave({ ...data, id })
    const res = await supabase.from(this.table).update(payload).eq('id', id).select('*').single()
    normalizeError(res)
    return this.normalizeRow(res.data)
  }
}

export const IncidentReport = new SupabaseIncidentReportEntity()
export const User = new SupabaseEntity('users')

export const getStorageType = async () => (supabase ? 'supabase' : 'error')

export const initializeSampleData = async () => {
  // For Supabase + anon key and RLS, sample data creation is usually blocked.
  // No-op in browser.
  return false
}
