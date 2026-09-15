import React from 'react';
import GameRow from './GameRow';

const matchesData = [
  {
    id: 1,
    league: 'Premier League',
    leagueFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    time: '18:30',
    status: 'upcoming',
    homeTeam: 'Manchester United',
    awayTeam: 'Liverpool',
    homeOdds: 2.45,
    drawOdds: 3.20,
    awayOdds: 2.85,
    marketsCount: 145
  },
  {
    id: 2,
    league: 'Premier League',
    leagueFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    time: 'LIVE 67\'',
    status: 'live',
    homeTeam: 'Chelsea',
    awayTeam: 'Arsenal',
    homeScore: 1,
    awayScore: 2,
    homeOdds: 3.10,
    drawOdds: 3.50,
    awayOdds: 2.20,
    marketsCount: 189
  },
  {
    id: 3,
    league: 'La Liga',
    leagueFlag: '🇪🇸',
    time: '20:00',
    status: 'upcoming',
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    homeOdds: 2.10,
    drawOdds: 3.40,
    awayOdds: 3.25,
    marketsCount: 167
  },
  {
    id: 4,
    league: 'Bundesliga',
    leagueFlag: '🇩🇪',
    time: '19:30',
    status: 'upcoming',
    homeTeam: 'Bayern Munich',
    awayTeam: 'Borussia Dortmund',
    homeOdds: 1.85,
    drawOdds: 3.80,
    awayOdds: 4.20,
    marketsCount: 134
  },
  {
    id: 5,
    league: 'Serie A',
    leagueFlag: '🇮🇹',
    time: 'LIVE 34\'',
    status: 'live',
    homeTeam: 'Juventus',
    awayTeam: 'AC Milan',
    homeScore: 0,
    awayScore: 0,
    homeOdds: 2.55,
    drawOdds: 3.10,
    awayOdds: 2.75,
    marketsCount: 156
  },
  {
    id: 6,
    league: 'Ligue 1',
    leagueFlag: '🇫🇷',
    time: '21:00',
    status: 'upcoming',
    homeTeam: 'PSG',
    awayTeam: 'Marseille',
    homeOdds: 1.65,
    drawOdds: 4.10,
    awayOdds: 5.50,
    marketsCount: 142
  },
];

export default function ChampSection({ category = 'all', isLive = false, onAddToBetSlip }) {
  // Filter matches based on category and live status
  const filteredMatches = matchesData.filter(match => {
    if (isLive && match.status !== 'live') return false;
    // Add category filtering logic here if needed
    return true;
  });

  return (
    <div className="p-4">
      <div className="space-y-3">
        {filteredMatches.length > 0 ? (
          filteredMatches.map((match) => (
            <GameRow
              key={match.id}
              match={match}
              onAddToBetSlip={onAddToBetSlip}
            />
          ))
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">⚽</div>
            <p>No matches available</p>
            <p className="text-sm mt-2">Please check back later</p>
          </div>
        )}
      </div>
    </div>
  );
}
