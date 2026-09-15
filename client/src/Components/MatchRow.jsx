// components/MatchRow.jsx
import React, { useState } from "react";
import {
  StarIcon,
  ChartBarIcon,
  ChartBarIcon as ChartLineIcon,
  TableCellsIcon,
  TvIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

const MatchRow = ({ match }) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSubGames, setShowSubGames] = useState(false);

  return (
    <li className="dashboard-game hover:bg-blue-50 transition-colors">
      <div className="p-4">
        {/* First Row: Controls, Teams, Scores */}
        <div className="dashboard-game-block__row flex items-start justify-between mb-3">
          {/* Left: Controls */}
          <div className="dashboard-game-block-controls flex space-x-2">
            <button
              onClick={() => setIsPinned(!isPinned)}
              className="dashboard-button-pinned p-2 hover:bg-gray-100 rounded"
              aria-label="Pin"
            >
              {isPinned ? (
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 15 14"
                >
                  <path d="M14.6 4l-4-3.9a.4.4 0 00-.4 0 1.3 1.3 0 00-.3 1.5L6 5.1a1.7 1.7 0 00-2.5.1.4.4 0 000 .5l2.4 2.4-2.3 2.3-1.9 2-.8 1a.4.4 0 10.5.5l1-.8c1-.7 2-1.8 2.1-1.8L6.7 9 9 11.2a.4.4 0 00.5 0 1.7 1.7 0 00.1-2.4l3.6-4a1.3 1.3 0 001.5-.3.4.4 0 000-.5z"></path>
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 15 14"
                >
                  <path d="M14.6 4l-4-3.9a.4.4 0 00-.4 0 1.3 1.3 0 00-.3 1.5L6 5.1a1.7 1.7 0 00-2.5.1.4.4 0 000 .5l2.4 2.4-2.3 2.3-1.9 2-.8 1a.4.4 0 10.5.5l1-.8c1-.7 2-1.8 2.1-1.8L6.7 9 9 11.2a.4.4 0 00.5 0 1.7 1.7 0 00.1-2.4l3.6-4a1.3 1.3 0 001.5-.3.4.4 0 000-.5z"></path>
                </svg>
              )}
            </button>

            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="dashboard-game-block-controls__favorite p-2 hover:bg-gray-100 rounded"
              aria-label="Add to favorites"
            >
              {isFavorite ? (
                <StarIconSolid className="w-4 h-4 text-primary" />
              ) : (
                <StarIcon className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>

          {/* Middle: Teams and Scores */}
          <a
            href={`/match/${match.id}`}
            className="dashboard-game-block__link flex-1 mx-4"
          >
            <div className="ui-team-scores">
              <div className="ui-team-scores__top">
                <div className="ui-team-scores-teams flex flex-col md:flex-row md:items-center md:space-x-8">
                  {/* Team 1 */}
                  <div className="dashboard-game-team-info flex items-center mb-2 md:mb-0">
                    <div className="ui-team-score-name--nowrap flex items-center">
                      <div className="ui-team-icons mr-2">
                        <div className="ui-ico-team w-6 h-6 rounded-full overflow-hidden">
                          <img
                            src={match.team1.logo}
                            alt={match.team1.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${match.team1.abbreviation}&background=random`;
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {match.team1.name}
                      </span>
                    </div>
                  </div>

                  {/* Team 2 */}
                  <div className="dashboard-game-team-info flex items-center">
                    <div className="ui-team-score-name--nowrap flex items-center">
                      <div className="ui-team-icons mr-2">
                        <div className="ui-ico-team w-6 h-6 rounded-full overflow-hidden">
                          <img
                            src={match.team2.logo}
                            alt={match.team2.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${match.team2.abbreviation}&background=random`;
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {match.team2.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scores */}
                <div className="ui-team-scores-scores mt-2 md:mt-0">
                  <div className="ui-game-scores flex items-center space-x-3">
                    <div className="ui-game-scores__item flex items-center">
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center mr-2 ${match.scores.inning === "first" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                      >
                        <span className="text-xs font-bold">1</span>
                      </div>
                      <span className="font-semibold">
                        {match.scores.team1}
                      </span>
                    </div>
                    <div className="ui-game-scores__item flex items-center">
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center mr-2 ${match.scores.inning === "second" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                      >
                        <span className="text-xs font-bold">2</span>
                      </div>
                      <span className="font-semibold">
                        {match.scores.team2}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* Second Row: Action Buttons */}
        <div className="dashboard-game-block__row flex items-center justify-between">
          {/* Action Buttons */}
          <div className="dashboard-game-action-bar flex items-center space-x-2">
            {match.hasLiveStream && (
              <div className="dashboard-game-action-bar__group">
                <button className="dashboard-game-action-bar__item p-2 hover:bg-gray-100 rounded flex items-center text-sm text-blue-600">
                  <TvIcon className="w-4 h-4 mr-1" />
                  Live
                </button>
              </div>
            )}

            {(match.hasStats || match.hasOddsChart || match.hasDraw) && (
              <div className="dashboard-game-action-bar__group flex items-center space-x-1">
                {match.hasStats && (
                  <button
                    className="dashboard-game-action-bar__item p-2 hover:bg-gray-100 rounded"
                    title="Statistics"
                  >
                    <ChartBarIcon className="w-4 h-4 text-gray-600" />
                  </button>
                )}
                {match.hasOddsChart && (
                  <button
                    className="dashboard-game-action-bar__item p-2 hover:bg-gray-100 rounded"
                    title="Odds movement chart"
                  >
                    <ChartLineIcon className="w-4 h-4 text-gray-600" />
                  </button>
                )}
                {match.hasDraw && (
                  <button
                    className="dashboard-game-action-bar__item p-2 hover:bg-gray-100 rounded"
                    title="Draw"
                  >
                    <TableCellsIcon className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sub-games Toggle */}
          <button
            onClick={() => setShowSubGames(!showSubGames)}
            className="dashboard-game-block__toggle-sub-games p-2 hover:bg-gray-100 rounded"
            aria-label="Show sub-games"
          >
            {showSubGames ? (
              <ChevronUpIcon className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Betting Markets */}
      <div className="dashboard-markets bg-gray-50 px-4 py-3 border-t">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {match.marketGroups.map((group, index) => (
            <div
              key={index}
              className="dashboard-markets__group flex justify-between"
            >
              {group.values.map((value, i) => (
                <span
                  key={i}
                  className="dashboard-markets__market market w-[30%]"
                >
                  <button
                    className={`ui-market__toggle w-full py-2 px-3 rounded text-center transition-colors ${value !== "-" ? "bg-white hover:bg-blue-50 border border-gray-300 hover:border-blue-300" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                  >
                    <span className="ui-market__value font-semibold">
                      {value}
                    </span>
                  </button>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* More Markets Button */}
      <div className="px-4 py-2 border-t">
        <button className="dashboard-game-more w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center">
          <span className="dashboard-game-more__count font-semibold">
            {match.additionalMarkets}
            <div className="inline-block w-2 h-2 bg-green-400 rounded-full ml-2"></div>
          </span>
        </button>
      </div>

      {/* Sub-games Section (Collapsible) */}
      {showSubGames && (
        <div className="bg-gray-100 px-4 py-3 border-t">
          <div className="text-sm text-gray-600">
            Additional betting markets available...
          </div>
        </div>
      )}
    </li>
  );
};

export default MatchRow;
