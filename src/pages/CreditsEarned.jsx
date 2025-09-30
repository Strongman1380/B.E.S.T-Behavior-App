import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Student, CreditsEarned as CreditsEarnedEntity, Grade as GradeEntity, StepsCompleted as StepsCompletedEntity } from '@/api/entities';
import { User, Award, BookOpen, Upload, Loader2 } from 'lucide-react';
import { aiService } from '@/services/aiService';

function normalizeHeader(header) {
  if (header == null) return '';
  const camelSeparated = String(header).trim().replace(/([a-z])([A-Z])/g, '$1 $2');
  return camelSeparated
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(current.trim());
      current = '';
      continue;
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter(r => r.some(cell => String(cell || '').trim().length > 0));
}

function buildCompositeRecords(rows) {
  if (!rows.length) {
    return { headers: [], normalizedHeaders: [], records: [] };
  }

  const headers = rows[0];
  const normalizedHeaders = headers.map(normalizeHeader);
  const records = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;

    const original = {};
    const normalized = {};
    let hasContent = false;

    headers.forEach((header, index) => {
      const value = row[index] != null ? String(row[index]).trim() : '';
      original[header] = value;
      const normalizedKey = normalizedHeaders[index];
      if (normalizedKey) {
        normalized[normalizedKey] = value;
      }
      if (value) {
        hasContent = true;
      }
    });

    if (hasContent) {
      records.push({ original, normalized });
    }
  }

  return { headers, normalizedHeaders, records };
}

function getField(record, keys) {
  for (const key of keys) {
    if (record[key] != null && record[key] !== '') {
      return record[key];
    }
  }
  return '';
}

