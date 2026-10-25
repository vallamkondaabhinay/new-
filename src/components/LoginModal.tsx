import React, { useState } from 'react';
import { Sparkles, Lock, Mail, KeyRound, ArrowRight, User, Building, Phone } from 'lucide-react';
import { api, setStoredToken } from '../services/api.ts';
import { signInWithGoogle } from '../services/firebaseAuth.ts';
import { Owner, SalonSettings } from '../types/salon.ts';

interface LoginModalProps {
  onLoginSuccess: (owner: Owner, salon: SalonSettings) => void;
}

type AuthMode = 'login' | 'register' | 'reset';

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Sign In states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register states
  const [regName, setRegName] = useState('');
  const [regSalonName, setRegSalonName] = useState('Gild & Glow Luxury Lounge');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({ email, password });
      if (res.token) {
        setStoredToken(res.token);
        onLoginSuccess(res.owner, res.salon);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.register({
        name: regName,
        businessName: regSalonName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
      });
      if (res.token) {
        setStoredToken(res.token);
        onLoginSuccess(res.owner, res.salon);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { user } = await signInWithGoogle();
      if (!user.email) {
        throw new Error('Google account does not have an associated email address.');
      }
      const res = await api.googleLogin({
        email: user.email,
        name: user.displayName,
      });
      if (res.token) {
        setStoredToken(res.token);
        onLoginSuccess(res.owner, res.salon);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completion.');
      } else {
        setError(err.message || 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({ email: 'meera@gildandglow.com', password: 'SalonOwner@2026' });
      if (res.token) {
        setStoredToken(res.token);
        onLoginSuccess(res.owner, res.salon);
      }
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.resetPassword({
        email: resetEmail,
        phone: resetPhone,
        newPassword,
      });
      setResetSuccessMessage(res.message);
      setTimeout(() => {
        setMode('login');
        setResetSuccessMessage(null);
        setEmail(resetEmail);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-[#2E0A28] items-center justify-center text-[#DFB76C] shadow-lg border border-[#C59A45]/40 mb-3">
          <Sparkles className="w-8 h-8 text-[#DFB76C]" />
        </div>
        <h1 className="font-serif-luxury text-4xl font-bold text-[#2E0A28] tracking-tight">
          Gild & Glow
        </h1>
        <p className="text-sm text-[#6F5B6A] max-w-sm mx-auto mt-1">
          Salon & Beauty Parlour ERP
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E8DEC8] p-8">
        {/* Navigation Tabs between Sign In and Create Account */}
        {mode !== 'reset' && (
          <div className="flex border-b border-[#E8DEC8] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'border-[#2E0A28] text-[#2E0A28]'
                  : 'border-transparent text-[#8C7A87] hover:text-[#2E0A28]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-all cursor-pointer ${
                mode === 'register'
                  ? 'border-[#2E0A28] text-[#2E0A28]'
                  : 'border-transparent text-[#8C7A87] hover:text-[#2E0A28]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* 1. SIGN IN MODE */}
        {mode === 'login' && (
          <div>
            <div className="mb-5">
              <h2 className="font-serif-luxury text-2xl font-bold text-[#2E0A28]">
                Owner Sign In
              </h2>
              <p className="text-xs text-[#6F5B6A] mt-0.5">
                Access your salon dashboard with Google or email credentials.
              </p>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-[#D8CCC4] bg-white hover:bg-[#FAF8F5] text-[#2E0A28] text-sm font-medium shadow-sm transition-all flex items-center justify-center space-x-3 hover:border-[#C59A45] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? 'Signing in with Google...' : 'Sign In with Google'}</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8DEC8]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-[#8C7A87]">or sign in with password</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C7A87] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@gildandglow.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#2E0A28]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setResetEmail(email);
                      setError(null);
                    }}
                    className="text-[11px] text-[#8C6826] hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C7A87] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-[#2E0A28] text-[#FAF8F5] text-sm font-semibold hover:bg-[#3E1137] active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 text-[#DFB76C]" />
              </button>
            </form>

            {/* Prompt to Create an Account */}
            <div className="mt-5 pt-4 border-t border-[#E8DEC8] text-center">
              <p className="text-xs text-[#6F5B6A]">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-semibold text-[#8C6826] hover:underline"
                >
                  Create an Account
                </button>
              </p>
            </div>

            {/* Instant Demo Access Helper for Reviewers & New Visitors */}
            <div className="mt-4 p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#2E0A28] flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#C59A45]" />
                  <span>No account yet? Try Demo Mode</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready to test
                </span>
              </div>
              <p className="text-[11px] text-[#6F5B6A]">
                Explore all POS billing, appointments, staff & analytics with pre-configured salon data in 1 click:
              </p>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading || googleLoading}
                className="w-full py-2 px-3 rounded-lg bg-[#2E0A28] hover:bg-[#3E1137] text-[#DFB76C] text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>1-Click Sign In as Demo Salon Owner</span>
                <ArrowRight className="w-3 h-3 text-[#DFB76C]" />
              </button>
              <div className="text-[10px] text-[#8C7A87] font-mono bg-white p-1.5 rounded border border-[#E8DEC8]">
                Owner: <span className="text-[#2E0A28]">meera@gildandglow.com</span> | Pass: <span className="text-[#2E0A28]">SalonOwner@2026</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. CREATE ACCOUNT MODE */}
        {mode === 'register' && (
          <div>
            <div className="mb-5">
              <h2 className="font-serif-luxury text-2xl font-bold text-[#2E0A28]">
                Create Owner Account
              </h2>
              <p className="text-xs text-[#6F5B6A] mt-0.5">
                Register your salon to start managing appointments, billing & retention.
              </p>
            </div>

            {/* Google Sign-Up Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-[#D8CCC4] bg-white hover:bg-[#FAF8F5] text-[#2E0A28] text-sm font-medium shadow-sm transition-all flex items-center justify-center space-x-3 hover:border-[#C59A45] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? 'Creating with Google...' : 'Sign Up with Google (1-Click)'}</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8DEC8]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-[#8C7A87]">or fill account details</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8C7A87] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Abhi V."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Salon or Parlour Name *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-[#8C7A87] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={regSalonName}
                    onChange={(e) => setRegSalonName(e.target.value)}
                    placeholder="e.g. Gild & Glow Luxury Lounge"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Email Address * (Login ID)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C7A87] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8C7A87] absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Password * (Min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C7A87] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 rounded-xl bg-[#2E0A28] text-[#FAF8F5] text-sm font-semibold hover:bg-[#3E1137] active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account & Launch ERP'}</span>
                <ArrowRight className="w-4 h-4 text-[#DFB76C]" />
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-[#E8DEC8] text-center">
              <p className="text-xs text-[#6F5B6A]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-semibold text-[#8C6826] hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        )}

        {/* 3. RESET PASSWORD MODE */}
        {mode === 'reset' && (
          <div>
            <div className="mb-6">
              <h2 className="font-serif-luxury text-2xl font-bold text-[#2E0A28]">
                Reset Password
              </h2>
              <p className="text-xs text-[#6F5B6A] mt-0.5">
                Verify your registered account details to set a new password.
              </p>
            </div>

            {resetSuccessMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {resetSuccessMessage}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Registered Email
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="owner@gildandglow.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D8CCC4] text-xs focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Owner Phone (for verification)
                </label>
                <input
                  type="text"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D8CCC4] text-xs focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D8CCC4] text-xs focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs text-[#6F5B6A] hover:underline"
                >
                  Back to Sign In
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[#2E0A28] text-[#FAF8F5] text-xs font-semibold hover:bg-[#3E1137]"
                >
                  {loading ? 'Resetting...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
