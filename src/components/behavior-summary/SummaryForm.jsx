import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { parseYmd } from "@/utils";
import { DailyEvaluation, IncidentReport, ContactLog } from "@/api/entities";
import { toast } from 'sonner';
import OpenAI from 'openai';

export default function SummaryForm({ summary, settings, onSave, isSaving, studentId }) {
  const [formData, setFormData] = useState({
    date_range_start: new Date(),
    date_range_end: new Date(),
    prepared_by: '',
    general_behavior_overview: '',
    strengths: '',
    improvements_needed: '',
    behavioral_incidents: '',
    summary_recommendations: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const newFormData = {
      date_range_start: summary?.date_range_start ? parseYmd(summary.date_range_start) : new Date(),
      date_range_end: summary?.date_range_end ? parseYmd(summary.date_range_end) : new Date(),
      prepared_by: summary?.prepared_by || settings?.teacher_name || '',
      general_behavior_overview: summary?.general_behavior_overview || '',
      strengths: summary?.strengths || '',
      improvements_needed: summary?.improvements_needed || '',
      behavioral_incidents: summary?.behavioral_incidents || '',
      summary_recommendations: summary?.summary_recommendations || ''
    };
    setFormData(newFormData);
  }, [summary, settings]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      date_range_start: format(formData.date_range_start, 'yyyy-MM-dd'),
      date_range_end: format(formData.date_range_end, 'yyyy-MM-dd')
    };
    onSave(dataToSave);
  };

  const generateSummaryFromComments = async () => {
    if (!studentId) {
      toast.error('No student selected');
      return;
    }

    setIsGenerating(true);
    try {
      // Fetch evaluations for the date range
      const startDate = format(formData.date_range_start, 'yyyy-MM-dd');
      const endDate = format(formData.date_range_end, 'yyyy-MM-dd');

      // Fetch ALL relevant data for comprehensive analysis
      const [evaluations, incidents, contacts] = await Promise.all([
        DailyEvaluation.filter({
          student_id: studentId,
          date_from: startDate,
          date_to: endDate
        }),
        IncidentReport.filter({
          student_id: studentId,
          incident_date_from: startDate,
          incident_date_to: endDate
        }),
        ContactLog.filter({
          student_id: studentId,
          contact_date_from: startDate,
          contact_date_to: endDate
        })
      ]);

      if (evaluations.length === 0 && incidents.length === 0 && contacts.length === 0) {
        toast.error('No data found for the selected date range');
        return;
      }

      // Extract ALL comments and behavioral information
      const allComments = [];

      // Process daily evaluations - ALL comments from time slots and general comments
      evaluations.forEach(evaluation => {
        // Add general comments
        if (evaluation.general_comments && evaluation.general_comments.trim()) {
          allComments.push({
            type: 'general',
            date: evaluation.date,
            content: evaluation.general_comments.trim(),
            context: 'Overall daily evaluation summary',
            source: 'daily_evaluation'
          });
        }

        // Add ALL time slot comments - comprehensive extraction
        if (evaluation.time_slots) {
          Object.entries(evaluation.time_slots).forEach(([slot, data]) => {
            if (data && data.comment && data.comment.trim()) {
              // Map time slot keys to readable labels
              const timeSlotLabels = {
                '8:30': '8:30 AM - 9:10 AM',
                '9:10': '9:10 AM - 9:50 AM',
                '9:50': '9:50 AM - 10:30 AM',
                '10:30': '10:30 AM - 11:10 AM',
                '11:10': '11:10 AM - Lunch',
                '1:10': 'After Lunch - 1:10 PM',
                '1:50': '1:10 PM - 1:50 PM',
                '2:30': '1:50 PM - 2:30 PM'
              };

              allComments.push({
                type: 'time_slot',
                date: evaluation.date,
                slot: slot,
                slotLabel: timeSlotLabels[slot] || slot,
                rating: data.rating,
                content: data.comment.trim(),
                context: `Time slot: ${timeSlotLabels[slot] || slot}`,
                source: 'daily_evaluation'
              });
            }
          });
        }
      });

      // Process incident reports for additional behavioral context
      incidents.forEach(incident => {
        if (incident.incident_description) {
          allComments.push({
            type: 'incident',
            date: incident.incident_date,
            content: incident.incident_description,
            context: `Incident Report - ${incident.incident_type || 'General Incident'}`,
            source: 'incident_report'
          });
        }
      });

      // Process contact logs for additional context
      contacts.forEach(contact => {
        if (contact.outcome_of_contact) {
          allComments.push({
            type: 'contact',
            date: contact.contact_date,
            content: contact.outcome_of_contact,
            context: `Contact with ${contact.contact_person_name} - ${contact.contact_category}`,
            source: 'contact_log'
          });
        }
        if (contact.purpose_of_contact) {
          allComments.push({
            type: 'contact_purpose',
            date: contact.contact_date,
            content: contact.purpose_of_contact,
            context: `Contact purpose with ${contact.contact_person_name}`,
            source: 'contact_log'
          });
        }
      });

      if (allComments.length === 0) {
        toast.error('No behavioral information found in evaluations, incidents, or contacts for the selected date range');
        return;
      }

      // Use AI to analyze and generate comprehensive summaries from ALL data
      const analysis = await analyzeCommentsWithAI(allComments);

      // Update form data with AI-generated content
      setFormData(prev => ({
        ...prev,
        general_behavior_overview: analysis.general_overview,
        strengths: analysis.strengths,
        improvements_needed: analysis.improvements,
        behavioral_incidents: analysis.incidents,
        summary_recommendations: analysis.recommendations
      }));

      toast.success(`AI-powered comprehensive summary generated from ALL ${allComments.length} behavioral records!`);

    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast.error('Failed to generate AI summary. Please check your OpenAI API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeCommentsWithAI = async (comments) => {
    const openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });

    // Prepare ALL behavioral information for AI analysis
    const commentsText = comments.map(comment => {
      const dateStr = new Date(comment.date).toLocaleDateString();
      switch (comment.type) {
        case 'general':
          return `Date: ${dateStr} - GENERAL COMMENT: ${comment.content}`;
        case 'time_slot':
          return `Date: ${dateStr} - ${comment.slotLabel} (Rating: ${comment.rating}/4): ${comment.content}`;
        case 'incident':
          return `Date: ${dateStr} - INCIDENT REPORT: ${comment.content}`;
        case 'contact':
          return `Date: ${dateStr} - CONTACT LOG: ${comment.content}`;
        case 'contact_purpose':
          return `Date: ${dateStr} - CONTACT PURPOSE: ${comment.content}`;
        default:
          return `Date: ${dateStr} - ${comment.context}: ${comment.content}`;
      }
    }).join('\n\n');

    const prompt = `You are a friendly but professional educational specialist analyzing student behavior data. Based on ALL the behavioral information from daily evaluations, incident reports, and contact logs, create a casual yet professional behavior summary that feels natural and conversational.

BEHAVIORAL DATA TO ANALYZE:
${commentsText}

Please analyze ALL the behavioral information and create content for each section. Keep it conversational and natural, like you're talking to a colleague about the student, but still professional and appropriate for educational documentation.

Focus on:
1. Daily patterns and consistency across time slots
2. How the student interacts with others throughout the day
3. Both the good stuff and areas that need attention
4. Any specific incidents and what happened
5. Communication with parents and how that went

Create content for these sections:

1. GENERAL BEHAVIOR OVERVIEW: Write 2-3 sentences in a conversational tone about the student's overall behavior. Make it feel like you're chatting about the student with another teacher - friendly but professional.

2. STRENGTHS: List 3-5 positive qualities or behaviors you've noticed, with specific examples. Keep it encouraging and specific, like you're highlighting what the student does well.

3. IMPROVEMENTS NEEDED: Mention 2-4 areas where the student could use some extra support or practice. Be gentle and constructive, focusing on growth opportunities rather than just problems.

4. BEHAVIORAL INCIDENTS: Note any specific incidents or challenging moments, including what happened and any follow-up. Keep it factual and neutral, like you're documenting events for the record.

5. SUMMARY & RECOMMENDATIONS: Share 2-3 practical suggestions for supporting the student's growth. Make them feel actionable and realistic, like helpful tips you'd give to another educator.

Format your response as a JSON object with these exact keys:
{
  "general_overview": "content here",
  "strengths": "content here", 
  "improvements": "content here",
  "incidents": "content here",
  "recommendations": "content here"
}

Use everyday language that's easy to read, but keep it appropriate for school documentation. Focus on being supportive and solution-oriented rather than just pointing out problems. Make it feel like helpful feedback from someone who genuinely cares about the student's success.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a friendly educational specialist who creates helpful, conversational behavior summaries that feel natural and supportive while remaining professional for school documentation."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1500
      });

      const response = completion.choices[0].message.content;
      
      // Parse the JSON response
      const analysis = JSON.parse(response);
      
      return {
        general_overview: analysis.general_overview || '',
        strengths: analysis.strengths || '',
        improvements: analysis.improvements || '',
        incidents: analysis.incidents || '',
        recommendations: analysis.recommendations || ''
      };
      
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI analysis');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Date Range Start</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date_range_start, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date_range_start}
                  onSelect={(date) => handleChange('date_range_start', date)}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label>Date Range End</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date_range_end, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date_range_end}
                  onSelect={(date) => handleChange('date_range_end', date)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Prepared By</Label>
          <Input
            value={formData.prepared_by}
            onChange={(e) => handleChange('prepared_by', e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className="space-y-2">
          <Label>General Behavior Overview</Label>
          <Textarea
            value={formData.general_behavior_overview}
            onChange={(e) => handleChange('general_behavior_overview', e.target.value)}
            placeholder="Provide an overall description of the student's behavior during this period..."
            className="min-h-[100px]"
          />
        </div>

        {/* Strengths and Improvements */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Strengths</Label>
            <Textarea
              value={formData.strengths}
              onChange={(e) => handleChange('strengths', e.target.value)}
              placeholder="Describe the student's behavioral strengths and positive qualities..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Improvements Needed</Label>
            <Textarea
              value={formData.improvements_needed}
              onChange={(e) => handleChange('improvements_needed', e.target.value)}
              placeholder="Identify areas where the student needs behavioral improvement..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Behavioral Incidents</Label>
          <Textarea
            value={formData.behavioral_incidents}
            onChange={(e) => handleChange('behavioral_incidents', e.target.value)}
            placeholder="Document any specific behavioral incidents during this period..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Summary & Recommendations</Label>
          <Textarea
            value={formData.summary_recommendations}
            onChange={(e) => handleChange('summary_recommendations', e.target.value)}
            placeholder="Provide a summary and any recommendations for the student..."
            className="min-h-[120px]"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button 
            onClick={generateSummaryFromComments} 
            disabled={isGenerating || !studentId} 
            variant="outline"
            className="bg-purple-50 hover:bg-purple-100 border-purple-200"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Analyzing...' : 'Generate from Comments'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Summary'}
          </Button>
        </div>
      </div>
    </div>
  );
}
