import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function BehaviorCheckbox({ title, options, selectedValue, onValueChange, notes, onNotesChange }) {
  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-3">{title}</h3>
      <div className="space-y-2 mb-3">
        {options.map(option => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`${title}-${option.value}`}
              checked={selectedValue === option.value}
              onCheckedChange={(checked) => onValueChange(checked ? option.value : '')}
            />
            <Label
              htmlFor={`${title}-${option.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Notes:</Label>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add notes..."
          className="min-h-[60px] text-sm"
          rows={2}
        />
      </div>
    </div>
  );
}