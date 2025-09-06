import { useEffect, useState, useCallback } from 'react'
import { Student, Grade } from '@/api/entities'
import { Button } from '@/components/ui/button'
import { Toaster, toast } from 'sonner'
import { User, Plus, Trash2 } from 'lucide-react'
import AddGradeDialog from '@/components/grades/AddGradeDialog'
import DeleteConfirmationDialog from '@/components/behavior/DeleteConfirmationDialog'

export default function GradeReports() {
  const [students, setStudents] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selection, setSelection] = useState([])

  const loadStudents = useCallback(async () => {
    try {
      const s = await Student.filter({ active: true })
      setStudents(s)
      return s
    } catch (e) {
      console.error('Failed to load students', e)
      toast.error('Failed to load students')
      return []
    }
  }, [])

  const loadGrades = useCallback(async (studentId) => {
    if (!studentId) { setGrades([]); return }
    try {
      const rows = await Grade.filter({ student_id: studentId }, '-created_at')
      setGrades(rows)
    } catch (e) {
      const msg = typeof e?.message === 'string' ? e.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('permission')) {
        toast.error('RLS/permissions prevented loading grades. Apply schema + policies in Supabase.')
      } else {
        toast.error('Failed to load grades')
      }
      console.error('Failed to load grades', e)
      setGrades([])
    }
  }, [])

  useEffect(() => {
    (async () => {
      setLoading(true)
      const s = await loadStudents()
      const idx = 0
      setCurrentIndex(idx)
      await loadGrades(s?.[idx]?.id)
      setLoading(false)
    })()
  }, [loadStudents, loadGrades])

  const currentStudent = students[currentIndex]

  const handleAddGrade = async ({ class_name, percentage, letter_grade }) => {
    try {
      const created = await Grade.create({ student_id: currentStudent.id, class_name, percentage, letter_grade })
      setGrades(prev => [created, ...prev])
      setShowAddDialog(false)
      toast.success('Grade added')
    } catch (e) {
      console.error('Add grade error', e)
      toast.error('Failed to add grade')
    }
  }

  const toggleSelected = (id) => {
    setSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const deleteSelected = async () => {
    try {
      await Promise.all(selection.map(id => Grade.delete(id)))
      setGrades(prev => prev.filter(g => !selection.includes(g.id)))
      setSelection([])
      setShowDeleteDialog(false)
      toast.success('Deleted selected grade(s)')
    } catch (e) {
      console.error('Delete grades error', e)
      toast.error('Failed to delete selected grades')
    }
  }

  if (loading) {
    return <div className="p-6">Loading grade reports...</div>
  }

  return (
    <div className="flex h-[calc(100vh-60px)] bg-slate-50">
      <Toaster richColors />
      {/* Sidebar students */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Grade Reports</h2>
          <p className="text-sm text-slate-500">{students.length} students</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {students.map((s, idx) => (
            <button key={s.id} onClick={async () => { setCurrentIndex(idx); setSelection([]); await loadGrades(s.id) }}
              className={`w-full text-left p-3 rounded-lg transition-colors duration-150 ${idx === currentIndex ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}>
              <span>{s.student_name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {!currentStudent ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">No students</div>
        ) : (
          <>
            <header className="bg-white p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-4 h-4 text-slate-600" /></div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{currentStudent.student_name}</h2>
                  <p className="text-sm text-slate-500">Grades</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Add Grade
                </Button>
                <Button variant="destructive" disabled={selection.length === 0} onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selection.length})
                </Button>
              </div>
            </header>
            <section className="p-4 overflow-y-auto">
              {grades.length === 0 ? (
                <div className="text-center text-slate-500 py-10">No grades yet. Click "Add Grade" to get started.</div>
              ) : (
                <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-sm text-slate-600">
                        <th className="px-4 py-3 border-b"><input type="checkbox" aria-label="Select all" onChange={(e) => {
                          const checked = e.target.checked; setSelection(checked ? grades.map(g => g.id) : [])
                        }} checked={selection.length > 0 && selection.length === grades.length} /></th>
                        <th className="px-4 py-3 border-b">Class</th>
                        <th className="px-4 py-3 border-b">Percentage</th>
                        <th className="px-4 py-3 border-b">Letter</th>
                        <th className="px-4 py-3 border-b">Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((g) => (
                        <tr key={g.id} className="border-b last:border-0">
                          <td className="px-4 py-3"><input type="checkbox" checked={selection.includes(g.id)} onChange={() => toggleSelected(g.id)} /></td>
                          <td className="px-4 py-3">{g.class_name}</td>
                          <td className="px-4 py-3">{Number(g.percentage).toFixed(1)}%</td>
                          <td className="px-4 py-3 font-semibold">{g.letter_grade}</td>
                          <td className="px-4 py-3 text-slate-500">{g.created_at ? new Date(g.created_at).toLocaleDateString() : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <AddGradeDialog open={showAddDialog} onOpenChange={setShowAddDialog} onAdd={handleAddGrade} />
      <DeleteConfirmationDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} onConfirm={deleteSelected} count={selection.length} actionText="delete" description={`This will permanently delete ${selection.length} grade(s).`} />
    </div>
  )
}

