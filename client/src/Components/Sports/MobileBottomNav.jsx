import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { id: 'sports', label: 'Sports', icon: '⚽', path: '/sports' },
  { id: 'live', label: 'Live', icon: '🔴', path: '/live' },
  { id: 'betslip', label: 'Bet Slip', icon: '📋', path: '/betslip', badge: 2 },
  { id: 'mybets', label: 'My Bets', icon: '📜', path: '/bets' },
  { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a2c38] border-t border-gray-700 z-50">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition ${
                isActive ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <span className="text-xl">{item.icon}</span>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
