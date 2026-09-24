import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { authService } from '../../services/authService';

export const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoNotice, setSsoNotice] = useState(false);

  const navigate = useNavigate();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      const pendingInvToken = sessionStorage.getItem('pending_invitation_token');
      if (pendingInvToken) {
        navigate(`/invite/${pendingInvToken}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const trimmedEmail = email.trim();

    try {
      await authService.register({ username, email: trimmedEmail, password });
      setSuccess('Registration successful! Redirecting to login...');
      setUsername('');
      setEmail('');
      setPassword('');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialClick = () => {
    setSsoNotice(true);
    setTimeout(() => setSsoNotice(false), 3500);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-[#27F087] selection:text-slate-950 relative">
      {/* Top Header Link: Back to Home */}
      <div className="max-w-[400px] w-full mx-auto flex items-center justify-between pt-1 sm:pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors px-3 py-1 rounded-full hover:bg-slate-200/70"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sify Workforce</span>
        </Link>
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-[400px] mx-auto my-auto py-4">
        <div className="bg-white rounded-[26px] border border-slate-200/80 shadow-xl shadow-slate-200/60 overflow-hidden transition-all">
          {/* Card Body */}
          <div className="p-6 sm:p-7 space-y-4">
            {/* Top Brand Logo Squircle */}
            <div className="flex justify-center pt-1">
              <div className="w-12 h-12 rounded-[18px] bg-slate-950 flex items-center justify-center shadow-md shadow-slate-900/15 transition-transform hover:scale-105">
                <div className="w-7 h-7 rounded-lg bg-[#27F087] flex items-center justify-center text-slate-950 font-black text-xs">
                  SW
                </div>
              </div>
            </div>

            {/* Header Text */}
            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-[22px] font-bold text-slate-950 font-display tracking-tight">
                Create your account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Register a new company account
              </p>
            </div>

            {/* SSO Notification banner */}
            {ssoNotice && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 text-center animate-fadeIn">
                Enterprise SSO will connect to your company identity provider once configured.
              </div>
            )}

            {/* Social / OAuth Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSocialClick}
                className="w-full h-11 flex items-center justify-center gap-2.5 px-4 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50/80 hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Divider "or" */}
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-200/90 w-full" />
              <span className="bg-white px-3 text-xs text-slate-400 font-normal">or</span>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 text-left">{error}</div>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm space-y-2 text-center animate-fadeIn">
                <div className="flex items-center justify-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{success}</span>
                </div>
                <div>
                  <Link to="/login" className="text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1">
                    <span>Go to Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Form with Proper Curved Inputs & Button */}
            {!success && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="space-y-1">
                  <label htmlFor="username" className="block text-xs sm:text-[13px] font-medium text-slate-700">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    required
                    minLength={3}
                    placeholder="Enter your username"
                    className="w-full h-11 rounded-xl border border-slate-200/90 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="block text-xs sm:text-[13px] font-medium text-slate-700">
                    Company Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="Enter your company email"
                    className="w-full h-11 rounded-xl border border-slate-200/90 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className="block text-xs sm:text-[13px] font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      className="w-full h-11 rounded-xl border border-slate-200/90 bg-white px-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 focus:outline-none"
                      aria-label={showPassword ? 'Hide value' : 'Show value'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-1 bg-[#1E232E] hover:bg-[#151821] active:scale-[0.99] text-white font-medium px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 text-sm disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <span>Register</span>
                      <ChevronRight className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Card Bottom Segment (Clerk Style) */}
          <div className="bg-slate-50/90 border-t border-slate-100 px-6 py-4 text-center text-xs sm:text-[13px] text-slate-600">
            <span>Already have an account? </span>
            <Link to="/login" className="text-slate-950 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>

        {/* Outer Trust Footer */}
        <div className="mt-5 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Secured by</span>
            <span className="font-bold text-slate-900 tracking-tight flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-[#27F087] flex items-center justify-center text-slate-950 font-black text-[9px]">
                SW
              </span>
              Sify Workforce
            </span>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-4" />
    </div>
  );
};
