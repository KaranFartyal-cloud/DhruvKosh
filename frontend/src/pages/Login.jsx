import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer'
  });
  
  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const response = await authAPI.login(formData.email, formData.password);
        localStorage.setItem('auth_token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/');
      } else {
        await authAPI.register(formData);
        // After registration, switch to login
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err) {
      setError(isLogin ? 'Login failed. Please check your credentials.' : 'Registration failed. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-ncpor-bg px-4 py-12 font-sans">
      <div className="max-w-md w-full bg-ncpor-card border border-ncpor-border rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display text-ncpor-textPrimary mb-2 tracking-wide">NCPOR</h1>
          <p className="text-sm font-medium tracking-[0.2em] text-ncpor-textSecondary uppercase">Outreach</p>
          <div className="mt-4 w-12 h-0.5 bg-ncpor-accent mx-auto"></div>
          <p className="mt-6 text-ncpor-textMuted text-sm">Polar Science Knowledge Repository</p>
        </div>
        
        {error && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
            error.includes('successful') 
              ? 'bg-ncpor-success/10 border border-ncpor-success/20 text-ncpor-success' 
              : 'bg-ncpor-warning/10 border border-ncpor-warning/20 text-ncpor-warning'
          }`}>
            {error}
          </div>
        )}
        
        <h2 className="text-xl font-display text-ncpor-textPrimary mb-6">
          {isLogin ? 'Sign In' : 'Register'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-ncpor-textSecondary mb-2">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
                className="w-full px-4 py-2.5 bg-ncpor-bgSecondary text-ncpor-textPrimary border border-ncpor-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ncpor-accent focus:border-ncpor-accent transition-all"
                placeholder="Your full name"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-ncpor-textSecondary mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-ncpor-bgSecondary text-ncpor-textPrimary border border-ncpor-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ncpor-accent focus:border-ncpor-accent transition-all"
              placeholder="your.email@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ncpor-textSecondary mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-ncpor-bgSecondary text-ncpor-textPrimary border border-ncpor-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ncpor-accent focus:border-ncpor-accent transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-ncpor-textSecondary mb-2">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-ncpor-bgSecondary text-ncpor-textPrimary border border-ncpor-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ncpor-accent focus:border-ncpor-accent transition-all"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ncpor-accent text-ncpor-bg py-2.5 px-4 rounded-lg font-medium hover:bg-ncpor-lightIce disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2 shadow-[0_0_15px_rgba(69,214,194,0.15)] hover:shadow-[0_0_20px_rgba(69,214,194,0.3)] hover:-translate-y-0.5 duration-200"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-ncpor-textSecondary hover:text-ncpor-accent transition-colors text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-ncpor-border">
          <p className="text-xs tracking-wider uppercase text-ncpor-textMuted text-center mb-4">Demo Credentials</p>
          <div className="text-xs text-ncpor-textMuted space-y-2 text-center font-mono bg-ncpor-bgSecondary/50 p-4 rounded-lg border border-ncpor-border/50">
            <p><span className="text-ncpor-textSecondary">Admin:</span> admin@ncpor.gov.in / admin123</p>
            <p><span className="text-ncpor-textSecondary">Editor:</span> editor@ncpor.gov.in / editor123</p>
            <p><span className="text-ncpor-textSecondary">Viewer:</span> viewer@ncpor.gov.in / viewer123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
