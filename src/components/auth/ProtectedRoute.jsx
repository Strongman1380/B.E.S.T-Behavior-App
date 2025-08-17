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
  const isEmailUser = user.providerData?.some(provider => provider.providerId === 'password');
  if (isEmailUser && !user.emailVerified) {
    return <EmailVerification />;
  }

  return children;
}