import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { FaCalendar, FaTrophy, FaClock, FaStar, FaPlay } from "react-icons/fa";

const Sports = () => {
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [selectedSport, setSelectedSport] = useState("football");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading upcoming matches
    const loadUpcomingMatches = async () => {
      // In a real app, this would fetch from your sports API
      const mockMatches = {
        football: [
          {
            id: 1,
            league: "Premier League",
            homeTeam: "Manchester City",
            awayTeam: "Liverpool",
            date: "2024-01-20",
            time: "17:30",
            odds: { home: 1.85, draw: 3.6, away: 4.2 },
            popular: true,
          },
          {
            id: 2,
            league: "La Liga",
            homeTeam: "Real Madrid",
            awayTeam: "Barcelona",
            date: "2024-01-21",
            time: "20:00",
            odds: { home: 2.1, draw: 3.4, away: 3.2 },
            popular: true,
          },
          {
            id: 3,
            league: "Serie A",
            homeTeam: "Juventus",
            awayTeam: "Inter Milan",
            date: "2024-01-22",
            time: "19:45",
            odds: { home: 2.4, draw: 3.2, away: 2.8 },
            popular: false,
          },
        ],
        cricket: [
          {
            id: 4,
            league: "IPL",
            homeTeam: "Royal Challengers Bangalore",
            awayTeam: "Kolkata Knight Riders",
            date: "2024-01-25",
            time: "19:30",
            odds: { home: 1.9, away: 1.9 },
            popular: true,
          },
          {
            id: 5,
            league: "BPL",
            homeTeam: "Dhaka Dynamites",
            awayTeam: "Chittagong Vikings",
            date: "2024-01-26",
            time: "18:00",
            odds: { home: 1.75, away: 2.1 },
            popular: false,
          },
        ],
        basketball: [
          {
            id: 6,
            league: "NBA",
            homeTeam: "Boston Celtics",
            awayTeam: "Golden State Warriors",
            date: "2024-01-23",
            time: "03:00",
            odds: { home: 1.65, away: 2.25 },
            popular: true,
          },
        ],
        tennis: [
          {
            id: 7,
            league: "ATP",
            homeTeam: "Carlos Alcaraz",
            awayTeam: "Daniil Medvedev",
            date: "2024-01-24",
            time: "16:00",
            odds: { home: 1.8, away: 2.0 },
            popular: false,
          },
        ],
      };
      setUpcomingMatches(mockMatches);
      setLoading(false);
    };

    loadUpcomingMatches();
  }, []);

  const sports = [
    { id: "football", name: "Football", icon: FaTrophy },
    { id: "cricket", name: "Cricket", icon: FaTrophy },
    { id: "basketball", name: "Basketball", icon: FaTrophy },
    { id: "tennis", name: "Tennis", icon: FaTrophy },
  ];

  const currentMatches = upcomingMatches[selectedSport] || [];

  return (
    <>
      <Helmet>
        <title>Sports Betting - ck369 BD | Bet on Your Favorite Sports</title>
        <meta
          name="description"
          content="Place bets on football, cricket, basketball, tennis and more at ck369 BD. Competitive odds, live scores, and comprehensive sports coverage."
        />
        <meta
          name="keywords"
          content="sports betting Bangladesh, football betting, cricket betting, basketball odds, tennis betting, ck369 BD sports"
        />
        <meta property="og:title" content="Sports Betting - ck369 BD" />
        <meta
          property="og:description"
          content="Bet on your favorite sports with competitive odds and comprehensive coverage."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://ck369bd.com/sports" />
      </Helmet>

      <div className="min-h-screen bg-primary from-[#0f2a47] via-[#205583] to-[#0f2a47]">
        {/* Hero Section */}
        <section className="relative py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                Sports
              </span>{" "}
              Betting
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-8">
              Bet on your favorite sports with competitive odds and
              comprehensive coverage. From football to cricket, basketball to
              tennis - we've got it all.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#upcoming-matches"
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                View Matches
              </a>
              <a
                href="/live-betting"
                className="border-2 border-white/30 hover:border-white/50 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300"
              >
                Live Betting
              </a>
            </div>
          </div>
        </section>

        {/* Sports Navigation */}
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

        {/* Upcoming Matches */}
        <section id="upcoming-matches" className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">
                Upcoming {sports.find((s) => s.id === selectedSport)?.name}{" "}
                Matches
              </h2>
              <div className="flex items-center gap-2 text-white/60">
                <FaCalendar className="text-sm" />
                <span>Next 7 days</span>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentMatches.map((match) => (
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
                        <div className="flex items-center gap-2 text-white/60">
                          <FaCalendar className="text-sm" />
                          <span className="text-sm">
                            {new Date(match.date).toLocaleDateString()}
                          </span>
                          <FaClock className="text-sm ml-2" />
                          <span className="text-sm">{match.time}</span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 items-center">
                        {/* Teams */}
                        <div className="text-center">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold text-lg">
                              {match.homeTeam}
                            </span>
                            <span className="text-white/60 mx-4">vs</span>
                            <span className="text-white font-bold text-lg">
                              {match.awayTeam}
                            </span>
                          </div>
                        </div>

                        {/* Odds */}
                        <div className="flex justify-center gap-2">
                          {selectedSport === "football" ||
                          selectedSport === "basketball" ? (
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

                        {/* Bet Now Button */}
                        <div className="flex justify-end">
                          <button className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105">
                            <FaPlay className="text-sm" />
                            Bet Now
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
              Why Bet with Us?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Competitive Odds",
                  description:
                    "Get the best odds on all major sporting events with our competitive pricing.",
                  icon: FaTrophy,
                },
                {
                  title: "Live Streaming",
                  description:
                    "Watch matches live on our platform while placing your bets in real-time.",
                  icon: FaPlay,
                },
                {
                  title: "Multiple Markets",
                  description:
                    "Bet on match winners, over/under, handicaps, and many other markets.",
                  icon: FaStar,
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

        {/* Popular Leagues */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
              Popular Leagues
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { name: "Premier League", country: "England", matches: 380 },
                { name: "La Liga", country: "Spain", matches: 380 },
                { name: "Serie A", country: "Italy", matches: 380 },
                { name: "IPL", country: "India", matches: 74 },
                { name: "NBA", country: "USA", matches: 1230 },
                { name: "ATP", country: "World", matches: 2000 },
                { name: "BPL", country: "Bangladesh", matches: 46 },
                { name: "Champions League", country: "Europe", matches: 125 },
              ].map((league, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center hover:border-white/20 transition-all duration-300 cursor-pointer"
                >
                  <h3 className="text-xl font-bold text-white mb-2">
                    {league.name}
                  </h3>
                  <p className="text-white/60 text-sm mb-2">{league.country}</p>
                  <p className="text-primary text-sm">
                    {league.matches} matches
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
              Ready to Start Betting?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of sports fans who trust ck369 BD for their betting
              needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Create Account & Bet
              </a>
              <a
                href="/live-betting"
                className="border-2 border-white/30 hover:border-white/50 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300"
              >
                Try Live Betting
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Sports;
