import React, { useState } from 'react';

const sportsData = [
  { id: 'soccer', name: 'Soccer', icon: '⚽', count: 145 },
  { id: 'basketball', name: 'Basketball', icon: '🏀', count: 89 },
  { id: 'tennis', name: 'Tennis', icon: '🎾', count: 67 },
  { id: 'cricket', name: 'Cricket', icon: '🏏', count: 34 },
  { id: 'baseball', name: 'Baseball', icon: '⚾', count: 52 },
  { id: 'ice_hockey', name: 'Ice Hockey', icon: '🏒', count: 41 },
  { id: 'american_football', name: 'American Football', icon: '🏈', count: 28 },
  { id: 'rugby', name: 'Rugby', icon: '🏉', count: 19 },
];

const popularLeagues = [
  { id: 'epl', name: 'Premier League', sport: 'soccer', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'laliga', name: 'La Liga', sport: 'soccer', flag: '🇪🇸' },
  { id: 'nba', name: 'NBA', sport: 'basketball', flag: '🇺🇸' },
  { id: 'ipl', name: 'IPL', sport: 'cricket', flag: '🇮🇳' },
  { id: 'bundesliga', name: 'Bundesliga', sport: 'soccer', flag: '🇩🇪' },
];

export default function SportsSidebar() {
  const [selectedSport, setSelectedSport] = useState('soccer');

  return (
    <aside className="md:w-64  bg-[#0f1923] text-white h-[calc(100vh-60px)] overflow-y-auto md:sticky md:top-0">
      {/* Popular Leagues */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">POPULAR LEAGUES</h3>
        <div className="space-y-1">
          {popularLeagues.map((league) => (
            <button
              key={league.id}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition text-left"
            >
              <span className="text-xl">{league.flag}</span>
              <span className="text-sm">{league.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* All Sports */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">ALL SPORTS</h3>
        <div className="space-y-1">
          {sportsData.map((sport) => (
            <button
              key={sport.id}
              onClick={() => setSelectedSport(sport.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                selectedSport === sport.id
                  ? 'bg-orange-500 text-white'
                  : 'hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{sport.icon}</span>
                <span className="text-sm">{sport.name}</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded">{sport.count}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
