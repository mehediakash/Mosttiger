// components/LiveMatches.jsx
import React from 'react';

const LiveMatches = ({ matches }) => {
  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-lg p-4 border border-gray-700">
      <div className="overflow-x-auto">
        <div className="flex space-x-4 pb-4">
          {matches.map((match) => (
            <div key={match.id} className="min-w-[280px] bg-gray-800/70 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                  <span className="text-sm text-red-400 font-medium">LIVE</span>
                </div>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded">{match.time}</span>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm">{match.team1}</span>
                  <span className="font-bold">{match.score1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{match.team2}</span>
                  <span className="font-bold">{match.score2}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-400 mb-3">{match.tournament}</div>
              
              <div className="grid grid-cols-3 gap-2">
                <button className="p-2 bg-gradient-to-r from-green-900/50 to-green-800/50 hover:from-green-800 hover:to-green-700 rounded text-center transition-all">
                  <div className="text-sm font-bold">{match.odds1}</div>
                </button>
                <button className="p-2 bg-gradient-to-r from-blue-900/50 to-blue-800/50 hover:from-blue-800 hover:to-blue-700 rounded text-center transition-all">
                  <div className="text-sm font-bold">{match.oddsDraw}</div>
                </button>
                <button className="p-2 bg-gradient-to-r from-red-900/50 to-red-800/50 hover:from-red-800 hover:to-red-700 rounded text-center transition-all">
                  <div className="text-sm font-bold">{match.odds2}</div>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveMatches;