import { Button } from '@/components/ui/button';
import { ExternalLink, Sheet, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BestInteractiveGrid() {
  const googleSheetsUrl = "https://docs.google.com/spreadsheets/u/9/?tgif=d";

  const openInNewTab = () => {
    window.open(googleSheetsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
            B.E.S.T Interactive Grid
          </h1>
          <p className="text-slate-600">
            Interactive spreadsheet for advanced data management and analysis
          </p>
        </div>

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            This opens your B.E.S.T Google Sheet in a new browser tab for full editing capabilities.
          </AlertDescription>
        </Alert>

        <Card className="border-blue-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Sheet className="h-5 w-5" />
              Open Interactive B.E.S.T Sheet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Click the button below to open your Google Sheet in a new browser tab. You'll need to sign in to your Google account if prompted.
            </p>
            <Button
              onClick={openInNewTab}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Interactive Sheet
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            Google Sheet Features Available:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Real-time collaboration with multiple users</li>
            <li>Advanced formulas and data analysis</li>
            <li>Charts and visualizations</li>
            <li>Data import/export from BEST Hub</li>
            <li>Version history and backup</li>
            <li>Mobile access and offline editing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
