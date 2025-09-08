import { useState, useEffect } from "react";
import { Settings as SettingsEntity } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, School, Server, RefreshCw, Trash2 } from "lucide-react";
import { Toaster, toast } from "sonner";

export default function Settings() {
  const [settings, setSettings] = useState({ teacher_name: '', school_name: '' });
  const [settingsId, setSettingsId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Backend switcher state
  const [backendUrl, setBackendUrl] = useState('');
  const [backendKey, setBackendKey] = useState('');
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => {
    try {
      const lsUrl = typeof window !== 'undefined' ? window.localStorage.getItem('SUPABASE_URL') : '';
      const lsKey = typeof window !== 'undefined' ? window.localStorage.getItem('SUPABASE_ANON_KEY') : '';
      const envUrl = import.meta?.env?.NEXT_PUBLIC_SUPABASE_URL || import.meta?.env?.VITE_SUPABASE_URL || import.meta?.env?.SUPABASE_URL || '';
      const envKey = import.meta?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta?.env?.VITE_SUPABASE_ANON_KEY || import.meta?.env?.SUPABASE_ANON_KEY || '';
      if (lsUrl && lsKey) {
        setBackendUrl(lsUrl);
        setBackendKey(lsKey);
        setHasOverride(true);
      } else {
        setBackendUrl(envUrl);
        setBackendKey(envKey ? '••••••••' : '');
        setHasOverride(false);
      }
    } catch (e) {
      // ignore
    }
  }, []);

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
      const msg = typeof error?.message === 'string' ? error.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('row-level security')) {
        toast.error('RLS/permissions prevent reading settings. Apply supabase-schema.sql policies/grants.')
      } else {
        toast.error("Error loading settings."); 
      }
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
      const msg = typeof error?.message === 'string' ? error.message : ''
      if (msg.includes('Supabase not configured')) {
        toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
      } else if (msg.toLowerCase().includes('row-level security')) {
        toast.error('Update blocked by RLS. Apply supabase-schema.sql policies/grants in Supabase.')
      } else if (msg.toLowerCase().includes('permission') || error?.code === '42501') {
        toast.error('Permission denied. Check RLS policies for anon role in Supabase.')
      } else {
        toast.error("Error saving settings."); 
      }
    }
    setIsSaving(false);
  };

  const applyBackendOverride = () => {
    if (!backendUrl || !backendKey || backendKey === '••••••••') {
      toast.error('Enter Supabase URL and anon key');
      return;
    }
    try {
      window.localStorage.setItem('SUPABASE_URL', backendUrl);
      window.localStorage.setItem('SUPABASE_ANON_KEY', backendKey);
      toast.success('Backend updated. Reloading...');
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      toast.error('Failed to save override');
    }
  };

  const resetBackendOverride = () => {
    try {
      window.localStorage.removeItem('SUPABASE_URL');
      window.localStorage.removeItem('SUPABASE_ANON_KEY');
      toast.success('Backend reset to build env. Reloading...');
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      toast.error('Failed to reset override');
    }
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

        {/* Backend Switcher */}
        <div className="mt-6">
          <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader className="border-b border-slate-100 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-slate-900">
                <Server className="w-4 h-4 sm:w-5 sm:h-5" />
                Backend Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <p className="text-sm text-slate-600">
                {hasOverride ? 'Using runtime override from this browser.' : 'Using build-time environment from deployment.'}
              </p>
              <div className="space-y-2">
                <Label htmlFor="supabase_url" className="text-sm font-medium text-slate-700">Supabase URL</Label>
                <Input
                  id="supabase_url"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="https://YOUR-PROJECT.supabase.co"
                  className="border-slate-300 focus:border-blue-500 h-10 sm:h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase_key" className="text-sm font-medium text-slate-700">Supabase Anon Key</Label>
                <Input
                  id="supabase_key"
                  type="password"
                  value={backendKey}
                  onChange={(e) => setBackendKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                  className="border-slate-300 focus:border-blue-500 h-10 sm:h-11"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={applyBackendOverride} className="h-10 sm:h-11">
                  <RefreshCw className="w-4 h-4 mr-2" /> Apply Backend Override
                </Button>
                <Button onClick={resetBackendOverride} variant="outline" className="h-10 sm:h-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="w-4 h-4 mr-2" /> Reset to Build Env
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
