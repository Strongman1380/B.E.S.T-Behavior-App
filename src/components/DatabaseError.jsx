import { AlertTriangle, Database, ExternalLink } from 'lucide-react';

const DatabaseError = ({ error }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Database Connection Error
        </h1>
        
        <p className="text-gray-600 text-center mb-6">
          Unable to connect to the PostgreSQL database. Please check your configuration.
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Database className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-1">
                Database Error Details
              </h3>
              <p className="text-sm text-red-700">
                {error || 'Connection failed - please check your DATABASE_URL environment variable'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">
            To fix this issue:
          </h3>
          
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>
              Go to your{' '}
              <a 
                href="https://vercel.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 inline-flex items-center"
              >
                Vercel Dashboard
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </li>
            <li>Select your project and go to the Storage tab</li>
            <li>Create a new PostgreSQL database</li>
            <li>Copy the connection string to your environment variables</li>
            <li>Redeploy your application</li>
          </ol>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Need help? Check the{' '}
            <a 
              href="https://github.com/Strongman1380/B.E.S.T-Behavior-App/blob/main/DEPLOYMENT.md" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              deployment guide
            </a>
            {' '}for detailed instructions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseError;
