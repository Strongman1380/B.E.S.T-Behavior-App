import { useState, useEffect } from "react";
import { Settings as SettingsEntity } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, School } from "lucide-react";
import { Toaster, toast } from "sonner";

export default function Settings() {
  const [settings, setSettings] = useState({ teacher_name: '', school_name: '' });
  const [settingsId, setSettingsId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settingsData = await SettingsEntity.list();
      if (settingsData.length > 0) {
        setSettings(settingsData[0]);
        setSettingsId(settingsData[0].id);
      }
    } catch (error) { 
      console.error("Error loading settings:", error);
      toast.error("Error loading settings."); 
    }
    setIsLoading(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      if (settingsId) {
        await SettingsEntity.update(settingsId, settings);
      } else {
        await SettingsEntity.create(settings);
      }
      toast.success("Settings saved successfully!");
      loadSettings();
    } catch (error) { 
      console.error("Error saving settings:", error);
      toast.error("Error saving settings."); 
    }
    setIsSaving(false);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <Toaster richColors />
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600 text-sm sm:text-base">
            <span className="hidden sm:inline">Configure default teacher and school information for behavior reports.</span>
            <span className="sm:hidden">Configure teacher and school info</span>
          </p>
        </div>

        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="border-b border-slate-100 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-slate-900">
              <School className="w-4 h-4 sm:w-5 sm:h-5" /> 
              Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="teacher_name" className="text-sm font-medium text-slate-700">Teacher Name</Label>
              <Input 
                id="teacher_name" 
                value={settings.teacher_name || ''} 
                onChange={(e) => setSettings({...settings, teacher_name: e.target.value})} 
                placeholder="Enter your full name" 
                className="border-slate-300 focus:border-blue-500 h-10 sm:h-11" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school_name" className="text-sm font-medium text-slate-700">School Name</Label>
              <Input 
                id="school_name" 
                value={settings.school_name || ''} 
                onChange={(e) => setSettings({...settings, school_name: e.target.value})} 
                placeholder="Enter school name" 
                className="border-slate-300 focus:border-blue-500 h-10 sm:h-11" 
              />
            </div>
            <Button 
              onClick={saveSettings} 
              disabled={isSaving || isLoading} 
              className="w-full bg-blue-600 hover:bg-blue-700 h-10 sm:h-11"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}