// components/SportsSidebar.jsx
import React from "react";

const SportsSidebar = ({ activeSport, onSportChange }) => {
  const sports = [
    { id: "all", name: "All Sports", icon: "🏆" },
    { id: "cricket", name: "Cricket", icon: "🏏", hasLive: true },
    { id: "football", name: "Football", icon: "⚽", hasLive: true },
    { id: "basketball", name: "Basketball", icon: "🏀", hasLive: true },
    { id: "tennis", name: "Tennis", icon: "🎾", hasLive: true },
    { id: "icehockey", name: "Ice Hockey", icon: "🏒", hasLive: true },
    { id: "tabletennis", name: "Table Tennis", icon: "🏓", hasLive: true },
    { id: "badminton", name: "Badminton", icon: "🏸", hasLive: true },
    { id: "volleyball", name: "Volleyball", icon: "🏐" },
    { id: "darts", name: "Darts", icon: "🎯", hasLive: true },
    { id: "bowling", name: "Bowling", icon: "🎳" },
    { id: "esports", name: "eSports", icon: "🎮" },
  ];

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-4 lg:sticky lg:top-4">
      <h2 className="text-lg font-bold mb-4 pb-3 border-b border-gray-700">
        Sports
      </h2>
      <ul className="space-y-2">
        {sports.map((sport) => (
          <li key={sport.id}>
            <button
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${activeSport === sport.id ? "bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-l-4 border-primary" : "hover:bg-gray-700/50"}`}
              onClick={() => onSportChange(sport.id)}
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">{sport.icon}</span>
                <span className="font-medium">{sport.name}</span>
              </div>
              {sport.hasLive && (
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 pt-6 border-t border-gray-700">
        <h3 className="text-md font-bold mb-3">Quick Links</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg transition-all">
            <span className="font-medium">Live Streaming</span>
            <span className="ml-2 text-xs bg-red-600 text-white px-2 py-1 rounded-full">
              LIVE
            </span>
          </button>
          <button className="w-full text-left p-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg transition-all">
            <span className="font-medium">Today's Matches</span>
          </button>
          <button className="w-full text-left p-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg transition-all">
            <span className="font-medium">Top Events</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SportsSidebar;
