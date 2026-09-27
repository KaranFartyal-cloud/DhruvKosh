import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, LayoutDashboard, List, Home } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <header className="bg-ocean-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
          <Compass className="h-8 w-8 text-ice-300" />
          <span>NCPOR Polar Outreach</span>
        </Link>
        
        <nav className="flex space-x-6">
          <Link to="/" className={`flex items-center space-x-1 hover:text-ice-300 transition-colors ${!isAdmin ? 'text-ice-300 font-semibold' : ''}`}>
            <Home className="h-5 w-5" />
            <span>Public Portal</span>
          </Link>
          <Link to="/admin" className={`flex items-center space-x-1 hover:text-ice-300 transition-colors ${location.pathname === '/admin' ? 'text-ice-300 font-semibold' : ''}`}>
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link to="/admin/expeditions" className={`flex items-center space-x-1 hover:text-ice-300 transition-colors ${location.pathname.startsWith('/admin/expeditions') ? 'text-ice-300 font-semibold' : ''}`}>
            <List className="h-5 w-5" />
            <span>Expeditions</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navigation;
