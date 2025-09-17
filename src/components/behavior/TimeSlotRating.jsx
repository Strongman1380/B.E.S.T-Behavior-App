import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from 'sonner';
import OpenAI from 'openai';

const SECTION_DEFINITIONS = [
  { key: 'ai', label: 'Adult Interaction', short: 'AI' },
  { key: 'pi', label: 'Peer Interaction', short: 'PI' },
  { key: 'ce', label: 'Classroom Expectations', short: 'CE' }
];

const SCORE_OPTIONS = ['4', '3', '2', '1', 'A/B', 'NS'];

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
  const [isEnhancingComment, setIsEnhancingComment] = useState(false);

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

  const handleEnhanceComment = async () => {
    const currentComment = safeData.comment || '';
    if (!currentComment.trim()) {
      toast.error('Please enter some comments first');
      return;
    }

    setIsEnhancingComment(true);
    try {
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });

      const prompt = `You are a professional educator enhancing teacher notes into simple, casually professional language. ONLY use the information provided in the raw teacher notes below. Do NOT add any external information, assumptions, or details that are not explicitly stated or clearly implied in the notes.

BEHAVIORAL RATING SYSTEM:
- 4 = Exceeds expectations (exceptional performance, goes above and beyond)
- 3 = Meets expectations (appropriate behavior, follows guidelines)
- 2 = Needs improvement (some behavioral issues requiring attention)
- 1 = Does not meet expectations (significant concerns needing intervention)

RAW TEACHER NOTES:
"${currentComment}"

Please enhance these notes using simple, casually professional language that is:
- Easy to read and understand
- Conversational but still appropriate for educational records
- Clear and straightforward
- Free of overly formal or academic jargon
- Natural sounding, like a teacher writing to parents

IMPORTANT: Only enhance and rephrase what is already in the notes. Do not introduce new information, examples, or observations that aren't mentioned in the original notes.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert educational assistant specializing in writing professional behavioral observations for student evaluations." },
          { role: "user", content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.7
      });

      const enhanced = completion.choices[0].message.content.trim();
      const newData = { ...safeData, comment: enhanced };
      onChange(newData);
      toast.success('Comment enhanced successfully!');
    } catch (error) {
      console.error('AI enhancement failed:', error);
      toast.error('Failed to enhance comment. Please try again.');
    } finally {
      setIsEnhancingComment(false);
    }
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Comments</span>
            <Button
              onClick={handleEnhanceComment}
              disabled={isEnhancingComment || !safeData.comment?.trim()}
              size="sm"
              variant="outline"
              className="flex items-center gap-1 h-7 px-2 text-xs"
            >
              {isEnhancingComment ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {isEnhancingComment ? 'Enhancing...' : 'Enhance'}
            </Button>
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
    </div>
  );
}
