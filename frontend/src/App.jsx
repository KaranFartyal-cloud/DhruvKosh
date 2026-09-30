import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

const Repository = React.lazy(() => import('./pages/Repository'));
const Upload = React.lazy(() => import('./pages/Upload'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Publishing = React.lazy(() => import('./pages/Publishing'));
const ContentDetail = React.lazy(() => import('./pages/ContentDetail'));
const Auth = React.lazy(() => import('./pages/Auth'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'dummy-client-id'}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <AuthProvider>
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center bg-ncpor-bg">
                    <div className="w-8 h-8 border-2 border-ncpor-accent/30 border-t-ncpor-accent rounded-full animate-spin" />
                  </div>
                }>
                  <Routes>
                    <Route path="/login" element={<PublicRoute><Auth /></PublicRoute>} />
                    <Route path="/signup" element={<PublicRoute><Auth /></PublicRoute>} />
                    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                      <Route index element={<Repository />} />
                      <Route path="upload" element={<Upload />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="publishing" element={<Publishing />} />
                      <Route path="content/:id" element={<ContentDetail />} />
                    </Route>
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
