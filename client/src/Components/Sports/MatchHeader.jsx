import React, { useState } from 'react';

const tabs = [
  { id: 'all', label: 'All Matches', count: 145 },
  { id: 'live', label: 'Live', count: 23 },
  { id: 'upcoming', label: 'Upcoming', count: 89 },
  { id: 'today', label: 'Today', count: 34 },
];

export default function MatchHeader() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="bg-[#1a2c38] mx-4 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-bold">⚽ Soccer Matches</h2>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">
            <span className="mr-2">🔍</span>
            Search
          </button>
          <select className="px-4 py-2 bg-white/10 text-white rounded-lg border-none outline-none">
            <option>Sort by Time</option>
            <option>Sort by League</option>
            <option>Sort by Popularity</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">{tab.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
