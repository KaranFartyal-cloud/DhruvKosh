import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

const Repository = React.lazy(() => import('./pages/Repository'));
const Upload = React.lazy(() => import('./pages/Upload'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Publishing = React.lazy(() => import('./pages/Publishing'));
const ContentDetail = React.lazy(() => import('./pages/ContentDetail'));

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-ncpor-bg">
                <div className="w-8 h-8 border-2 border-ncpor-accent/30 border-t-ncpor-accent rounded-full animate-spin" />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Repository />} />
                  <Route path="upload" element={<Upload />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="publishing" element={<Publishing />} />
                  <Route path="content/:id" element={<ContentDetail />} />
                </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
