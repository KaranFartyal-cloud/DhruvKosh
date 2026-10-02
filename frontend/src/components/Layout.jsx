import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import PageTransition from './PageTransition';
import { Database, UploadCloud, LayoutDashboard, Share2, Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import dhruvLogo from '../assets/dhruv_logo.png';

/* ─── Nav item definition ─────────────────────────────────────────────── */
const NAV = [
  { to: '/', end: true, label: 'Repository', icon: Database },
  { to: '/upload', label: 'Upload', icon: UploadCloud },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/publishing', label: 'Publishing', icon: Share2 },
  { to: '/expeditions', label: 'Expeditions', icon: Database },
  // { to: '/polar-guide', label: 'AI Guide', icon: Bell },
];

const Layout = () => {
  const { isLight, toggleTheme } = useTheme();

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

          {/* Right Action Icons: Status, Theme Toggle, Bell, User Avatar */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-ncpor-panel/80 border border-ncpor-divider text-[11px] font-mono text-ncpor-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Polar Sync</span>
            </div>

            {/* Theme Toggle (Midnight / Glacier Day) */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-ncpor-divider bg-ncpor-panel hover:border-ncpor-accent/40 text-ncpor-secondary hover:text-ncpor-primary transition-all duration-200 active:scale-95 shadow-sm"
              title={`Switch to ${isLight ? 'Midnight (Dark)' : 'Glacier Day (Light)'}`}
            >
              {isLight ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#0A7C8C]" />
                  <span className="hidden sm:inline">Glacier Day</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#7FE7F5]" />
                  <span className="hidden sm:inline">Midnight</span>
                </>
              )}
            </button>

            {/* Notification Bell */}
            <button className="p-2 text-ncpor-muted hover:text-ncpor-accent hover:bg-ncpor-panel rounded-lg transition-colors border border-transparent hover:border-ncpor-divider">
              <Bell className="w-4 h-4" />
            </button>

            {/* Avatar Pill */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2F5FA8] to-slate-800 border border-ncpor-accent/30 flex items-center justify-center text-ncpor-accent font-bold text-xs shadow-sm cursor-pointer hover:border-ncpor-accent transition-colors">
              DK
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
