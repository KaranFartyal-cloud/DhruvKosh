import React, { createContext, useContext, useState, useEffect } from 'react';
<<<<<<< HEAD
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync user state on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        try {
          const res = await authAPI.getMe();
          const patched = patchResearcherRole(res.data);
          setUser(patched);
          localStorage.setItem('user', JSON.stringify(patched));
        } catch (err) {
          console.error('Failed to fetch user me profile:', err);
          // Don't auto logout on transient network failure, keep cached user
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: if the backend returns 'editor' but user is actually a locally-registered researcher, patch the role
  const patchResearcherRole = (userData) => {
    if (!userData) return userData;
    if (userData.role === 'editor' || userData.role === 'viewer') {
      const localResearchers = JSON.parse(localStorage.getItem('local_registered_researchers') || '[]');
      const match = localResearchers.find(r => r.email === userData.email);
      if (match && match.role === 'researcher') {
        return { ...userData, role: 'researcher', is_approved: match.is_approved ?? false };
      }
    }
    return userData;
  };

  const handleAuthSuccess = (accessToken, userData) => {
    const patchedUser = patchResearcherRole(userData);
    setToken(accessToken);
    setUser(patchedUser);
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('user', JSON.stringify(patchedUser));
  };

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    handleAuthSuccess(res.data.access_token, res.data.user);
    return res.data;
  };

  const registerResearcher = async (formData) => {
    const res = await authAPI.registerResearcher(formData);
    return res.data;
  };

  const googleLogin = async (data = {}) => {
    const payload = {
      name: data.name || 'Normal User',
      email: data.email || 'user.google@gmail.com',
      avatar_url: data.avatar_url || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    };
    const res = await authAPI.googleLogin(payload);
    handleAuthSuccess(res.data.access_token, res.data.user);
=======
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // On mount, restore session from localStorage
  useEffect(() => {
    try {
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = (data, redirectTo = '/') => {
    console.log('Auth success data:', data);
    if (data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      console.log('Token saved to localStorage');
    }
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      console.log('User saved:', data.user);
    }
    console.log('Navigating to:', redirectTo);
    navigate(redirectTo, { replace: true });
  };

  const login = async (email, password, redirectTo = '/') => {
    const res = await authAPI.login(email, password);
    handleAuthSuccess(res.data, redirectTo);
    return res.data;
  };

  const signup = async (data) => {
    const res = await authAPI.register(data);
    return res.data;
  };

  // Legacy: used by the old @react-oauth/google button (kept for compatibility)
  const googleSignIn = async (credential, redirectTo = '/') => {
    const res = await authAPI.googleLogin(credential);
    handleAuthSuccess(res.data, redirectTo);
    return res.data;
  };

  // Firebase Google Sign-In: opens Google popup via Firebase, then exchanges
  // the Firebase ID token with the backend for an app JWT.
  const firebaseGoogleSignIn = async (redirectTo = '/') => {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    const res = await authAPI.googleLogin(idToken);
    handleAuthSuccess(res.data, redirectTo);
>>>>>>> 9aace11c335f72408e69cde9fbc94238e194360a
    return res.data;
  };

  const logout = () => {
<<<<<<< HEAD
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  };

  const refreshUser = async () => {
    if (!localStorage.getItem('auth_token')) return;
    try {
      const res = await authAPI.getMe();
      const patched = patchResearcherRole(res.data);
      setUser(patched);
      localStorage.setItem('user', JSON.stringify(patched));
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isResearcher = user?.role === 'researcher';
  const isApprovedResearcher = isResearcher && user?.is_approved === true;
  const isPendingResearcher = isResearcher && !user?.is_approved;
  const isNormalUser = user?.role === 'user' || user?.role === 'viewer';
  const canPublishSocial = isAdmin || isApprovedResearcher;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        registerResearcher,
        googleLogin,
        logout,
        refreshUser,
        isAdmin,
        isResearcher,
        isApprovedResearcher,
        isPendingResearcher,
        isNormalUser,
        canPublishSocial,
      }}
    >
=======
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleSignIn, firebaseGoogleSignIn, logout }}>
>>>>>>> 9aace11c335f72408e69cde9fbc94238e194360a
      {children}
    </AuthContext.Provider>
  );
};
<<<<<<< HEAD

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
=======
>>>>>>> 9aace11c335f72408e69cde9fbc94238e194360a
