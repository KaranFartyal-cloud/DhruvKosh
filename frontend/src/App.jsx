import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { SpeechProvider } from './contexts/SpeechProvider';

const Repository     = React.lazy(() => import('./pages/Repository'));
const Upload         = React.lazy(() => import('./pages/Upload'));
const Dashboard      = React.lazy(() => import('./pages/Dashboard'));
const Publishing     = React.lazy(() => import('./pages/Publishing'));
const ContentDetail  = React.lazy(() => import('./pages/ContentDetail'));
const ExpeditionsList  = React.lazy(() => import('./pages/ExpeditionsList'));
const ExpeditionDetail = React.lazy(() => import('./pages/ExpeditionDetail'));
<<<<<<< HEAD
const PolarGuide = React.lazy(() => import('./components/PolarGuide'));
const Login = React.lazy(() => import('./pages/Login'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
=======
const PolarGuide     = React.lazy(() => import('./components/PolarGuide'));
const Auth           = React.lazy(() => import('./pages/Auth'));
>>>>>>> 9aace11c335f72408e69cde9fbc94238e194360a

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-ncpor-bg">
    <div className="w-8 h-8 border-2 border-ncpor-accent/30 border-t-ncpor-accent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
<<<<<<< HEAD
        <AuthProvider>
          <SpeechProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center bg-ncpor-bg">
                      <div className="w-8 h-8 border-2 border-ncpor-accent/30 border-t-ncpor-accent rounded-full animate-spin" />
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Repository />} />
                      <Route path="upload" element={<Upload />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="admin" element={<AdminDashboard />} />
                      <Route path="publishing" element={<Publishing />} />
                      <Route path="content/:id" element={<ContentDetail />} />
                      <Route path="expeditions" element={<ExpeditionsList />} />
=======
        <SpeechProvider>
          <BrowserRouter>
            {/* AuthProvider MUST be inside BrowserRouter — it uses useNavigate internally */}
            <AuthProvider>
              <ErrorBoundary>
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Auth />} />

                    {/* Main app shell */}
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Repository />} />
                      <Route path="upload"          element={<Upload />} />
                      <Route path="dashboard"       element={<Dashboard />} />
                      <Route path="publishing"      element={<Publishing />} />
                      <Route path="content/:id"     element={<ContentDetail />} />
                      <Route path="expeditions"     element={<ExpeditionsList />} />
>>>>>>> 9aace11c335f72408e69cde9fbc94238e194360a
                      <Route path="expeditions/:id" element={<ExpeditionDetail />} />
                      <Route
                        path="polar-guide"
                        element={
                          <div className="w-full" style={{ height: 'calc(100vh - 64px)' }}>
                            <PolarGuide
                              onLogout={() => {
                                localStorage.removeItem('auth_token');
                                localStorage.removeItem('user');
                                window.location.href = '/login';
                              }}
                            />
                          </div>
                        }
                      />
                    </Route>
                  </Routes>
                </Suspense>
              </ErrorBoundary>
<<<<<<< HEAD
            </BrowserRouter>
          </SpeechProvider>
        </AuthProvider>
=======
            </AuthProvider>
          </BrowserRouter>
        </SpeechProvider>
>>>>>>> 9aace11c335f72408e69cde9fbc94238e194360a
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
