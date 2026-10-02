import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  GraduationCap,
  UserCheck,
  User,
  Lock,
  Mail,
  Building2,
  Briefcase,
  Phone,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  IdCard,
  Key
} from 'lucide-react';
import dhruvLogo from '../assets/dhruv_logo.png';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, registerResearcher, googleLogin } = useAuth();

  // Mode: 'normal_user' | 'researcher' | 'admin'
  const [activeTab, setActiveTab] = useState('researcher');
  
  // Researcher view: 'login' | 'register'
  const [researcherMode, setResearcherMode] = useState('register');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Researcher Registration Form (9 fields)
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    institution: '',
    designation: '',
    research_area: '',
    researcher_id: '',
    phone_number: '',
  });

  // Login Form (Email / Password)
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  // Custom Google User modal / fast login inputs
  const [googleForm, setGoogleForm] = useState({
    name: 'Dr. Polar Explorer',
    email: 'explorer@gmail.com',
  });
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleRegChange = (e) => {
    setRegForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLoginChange = (e) => {
    setLoginForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Submit Researcher Registration
  const handleResearcherRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (regForm.password !== regForm.confirm_password) {
      setError('Password and Confirm Password do not match.');
      setLoading(false);
      return;
    }

    try {
      await registerResearcher(regForm);
      setSuccessMsg(
        'Researcher account registered successfully! Your account is pending Admin approval for social media publishing. You can now log in.'
      );
      // Auto fill login form with newly registered credentials
      setLoginForm({
        email: regForm.email,
        password: regForm.password,
      });
      setResearcherMode('login');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Registration failed. Please check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Submit Standard Login (Researcher or Admin)
  const handleStandardLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await login(loginForm.email, loginForm.password);
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Login failed. Please verify your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Seed Admin Login
  const handleSeedAdminLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login('admin@ncpor.gov.in', 'admin123');
      navigate('/dashboard');
    } catch (err) {
      setError('Seed Admin login failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In — uses real Firebase Auth popup
  const handleGoogleSignIn = async (emailParam, nameParam) => {
    setLoading(true);
    setError(null);
    try {
      // If explicit email/name provided (custom form), use the mock flow
      if (emailParam && nameParam) {
        await googleLogin({
          email: emailParam,
          name: nameParam,
          avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        });
        navigate('/');
        return;
      }

      // Real Firebase Google Sign-In popup
      const { signInWithPopup } = await import('firebase/auth');
      const { auth, googleProvider } = await import('../utils/firebase');
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      await googleLogin({
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        avatar_url: firebaseUser.photoURL || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      });
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google Sign-In cancelled. Please try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google Sign-In. Please add localhost to Firebase Console → Authentication → Settings → Authorized domains.');
      } else {
        setError('Google Sign-In failed: ' + (err.response?.data?.detail || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-ncpor-bg py-10 px-4 sm:px-6 flex items-center justify-center relative overflow-hidden">
      {/* Glow Orbs background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-600/10 blur-[90px] rounded-full pointer-events-none" />

      <div className="max-w-3xl w-full bg-ncpor-panel/90 backdrop-blur-xl border border-ncpor-divider rounded-2xl shadow-2xl p-6 sm:p-10 relative z-10 transition-all duration-300">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-cyan-500/20 border border-ncpor-accent/30 p-1 bg-ncpor-elevated">
              <img src={dhruvLogo} alt="DhruvKosh Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <h1 className="font-display font-extrabold text-2xl text-ncpor-primary tracking-wide flex items-center gap-2">
                DhruvKosh Auth Portal
                <span className="text-xs px-2 py-0.5 rounded-full bg-ncpor-accent/15 text-ncpor-accent border border-ncpor-accent/30 font-mono">
                  Role-Based
                </span>
              </h1>
              <p className="text-xs text-ncpor-muted">National Centre for Polar and Ocean Research</p>
            </div>
          </div>
          <p className="text-sm text-ncpor-secondary max-w-md mx-auto">
            Select your access role below to register, log in, or authenticate with Google Sign-In.
          </p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Top Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-ncpor-elevated/70 border border-ncpor-divider rounded-xl mb-8">
          <button
            type="button"
            onClick={() => {
              setActiveTab('researcher');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'researcher'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 font-semibold'
                : 'text-ncpor-muted hover:text-ncpor-primary hover:bg-ncpor-panel/50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Researcher</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('normal_user');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'normal_user'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 font-semibold'
                : 'text-ncpor-muted hover:text-ncpor-primary hover:bg-ncpor-panel/50'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Normal User (Google)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-500/20 font-semibold'
                : 'text-ncpor-muted hover:text-ncpor-primary hover:bg-ncpor-panel/50'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Admin (Seed)</span>
          </button>
        </div>

        {/* TAB 1: RESEARCHER AUTH (Login or Register with 9 fields) */}
        {activeTab === 'researcher' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Toggle Login vs Register */}
            <div className="flex items-center justify-between border-b border-ncpor-divider pb-4">
              <div>
                <h2 className="text-lg font-bold text-ncpor-primary flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-ncpor-accent" />
                  {researcherMode === 'register' ? 'Register as Researcher' : 'Researcher Login'}
                </h2>
                <p className="text-xs text-ncpor-muted mt-0.5">
                  {researcherMode === 'register'
                    ? 'Enter your institutional details below to request researcher access'
                    : 'Log in with your registered researcher email & password'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResearcherMode(researcherMode === 'register' ? 'login' : 'register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-semibold text-ncpor-accent hover:underline flex items-center gap-1 bg-ncpor-accent/10 px-3 py-1.5 rounded-lg border border-ncpor-accent/20"
              >
                {researcherMode === 'register' ? 'Already registered? Login' : 'New Researcher? Register'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Researcher Registration Form */}
            {researcherMode === 'register' && (
              <form onSubmit={handleResearcherRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                      <input
                        type="text"
                        name="name"
                        value={regForm.name}
                        onChange={handleRegChange}
                        required
                        placeholder="Dr. Rajesh Sharma"
                        className="w-full pl-9 pr-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                      />
                    </div>
                  </div>

                  {/* 2. Email */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                      <input
                        type="email"
                        name="email"
                        value={regForm.email}
                        onChange={handleRegChange}
                        required
                        placeholder="researcher@ncpor.res.in"
                        className="w-full pl-9 pr-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                      />
                    </div>
                  </div>

                  {/* 3. Password */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                      <input
                        type="password"
                        name="password"
                        value={regForm.password}
                        onChange={handleRegChange}
                        required
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                      />
                    </div>
                  </div>

                  {/* 4. Confirm Password */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                      <input
                        type="password"
                        name="confirm_password"
                        value={regForm.confirm_password}
                        onChange={handleRegChange}
                        required
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                      />
                    </div>
                  </div>

                  {/* 5. Institution / Organization */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                      Institution / Organization <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                      <input
                        type="text"
                        name="institution"
                        value={regForm.institution}
                        onChange={handleRegChange}
                        required
                        placeholder="NCPOR / IIT / IISc / MoES"
                        className="w-full pl-9 pr-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                      />
                    </div>
                  </div>

                  {/* 6. Designation */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                      Designation <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                      <input
                        type="text"
                        name="designation"
                        value={regForm.designation}
                        onChange={handleRegChange}
                        required
                        placeholder="Senior Scientist / Professor"
                        className="w-full pl-9 pr-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                      />
                    </div>
                  </div>

                  {/* 7. Research Area */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                      Research Area <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <FlaskConical className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                      <input
                        type="text"
                        name="research_area"
                        value={regForm.research_area}
                        onChange={handleRegChange}
                        required
                        placeholder="Polar Oceanography / Glaciology"
                        className="w-full pl-9 pr-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                      />
                    </div>
                  </div>

                  {/* 8. Researcher / Employee ID */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                      Researcher / Employee ID <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <IdCard className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                      <input
                        type="text"
                        name="researcher_id"
                        value={regForm.researcher_id}
                        onChange={handleRegChange}
                        required
                        placeholder="RES-4091 / EMP-102"
                        className="w-full pl-9 pr-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                      />
                    </div>
                  </div>

                  {/* 9. Phone Number */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                      <input
                        type="tel"
                        name="phone_number"
                        value={regForm.phone_number}
                        onChange={handleRegChange}
                        required
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-200 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <GraduationCap className="w-5 h-5" />
                        <span>Register as Researcher</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-ncpor-muted text-center mt-2">
                    Note: After registration, Admin approval is required before you can post content across social media platforms.
                  </p>
                </div>
              </form>
            )}

            {/* Researcher Login Form */}
            {researcherMode === 'login' && (
              <form onSubmit={handleStandardLogin} className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                    Researcher Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                    <input
                      type="email"
                      name="email"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      required
                      placeholder="dr.sharma@ncpor.gov.in"
                      className="w-full pl-9 pr-3 py-2.5 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ncpor-secondary mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-ncpor-muted absolute left-3 top-3" />
                    <input
                      type="password"
                      name="password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      required
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-sm text-ncpor-primary focus:outline-none focus:border-ncpor-accent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-200 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Log In as Researcher</span>
                  )}
                </button>

                <div className="p-3 rounded-lg bg-ncpor-elevated/60 border border-ncpor-divider text-xs text-ncpor-secondary space-y-1">
                  <p className="font-semibold text-ncpor-accent flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" /> Demo Researcher Accounts:
                  </p>
                  <p className="font-mono text-[11px] text-ncpor-muted">
                    • Approved Researcher: <span className="text-emerald-400">dr.sharma@ncpor.gov.in / researcher123</span>
                  </p>
                  <p className="font-mono text-[11px] text-ncpor-muted">
                    • Pending Researcher: <span className="text-amber-400">ananya.patel@ncpor.gov.in / researcher123</span>
                  </p>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: NORMAL USER (Google Sign In) */}
        {activeTab === 'normal_user' && (
          <div className="space-y-6 text-center py-4 animate-fadeIn max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <UserCheck className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-ncpor-primary mb-1">Normal User Sign-In</h2>
              <p className="text-xs text-ncpor-muted">
                Normal users sign in using Google Auth to access datasets, research publications, and interactive polar guides.
              </p>
            </div>

            {/* Prominent Google Sign In Button */}
            <div className="p-6 bg-ncpor-elevated/70 rounded-2xl border border-ncpor-divider space-y-4 shadow-xl">
              <button
                type="button"
                onClick={() => handleGoogleSignIn()}
                disabled={loading}
                className="w-full py-3.5 px-6 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl shadow-lg border border-slate-200 transition-all duration-200 active:scale-95 flex items-center justify-center gap-3 text-sm group"
              >
                {/* Official Google G Logo */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
                <span>Continue with Google Sign-In</span>
              </button>

              <div className="flex items-center gap-2 my-2 text-[11px] text-ncpor-muted">
                <div className="h-[1px] flex-1 bg-ncpor-divider" />
                <span>or custom Google account</span>
                <div className="h-[1px] flex-1 bg-ncpor-divider" />
              </div>

              {!showGoogleModal ? (
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  className="text-xs text-ncpor-accent hover:underline font-medium"
                >
                  Enter custom Google name &amp; email
                </button>
              ) : (
                <div className="space-y-3 text-left pt-2">
                  <div>
                    <label className="block text-[11px] text-ncpor-secondary mb-1">Google User Name</label>
                    <input
                      type="text"
                      value={googleForm.name}
                      onChange={(e) => setGoogleForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-ncpor-bg border border-ncpor-divider rounded text-xs text-ncpor-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-ncpor-secondary mb-1">Google Email</label>
                    <input
                      type="email"
                      value={googleForm.email}
                      onChange={(e) => setGoogleForm((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-ncpor-bg border border-ncpor-divider rounded text-xs text-ncpor-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGoogleSignIn(googleForm.email, googleForm.name)}
                    className="w-full py-2 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500"
                  >
                    Sign In with Google Account
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN PORTAL (Seeded) */}
        {activeTab === 'admin' && (
          <div className="space-y-6 animate-fadeIn max-w-md mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-ncpor-primary">Admin System Portal</h2>
              <p className="text-xs text-ncpor-muted mt-1">
                Admins approve registered researchers, grant social media posting rights, and manage portal contents.
              </p>
            </div>

            {/* SEEDED CREDENTIALS PROMINENT CARD */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-900/10 to-transparent border border-amber-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono tracking-widest uppercase border border-amber-500/30">
                Seed Account
              </div>

              <h3 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Admin Seed Credentials:
              </h3>

              <div className="bg-ncpor-bg/80 p-3 rounded-xl border border-amber-500/20 text-xs font-mono space-y-1.5 mb-4">
                <div className="flex justify-between">
                  <span className="text-ncpor-muted">Admin Email:</span>
                  <span className="text-amber-200 font-bold">admin@ncpor.gov.in</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ncpor-muted">Seed Password:</span>
                  <span className="text-amber-200 font-bold">admin123</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSeedAdminLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>1-Click Login as Seed Admin</span>
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleStandardLogin} className="space-y-3 pt-2">
              <p className="text-xs text-ncpor-muted text-center font-medium">Or enter admin credentials manually:</p>
              <div>
                <input
                  type="email"
                  name="email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  placeholder="admin@ncpor.gov.in"
                  className="w-full px-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-xs text-ncpor-primary"
                />
              </div>
              <div>
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  placeholder="admin123"
                  className="w-full px-3 py-2 bg-ncpor-elevated border border-ncpor-divider rounded-lg text-xs text-ncpor-primary"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-ncpor-elevated hover:bg-ncpor-panel text-ncpor-secondary text-xs rounded-lg border border-ncpor-divider font-medium"
              >
                Manual Admin Log In
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
