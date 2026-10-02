import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import PageTransition from './PageTransition';
import { Database, UploadCloud, LayoutDashboard, Share2, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import dhruvLogo from '../assets/dhruv_logo.png';

/* ─── Nav item definition ─────────────────────────────────────────────── */
const NAV = [
  { to: '/', end: true, label: 'Repository', icon: Database },
  { to: '/upload', label: 'Upload', icon: UploadCloud },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/publishing', label: 'Publishing', icon: Share2 },
  { to: '/expeditions', label: 'Expeditions', icon: Database },
  { to: '/polar-guide', label: 'AI Guide', icon: Bell },
];

const Layout = () => {
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    logout();
    window.location.href = '/login';
  };

  // Notifications state (in-memory, empty until dynamic events occur)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsNotificationsOpen(false);
    };
    
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isNotificationsOpen]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen w-full bg-ncpor-bg text-ncpor-primary font-sans relative flex flex-col selection:bg-cyan-500/20 selection:text-cyan-200 transition-colors duration-300">

      {/* ── Top Navigation Bar (Single Global Header) ───────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-ncpor-divider bg-ncpor-bg/85 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Portal Identity */}
          <NavLink to="/" className="flex items-center gap-3 group">
            {/* Project logo — glowing compass star mark */}
            <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden transition-all duration-300
              group-hover:shadow-[0_0_18px_rgba(0,210,255,0.45)] group-hover:scale-105">
              <img
                src={dhruvLogo}
                alt="DhruvKosh logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg tracking-wider text-ncpor-primary group-hover:text-ncpor-accent transition-colors">
                  DhruvKosh
                </span>
                <span className="px-1.5 py-0.5 bg-ncpor-accent/10 border border-ncpor-accent/20 text-ncpor-accent text-[10px] font-mono rounded tracking-widest uppercase">
                  NCPOR
                </span>
              </div>
              <span className="text-[10px] text-ncpor-muted uppercase tracking-widest -mt-0.5">
                National Polar &amp; Ocean Research
              </span>
            </div>
          </NavLink>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-ncpor-panel/80 p-1 rounded-xl border border-ncpor-divider">
            {NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `
                  flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200
                  ${isActive
                    ? 'bg-ncpor-elevated text-ncpor-accent border border-ncpor-accent/25 shadow-sm'
                    : 'text-ncpor-secondary hover:text-ncpor-primary hover:bg-ncpor-elevated/50'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Action Icons: Status, Bell, User Avatar */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-ncpor-panel/80 border border-ncpor-divider text-[11px] font-mono text-ncpor-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Polar Sync</span>
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 relative text-ncpor-muted hover:text-ncpor-accent hover:bg-ncpor-panel rounded-lg transition-colors border border-transparent hover:border-ncpor-divider"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-ncpor-bg"></span>
                )}
              </button>
              
              {/* Dropdown Panel */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col">
                  <div className="p-3 border-b border-ncpor-divider flex items-center justify-between bg-ncpor-bg/50">
                    <h3 className="text-sm font-semibold text-ncpor-primary">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-ncpor-accent hover:text-ncpor-primary transition-colors">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(note => (
                        <div key={note.id} className={`p-3 border-b border-ncpor-divider/50 hover:bg-ncpor-elevated transition-colors ${!note.read ? 'bg-ncpor-accent/5' : ''}`}>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className={`text-sm ${!note.read ? 'text-ncpor-primary font-medium' : 'text-ncpor-secondary'}`}>{note.title}</h4>
                            <span className="text-[10px] text-ncpor-muted whitespace-nowrap">{note.time}</span>
                          </div>
                          <p className="text-xs text-ncpor-muted mt-1">{note.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-sm text-ncpor-muted">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Pill */}
            <div className="relative group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2F5FA8] to-slate-800 border border-ncpor-accent/30 flex items-center justify-center text-ncpor-accent font-bold text-xs shadow-sm cursor-pointer hover:border-ncpor-accent transition-colors">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'DK'}
              </div>
              
              <div className="absolute right-0 mt-2 w-48 bg-ncpor-panel border border-ncpor-divider rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                {user ? (
                  <>
                    <div className="px-4 py-3 border-b border-ncpor-divider">
                      <p className="text-sm font-medium text-ncpor-primary truncate">{user.name}</p>
                      <p className="text-xs text-ncpor-muted truncate">{user.email}</p>
                    </div>
                    <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-ncpor-elevated transition-colors">
                      Sign out
                    </button>
                  </>
                ) : (
                  <NavLink to="/login" className="block w-full text-left px-4 py-2 text-sm text-ncpor-primary hover:bg-ncpor-elevated transition-colors">
                    Sign in
                  </NavLink>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Page Content Outlet ─────────────────────────────────── */}
      <main className="flex-1 w-full relative z-10">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-ncpor-divider bg-ncpor-bg text-ncpor-muted py-8 text-xs relative z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-ncpor-secondary">
            <span>© {new Date().getFullYear()} National Centre for Polar and Ocean Research (NCPOR)</span>
            <span>•</span>
            <span>Ministry of Earth Sciences, Govt. of India</span>
          </div>
          <div className="flex items-center gap-4 text-ncpor-muted">
            <span className="hover:text-ncpor-accent transition-colors">Antarctica (Maitri & Bharati)</span>
            <span>•</span>
            <span className="hover:text-ncpor-accent transition-colors">Arctic (Himadri)</span>
            <span>•</span>
            <span className="hover:text-ncpor-accent transition-colors">Himalayas</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
