// components/CricketTournament.jsx
import React from 'react';
import MatchRow from './MatchRow';
// import { ChevronDownIcon } from '@heroicons/react/24/outline';

const CricketTournament = ({ tournament }) => {
  return (
    <li className="dashboard-champ bg-white border-b last:border-b-0">
      {/* Tournament Header */}
      <div className="dashboard-champ-body__head bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          {/* Tournament Name */}
          <div className="dashboard-champ-name flex items-center mb-3 md:mb-0">
            <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center mr-3">
              <span className="text-blue-600 font-bold">🏏</span>
            </div>
            <a href={`/en/live/cricket/${tournament.id}`} className="dashboard-champ-name__label flex items-center hover:text-blue-600">
              <div className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center mr-2">
                <span className="text-xs">{tournament.flag}</span>
              </div>
              <span className="font-semibold text-gray-800">
                {tournament.name}
              </span>
            </a>
          </div>

          {/* Market Groups */}
          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
            {/* 1X2 Group */}
            <div className="dashboard-market-group flex items-center space-x-1">
              <span className="dashboard-market-group__label px-2 py-1 text-xs font-medium bg-gray-200 rounded">1</span>
              <div className="ui-overlay-dropdown relative">
                <div className="ui-overlay-dropdown__trigger">
                  <button className="dashboard-market-group__trigger flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50">
                    <span className="mr-1">X</span>
                    {/* <ChevronDownIcon className="w-3 h-3" /> */}
                  </button>
                </div>
              </div>
              <span className="dashboard-market-group__label px-2 py-1 text-xs font-medium bg-gray-200 rounded">2</span>
            </div>

            {/* Total Group */}
            <div className="dashboard-market-group flex items-center space-x-1">
              <span className="dashboard-market-group__label px-2 py-1 text-xs font-medium bg-gray-200 rounded">O</span>
              <div className="ui-overlay-dropdown relative">
                <div className="ui-overlay-dropdown__trigger">
                  <button className="dashboard-market-group__trigger flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50">
                    <span className="mr-1">Total</span>
                    {/* <ChevronDownIcon className="w-3 h-3" /> */}
                  </button>
                </div>
              </div>
              <span className="dashboard-market-group__label px-2 py-1 text-xs font-medium bg-gray-200 rounded">U</span>
            </div>

            {/* IT1 Group */}
            <div className="dashboard-market-group flex items-center space-x-1">
              <span className="dashboard-market-group__label px-2 py-1 text-xs font-medium bg-gray-200 rounded">O</span>
              <div className="ui-overlay-dropdown relative">
                <div className="ui-overlay-dropdown__trigger">
                  <button className="dashboard-market-group__trigger flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50">
                    <span className="mr-1">IT1</span>
                    {/* <ChevronDownIcon className="w-3 h-3" /> */}
                  </button>
                </div>
              </div>
              <span className="dashboard-market-group__label px-2 py-1 text-xs font-medium bg-gray-200 rounded">U</span>
            </div>

            {/* More Markets Link */}
            <div className="dashboard-champ__more">
              <a href={`/en/live/cricket/${tournament.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                +{tournament.totalMarkets}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Matches List */}
      <ul className="dashboard-champ-body__games divide-y divide-gray-100">
        {tournament.matches.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </ul>
    </li>
  );
};

export default CricketTournament;