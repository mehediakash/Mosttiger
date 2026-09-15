// components/Header.jsx
import React from 'react';
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassCircleIcon } from '@heroicons/react/24/solid';

const Header = ({ tabs, activeTab, setActiveTab, searchQuery, setSearchQuery }) => {
  return (
    <div className="central-menu">
      <div className="central-menu-header central-menu__bar bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-lg">
        {/* Breadcrumbs */}
        <nav className="ui-breadcrumbs central-menu-header__breadcrumbs px-4 py-3 border-b border-blue-500">
          <div className="flex items-center space-x-2">
            <a href="/en/live" className="ui-breadcrumbs-point flex items-center hover:text-blue-200 transition-colors">
              <HomeIcon className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">LIVE (568)</span>
            </a>
            
            <ChevronRightIcon className="w-4 h-4 text-blue-300" />
            
            <span className="ui-breadcrumbs-point ui-breadcrumbs-point--current flex items-center">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center mr-2">
                <span className="text-blue-600 font-bold text-xs">1</span>
              </div>
              <span className="text-sm font-medium">Football</span>
            </span>
            
            <ChevronRightIcon className="w-4 h-4 text-blue-300" />
            
            <span className="ui-breadcrumbs-point ui-breadcrumbs-point--current flex items-center">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center mr-2">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <span className="text-sm font-medium">Championship</span>
            </span>
          </div>
        </nav>

        {/* Tabs and Search Section */}
        <div className="central-menu-header__block px-4 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
            {/* Tabs */}
            <div className="match-tab-filter-app central-menu-header__filter">
              <ul className="ui-switches flex space-x-1 overflow-x-auto pb-1">
                {tabs.map((tab) => (
                  <li key={tab.id} className="ui-switches-item flex-shrink-0">
                    <label className={`ui-switch flex items-center px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === tab.id ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:text-white'}`}>
                      <input 
                        type="radio" 
                        checked={activeTab === tab.id}
                        onChange={() => setActiveTab(tab.id)}
                        className="hidden"
                      />
                      <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* Search */}
            <div className="games-search-app flex-shrink-0">
              <div className="relative">
                <div className="ui-search-default flex items-center bg-white rounded-lg overflow-hidden shadow-sm">
                  <input 
                    type="text" 
                    placeholder="Search by match" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ui-search-default__input px-4 py-2 w-48 lg:w-64 focus:outline-none text-gray-800"
                  />
                  <button className="ui-search-button bg-blue-700 hover:bg-blue-800 px-4 py-2 transition-colors">
                    <MagnifyingGlassCircleIcon className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;