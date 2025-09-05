import { Textarea } from "@/components/ui/textarea";

export default function TimeSlotRating({ timeKey, label, data, onChange }) {
  const safeData = data || {};

  const handleRatingChange = (value) => {
    const newData = { ...safeData, rating: value };
    onChange(newData);
  };
  
  const handleCommentChange = (e) => {
    const newData = { ...safeData, comment: e.target.value };
    onChange(newData);
  };

  // Smiley toggle removed; 4's indicate exceeding expectations.
  
  const ratingOptions = [4, 3, 2, 1];
  // No special status for dismissal; all time slots use 1–4 ratings.

  return (
    <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex flex-col gap-3">
        <div className="font-bold text-base sm:text-lg text-slate-800">{label || timeKey}</div>
        
        <div className="flex items-center gap-2 flex-wrap">
            {ratingOptions.map(rating => (
              <button
                key={rating}
                type="button"
                onClick={() => handleRatingChange(rating)}
                className={`w-12 h-12 sm:w-10 sm:h-10 rounded border-2 text-base font-bold transition-colors flex items-center justify-center ${
                  safeData.rating === rating
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {rating}
              </button>
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
