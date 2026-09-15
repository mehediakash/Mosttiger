// components/MatchCard.jsx
import React, { useState } from "react";

const MatchCard = ({ match }) => {
  const [selectedBet, setSelectedBet] = useState(null);

  const handleBetSelect = (betType, odds) => {
    setSelectedBet({ type: betType, odds });
  };

  return (
    <div className="bg-gray-800  rounded-xl shadow-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-all">
      {/* Match header */}
      <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              {match.category}
            </span>
            <h3 className="font-bold">{match.tournament}</h3>
          </div>
          <div className="flex items-center">
            {match.live && (
              <span className="flex items-center text-sm text-red-400 mr-3">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                LIVE
              </span>
            )}
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">
              {match.time}
            </span>
          </div>
        </div>
      </div>

      {/* Teams and scores */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-900 to-blue-700 flex items-center justify-center mr-3">
              <span className="text-sm font-bold">T1</span>
            </div>
            <span className="font-medium">{match.team1}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{match.score1}</div>
            <div className="text-xs text-gray-400">{match.overs1}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-900 to-red-700 flex items-center justify-center mr-3">
              <span className="text-sm font-bold">T2</span>
            </div>
            <span className="font-medium">{match.team2}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{match.score2}</div>
            <div className="text-xs text-gray-400">{match.overs2}</div>
          </div>
        </div>

        {/* Match status */}
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Status:</span>
            <span
              className={`font-medium ${match.status === "Live" ? "text-green-400" : "text-primary"}`}
            >
              {match.status}
            </span>
          </div>
        </div>
      </div>

      {/* Betting odds */}
      <div className="bg-gray-900 p-4">
        <div className="grid grid-cols-3 gap-2">
          {/* Team 1 win */}
          <button
            className={`p-3 rounded-lg text-center transition-all ${selectedBet?.type === "team1" ? "bg-gradient-to-r from-green-900/70 to-emerald-900/70 border border-green-600" : "bg-gray-800 hover:bg-gray-700"}`}
            onClick={() => handleBetSelect("team1", match.odds1)}
          >
            <div className="text-sm text-gray-400">1</div>
            <div className="text-lg font-bold">{match.odds1}</div>
            {selectedBet?.type === "team1" && (
              <div className="text-xs text-green-400 mt-1">Selected</div>
            )}
          </button>

          {/* Draw */}
          <button
            className={`p-3 rounded-lg text-center transition-all ${selectedBet?.type === "draw" ? "bg-gradient-to-r from-blue-900/70 to-indigo-900/70 border border-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}
            onClick={() => handleBetSelect("draw", match.oddsDraw)}
          >
            <div className="text-sm text-gray-400">X</div>
            <div className="text-lg font-bold">{match.oddsDraw}</div>
            {selectedBet?.type === "draw" && (
              <div className="text-xs text-blue-400 mt-1">Selected</div>
            )}
          </button>

          {/* Team 2 win */}
          <button
            className={`p-3 rounded-lg text-center transition-all ${selectedBet?.type === "team2" ? "bg-gradient-to-r from-red-900/70 to-pink-900/70 border border-red-600" : "bg-gray-800 hover:bg-gray-700"}`}
            onClick={() => handleBetSelect("team2", match.odds2)}
          >
            <div className="text-sm text-gray-400">2</div>
            <div className="text-lg font-bold">{match.odds2}</div>
            {selectedBet?.type === "team2" && (
              <div className="text-xs text-red-400 mt-1">Selected</div>
            )}
          </button>
        </div>

        {/* Additional bet options */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-center transition-all">
            <div>Total</div>
            <div className="font-bold">O {match.totalOver}</div>
          </button>
          <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-center transition-all">
            <div>Total</div>
            <div className="font-bold">U {match.totalUnder}</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchCard;
