import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Helper: if the backend returns 'editor'/'viewer' but user is actually a locally-registered researcher, patch the role
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
          console.error('Failed to fetch user profile:', err);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuthSuccess = (accessToken, userData) => {
    const patchedUser = patchResearcherRole(userData);
    setToken(accessToken);
    setUser(patchedUser);
    if (accessToken) localStorage.setItem('auth_token', accessToken);
    if (patchedUser) localStorage.setItem('user', JSON.stringify(patchedUser));
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

  const signup = async (data) => {
    const res = await authAPI.register(data);
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
    return res.data;
  };

  const logout = () => {
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
        signup,
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
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
