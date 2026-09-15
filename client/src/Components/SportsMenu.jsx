// components/SportsMenu.jsx
import React from 'react';
// import { ChevronDownIcon } from '@heroicons/react/24/outline';

const SportsMenu = ({ sports, activeSport, setActiveSport }) => {
  return (
    <div className="central-menu-toolbar__sports bg-white border-b">
      <div className="nav-sport-menu-app">
        <div className="nav-menu nav-sport-menu-app__menu">
          {/* Sports List */}
          <ul className="ui-switches menu-sport-list flex space-x-1 overflow-x-auto px-4 py-3">
            {sports.map((sport) => (
              <li key={sport.id} className="ui-switches-item flex-shrink-0">
                <div className="ui-overlay-dropdown menu-sport-dropdown">
                  <div className="ui-overlay-dropdown__trigger">
                    <label className={`ui-switch flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all min-w-[70px] ${activeSport === sport.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${activeSport === sport.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        {sport.icon}
                      </div>
                      <span className="text-xs font-medium text-center">{sport.name}</span>
                      <input 
                        type="checkbox" 
                        checked={activeSport === sport.id}
                        onChange={() => setActiveSport(sport.id)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Additional Controls */}
          <div className="border-t px-4 py-2">
            <div className="flex justify-between items-center">
              <div className="nav-menu__controls flex space-x-2">
                {/* Other Sports Dropdown */}
                <div className="ui-overlay-dropdown menu-dropdown">
                  <div className="ui-overlay-dropdown__trigger">
                    <button className="ui-dropdown-trigger flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                      <svg className="w-5 h-5 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      Other
                      {/* <ChevronDownIcon className="w-4 h-4 ml-2" /> */}
                    </button>
                  </div>
                </div>

                {/* Esports Dropdown */}
                <div className="ui-overlay-dropdown menu-dropdown">
                  <div className="ui-overlay-dropdown__trigger">
                    <button className="ui-dropdown-trigger flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                      <svg className="w-5 h-5 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM4 10a6 6 0 1112 0 6 6 0 01-12 0z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M10 6a4 4 0 100 8 4 4 0 000-8zM6 10a4 4 0 118 0 4 4 0 01-8 0z" clipRule="evenodd" />
                      </svg>
                      Esports
                      {/* <ChevronDownIcon className="w-4 h-4 ml-2" /> */}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SportsMenu;