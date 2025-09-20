import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3X3, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BestGrids() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const handleRefresh = () => {
    setIsLoading(true);
    // Refresh the iframe by updating the src with a timestamp
    const iframe = document.getElementById('best-grids-iframe');
    if (iframe) {
      const currentSrc = iframe.src.split('&timestamp=')[0];
      iframe.src = `${currentSrc}&timestamp=${Date.now()}`;
    }
    
    // Simulate loading time
    setTimeout(() => {
      setIsLoading(false);
      setLastRefresh(new Date());
    }, 1000);
  };

  const openInNewTab = () => {
    window.open('https://docs.google.com/spreadsheets/d/1uSByZh0pkirnil0cqD5Nc-XaReBSl_eCf5LP_yVp4nY/edit?usp=sharing', '_blank');
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-2 sm:gap-3">
                <Grid3X3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                <span className="hidden sm:inline">B.E.S.T Grids</span>
                <span className="sm:hidden">B.E.S.T Grids</span>
              </h1>
              <p className="text-slate-600 flex items-center gap-2 text-sm sm:text-base">
                <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />
                Interactive Google Sheets integration for data management and analysis
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={openInNewTab}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        {/* Google Sheets Embed */}
        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-blue-600" />
              Interactive Data Grid
            </CardTitle>
            <p className="text-sm text-slate-600">
              This embedded Google Sheet syncs in real-time and allows direct editing within the application.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full" style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}>
              {isLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-sm text-slate-600">Refreshing grid...</p>
                  </div>
                </div>
              )}
              <iframe
                id="best-grids-iframe"
                src="https://docs.google.com/spreadsheets/d/1uSByZh0pkirnil0cqD5Nc-XaReBSl_eCf5LP_yVp4nY/edit?usp=sharing&widget=true&headers=false"
                width="100%"
                height="100%"
                frameBorder="0"
                className="rounded-lg border border-slate-200"
                title="B.E.S.T Grids - Interactive Data Management"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Real-time data synchronization
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Direct editing capabilities
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Collaborative access
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Automatic saving
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Usage Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-slate-600">
                • Use the refresh button if data appears outdated
              </div>
              <div className="text-sm text-slate-600">
                • Click "Open in New Tab" for full-screen editing
              </div>
              <div className="text-sm text-slate-600">
                • Changes are automatically saved to Google Sheets
              </div>
              <div className="text-sm text-slate-600">
                • Data syncs across all users in real-time
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}