import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SECTION_DEFINITIONS = [
  { key: 'ai', label: 'Adult Interaction', short: 'AI' },
  { key: 'pi', label: 'Peer Interaction', short: 'PI' },
  { key: 'ce', label: 'Classroom Expectations', short: 'CE' }
];

const SCORE_OPTIONS = ['4', '3', '2', '1', 'A', 'B', 'NS'];

const getInitialValue = (data, section) => {
  if (!data) return undefined;
  const sectionValue = data[section];
  if (sectionValue !== undefined && sectionValue !== null && `${sectionValue}`.length > 0) {
    return `${sectionValue}`;
  }
  if (typeof data.rating === 'number') {
    return `${data.rating}`;
  }
  return undefined;
};

export default function TimeSlotRating({ timeKey, label, data, onChange }) {
  const safeData = data || {};

  const handleSectionChange = (section, value) => {
    const newData = { ...safeData, [section]: value };
    if ('rating' in newData) {
      delete newData.rating;
    }
    onChange(newData);
  };
  
  const handleCommentChange = (e) => {
    const newData = { ...safeData, comment: e.target.value };
    onChange(newData);
  };

  return (
    <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex flex-col gap-3">
        <div className="font-bold text-base sm:text-lg text-slate-800">{label || timeKey}</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SECTION_DEFINITIONS.map(({ key, label: sectionLabel, short }) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600 tracking-wider uppercase">{short} • {sectionLabel}</span>
              <Select
                value={getInitialValue(safeData, key)}
                onValueChange={(value) => handleSectionChange(key, value)}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select score" />
                </SelectTrigger>
                <SelectContent>
                  {SCORE_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <Textarea
          placeholder="Add comment..."
          value={safeData.comment || ''}
          onChange={handleCommentChange}
          className="w-full border-slate-300 focus:border-blue-500 min-h-[60px] sm:min-h-[60px] text-sm"
          rows={2}
        />
      </div>
    </div>
  );
}
