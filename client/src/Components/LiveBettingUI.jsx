// App.jsx
import React, { useState, useEffect } from "react";
import SportsSidebar from "../Components/Sports/SportsSidebar";
import MatchesSection from "../Components/MatchesSection";
import MatchSearch from "../Components/MatchSearch";
import LiveMatches from "../Components/LiveMatches";
import DemoData from "../Components/data/DemoData";

function App() {
  const [activeSport, setActiveSport] = useState("all");
  const [matches, setMatches] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);

  useEffect(() => {
    // Load all matches initially
    setMatches(DemoData.getAllMatches());
    setLiveMatches(DemoData.getLiveMatches());
  }, []);

  const handleSportChange = (sport) => {
    setActiveSport(sport);
    if (sport === "all") {
      setMatches(DemoData.getAllMatches());
    } else {
      setMatches(DemoData.getMatchesBySport(sport));
    }
  };

  const handleSearch = (searchTerm) => {
    if (!searchTerm.trim()) {
      setMatches(DemoData.getAllMatches());
    } else {
      const filtered = DemoData.getAllMatches().filter(
        (match) =>
          match.team1.toLowerCase().includes(searchTerm.toLowerCase()) ||
          match.team2.toLowerCase().includes(searchTerm.toLowerCase()) ||
          match.tournament.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setMatches(filtered);
    }
  };

  return (
    <div className="min-h-screen bg-primary from-gray-900 to-gray-950 text-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left sidebar with sports */}
          <div className="lg:w-1/5">
            <SportsSidebar
              activeSport={activeSport}
              onSportChange={handleSportChange}
            />
          </div>

          {/* Main content area */}
          <div className="lg:w-3/5">
            {/* Quick navigation */}
            <div className="flex border-b border-gray-700 mb-6">
              <button
                className={`px-6 py-3 font-medium ${activeSport === "all" ? "border-b-2 border-primary text-primary" : "text-gray-400 hover:text-gray-300"}`}
              >
                Recommended
              </button>
              <button
                className={`px-6 py-3 font-medium ${activeSport === "live" ? "border-b-2 border-primary text-primary" : "text-gray-400 hover:text-gray-300"}`}
              >
                Upcoming events
              </button>
              <button className="px-6 py-3 font-medium text-gray-400 hover:text-gray-300">
                1st period
              </button>
              <button className="px-6 py-3 font-medium text-gray-400 hover:text-gray-300">
                2nd period
              </button>
            </div>

            {/* Live matches section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                Live Matches
              </h2>
              <LiveMatches matches={liveMatches} />
            </div>

            {/* Matches section */}
            <MatchesSection matches={matches} activeSport={activeSport} />
          </div>

          {/* Right sidebar - Match search/betting panel */}
          <div className="lg:w-1/5">
            <MatchSearch />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
