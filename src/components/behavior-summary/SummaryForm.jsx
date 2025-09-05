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

      // Extract all comments - comprehensive collection
      const allComments = [];
      evaluations.forEach(evaluation => {
        // Add general comments
        if (evaluation.general_comments && evaluation.general_comments.trim()) {
          allComments.push({
            type: 'general',
            date: evaluation.date,
            content: evaluation.general_comments.trim(),
            context: 'Overall daily evaluation summary'
          });
        }

        // Add time slot comments - comprehensive extraction
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
                context: `Time slot: ${timeSlotLabels[slot] || slot}`
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

      toast.success('Comprehensive summary generated from ALL evaluation comments!');

    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary from comments');
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeComments = (comments) => {
    // Group comments by themes with comprehensive categorization
    const positiveComments = [];
    const negativeComments = [];
    const incidentComments = [];
    const improvementComments = [];
    const generalComments = [];
    const academicComments = [];
    const socialComments = [];
    const behavioralComments = [];
    const participationComments = [];
    const focusComments = [];
    const cooperationComments = [];

    comments.forEach(comment => {
      const content = comment.content.toLowerCase();
      const originalContent = comment.content;

      // Comprehensive positive indicators
      if (content.includes('great') || content.includes('excellent') || content.includes('wonderful') ||
          content.includes('amazing') || content.includes('fantastic') || content.includes('good job') ||
          content.includes('well done') || content.includes('positive') || content.includes('helpful') ||
          content.includes('cooperative') || content.includes('focused') || content.includes('engaged') ||
          content.includes('participated') || content.includes('contributed') || content.includes('excellent work') ||
          content.includes('outstanding') || content.includes('superb') || content.includes('impressive') ||
          content.includes('commendable') || content.includes('praise') || content.includes('achievement')) {
        positiveComments.push({ ...comment, originalContent });
      }

      // Comprehensive negative indicators
      if (content.includes('disruptive') || content.includes('difficult') || content.includes('challenging') ||
          content.includes('problem') || content.includes('issue') || content.includes('concern') ||
          content.includes('struggle') || content.includes('hard time') || content.includes('refused') ||
          content.includes('argued') || content.includes('resisted') || content.includes('uncooperative') ||
          content.includes('defiant') || content.includes('resistant') || content.includes('unfocused') ||
          content.includes('distracted') || content.includes('off task') || content.includes('inappropriate')) {
        negativeComments.push({ ...comment, originalContent });
      }

      // Incident-related comments
      if (content.includes('incident') || content.includes('fight') || content.includes('argue') ||
          content.includes('yell') || content.includes('disrespect') || content.includes('disobedient') ||
          content.includes('defiant') || content.includes('aggressive') || content.includes('bullying') ||
          content.includes('conflict') || content.includes('dispute') || content.includes('confrontation') ||
          content.includes('disruption') || content.includes('interruption') || content.includes('disturbance')) {
        incidentComments.push({ ...comment, originalContent });
      }

      // Improvement and development comments
      if (content.includes('improve') || content.includes('work on') || content.includes('practice') ||
          content.includes('develop') || content.includes('learn') || content.includes('better') ||
          content.includes('more') || content.includes('help with') || content.includes('support') ||
          content.includes('encourage') || content.includes('remind') || content.includes('reinforce') ||
          content.includes('build') || content.includes('strengthen') || content.includes('enhance')) {
        improvementComments.push({ ...comment, originalContent });
      }

      // Academic-related comments
      if (content.includes('academic') || content.includes('learning') || content.includes('assignment') ||
          content.includes('homework') || content.includes('reading') || content.includes('writing') ||
          content.includes('math') || content.includes('science') || content.includes('test') ||
          content.includes('grade') || content.includes('study') || content.includes('lesson') ||
          content.includes('curriculum') || content.includes('subject') || content.includes('classwork')) {
        academicComments.push({ ...comment, originalContent });
      }

      // Social interaction comments
      if (content.includes('social') || content.includes('friend') || content.includes('peer') ||
          content.includes('group') || content.includes('interaction') || content.includes('relationship') ||
          content.includes('communication') || content.includes('sharing') || content.includes('teamwork') ||
          content.includes('collaboration') || content.includes('conversation') || content.includes('discussion')) {
        socialComments.push({ ...comment, originalContent });
      }

      // Behavioral comments
      if (content.includes('behavior') || content.includes('conduct') || content.includes('manners') ||
          content.includes('respect') || content.includes('courtesy') || content.includes('polite') ||
          content.includes('rude') || content.includes('appropriate') || content.includes('inappropriate') ||
          content.includes('acceptable') || content.includes('unacceptable')) {
        behavioralComments.push({ ...comment, originalContent });
      }

      // Participation comments
      if (content.includes('participat') || content.includes('involved') || content.includes('engaged') ||
          content.includes('active') || content.includes('contribute') || content.includes('volunteer') ||
          content.includes('raise hand') || content.includes('answer') || content.includes('question') ||
          content.includes('discussion') || content.includes('activity')) {
        participationComments.push({ ...comment, originalContent });
      }

      // Focus and attention comments
      if (content.includes('focus') || content.includes('attention') || content.includes('concentrat') ||
          content.includes('distract') || content.includes('on task') || content.includes('off task') ||
          content.includes('daydream') || content.includes('wandering') || content.includes('listening') ||
          content.includes('following') || content.includes('directions')) {
        focusComments.push({ ...comment, originalContent });
      }

      // Cooperation comments
      if (content.includes('cooperat') || content.includes('helpful') || content.includes('assist') ||
          content.includes('support') || content.includes('team') || content.includes('together') ||
          content.includes('collaborat') || content.includes('work with') || content.includes('group work')) {
        cooperationComments.push({ ...comment, originalContent });
      }

      if (comment.type === 'general') {
        generalComments.push({ ...comment, originalContent });
      }
    });

    // Generate comprehensive summary sections
    const general_overview = generateGeneralOverview(comments, generalComments);
    const strengths = generateStrengths(positiveComments, participationComments, focusComments, cooperationComments);
    const improvements = generateImprovements(improvementComments, negativeComments, focusComments);
    const incidents = generateIncidents(incidentComments);
    const recommendations = generateRecommendations(improvements, strengths, academicComments, socialComments, behavioralComments);

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

  const generateStrengths = (positiveComments, participationComments, focusComments, cooperationComments) => {
    const allStrengths = [...positiveComments, ...participationComments, ...focusComments, ...cooperationComments];
    if (allStrengths.length === 0) return '';

    // Group by categories for better organization
    const categories = {
      positive: positiveComments.slice(0, 3),
      participation: participationComments.slice(0, 2),
      focus: focusComments.slice(0, 2),
      cooperation: cooperationComments.slice(0, 2)
    };

    let strengthsText = '';

    if (categories.positive.length > 0) {
      const positiveText = categories.positive.map(c => c.originalContent).join('; ');
      strengthsText += `Demonstrated positive behaviors: ${positiveText}. `;
    }

    if (categories.participation.length > 0) {
      const participationText = categories.participation.map(c => c.originalContent).join('; ');
      strengthsText += `Active participation: ${participationText}. `;
    }

    if (categories.focus.length > 0) {
      const focusText = categories.focus.map(c => c.originalContent).join('; ');
      strengthsText += `Good focus and attention: ${focusText}. `;
    }

    if (categories.cooperation.length > 0) {
      const cooperationText = categories.cooperation.map(c => c.originalContent).join('; ');
      strengthsText += `Cooperative and helpful: ${cooperationText}. `;
    }

    return strengthsText.substring(0, 500);
  };

  const generateImprovements = (improvementComments, negativeComments, focusComments) => {
    const allImprovements = [...improvementComments, ...negativeComments];

    // Add focus-related issues to improvements
    const focusIssues = focusComments.filter(c => c.content.toLowerCase().includes('distract') ||
                                                  c.content.toLowerCase().includes('off task') ||
                                                  c.content.toLowerCase().includes('unfocused'));
    allImprovements.push(...focusIssues);

    if (allImprovements.length === 0) return '';

    // Group by categories for better organization
    const categories = {
      improvements: improvementComments.slice(0, 3),
      challenges: negativeComments.slice(0, 3),
      focus: focusIssues.slice(0, 2)
    };

    let improvementsText = '';

    if (categories.improvements.length > 0) {
      const improvementText = categories.improvements.map(c => c.originalContent).join('; ');
      improvementsText += `Areas for development: ${improvementText}. `;
    }

    if (categories.challenges.length > 0) {
      const challengeText = categories.challenges.map(c => c.originalContent).join('; ');
      improvementsText += `Behavioral challenges: ${challengeText}. `;
    }

    if (categories.focus.length > 0) {
      const focusText = categories.focus.map(c => c.originalContent).join('; ');
      improvementsText += `Focus and attention concerns: ${focusText}. `;
    }

    return improvementsText.substring(0, 500);
  };

  const generateIncidents = (incidentComments) => {
    if (incidentComments.length === 0) return '';

    const incidents = incidentComments
      .slice(0, 5)
      .map(c => `${c.date}: ${c.content}`)
      .join('. ');

    return `Behavioral incidents noted: ${incidents}.`;
  };

  const generateRecommendations = (improvements, strengths, academicComments, socialComments, behavioralComments) => {
    if (!improvements && !strengths && academicComments.length === 0 && socialComments.length === 0 && behavioralComments.length === 0) return '';

    let recommendations = '';

    if (strengths) {
      recommendations += 'Continue to build on the student\'s strengths and positive behaviors. ';
    }

    if (improvements) {
      recommendations += 'Focus on the identified areas for improvement through targeted interventions and support. ';
    }

    if (academicComments.length > 0) {
      recommendations += 'Support academic engagement and success through consistent routines and encouragement. ';
    }

    if (socialComments.length > 0) {
      recommendations += 'Encourage positive social interactions and peer relationships. ';
    }

    if (behavioralComments.length > 0) {
      recommendations += 'Reinforce appropriate behavioral expectations and provide clear consequences. ';
    }

    return recommendations.substring(0, 500);
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
