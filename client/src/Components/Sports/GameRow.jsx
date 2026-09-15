import React from 'react';
import MarketButton from './MarketButton';

export default function GameRow({ match, onAddToBetSlip }) {
  return (
    <div className="bg-[#1a2c38] rounded-lg p-4 hover:bg-[#1f3340] transition">
      {/* Match Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="text-lg">{match.leagueFlag}</span>
          <span>{match.league}</span>
          {match.status === 'live' && (
            <span className="flex items-center gap-1 text-red-500 font-semibold ml-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{match.time}</span>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">{match.homeTeam}</span>
              {match.homeScore !== undefined && (
                <span className="text-2xl font-bold text-orange-400">{match.homeScore}</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">{match.awayTeam}</span>
              {match.awayScore !== undefined && (
                <span className="text-2xl font-bold text-orange-400">{match.awayScore}</span>
              )}
            </div>
          </div>
        </div>

        {/* Main Markets (1X2) */}
        <div className="grid grid-cols-3 gap-2">
          <MarketButton
            label="1"
            odds={match.homeOdds}
            isSelected={false}
            onClick={() => onAddToBetSlip({
              matchId: match.id,
              selection: match.homeTeam,
              odds: match.homeOdds,
              market: 'Match Winner - Home',
              match: `${match.homeTeam} vs ${match.awayTeam}`,
              league: match.league
            })}
          />
          <MarketButton
            label="X"
            odds={match.drawOdds}
            isSelected={false}
            onClick={() => onAddToBetSlip({
              matchId: match.id,
              selection: 'Draw',
              odds: match.drawOdds,
              market: 'Match Winner - Draw',
              match: `${match.homeTeam} vs ${match.awayTeam}`,
              league: match.league
            })}
          />
          <MarketButton
            label="2"
            odds={match.awayOdds}
            isSelected={false}
            onClick={() => onAddToBetSlip({
              matchId: match.id,
              selection: match.awayTeam,
              odds: match.awayOdds,
              market: 'Match Winner - Away',
              match: `${match.homeTeam} vs ${match.awayTeam}`,
              league: match.league
            })}
          />
        </div>
      </div>

      {/* Additional Markets Link */}
      <div className="mt-3 flex gap-3 text-xs">
        <button className="text-orange-400 hover:text-orange-300 transition">
          +{match.marketsCount || 125} Markets
        </button>
        <button className="text-gray-400 hover:text-gray-300 transition">
          📊 Statistics
        </button>
      </div>
    </div>
  );
}
