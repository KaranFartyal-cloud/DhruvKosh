import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Repository from './pages/Repository';
import Upload from './pages/Upload';
import ContentDetail from './pages/ContentDetail';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Set this to false to disable authentication for hackathon demo
const USE_AUTH = import.meta.env.VITE_USE_AUTH !== 'false';

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('auth_token') !== null;
  };

  const ProtectedRoute = ({ children }) => {
    if (!USE_AUTH) return children;
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <div className="min-h-screen bg-ocean-50">
        {(!USE_AUTH || isAuthenticated()) && <Navbar />}
        <Routes>
          {USE_AUTH && <Route path="/login" element={<Login />} />}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Repository />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/content/:id"
            element={
              <ProtectedRoute>
                <ContentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
