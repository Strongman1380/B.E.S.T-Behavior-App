import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Sparkles, Loader2 } from "lucide-react";
import TimeSlotRating from "./TimeSlotRating";
import { toast } from 'sonner';
import OpenAI from 'openai';

import { TIME_SLOTS } from "@/config/timeSlots";

// Debounce function to limit API calls
const useDebounce = (callback, delay) => {
  const [debounceTimer, setDebounceTimer] = useState(null);

  const debouncedCallback = useCallback((...args) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);
    
    setDebounceTimer(newTimer);
  }, [callback, delay, debounceTimer]);

  return debouncedCallback;
};

export default function EvaluationForm({ evaluation, settings, onSave, isSaving }) {
  const [formData, setFormData] = useState({ time_slots: {}, general_comments: '' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEnhancingComments, setIsEnhancingComments] = useState(false);

  useEffect(() => {
    const newFormData = {
      teacher_name: evaluation?.teacher_name || settings?.teacher_name || '',
      school: evaluation?.school || settings?.school_name || '',
      time_slots: evaluation?.time_slots || {},
      general_comments: evaluation?.general_comments || ''
    };
    setFormData(newFormData);
    setHasUnsavedChanges(false);
  }, [evaluation, settings]);

  const handleSave = async (dataToSave = formData, showToast = true) => {
    try {
      await onSave(dataToSave, showToast); // Pass showToast flag to parent
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save evaluation:", error);
    }
  };

  // Debounced save function - only saves after 2 seconds of no changes
  const debouncedSave = useDebounce((data) => handleSave(data, false), 2000); // Don't show toast for auto-save

  const handleTimeSlotChange = (slot, data) => {
    const newFormData = {
      ...formData,
      time_slots: { ...formData.time_slots, [slot]: data }
    };
    setFormData(newFormData);
    setHasUnsavedChanges(true);
    
    // Use debounced save to prevent too many API calls
    debouncedSave(newFormData);
  };

  const handleCommentsChange = (comments) => {
    const newFormData = { ...formData, general_comments: comments };
    setFormData(newFormData);
    setHasUnsavedChanges(true);
    
    // Use debounced save for comments too
    debouncedSave(newFormData);
  };

  const handleEnhanceComments = async () => {
    if (!formData.general_comments.trim()) {
      toast.error('Please enter some comments first');
      return;
    }

    setIsEnhancingComments(true);
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
"${formData.general_comments}"

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
      const newFormData = { ...formData, general_comments: enhanced };
      setFormData(newFormData);
      setHasUnsavedChanges(true);
      debouncedSave(newFormData);
      toast.success('Comments enhanced successfully!');
    } catch (error) {
      console.error('AI enhancement failed:', error);
      toast.error('Failed to enhance comments. Please try again.');
    } finally {
      setIsEnhancingComments(false);
    }
  };

  return (
    <div className="bg-white p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl shadow-lg border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {TIME_SLOTS.map(({ key, label }) => (
          <TimeSlotRating
            key={key}
            timeKey={key}
            label={label}
            data={formData.time_slots?.[key] || {}}
            onChange={(data) => handleTimeSlotChange(key, data)}
          />
        ))}
      </div>
      <div className="mt-6 sm:mt-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-base sm:text-lg text-slate-800">General Comments</h3>
          <Button
            onClick={handleEnhanceComments}
            disabled={isEnhancingComments || !formData.general_comments.trim()}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            {isEnhancingComments ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isEnhancingComments ? 'Enhancing...' : 'Enhance with AI'}
          </Button>
        </div>
        <Textarea
          value={formData.general_comments}
          onChange={(e) => handleCommentsChange(e.target.value)}
          placeholder="Add any overall comments about the student's day..."
          className="min-h-[100px] sm:min-h-[120px] bg-slate-50 text-sm sm:text-base"
        />
      </div>
      <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-3 sm:gap-4">
        {hasUnsavedChanges && (
          <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">Auto-saving...</span>
        )}
        <Button 
          onClick={() => handleSave(formData, true)} 
          disabled={isSaving} 
          className="min-w-[140px] h-10 sm:h-11 w-full sm:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Now'}
        </Button>
      </div>
    </div>
  );
}
