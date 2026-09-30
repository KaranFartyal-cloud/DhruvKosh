import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import dhruvLogo from '../assets/dhruv_logo.png';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Threads from '../components/Threads';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, googleSignIn, firebaseGoogleSignIn } = useAuth();
  const { isLight } = useTheme();
  
  const isSignupRoute = location.pathname === '/signup';
  const [isLogin, setIsLogin] = useState(!isSignupRoute);

  useEffect(() => {
    setIsLogin(location.pathname !== '/signup');
  }, [location.pathname]);

  const handleTabSwitch = (loginMode) => {
    setIsLogin(loginMode);
    navigate(loginMode ? '/login' : '/signup', { replace: true });
    setError(null);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shake, setShake] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    remember: false,
    terms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getStrength = (pw) => {
    if (!pw) return { label: '', color: 'bg-transparent', w: 'w-0' };
    if (pw.length < 8) return { label: 'Weak', color: 'bg-red-500', w: 'w-1/3' };
    if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { label: 'Strong', color: 'bg-green-500', w: 'w-full' };
    return { label: 'Fair', color: 'bg-yellow-500', w: 'w-2/3' };
  };
  const strength = getStrength(formData.password);

  const validate = () => {
    if (!formData.email.includes('@')) return "Invalid email address.";
    if (formData.password.length < 8) return "Password must be at least 8 characters.";
    if (!isLogin && formData.password !== formData.confirmPassword) return "Passwords do not match.";
    if (!isLogin && !formData.name) return "Name is required.";
    if (!isLogin && !formData.terms) return "You must accept the terms.";
    return null;
  };

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (failedAttempts >= 5) {
      triggerError("Too many failed attempts. Please try again later.");
      return;
    }
    const valError = validate();
    if (valError) {
      triggerError(valError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        // AuthContext.login() saves token + user and navigates to '/'
        await login(formData.email, formData.password);
      } else {
        await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'viewer'
        });
        handleTabSwitch(true);
        triggerError('Account created! Please sign in.');
        setLoading(false);
      }
    } catch (err) {
      setFailedAttempts(p => p + 1);
      const msg = err.response?.data?.detail ||
        (isLogin ? 'Incorrect email or password.' : 'Registration failed. Email may already be in use.');
      triggerError(msg);
      setLoading(false);
    }
  };

  const handleFirebaseGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseGoogleSignIn();
      // On success, AuthContext navigates to '/' automatically
    } catch (err) {
      console.error('Firebase Google Auth error:', err);
      // Handle common Firebase popup errors gracefully
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        triggerError('Sign-in cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        triggerError('Popup was blocked by your browser. Please allow popups for this site.');
      } else {
        const msg = err.response?.data?.detail || err.message || 'Google sign-in failed.';
        triggerError(msg);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-ncpor-bg text-ncpor-primary font-sans">

      {/* Brand Panel */}
      <div className={`md:w-[52%] w-full relative overflow-hidden flex flex-col justify-between p-8 md:p-12 animate-fade-in md:min-h-screen transition-colors duration-500 ${
        isLight
          ? 'bg-gradient-to-br from-[#EEF4FB] via-[#E2EDF8] to-[#D5E3F2] text-[#0B1B33]'
          : 'bg-gradient-to-br from-[#05080F] via-[#09101C] to-[#0D1422] text-white'
      }`}>
        {/* Dynamic React Bits <Threads /> Interactive Background */}
        <div className="absolute inset-0 z-0 pointer-events-auto opacity-75">
          <Threads
            color={isLight ? [0.04, 0.49, 0.55] : [0.50, 0.91, 0.96]}
            amplitude={1.2}
            distance={0.12}
            enableMouseInteraction={true}
          />
        </div>

        {/* Ambient Polar Mist / Radial Vignette */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: isLight
              ? 'radial-gradient(circle at 30% 20%, rgba(10, 124, 140, 0.06) 0%, rgba(255, 255, 255, 0.35) 70%, transparent 100%)'
              : 'radial-gradient(circle at 30% 20%, rgba(127, 231, 245, 0.08) 0%, rgba(5, 8, 15, 0.5) 70%, transparent 100%)',
          }}
        />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-8 w-fit group">
            <img src={dhruvLogo} alt="DhruvKosh" className="w-12 h-12 transition-transform duration-300 group-hover:scale-105" />
            <div>
              <h1 className={`text-2xl font-display font-bold tracking-wider ${isLight ? 'text-[#0B1B33]' : 'text-white'}`}>DhruvKosh</h1>
              <p className={`text-[10px] tracking-widest uppercase font-semibold ${isLight ? 'text-[#0A7C8C]' : 'text-[#7FE7F5]'}`}>NCPOR</p>
            </div>
          </Link>
          <div className="hidden md:block mt-20">
            <h2 className={`text-4xl lg:text-5xl font-display font-medium mb-4 leading-tight overflow-hidden ${isLight ? 'text-[#0B1B33]' : 'text-white'}`}>
              <span className="block animate-slide-up-mask stagger-1">Every station.</span>
              <span className={`block animate-slide-up-mask stagger-2 ${isLight ? 'text-[#0A7C8C]' : 'text-[#7FE7F5]'}`}>Every record.</span>
            </h2>
            <p className={`max-w-md animate-fade-in stagger-3 text-sm md:text-base leading-relaxed ${isLight ? 'text-[#4A5D73]' : 'text-gray-400'}`}>
              Sign in to the National Polar & Ocean Research Knowledge Platform.
            </p>
          </div>
        </div>

        <div className={`relative z-10 hidden md:block text-xs font-mono animate-fade-in stagger-4 ${isLight ? 'text-[#66758C]' : 'text-gray-500'}`}>
          NCPOR • Ministry of Earth Sciences, Govt. of India
        </div>
      </div>

      {/* Auth Panel */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative bg-ncpor-bg z-20 overflow-y-auto">
        <div className={`w-full max-w-[440px] p-8 md:p-10 rounded-2xl transition-all duration-300 ${shake ? 'animate-shake' : ''} opacity-100 scale-100 animate-card-rise ${isLight ? 'bg-white shadow-[0_8px_30px_rgba(10,124,140,0.12)] border-gray-100' : 'bg-ncpor-surface border border-ncpor-divider/50 backdrop-blur-md shadow-2xl'}`}>
          
          <div className="flex bg-ncpor-elevated rounded-lg p-1 mb-8 relative border border-ncpor-divider">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-ncpor-bg rounded-md shadow-sm border border-ncpor-divider transition-all duration-300 ease-out ${isLogin ? 'left-1' : 'left-[calc(50%+3px)]'}`} />
            <button type="button" onClick={() => handleTabSwitch(true)} className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors ${isLogin ? 'text-ncpor-primary' : 'text-ncpor-muted hover:text-ncpor-secondary'}`}>Login</button>
            <button type="button" onClick={() => handleTabSwitch(false)} className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors ${!isLogin ? 'text-ncpor-primary' : 'text-ncpor-muted hover:text-ncpor-secondary'}`}>Register</button>
          </div>

                      {/* Firebase Google Sign-In Button */}
              <button
                type="button"
                onClick={handleFirebaseGoogleSignIn}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border font-medium text-sm transition-all duration-200 active:scale-[0.98] mb-6 ${
                  isLight
                    ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                    : 'bg-ncpor-elevated border-ncpor-divider text-ncpor-primary hover:bg-ncpor-surface'
                } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-ncpor-accent/30 border-t-ncpor-accent rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>
          
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-ncpor-divider" />
            <span className="text-xs text-ncpor-muted uppercase tracking-wider">or continue with email</span>
            <div className="flex-1 h-px bg-ncpor-divider" />
          </div>

          <div className="relative overflow-hidden transition-all duration-300" style={{ height: isLogin ? '260px' : '460px' }}>
            <div className={`absolute inset-0 w-full transition-all duration-300 ease-out flex flex-col gap-4 ${isLogin ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-8 pointer-events-none'}`}>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative group">
                  <input type="email" name="email" id="email-login" value={formData.email} onChange={handleChange} required autoComplete="email" className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-3 pt-5 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Email" />
                  <label htmlFor="email-login" className="absolute left-4 top-1.5 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Email</label>
                  {formData.email.includes('@') && <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-4 top-4 animate-draw-check" />}
                </div>

                <div className="relative group">
                  <input type={showPassword ? 'text' : 'password'} name="password" id="password-login" value={formData.password} onChange={handleChange} required autoComplete="current-password" className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-3 pt-5 pr-10 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Password" />
                  <label htmlFor="password-login" className="absolute left-4 top-1.5 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Password</label>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-ncpor-muted hover:text-ncpor-accent transition-colors" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" name="remember" checked={formData.remember} onChange={handleChange} className="w-4 h-4 rounded border-ncpor-divider text-ncpor-accent focus:ring-ncpor-accent focus:ring-offset-ncpor-bg bg-ncpor-bg" />
                    <span className="text-xs text-ncpor-secondary group-hover:text-ncpor-primary transition-colors">Remember me</span>
                  </label>
                  <button type="button" className="text-xs text-ncpor-accent hover:text-cyan-400 hover:underline transition-colors">Forgot password?</button>
                </div>

                <button type="submit" disabled={loading} className="w-full mt-2 bg-ncpor-accent text-[#05080F] font-semibold py-2.5 rounded-lg hover:bg-cyan-400 transition-all active:scale-[0.98] flex items-center justify-center h-10 sweep-hover relative overflow-hidden">
                  <span className="relative z-10">{loading ? <div className="w-5 h-5 border-2 border-[#05080F]/30 border-t-[#05080F] rounded-full animate-spin" /> : 'Sign in'}</span>
                </button>
              </form>
            </div>

            <div className={`absolute inset-0 w-full transition-all duration-300 ease-out flex flex-col gap-4 ${!isLogin ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-8 pointer-events-none'}`}>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="relative group">
                  <input type="text" name="name" id="name-reg" value={formData.name} onChange={handleChange} required autoComplete="name" className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-2.5 pt-4 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Full name" />
                  <label htmlFor="name-reg" className="absolute left-4 top-1 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Full name</label>
                </div>

                <div className="relative group">
                  <input type="email" name="email" id="email-reg" value={formData.email} onChange={handleChange} required autoComplete="email" className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-2.5 pt-4 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Email" />
                  <label htmlFor="email-reg" className="absolute left-4 top-1 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Email</label>
                </div>

                <div className="relative group">
                  <input type="text" name="organization" id="org-reg" value={formData.organization} onChange={handleChange} autoComplete="organization" className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-2.5 pt-4 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Organization" />
                  <label htmlFor="org-reg" className="absolute left-4 top-1 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Organization (optional)</label>
                </div>

                <div className="relative group">
                  <input type={showPassword ? 'text' : 'password'} name="password" id="password-reg" value={formData.password} onChange={handleChange} required autoComplete="new-password" minLength={8} className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-2.5 pt-4 pr-10 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Password" />
                  <label htmlFor="password-reg" className="absolute left-4 top-1 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Password</label>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-ncpor-muted hover:text-ncpor-accent transition-colors" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <div className="flex-1 h-1 bg-ncpor-divider rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} ${strength.w} transition-all duration-300 ease-out`} />
                    </div>
                    <span className="text-[10px] text-ncpor-muted w-10 text-right">{strength.label}</span>
                  </div>
                </div>

                <div className="relative group">
                  <input type={showPassword ? 'text' : 'password'} name="confirmPassword" id="confirm-reg" value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password" minLength={8} className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-2.5 pt-4 pr-10 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Confirm password" />
                  <label htmlFor="confirm-reg" className="absolute left-4 top-1 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Confirm password</label>
                </div>

                <label className="flex items-start gap-2 cursor-pointer mt-1">
                  <input type="checkbox" name="terms" checked={formData.terms} onChange={handleChange} required className="w-4 h-4 mt-0.5 rounded border-ncpor-divider text-ncpor-accent focus:ring-ncpor-accent focus:ring-offset-ncpor-bg bg-ncpor-bg" />
                  <span className="text-[11px] text-ncpor-secondary leading-tight">I agree to the Terms of Service and Privacy Policy.</span>
                </label>

                <button type="submit" disabled={loading} className="w-full mt-2 bg-ncpor-accent text-[#05080F] font-semibold py-2.5 rounded-lg hover:bg-cyan-400 transition-all active:scale-[0.98] flex items-center justify-center h-10 sweep-hover relative overflow-hidden">
                  <span className="relative z-10">{loading ? <div className="w-5 h-5 border-2 border-[#05080F]/30 border-t-[#05080F] rounded-full animate-spin" /> : 'Create account'}</span>
                </button>
              </form>
            </div>
          </div>

          <div aria-live="polite" className="mt-4 text-center">
            {error && (
              <p className={`text-sm ${error.includes('successfully') ? 'text-green-500' : 'text-red-500'}`}>{error}</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
