import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { countCompletedSlots } from "@/utils/behaviorMetrics";
import { TIME_SLOT_KEYS } from "@/config/timeSlots";
import { User, Edit, CheckCircle, Play, UserCog } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function StudentCard({ student, evaluation, today, onEdit, isSelectMode, isSelected, onSelectToggle }) {
  const hasEvaluation = !!evaluation;
  const completedSlots = evaluation ? countCompletedSlots(evaluation.time_slots) : 0;
  const totalSlots = evaluation ? (Object.keys(evaluation.time_slots || {}).length || TIME_SLOT_KEYS.length) : TIME_SLOT_KEYS.length;
  
  const handleCardClick = (e) => {
    if (isSelectMode) {
      e.preventDefault();
      onSelectToggle();
    }
  }

  return (
    <div className="relative" onClick={handleCardClick}>
      {isSelectMode && (
        <div className="absolute top-6 left-6 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectToggle}
            onClick={(e) => e.stopPropagation()}
            className="w-6 h-6 bg-white border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
            aria-label={`Select student ${student.name}`}
          />
        </div>
      )}
      <Card className={`bg-white shadow-lg border-2 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col ${isSelected ? 'border-blue-500' : 'border-slate-200'} ${isSelectMode ? 'cursor-pointer' : ''}`}>
        <CardContent className="p-8 flex-grow">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-md">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xl mb-1">{student.name}</h3>
                <p className="text-sm text-slate-500">ID: {student.id.slice(-6)}</p>
              </div>
            </div>
            
            {hasEvaluation && (
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 text-sm font-semibold">
                <CheckCircle className="w-4 h-4 mr-1" />
                In Progress
              </Badge>
            )}
          </div>

          {hasEvaluation && (
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-2 font-medium">Today’s Progress</p>
              <div className="text-2xl font-bold text-slate-900 mb-3">
                {completedSlots}/{totalSlots} time slots
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${totalSlots ? (completedSlots / totalSlots) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
        <div className="p-6 pt-0 mt-auto">
          <div className="flex flex-col sm:flex-row gap-3">
              <Link to={createPageUrl(`StudentEvaluation?studentId=${student.id}&date=${today}`)} className="flex-1" onClick={(e) => {if(isSelectMode) e.preventDefault()}}>
                <Button disabled={isSelectMode} className="w-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200 h-12 text-base font-semibold">
                  {hasEvaluation ? (
                    <>
                      <Edit className="w-5 h-5 mr-2" />
                      Continue
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </Link>
              <Button 
                  variant="outline" 
                  className="h-12 border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold text-base"
                  onClick={(e) => {
                    if (isSelectMode) e.stopPropagation();
                    onEdit();
                  }}
                  disabled={isSelectMode}
              >
                  <UserCog className="w-5 h-5 mr-2" />
                  Profile
              </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
