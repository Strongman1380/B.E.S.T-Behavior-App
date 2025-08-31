import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailVerification() {
  const { user, resendEmailVerification, logout } = useAuth();
  const [isResending, setIsResending] = useState(false);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await resendEmailVerification();
    } catch {
      toast.error('Failed to send verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center p-4 sm:p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Verify Your Email</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 text-center space-y-4">
            <p className="text-slate-600">
              We’ve sent a verification email to:
            </p>
            <p className="font-semibold text-slate-900 bg-slate-100 p-2 rounded">
              {user?.email}
            </p>
            <p className="text-sm text-slate-500">
              Please check your email and click the verification link to continue.
            </p>
            
            <div className="space-y-3 pt-4">
              <Button 
                onClick={handleRefresh} 
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                I’ve Verified My Email
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={logout}
                className="w-full text-slate-600"
              >
                Sign Out
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-xs text-slate-500">
                Didn’t receive the email? Check your spam folder or try resending.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
