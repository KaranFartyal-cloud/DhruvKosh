import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navigation from './components/Navigation';
import PublicHome from './pages/PublicHome';
import AdminDashboard from './pages/AdminDashboard';
import ExpeditionsList from './pages/ExpeditionsList';
import ExpeditionDetail from './pages/ExpeditionDetail';
import PublicContentDetail from './pages/PublicContentDetail';

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
      <BrowserRouter>
        <div className="min-h-screen bg-ice-50 font-sans flex flex-col">
          <Navigation />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/content/:id" element={<PublicContentDetail />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/expeditions" element={<ExpeditionsList />} />
              <Route path="/admin/expeditions/:id" element={<ExpeditionDetail />} />
            </Routes>
          </main>
          <footer className="bg-ocean-900 text-white p-6 text-center">
            <p>&copy; 2026 National Centre for Polar and Ocean Research (NCPOR)</p>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
