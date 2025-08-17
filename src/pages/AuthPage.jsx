import { useState } from 'react';
import Login from '../components/auth/Login';
import SignUp from '../components/auth/SignUp';
import { Toaster } from 'sonner';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      {isSignUp ? (
        <SignUp onToggleMode={toggleMode} />
      ) : (
        <Login onToggleMode={toggleMode} />
      )}
    </>
  );
}