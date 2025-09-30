import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Grade } from '@/api/entities';
import { Printer, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function PrintGradesDialog({ open, onOpenChange, students, currentStudentId = null }) {
  const [grades, setGrades] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [studentMode, setStudentMode] = useState('all');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (!open) return;
    (async () => {
      setIsLoading(true);
      try {
        const rows = await Grade.list('-created_at');
        setGrades(rows);
      } catch (e) {
        console.error('Load grades error', e);
        toast.error('Failed to load grades for printing');
      } finally {
        setIsLoading(false);
      }
    })();
    setStudentMode('all');
    setStart('');
    setEnd('');
  }, [open]);

  const byStudent = useMemo(() => {
    const grouped = new Map();
    grades.forEach(g => {
      if (!g.student_id) return;
      const arr = grouped.get(g.student_id) || [];
      arr.push(g);
      grouped.set(g.student_id, arr);
    });
    return grouped;
  }, [grades]);

  const filteredStudentIds = useMemo(() => {
    if (studentMode === 'current' && currentStudentId) return [currentStudentId];
    return students.map(s => s.id);
  }, [studentMode, currentStudentId, students]);

  const withinRange = (g) => {
    if (!start && !end) return true;
    const day = (g.date_entered || g.created_at || '').slice(0,10);
    if (start && day < start) return false;
    if (end && day > end) return false;
    return true;
  };

  const handlePrint = () => {
    const container = document.getElementById('print-grades-area');
    if (!container) return;
    const win = window.open('', '', 'height=800,width=900');
    win.document.write(`
      <html>
        <head>
          <title>Grade Reports</title>
          <style>
            @page { size: letter; margin: 0.6in; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
            h2 { margin: 0 0 6px 0; }
            .student-block { page-break-after: always; }
            .header-with-logo { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
            .header-logo { width: 64px; height: 64px; flex-shrink: 0; }
            .student-block:last-child { page-break-after: avoid; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
            th { background: #f3f4f6; text-align: left; }
            .meta { color: #374151; font-size: 12px; }
          </style>
        </head>
        <body>${container.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const getName = (id) => students.find(s => s.id === id)?.student_name || 'Unknown';

  const renderTable = (sid) => {
    const rows = (byStudent.get(sid) || []).filter(withinRange).sort((a, b) => {
      const left = new Date(a.date_entered || a.created_at || 0).getTime() || 0;
      const right = new Date(b.date_entered || b.created_at || 0).getTime() || 0;
      return left - right;
    });
    if (rows.length === 0) return null;
    return (
      <div key={sid} className="student-block">
        <div className="header-with-logo">
          <img src="/best-logo.png" alt="BEST Logo" className="header-logo" />
          <h2>{getName(sid)} - Grade Report</h2>
        </div>
        <div className="meta">
          {start || end ? (
            <div>Date Range: {start || '—'} to {end || '—'}</div>
          ) : (
            <div>All Dates</div>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Percentage</th>
              <th>Letter</th>
              <th>Recorded</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.course_name}</td>
                <td>{Number(r.grade_value ?? r.percentage ?? 0).toFixed(1)}%</td>
                <td>{r.letter_grade}</td>
                <td>{r.date_entered ? new Date(r.date_entered).toLocaleDateString() : (r.created_at ? new Date(r.created_at).toLocaleDateString() : '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between pr-10">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Print Grade Reports
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} disabled={isLoading}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="px-4 pb-2">
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Students:</label>
              <label className="text-sm flex items-center gap-1">
                <input type="radio" name="sMode" value="all" checked={studentMode === 'all'} onChange={() => setStudentMode('all')} /> All
              </label>
              <label className={`text-sm flex items-center gap-1 ${!currentStudentId ? 'opacity-50' : ''}`}>
                <input type="radio" name="sMode" value="current" disabled={!currentStudentId} checked={studentMode === 'current'} onChange={() => setStudentMode('current')} /> Current
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Date range:</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border border-slate-300 rounded px-2 py-1 text-sm" />
              <span className="text-slate-500">to</span>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border border-slate-300 rounded px-2 py-1 text-sm" />
              {(start || end || studentMode !== 'all') && (
                <Button variant="ghost" className="h-8" onClick={() => { setStart(''); setEnd(''); setStudentMode('all'); }}>Clear</Button>
              )}
            </div>
          </div>
        </div>

        <div id="print-grades-area" className="flex-grow overflow-y-auto p-4 bg-slate-50">
          {isLoading ? (
            <div className="text-center py-10">Loading grades...</div>
          ) : (
            filteredStudentIds.map(sid => renderTable(sid))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
