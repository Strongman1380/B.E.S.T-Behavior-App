import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Clock } from "lucide-react";

import TimeSlotRating from './TimeSlotRating';

const TIME_SLOTS = ['8:30', '9:30', '9:10', '9:50', '10:30', '11:10', '1:10', '1:50', '2:30'];

export default function EvaluationForm({ evaluation, settings, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    teacher_name: '',
    school: '',
    time_slots: {},
    general_comments: ''
  });

  useEffect(() => {
    if (evaluation) {
      setFormData(evaluation);
    } else if (settings) {
      setFormData(prev => ({
        ...prev,
        teacher_name: settings.teacher_name || '',
        school: settings.school_name || ''
      }));
    }
  }, [evaluation, settings]);

  const handleTimeSlotChange = (timeSlot, field, value) => {
    setFormData(prev => ({
      ...prev,
      time_slots: {
        ...prev.time_slots,
        [timeSlot]: {
          ...(prev.time_slots[timeSlot] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const completedSlots = Object.keys(formData.time_slots || {}).filter(slot => {
    const slotData = formData.time_slots[slot];
    return slot === '2:30' ? slotData?.status : slotData?.rating;
  }).length;

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <Card className="bg-white shadow-lg border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-slate-900">
            Evaluation Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            <Label htmlFor="teacher_name" className="text-base font-semibold text-slate-700">
              Teacher's Name
            </Label>
            <Input
              id="teacher_name"
              value={formData.teacher_name}
              onChange={(e) => setFormData({...formData, teacher_name: e.target.value})}
              placeholder="Enter teacher name"
              className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="school" className="text-base font-semibold text-slate-700">
              School
            </Label>
            <Input
              id="school"
              value={formData.school}
              onChange={(e) => setFormData({...formData, school: e.target.value})}
              placeholder="Enter school name"
              className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-bold text-blue-900">
                Progress: {completedSlots}/9 time slots completed
              </span>
            </div>
            <div className="w-full sm:w-48 bg-blue-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(completedSlots / 9) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      <Card className="bg-white shadow-lg border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-slate-900">
            Time Slot Evaluations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {TIME_SLOTS.map((timeSlot) => (
            <TimeSlotRating
              key={timeSlot}
              timeSlot={timeSlot}
              data={formData.time_slots[timeSlot] || {}}
              onChange={(field, value) => handleTimeSlotChange(timeSlot, field, value)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Rating Legend */}
      <Card className="bg-slate-50 border-slate-200 shadow-lg">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Rating Scale</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">4</span>
              <span className="text-slate-700 font-medium">Productive, cooperative and on task!</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 bg-yellow-500 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">3</span>
              <span className="text-slate-700 font-medium">Needs to Show Improvement!</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">2</span>
              <span className="text-slate-700 font-medium">Showing Disruptive Behaviors!</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">1</span>
              <span className="text-slate-700 font-medium">Unable to redirect from negative behavior!</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Comments */}
      <Card className="bg-white shadow-lg border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-slate-900">
            General Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Textarea
            value={formData.general_comments}
            onChange={(e) => setFormData({...formData, general_comments: e.target.value})}
            placeholder="Add any general comments about the student's day..."
            className="min-h-40 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="sticky bottom-6 flex justify-center pb-8">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 px-12 py-4 text-xl font-bold shadow-xl rounded-xl"
        >
          <Save className="w-6 h-6 mr-3" />
          {isSaving ? 'Saving...' : 'Save Evaluation'}
        </Button>
      </div>
    </div>
  );
}