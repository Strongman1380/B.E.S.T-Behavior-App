import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Eye, EyeOff, Mail, Lock, User, Chrome } from 'lucide-react';
import { toast } from 'sonner';

export default function SignUp({ onToggleMode }) {
  const { signUp, signInWithGoogle } = useAuth();
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      toast.error('Please enter your full name');
      return false;
    }
    
    if (!formData.email) {
      toast.error('Please enter your email');
      return false;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signUp(formData.email, formData.password, formData.displayName);
      // Success message is handled in the auth context
    } catch (error) {
      let errorMessage = 'Failed to create account';
      
      // Handle Supabase error messages
      if (error.message) {
        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Invalid email address';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password is too weak';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Note: For OAuth redirect, user will be redirected and success will be handled on return
    } catch (error) {
      let errorMessage = 'Failed to sign up with Google';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
          <p className="text-slate-600">Join Bright Track to get started</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-center text-lg sm:text-xl">Sign Up</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
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
                <p className="text-xs text-slate-500">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignUp}
              className="w-full h-11"
              disabled={loading}
            >
              <Chrome className="w-4 h-4 mr-2" />
              Google
            </Button>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <button
                  onClick={onToggleMode}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}