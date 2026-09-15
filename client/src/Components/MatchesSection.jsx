// components/MatchesSection.jsx
import React from "react";
import MatchCard from "./MatchCard";

const MatchesSection = ({ matches, activeSport }) => {
  // Group matches by tournament/league
  const groupedMatches = matches.reduce((groups, match) => {
    const group = match.tournament;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(match);
    return groups;
  }, {});

  if (matches.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h3 className="text-xl font-bold mb-2">No matches found</h3>
        <p className="text-gray-400">
          Try selecting a different sport or search term
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        {activeSport === "all"
          ? "All Matches"
          : activeSport.charAt(0).toUpperCase() + activeSport.slice(1)}
        <span className="ml-2 text-sm font-normal bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full">
          {matches.length} matches
        </span>
      </h2>

      {Object.keys(groupedMatches).map((tournament) => (
        <div key={tournament} className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 primary rounded-full mr-3"></div>
            <h3 className="text-lg font-bold">{tournament}</h3>
            <span className="ml-3 text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
              {groupedMatches[tournament].length}
            </span>
          </div>

          <div className=" gap-4">
            {groupedMatches[tournament].map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MatchesSection;
