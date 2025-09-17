import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Eye, EyeOff, Mail, Lock, Chrome } from 'lucide-react';
import { toast } from 'sonner';

export default function Login({ onToggleMode }) {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  
  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  
  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      let errorMessage = 'Failed to sign in';
      
      // Handle Supabase error messages
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many failed attempts. Please try again later';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Note: For OAuth redirect, user will be redirected and success will be handled on return
    } catch (error) {
      let errorMessage = 'Failed to sign in with Google';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      await resetPassword(resetEmail);
      setShowResetForm(false);
      setResetEmail('');
    } catch (error) {
      let errorMessage = 'Failed to send reset email';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-600">Sign in to your Bright Track account</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-center text-lg sm:text-xl">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-4">
              {!showResetForm ? (
                <>
                  {/* Google Sign In Button - Primary Option */}
                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full h-12 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    disabled={loading}
                  >
                    <Chrome className="w-5 h-5 mr-3" />
                    {loading ? 'Signing in...' : 'Continue with Google'}
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-500">Or sign in with email</span>
                    </div>
                  </div>

                  {/* Email/Password Form */}
                  <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="pl-10 pr-10 h-11"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-11" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowResetForm(true)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">Email</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="h-11"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full h-11">
                    Send Reset Email
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowResetForm(false)}
                      className="text-sm text-slate-600 hover:text-slate-800"
                    >
                      Back to sign in
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <button
                  onClick={onToggleMode}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Sign up
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}