import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import PageTransition from './PageTransition';

/* ─── Nav item definition ─────────────────────────────────────────────── */
const NAV = [
  {
    to: '/', end: true, label: 'Repository',
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  },
  {
    to: '/upload', label: 'Upload',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  },
  {
    to: '/dashboard', label: 'Dashboard',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
];

const Layout = () => {
  return (
    <div className="flex h-screen w-full bg-ncpor-bg text-ncpor-primary overflow-hidden font-sans relative">

      {/* ── Signature polar coordinate grid (extremely low opacity) ── */}
      <div className="polar-grid" aria-hidden="true" />

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="w-[220px] shrink-0 bg-ncpor-sidebar border-r border-ncpor-divider flex flex-col justify-between relative z-10 animate-fade-in"
        style={{ animationDelay: '0ms' }}
      >
        <div>
          {/* Logo */}
          <div className="p-6 mb-4">
            <h1 className="text-3xl font-display tracking-wide text-ncpor-primary leading-none mb-2">
              NCPOR
            </h1>
            {/* Animated orange underline */}
            <div
              className="h-[2px] w-6 bg-ncpor-accent rounded-full mb-2"
              style={{ transition: 'width 0.4s cubic-bezier(0.25,1,0.5,1)' }}
            />
            <p className="text-[10px] font-semibold text-ncpor-muted uppercase tracking-[0.3em]">Outreach</p>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 px-3 mt-2">
            {NAV.map(({ to, end, label, icon }, i) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `
                  group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium relative
                  transition-all duration-220 ease-out
                  ${isActive
                    ? 'bg-ncpor-panel text-ncpor-primary'
                    : 'text-ncpor-muted hover:bg-ncpor-panel/60 hover:text-ncpor-primary'
                  }
                `}
                style={{ animationDelay: `${60 + i * 50}ms` }}
              >
                {({ isActive }) => (
                  <>
                    {/* Active orange indicator bar */}
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-md bg-ncpor-accent
                        transition-all duration-220 ease-out
                        ${isActive ? 'h-3/4 opacity-100' : 'h-0 opacity-0'}`}
                    />

                    {/* Icon */}
                    <svg
                      className={`w-4 h-4 shrink-0 transition-all duration-220
                        ${isActive ? 'text-ncpor-accent' : 'text-ncpor-muted group-hover:text-ncpor-accent'}
                        group-hover:translate-x-[1px]`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                    </svg>

                    {/* Label */}
                    <span className="transition-transform duration-220 group-hover:translate-x-[1px]">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Settings */}
        <div className="p-4 mb-4">
          <button className="group flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-ncpor-muted hover:bg-ncpor-panel/60 hover:text-ncpor-primary transition-all duration-220 text-sm font-medium">
            <svg
              className="w-4 h-4 shrink-0 text-ncpor-muted group-hover:text-ncpor-accent transition-all duration-220 group-hover:rotate-45 group-hover:translate-x-[1px]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="transition-transform duration-220 group-hover:translate-x-[1px]">Settings</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">

        {/* Topbar */}
        <header className="h-16 shrink-0 border-b border-ncpor-divider flex items-center justify-between px-8 animate-fade-in" style={{ animationDelay: '80ms' }}>
          {/* Search with focus glow */}
          <div className="relative w-96 group">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ncpor-muted
                transition-colors duration-220 group-focus-within:text-ncpor-accent"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search reports, datasets, expeditions..."
              className="w-full bg-ncpor-panel border border-ncpor-divider rounded-lg py-2 pl-10 pr-4 text-sm
                text-ncpor-primary placeholder-ncpor-muted
                focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15
                transition-all duration-220 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-ncpor-muted animate-fade-in" style={{ animationDelay: '120ms' }}>
              September 2026
            </span>

            {/* Notification bell */}
            <button className="relative text-ncpor-muted hover:text-ncpor-accent transition-colors duration-220 btn-press tooltip-parent">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-ncpor-accent rounded-full -mt-1 -mr-1" />
              <span className="tooltip -bottom-9 left-1/2 -translate-x-1/2">Notifications</span>
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-ncpor-panel border border-ncpor-divider flex items-center justify-center text-ncpor-primary font-bold text-sm hover:border-ncpor-accent/50 transition-colors duration-220 cursor-pointer">
              DK
            </div>
          </div>
        </header>

        {/* Scrollable Page Content — wrapped in PageTransition */}
        <div className="flex-1 overflow-auto p-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </div>
    </div>
  );
};

export default Layout;
