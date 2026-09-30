import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    if (data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
    }
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    }
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

  const googleSignIn = async (credential, redirectTo = '/') => {
    const res = await authAPI.googleLogin(credential);
    handleAuthSuccess(res.data, redirectTo);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleSignIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
