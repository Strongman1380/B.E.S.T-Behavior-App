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
import { DailyEvaluation } from "@/api/entities";
import { toast } from 'sonner';

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

      const evaluations = await DailyEvaluation.filter({
        student_id: studentId,
        date_from: startDate,
        date_to: endDate
      });

      if (evaluations.length === 0) {
        toast.error('No evaluations found for the selected date range');
        return;
      }

      // Extract all comments
      const allComments = [];
      evaluations.forEach(evaluation => {
        // Add general comments
        if (evaluation.general_comments) {
          allComments.push({
            type: 'general',
            date: evaluation.date,
            content: evaluation.general_comments
          });
        }

        // Add time slot comments
        if (evaluation.time_slots) {
          Object.entries(evaluation.time_slots).forEach(([slot, data]) => {
            if (data.comment) {
              allComments.push({
                type: 'time_slot',
                date: evaluation.date,
                slot: slot,
                rating: data.rating,
                content: data.comment
              });
            }
          });
        }
      });

      if (allComments.length === 0) {
        toast.error('No comments found in evaluations for the selected date range');
        return;
      }

      // Analyze and categorize comments
      const analysis = analyzeComments(allComments);

      // Update form data with generated content
      setFormData(prev => ({
        ...prev,
        general_behavior_overview: analysis.general_overview,
        strengths: analysis.strengths,
        improvements_needed: analysis.improvements,
        behavioral_incidents: analysis.incidents,
        summary_recommendations: analysis.recommendations
      }));

      toast.success('Summary generated from evaluation comments!');

    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary from comments');
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeComments = (comments) => {
    // Group comments by themes
    const positiveComments = [];
    const negativeComments = [];
    const incidentComments = [];
    const improvementComments = [];
    const generalComments = [];

    comments.forEach(comment => {
      const content = comment.content.toLowerCase();

      // Categorize based on keywords and context
      if (content.includes('great') || content.includes('excellent') || content.includes('wonderful') ||
          content.includes('amazing') || content.includes('fantastic') || content.includes('good job') ||
          content.includes('well done') || content.includes('positive') || content.includes('helpful') ||
          content.includes('cooperative') || content.includes('focused') || content.includes('engaged')) {
        positiveComments.push(comment);
      }

      if (content.includes('disruptive') || content.includes('difficult') || content.includes('challenging') ||
          content.includes('problem') || content.includes('issue') || content.includes('concern') ||
          content.includes('struggle') || content.includes('hard time') || content.includes('refused') ||
          content.includes('argued') || content.includes('resisted')) {
        negativeComments.push(comment);
      }

      if (content.includes('incident') || content.includes('fight') || content.includes('argue') ||
          content.includes('yell') || content.includes('disrespect') || content.includes('disobedient') ||
          content.includes('defiant') || content.includes('aggressive') || content.includes('bullying')) {
        incidentComments.push(comment);
      }

      if (content.includes('improve') || content.includes('work on') || content.includes('practice') ||
          content.includes('develop') || content.includes('learn') || content.includes('better') ||
          content.includes('more') || content.includes('help with')) {
        improvementComments.push(comment);
      }

      if (comment.type === 'general') {
        generalComments.push(comment);
      }
    });

    // Generate summary sections
    const general_overview = generateGeneralOverview(comments, generalComments);
    const strengths = generateStrengths(positiveComments);
    const improvements = generateImprovements(improvementComments, negativeComments);
    const incidents = generateIncidents(incidentComments);
    const recommendations = generateRecommendations(improvements, strengths);

    return {
      general_overview,
      strengths,
      improvements,
      incidents,
      recommendations
    };
  };

  const generateGeneralOverview = (allComments, generalComments) => {
    if (generalComments.length === 0) return '';

    const overview = generalComments.map(c => c.content).join(' ').substring(0, 300);
    return `During this period, ${overview}...`;
  };

  const generateStrengths = (positiveComments) => {
    if (positiveComments.length === 0) return '';

    const strengths = positiveComments
      .slice(0, 5) // Limit to top 5
      .map(c => c.content)
      .join('. ')
      .substring(0, 400);

    return `The student demonstrated several positive behaviors including: ${strengths}.`;
  };

  const generateImprovements = (improvementComments, negativeComments) => {
    const allImprovements = [...improvementComments, ...negativeComments];
    if (allImprovements.length === 0) return '';

    const improvements = allImprovements
      .slice(0, 5)
      .map(c => c.content)
      .join('. ')
      .substring(0, 400);

    return `Areas for improvement include: ${improvements}.`;
  };

  const generateIncidents = (incidentComments) => {
    if (incidentComments.length === 0) return '';

    const incidents = incidentComments
      .slice(0, 5)
      .map(c => `${c.date}: ${c.content}`)
      .join('. ');

    return `Behavioral incidents noted: ${incidents}.`;
  };

  const generateRecommendations = (improvements, strengths) => {
    if (!improvements && !strengths) return '';

    let recommendations = '';

    if (strengths) {
      recommendations += 'Continue to build on the student\'s strengths. ';
    }

    if (improvements) {
      recommendations += 'Focus on the identified areas for improvement through targeted interventions and support.';
    }

    return recommendations;
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
