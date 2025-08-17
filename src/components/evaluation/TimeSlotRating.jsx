import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RATING_COLORS = {
  1: 'bg-red-500 hover:bg-red-600 border-red-500',
  2: 'bg-orange-500 hover:bg-orange-600 border-orange-500', 
  3: 'bg-yellow-500 hover:bg-yellow-600 border-yellow-500',
  4: 'bg-green-500 hover:bg-green-600 border-green-500'
};

export default function TimeSlotRating({ timeSlot, data, onChange }) {
  const isDismissalTime = timeSlot === '2:30';

  return (
    <div className="p-6 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <div className="w-20 text-xl font-bold text-slate-900 flex-shrink-0">
          {timeSlot}
        </div>
        
        {isDismissalTime ? (
          <div className="flex-shrink-0">
            <Select
              value={data.status || ''}
              onValueChange={(value) => onChange('status', value)}
            >
              <SelectTrigger className="w-40 h-12 text-base">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISMISSED">DISMISSED</SelectItem>
                <SelectItem value="PRESENT">PRESENT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex gap-3 flex-shrink-0">
            {[1, 2, 3, 4].map((rating) => (
              <Button
                key={rating}
                variant={data.rating === rating ? 'default' : 'outline'}
                size="lg"
                className={`w-12 h-12 rounded-full text-lg font-bold ${
                  data.rating === rating 
                    ? `${RATING_COLORS[rating]} text-white shadow-lg` 
                    : 'border-2 border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
                onClick={() => onChange('rating', rating)}
              >
                {rating}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full">
        <Input
          value={data.comment || ''}
          onChange={(e) => onChange('comment', e.target.value)}
          placeholder="Add comment for this time slot..."
          className="w-full h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
        />
      </div>
    </div>
  );
}