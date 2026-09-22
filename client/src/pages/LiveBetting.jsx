import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  FaPlay,
  FaCalendar,
  FaTrophy,
  FaClock,
  FaUsers,
  FaStar,
} from "react-icons/fa";

const LiveBetting = () => {
  const [liveMatches, setLiveMatches] = useState([]);
  const [selectedSport, setSelectedSport] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading live matches
    const loadLiveMatches = async () => {
      // In a real app, this would fetch from your sports API
      const mockMatches = [
        {
          id: 1,
          sport: "football",
          league: "Premier League",
          homeTeam: "Arsenal",
          awayTeam: "Chelsea",
          score: "2-1",
          time: "67'",
          status: "live",
          odds: { home: 2.1, draw: 3.4, away: 3.2 },
          popular: true,
        },
        {
          id: 2,
          sport: "cricket",
          league: "IPL",
          homeTeam: "Mumbai Indians",
          awayTeam: "Chennai Super Kings",
          score: "145/3 (18.2)",
          time: "Live",
          status: "live",
          odds: { home: 1.85, away: 1.95 },
          popular: true,
        },
        {
          id: 3,
          sport: "basketball",
          league: "NBA",
          homeTeam: "Lakers",
          awayTeam: "Warriors",
          score: "89-76",
          time: "3rd Qtr",
          status: "live",
          odds: { home: 1.75, away: 2.05 },
          popular: false,
        },
        {
          id: 4,
          sport: "tennis",
          league: "ATP",
          homeTeam: "Novak Djokovic",
          awayTeam: "Rafael Nadal",
          score: "6-4, 3-2",
          time: "Live",
          status: "live",
          odds: { home: 1.45, away: 2.7 },
          popular: false,
        },
      ];
      setLiveMatches(mockMatches);
      setLoading(false);
    };

    loadLiveMatches();
  }, []);

  const sports = [
    { id: "all", name: "All Sports", icon: FaTrophy },
    { id: "football", name: "Football", icon: FaTrophy },
    { id: "cricket", name: "Cricket", icon: FaTrophy },
    { id: "basketball", name: "Basketball", icon: FaTrophy },
    { id: "tennis", name: "Tennis", icon: FaTrophy },
  ];

  const filteredMatches =
    selectedSport === "all"
      ? liveMatches
      : liveMatches.filter((match) => match.sport === selectedSport);

  return (
    <>
      <Helmet>
        <title>Live Betting - ck369 BD | Bet on Live Sports</title>
        <meta
          name="description"
          content="Place bets on live sports matches at ck369 BD. Real-time odds, live scores, and in-play betting on football, cricket, basketball, and more."
        />
        <meta
          name="keywords"
          content="live betting Bangladesh, in-play betting, live sports odds, real-time betting, ck369 BD live"
        />
        <meta property="og:title" content="Live Betting - ck369 BD" />
        <meta
          property="og:description"
          content="Experience the thrill of live betting with real-time odds and instant results."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://ck369bd.com/live-betting" />
      </Helmet>

      <div className="min-h-screen bg-primary from-[#0f2a47] via-[#205583] to-[#0f2a47]">
        {/* Hero Section */}
        <section className="relative py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                Live
              </span>{" "}
              Betting
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-8">
              Experience the excitement of live betting with real-time odds that
              change as the action unfolds. Bet on your favorite sports while
              watching the games live.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#live-matches"
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                View Live Matches
              </a>
              <div className="flex items-center gap-2 text-white/60">
                <FaUsers className="text-green-400" />
                <span>1,247 players online</span>
              </div>
            </div>
          </div>
        </section>

        {/* Sports Filter */}
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => setSelectedSport(sport.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 ${
                    selectedSport === sport.id
                      ? "bg-gradient-to-r from-primary to-orange-500 text-black font-bold"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30"
                  }`}
                >
                  <sport.icon className="text-sm" />
                  {sport.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Live Matches */}
        <section id="live-matches" className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">Live Matches</h2>
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/80">Live Now</span>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMatches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <span className="text-white/60 text-sm">
                            {match.league}
                          </span>
                          {match.popular && (
                            <div className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-1 rounded-full text-xs font-bold">
                              <FaStar className="text-xs" />
                              POPULAR
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-sm font-bold">
                            {match.time}
                          </span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 items-center">
                        {/* Teams and Score */}
                        <div className="text-center">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-bold text-lg">
                              {match.homeTeam}
                            </span>
                            <span className="text-white/60">vs</span>
                            <span className="text-white font-bold text-lg">
                              {match.awayTeam}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {match.score}
                          </div>
                        </div>

                        {/* Odds */}
                        <div className="flex justify-center gap-2">
                          {match.sport === "football" ||
                          match.sport === "basketball" ? (
                            <div className="flex gap-2">
                              <button className="bg-white/10 hover:bg-primary/20 text-white px-4 py-2 rounded-lg transition-colors duration-200 min-w-[60px]">
                                {match.odds.home}
                              </button>
                              <button className="bg-white/10 hover:bg-primary/20 text-white px-4 py-2 rounded-lg transition-colors duration-200 min-w-[60px]">
                                {match.odds.draw || "N/A"}
                              </button>
                              <button className="bg-white/10 hover:bg-primary/20 text-white px-4 py-2 rounded-lg transition-colors duration-200 min-w-[60px]">
                                {match.odds.away}
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button className="bg-white/10 hover:bg-primary/20 text-white px-4 py-2 rounded-lg transition-colors duration-200 min-w-[60px]">
                                {match.odds.home}
                              </button>
                              <button className="bg-white/10 hover:bg-primary/20 text-white px-4 py-2 rounded-lg transition-colors duration-200 min-w-[60px]">
                                {match.odds.away}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Watch Live Button */}
                        <div className="flex justify-end">
                          <button className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105">
                            <FaPlay className="text-sm" />
                            Watch Live
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
              Why Choose Live Betting?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Real-Time Odds",
                  description:
                    "Odds update instantly as the match progresses, giving you the best opportunities to bet.",
                  icon: FaClock,
                },
                {
                  title: "Live Streaming",
                  description:
                    "Watch matches live on our platform while placing bets in real-time.",
                  icon: FaPlay,
                },
                {
                  title: "Cash Out",
                  description:
                    "Lock in profits or minimize losses with our cash out feature during live matches.",
                  icon: FaTrophy,
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center"
                >
                  <feature.icon className="text-4xl text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-white/80 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Experience Live Betting?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of players who enjoy the thrill of live betting
              with real-time action.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Start Live Betting Now
              </a>
              <a
                href="/sports"
                className="border-2 border-white/30 hover:border-white/50 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300"
              >
                View All Sports
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default LiveBetting;