function normalizeDate(value) {
  if (!value) return null;
  const input = String(value).trim();
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function deriveLetterGrade(value, existing) {
  if (existing) return existing;
  const score = Number(value);
  if (Number.isNaN(score)) return '';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function findValueByHeader(original, headerName) {
  if (!original || !headerName) return '';
  const target = String(headerName).trim().toLowerCase();
  if (target in original) {
    const direct = original[headerName];
    if (direct != null && String(direct).trim() !== '') {
      return String(direct).trim();
    }
  }
  const entries = Object.entries(original || {});
  for (const [key, value] of entries) {
    if (String(key).trim().toLowerCase() === target) {
      if (value != null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
  }
  return '';
}

function resolveMappedValue(composite, mapping, canonicalKey, fallbackKeys = []) {
  const { original, normalized } = composite;

  if (mapping && mapping[canonicalKey]) {
    const headerName = mapping[canonicalKey];
    const mappedValue = findValueByHeader(original, headerName);
    if (mappedValue) return mappedValue;

    const normalizedKey = normalizeHeader(headerName);
    if (normalizedKey && normalized && normalized[normalizedKey]) {
      return String(normalized[normalizedKey]).trim();
    }
  }

  return getField(normalized, fallbackKeys) || '';
}

function normalizeCreditsRecord(composite, mapping, rowNumber) {
  const studentIdValue = resolveMappedValue(composite, mapping, 'student_id', ['student_id', 'studentid']);
  const studentName = resolveMappedValue(composite, mapping, 'student_name', ['student_name', 'student', 'name']);
  if (!studentIdValue && !studentName) {
    throw new Error(`Row ${rowNumber}: Missing student reference`);
  }

  const courseName = resolveMappedValue(composite, mapping, 'course_name', ['course_name', 'course', 'class', 'subject']);
  if (!courseName) {
    throw new Error(`Row ${rowNumber}: Missing course name`);
  }

  const creditRaw = resolveMappedValue(composite, mapping, 'credit_value', ['credit_value', 'credit', 'credits', 'units']);
  const creditValue = Number(creditRaw);
  if (!Number.isFinite(creditValue) || creditValue <= 0) {
    throw new Error(`Row ${rowNumber}: Invalid credit value`);
  }

  const dateValue = normalizeDate(resolveMappedValue(composite, mapping, 'date_earned', ['date_earned', 'date', 'completed_on', 'completion_date']));
  if (!dateValue) {
    throw new Error(`Row ${rowNumber}: Invalid or missing date`);
  }

  const gradeValue = resolveMappedValue(composite, mapping, 'grade', ['grade', 'letter_grade', 'grade_level']);

  return {
    rowNumber,
    studentName,
    studentIdValue,
    studentIdentifier: studentIdValue || studentName,
    courseName,
    creditValue,
    dateEarned: dateValue,
    grade: gradeValue,
    original: composite.original
  };
}

function normalizeStepsRecord(composite, mapping, rowNumber) {
  const studentIdValue = resolveMappedValue(composite, mapping, 'student_id', ['student_id']);
  const studentName = resolveMappedValue(composite, mapping, 'student_name', ['student_name', 'student', 'name']);
  if (!studentIdValue && !studentName) {
    throw new Error(`Row ${rowNumber}: Missing student reference`);
  }

  const stepsRaw = resolveMappedValue(composite, mapping, 'steps_count', ['steps_count', 'steps', 'count']);
  const stepsCount = Number(stepsRaw);
  if (!Number.isFinite(stepsCount) || stepsCount < 0) {
    throw new Error(`Row ${rowNumber}: Invalid steps count`);
  }

  const dateValue = normalizeDate(resolveMappedValue(composite, mapping, 'date_completed', ['date_completed', 'date', 'recorded_on']));
  if (!dateValue) {
    throw new Error(`Row ${rowNumber}: Invalid or missing date`);
  }

  return {
    rowNumber,
    studentName,
    studentIdValue,
    studentIdentifier: studentIdValue || studentName,
    dateCompleted: dateValue,
    stepsCount: Math.round(stepsCount),
    original: composite.original
  };
}

function normalizeGradesRecord(composite, mapping, rowNumber) {
  const studentIdValue = resolveMappedValue(composite, mapping, 'student_id', ['student_id']);
  const studentName = resolveMappedValue(composite, mapping, 'student_name', ['student_name', 'student', 'name']);
  if (!studentIdValue && !studentName) {
    throw new Error(`Row ${rowNumber}: Missing student reference`);
  }

  const courseName = resolveMappedValue(composite, mapping, 'course_name', ['course_name', 'course', 'class', 'subject']);
  if (!courseName) {
    throw new Error(`Row ${rowNumber}: Missing course name`);
  }

  const gradeRaw = resolveMappedValue(composite, mapping, 'grade_value', ['grade_value', 'grade', 'percentage', 'score']);
  const gradeValue = Number(gradeRaw);
  if (!Number.isFinite(gradeValue) || gradeValue < 0 || gradeValue > 100) {
    throw new Error(`Row ${rowNumber}: Invalid grade percentage`);
  }

  const letterGrade = deriveLetterGrade(gradeValue, resolveMappedValue(composite, mapping, 'letter_grade', ['letter_grade', 'letter']));
  const dateEntered = normalizeDate(resolveMappedValue(composite, mapping, 'date_entered', ['date_entered', 'date', 'recorded_on'])) || new Date().toISOString().slice(0, 10);

  return {
    rowNumber,
    studentName,
    studentIdValue,
    studentIdentifier: studentIdValue || studentName,
    courseName,
    gradeValue,
    letterGrade,
    dateEntered,
    original: composite.original
  };
}

const IMPORT_SPECS = {
  credits: {
    label: 'Credits Earned',
    canonicalFields: ['student_name', 'student_id', 'course_name', 'credit_value', 'date_earned', 'grade'],
    fieldDescriptions: {
      student_name: 'Full name of the student',
      student_id: 'Numeric student ID if available',
      course_name: 'Course or class name',
      credit_value: 'Numeric credit value (e.g., 1, 0.5)',
      date_earned: 'Date credit was earned (YYYY-MM-DD)',
      grade: 'Associated grade or level if provided'
    },
    normalize: normalizeCreditsRecord,
    previewColumns: [
      { key: 'studentName', label: 'Student' },
      { key: 'courseName', label: 'Course' },
      { key: 'creditValue', label: 'Credits' },
      { key: 'dateEarned', label: 'Date Earned' },
      { key: 'grade', label: 'Grade' }
    ]
  },
  steps: {
    label: 'Steps Completed',
    canonicalFields: ['student_name', 'student_id', 'date_completed', 'steps_count'],
    fieldDescriptions: {
      student_name: 'Full name of the student',
      student_id: 'Numeric student ID if available',
      date_completed: 'Date steps were recorded (YYYY-MM-DD)',
      steps_count: 'Number of steps completed (integer)'
    },
    normalize: normalizeStepsRecord,
    previewColumns: [
      { key: 'studentName', label: 'Student' },
      { key: 'stepsCount', label: 'Steps' },
      { key: 'dateCompleted', label: 'Date' }
    ]
  },
  grades: {
    label: 'Course Grades',
    canonicalFields: ['student_name', 'student_id', 'course_name', 'grade_value', 'letter_grade', 'date_entered'],
    fieldDescriptions: {
      student_name: 'Full name of the student',
      student_id: 'Numeric student ID if available',
      course_name: 'Course or class name',
      grade_value: 'Numeric grade percentage (0-100)',
      letter_grade: 'Letter grade equivalent (A-F)',
      date_entered: 'Date grade was recorded (YYYY-MM-DD)'
    },
    normalize: normalizeGradesRecord,
    previewColumns: [
      { key: 'studentName', label: 'Student' },
      { key: 'courseName', label: 'Course' },
      { key: 'gradeValue', label: 'Grade (%)' },
      { key: 'letterGrade', label: 'Letter' },
      { key: 'dateEntered', label: 'Date' }
    ]
  }
};

export default function CreditsEarned() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [credits, setCredits] = useState([]);
  const [creditsSupported, setCreditsSupported] = useState(true);
  const [importType, setImportType] = useState('credits');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [stepsHistory, setStepsHistory] = useState([]);
  const [gradeHistory, setGradeHistory] = useState([]);
  const [pendingImport, setPendingImport] = useState(null);
  const [isSavingImport, setIsSavingImport] = useState(false);
  const fileInputRef = useRef(null);
  const IMPORT_LABELS = {
    credits: { singular: 'credit', plural: 'credits' },
    steps: { singular: 'steps entry', plural: 'steps entries' },
    grades: { singular: 'grade', plural: 'grades' }
  };
  useEffect(() => {
    setPendingImport(null);
    setImportResults(null);
  }, [importType]);

  useEffect(() => {
    async function fetchStudents() {
      try {
        // Load active students, ordered by name
        const allStudents = await Student.filter({ active: true }, 'student_name');
        setStudents(allStudents || []);
      } catch (error) {
        console.error('Error loading students:', error);
        toast.error('Failed to load students');
        setStudents([]);
      }
    }
    fetchStudents();
  }, []);

  async function fetchStudentData(studentId) {
    try {
      const [creditsData, stepsData, gradesData] = await Promise.all([
        CreditsEarnedEntity.filter({ student_id: studentId }),
        StepsCompletedEntity.filter({ student_id: studentId }),
        GradeEntity.filter({ student_id: studentId })
      ]);
      setCredits(Array.isArray(creditsData) ? creditsData : []);
      setStepsHistory(Array.isArray(stepsData) ? stepsData : []);
      setGradeHistory(Array.isArray(gradesData) ? gradesData : []);
      setCreditsSupported(true);
    } catch (error) {
      const message = error?.message || 'Unable to load academic records';
      if (message.includes('Could not find the table')) {
        toast.error('Academic credits data is not yet enabled in Supabase.');
        setCreditsSupported(false);
      } else {
        toast.error(message);
        setCreditsSupported(true);
      }
      setCredits([]);
      setStepsHistory([]);
      setGradeHistory([]);
      console.error('Failed to load student academic records:', error);
    }
  }

  function handleStudentChange(studentId) {
    setSelectedStudent(studentId);
    fetchStudentData(studentId);
  }

  function resolveStudentReference(identifier) {
    if (identifier == null) return null;
    const trimmed = String(identifier).trim();
    if (!trimmed) return null;

    const numericId = Number(trimmed);
    if (!Number.isNaN(numericId)) {
      const matchById = students.find(s => Number(s.id) === numericId);
      if (matchById) return matchById;
    }

    const lower = trimmed.toLowerCase();
    return students.find(s => s.student_name?.trim().toLowerCase() === lower) || null;
  }

  const mapHeadersWithAI = async (headers, sampleRow, spec) => {
    if (!spec || !aiService?.isInitialized?.()) {
      return null;
    }

    try {
      const mapping = await aiService.mapCsvHeaders(headers, sampleRow, {
        label: spec.label,
        canonicalFields: spec.canonicalFields,
        fieldDescriptions: spec.fieldDescriptions
      });
      if (mapping && typeof mapping === 'object') {
        return mapping;
      }
    } catch (error) {
      console.warn('AI header mapping failed, falling back to heuristics.', error?.message || error);
    }
    return null;
  };

  function normalizeRecordsForImport(composites, mapping, spec) {
    const rows = [];
    const errors = [];

    composites.forEach((composite, index) => {
      try {
        const normalizedRow = spec.normalize(composite, mapping, index + 2);
        if (!normalizedRow.studentName && normalizedRow.studentIdValue) {
          const matched = resolveStudentReference(normalizedRow.studentIdValue);
          if (matched) {
            normalizedRow.studentName = matched.student_name;
          }
        }
        rows.push(normalizedRow);
      } catch (error) {
        const message = error?.message || 'Unknown row error';
        errors.push({ row: index + 2, message });
      }
    });

    return { rows, errors };
  }

  async function saveCreditsRow(row, student) {
    await CreditsEarnedEntity.create({
      student_id: student.id,
      course_name: row.courseName,
      credit_value: row.creditValue,
      date_earned: row.dateEarned,
      ...(row.grade ? { grade: row.grade } : {})
    });
  }

  async function saveStepsRow(row, student) {
    await StepsCompletedEntity.create({
      student_id: student.id,
      date_completed: row.dateCompleted,
      steps_count: row.stepsCount
    });
  }

  async function saveGradesRow(row, student) {
    await GradeEntity.create({
      student_id: student.id,
      course_name: row.courseName,
      grade_value: row.gradeValue,
      letter_grade: row.letterGrade,
      date_entered: row.dateEntered
    });
  }

  const handleCsvImport = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    if (importType === 'credits' && !creditsSupported) {
      toast.error('Credits tracking is currently disabled. Create the `credits_earned` table to continue.');
      input.value = '';
      return;
    }

    const spec = IMPORT_SPECS[importType];
    if (!spec) {
      toast.error('Unsupported import type.');
      input.value = '';
      return;
    }

    setIsImporting(true);
    setImportResults(null);
    setPendingImport(null);

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        toast.error('The CSV file is empty.');
        return;
      }

      const { headers, records } = buildCompositeRecords(rows);
      if (!records.length) {
        toast.error('No data rows found in the CSV.');
        return;
      }

      const sampleRow = records[0]?.original || {};
      const headerMapping = await mapHeadersWithAI(headers, sampleRow, spec);
      const { rows: normalizedRows, errors } = normalizeRecordsForImport(records, headerMapping, spec);

      if (!normalizedRows.length) {
        toast.error('Unable to interpret any rows from the CSV. Please review the file format.');
        if (errors.length) {
          console.table(errors);
        }
        return;
      }

      setPendingImport({
        type: importType,
        rows: normalizedRows,
        mapping: headerMapping,
        aiUsed: Boolean(headerMapping),
        headers
      });

      setImportResults({
        successCount: normalizedRows.length,
        errorCount: errors.length,
        errorsPreview: errors.slice(0, 5),
        aiUsed: Boolean(headerMapping)
      });

      if (errors.length) {
        console.table(errors);
        toast.warning(`${errors.length} row${errors.length === 1 ? '' : 's'} skipped during interpretation. Review the preview before saving.`);
      } else {
        toast.success('CSV parsed successfully. Review the preview below, then click Save to import.');
      }
    } catch (error) {
      console.error('CSV import failed:', error);
      toast.error('CSV import failed. Please verify the file format.');
    } finally {
      setIsImporting(false);
      if (input) input.value = '';
    }
  };

  const savePendingImport = async () => {
    if (!pendingImport?.rows?.length) {
      toast.error('No pending rows to save. Upload a CSV first.');
      return;
    }

    setIsSavingImport(true);

    const errors = [];
    let successCount = 0;

    for (const row of pendingImport.rows) {
      try {
        const candidate = row.studentIdValue || row.studentIdentifier || row.studentName;
        const student = resolveStudentReference(candidate);
        if (!student) {
          throw new Error(`Student "${candidate || 'Unknown'}" not found in roster`);
        }

          switch (pendingImport.type) {
            case 'credits':
              await saveCreditsRow(row, student);
              break;
            case 'steps':
              await saveStepsRow(row, student);
              break;
            case 'grades':
              await saveGradesRow(row, student);
              break;
            default:
              throw new Error(`Unsupported import type: ${pendingImport.type}`);
          }

        successCount += 1;
      } catch (error) {
        const message = error?.message || 'Unknown error';
        errors.push({ row: row.rowNumber, message });
      }
    }

    if (successCount > 0) {
      const labelMeta = IMPORT_LABELS[pendingImport.type];
      const label = labelMeta
        ? (successCount === 1 ? labelMeta.singular : labelMeta.plural)
        : (successCount === 1 ? 'record' : 'records');
      toast.success(`Saved ${successCount} ${label} to the database.`);
      if (selectedStudent) {
        try {
          await fetchStudentData(selectedStudent);
        } catch (error) {
          console.warn('Failed to refresh selected student after import:', error?.message || error);
        }
      }
    }

    if (errors.length) {
      console.table(errors);
      toast.warning(`${errors.length} row${errors.length === 1 ? '' : 's'} failed to save. Check the console for details.`);
    }

    if (successCount === 0 && errors.length > 0) {
      toast.error('No rows were saved. Please review the data and try again.');
    }

    setPendingImport(null);
    setImportResults(null);
    setIsSavingImport(false);
  };

  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const sortedStepsHistory = [...stepsHistory].sort((a, b) => {
    const aDate = a?.date_completed ? new Date(a.date_completed).getTime() : 0;
    const bDate = b?.date_completed ? new Date(b.date_completed).getTime() : 0;
    return bDate - aDate;
  });
  const sortedGradeHistory = [...gradeHistory].sort((a, b) => {
    const aDate = a?.date_entered ? new Date(a.date_entered).getTime() : 0;
    const bDate = b?.date_entered ? new Date(b.date_entered).getTime() : 0;
    return bDate - aDate;
  });
  const importHelpText = (() => {
    switch (importType) {
      case 'credits':
        return (
          <>
            Expected columns: <code className="font-mono text-xs">student_name</code>, <code className="font-mono text-xs">course_name</code>, <code className="font-mono text-xs">credit_value</code>, <code className="font-mono text-xs">date_earned (YYYY-MM-DD)</code>, optional <code className="font-mono text-xs">grade</code>.
          </>
        );
      case 'steps':
        return (
          <>
            Expected columns: <code className="font-mono text-xs">student_name</code>, <code className="font-mono text-xs">date_completed (YYYY-MM-DD)</code>, <code className="font-mono text-xs">steps_count</code>.
          </>
        );
      case 'grades':
        return (
          <>
            Expected columns: <code className="font-mono text-xs">student_name</code>, <code className="font-mono text-xs">course_name</code>, <code className="font-mono text-xs">grade_value</code>, optional <code className="font-mono text-xs">letter_grade</code>, optional <code className="font-mono text-xs">date_entered</code>.
          </>
        );
      default:
        return null;
    }
  })();
  const pendingSpec = pendingImport ? IMPORT_SPECS[pendingImport.type] : null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Award className="h-6 w-6" />
        Academic Progress Dashboard
      </h1>

      {!creditsSupported && (
        <div className="mb-6 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-800">
          The Supabase table `credits_earned` is missing or inaccessible, so credit tracking is disabled. Apply the SQL in `supabase-schema.sql` and refresh to enable this view.
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Student List - Left Side */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Students
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {students.map(student => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentChange(student.id)}
                    className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedStudent === student.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{student.student_name}</p>
                        <p className="text-xs text-gray-500">Grade {student.grade_level}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Details and Credits - Right Side */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Import
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  type="button"
                  variant={importType === 'credits' ? 'default' : 'outline'}
                  onClick={() => setImportType('credits')}
                  size="sm"
                  disabled={isImporting}
                >
                  Credits Earned
                </Button>
                <Button
                  type="button"
                  variant={importType === 'steps' ? 'default' : 'outline'}
                  onClick={() => setImportType('steps')}
                  size="sm"
                  disabled={isImporting}
                >
                  Steps Completed
                </Button>
                <Button
                  type="button"
                  variant={importType === 'grades' ? 'default' : 'outline'}
                  onClick={() => setImportType('grades')}
                  size="sm"
                  disabled={isImporting}
                >
                  Course Grades
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvImport}
              />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-slate-600">{importHelpText}</div>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting || students.length === 0}
                  className="w-full sm:w-auto"
                >
                  {isImporting ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Importing...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Upload CSV</span>
                  )}
                </Button>
              </div>

              {importResults && (
                <div className="mt-4 text-sm">
                  <p className="text-slate-700">
                    Parsed {importResults.successCount} row{importResults.successCount === 1 ? '' : 's'} for {IMPORT_SPECS[importType]?.label || 'import'}. {importResults.errorCount > 0 ? `${importResults.errorCount} row${importResults.errorCount === 1 ? '' : 's'} skipped.` : ''}
                  </p>
                  {importResults.aiUsed && (
                    <p className="text-xs text-emerald-700 mt-1">Column mapping assisted by AI.</p>
                  )}
                  {importResults.errorsPreview.length > 0 && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                      <p className="font-medium text-xs uppercase tracking-wide">First issues</p>
                      <ul className="mt-1 space-y-1 text-xs">
                        {importResults.errorsPreview.map((error, index) => (
                          <li key={`${error.row}-${index}`}>
                            Row {error.row}: {error.message.replace(/^Row \d+:\s*/i, '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
          </CardContent>
        </Card>

        {pendingImport && pendingSpec && (
          <Card className="border border-blue-200 bg-blue-50/50">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  Pending Import — {pendingSpec.label}
                  {pendingImport.aiUsed && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      AI assisted
                    </span>
                  )}
                </CardTitle>
                <p className="text-sm text-slate-600">
                  {pendingImport.rows.length} row{pendingImport.rows.length === 1 ? '' : 's'} ready to save.
                </p>
              </div>
              <Button
                type="button"
                onClick={savePendingImport}
                disabled={isSavingImport}
                className="w-full sm:w-auto"
              >
                {isSavingImport ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span>
                ) : (
                  (() => {
                    const labelMeta = IMPORT_LABELS[pendingImport.type];
                    const label = labelMeta
                      ? (pendingImport.rows.length === 1 ? labelMeta.singular : labelMeta.plural)
                      : (pendingImport.rows.length === 1 ? 'record' : 'records');
                    return `Save ${pendingImport.rows.length} ${label}`;
                  })()
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-blue-100 bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">CSV Row</TableHead>
                      {pendingSpec.previewColumns.map(column => (
                        <TableHead key={column.key}>{column.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingImport.rows.slice(0, 20).map((row) => (
                      <TableRow key={`preview-${row.rowNumber}`}>
                        <TableCell>#{row.rowNumber}</TableCell>
                        {pendingSpec.previewColumns.map(column => (
                          <TableCell key={`${row.rowNumber}-${column.key}`}>
                            {row[column.key] ?? ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {pendingImport.rows.length > 20 && (
                  <div className="px-3 py-2 text-xs text-slate-500 border-t border-blue-100 bg-blue-50">
                    Showing first 20 rows. All {pendingImport.rows.length} rows will be saved.
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Confirm the preview looks correct, then click Save. Any rows with unresolved students will be skipped and reported.
              </p>
            </CardContent>
          </Card>
        )}

        {selectedStudent ? (
          <div className="space-y-6">
              {/* Selected Student Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedStudentData?.student_name}
                    <span className="text-sm font-normal text-gray-500">
                      - Grade {selectedStudentData?.grade_level}
                    </span>
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Credits Earned Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Credits Earned History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {credits.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course Name</TableHead>
                          <TableHead>Credit Value</TableHead>
                          <TableHead>Date Earned</TableHead>
                          <TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {credits.map(credit => (
                          <TableRow key={credit.id}>
                            <TableCell className="font-medium">{credit.course_name}</TableCell>
                            <TableCell>{credit.credit_value}</TableCell>
                            <TableCell>{new Date(credit.date_earned).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                {credit.grade}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No credits recorded yet</p>
                      <p className="text-sm">Use the import tools above to add credit history.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Steps History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Steps History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sortedStepsHistory.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Steps</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedStepsHistory.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{entry.date_completed ? new Date(entry.date_completed).toLocaleDateString() : '—'}</TableCell>
                              <TableCell>{entry.steps_count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p>No steps recorded yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Grades History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Grade History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sortedGradeHistory.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead>Grade (%)</TableHead>
                            <TableHead>Letter</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedGradeHistory.map((grade) => (
                            <TableRow key={grade.id}>
                              <TableCell className="font-medium">{grade.course_name}</TableCell>
                              <TableCell>{grade.grade_value}</TableCell>
                              <TableCell>{grade.letter_grade}</TableCell>
                              <TableCell>{grade.date_entered ? new Date(grade.date_entered).toLocaleDateString() : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p>No grades recorded yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Student</h3>
                <p className="text-gray-500">Choose a student from the list to view and manage their credits</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
