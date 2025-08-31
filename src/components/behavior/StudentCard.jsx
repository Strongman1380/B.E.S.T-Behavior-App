import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Edit, Play, UserCog } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function StudentCard({ student, evaluation, today, onEdit, isSelectMode, isSelected, onSelectToggle }) {
  const hasEvaluation = !!evaluation;
  
  const handleCardClick = (e) => {
    if (isSelectMode) {
      e.preventDefault();
      onSelectToggle();
    }
  }

  return (
    <div className="relative" onClick={handleCardClick}>
      {isSelectMode && (
        <div className="absolute top-4 left-4 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectToggle}
            onClick={(e) => e.stopPropagation()}
            className="w-6 h-6 bg-white border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
            aria-label={`Select student ${student.student_name}`}
          />
        </div>
      )}
      <Card className={`bg-white shadow-md border-2 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col ${isSelected ? 'border-blue-500' : 'border-slate-200'} ${isSelectMode ? 'cursor-pointer' : ''}`}>
        <CardContent className="p-6 flex-grow">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-inner ${isSelectMode && isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <User className={`w-8 h-8 ${isSelectMode && isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{student.student_name}</h3>
              {hasEvaluation && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 mt-1">
                    Evaluation Started
                  </Badge>
              )}
            </div>
          </div>
        </CardContent>
        <div className="p-4 pt-0 mt-auto bg-slate-50/50 rounded-b-lg">
          <div className="flex gap-2">
            <Link to={createPageUrl(`StudentEvaluation?studentId=${student.id}&date=${today}`)} className="flex-1" onClick={(e) => {if(isSelectMode) e.preventDefault()}}>
              <Button disabled={isSelectMode} className="w-full bg-blue-600 hover:bg-blue-700">
                {hasEvaluation ? <Edit className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {hasEvaluation ? 'Continue' : 'Start'}
              </Button>
            </Link>
            <Button 
                variant="outline" 
                onClick={(e) => {
                  if (isSelectMode) e.stopPropagation();
                  onEdit();
                }}
                disabled={isSelectMode}
            >
                <UserCog className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
