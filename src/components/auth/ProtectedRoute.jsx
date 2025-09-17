import { useAuth } from '../../contexts/AuthContext';
import AuthPage from '../../pages/AuthPage';
import EmailVerification from './EmailVerification';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Check if user signed up with email/password and hasn't verified their email
  // Note: Supabase handles email verification differently - users can sign in even without verification
  // but we can check if they used email/password vs OAuth
  const isEmailUser = user.app_metadata?.provider === 'email';
  if (isEmailUser && !user.email_confirmed_at) {
    return <EmailVerification />;
  }

  return children;
}