/* eslint react-refresh/only-export-components: off */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase is properly configured
    const isSupabaseConfigured = supabase && 
                                import.meta.env.VITE_SUPABASE_URL && 
                                import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!isSupabaseConfigured) {
      if (import.meta.env.DEV) {
        // Development/demo mode only
        console.log('Using demo mode - bypassing Supabase authentication (DEV only)');
        const mockUser = {
          id: 'demo-user-123',
          email: 'demo@brighttrack.local',
          user_metadata: { 
            full_name: 'Demo User',
            avatar_url: null 
          },
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: 'demo' }
        };
        setUser(mockUser);
      } else {
        console.warn('Supabase not configured in production - showing login screen');
        setUser(null);
      }
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Email/Password Sign Up
  const signUp = async (email, password, displayName) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
          }
        }
      });

      if (error) throw error;

      toast.success('Account created! Please check your email to verify your account.');
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  // Email/Password Sign In
  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Successfully signed in!');
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Google Sign In
  const signInWithGoogle = async () => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;

      // Note: For OAuth, the success toast will be shown after redirect
      return data;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  // Sign Out
  const logout = async () => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Successfully signed out!');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Reset Password
  const resetPassword = async (email) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
