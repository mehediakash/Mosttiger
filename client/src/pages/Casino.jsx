import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { FaPlay, FaStar, FaFire, FaCrown, FaShieldAlt } from "react-icons/fa";
import { useSelector } from "react-redux";

const Casino = () => {
  const { user } = useSelector((state) => state.auth);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading games
    const loadGames = async () => {
      // In a real app, this would fetch from your API
      const mockGames = [
        {
          id: 1,
          name: "Sweet Magic",
          provider: "JILI",
          image: "/api/placeholder/300/200",
          category: "Slots",
          rating: 4.8,
          hot: true,
        },
        {
          id: 2,
          name: "Fortune Gems",
          provider: "PG",
          image: "/api/placeholder/300/200",
          category: "Slots",
          rating: 4.9,
          hot: false,
        },
        {
          id: 3,
          name: "Dragon Tiger",
          provider: "JILI",
          image: "/api/placeholder/300/200",
          category: "Table",
          rating: 4.7,
          hot: true,
        },
        {
          id: 4,
          name: "Baccarat Deluxe",
          provider: "Evolution",
          image: "/api/placeholder/300/200",
          category: "Table",
          rating: 4.6,
          hot: false,
        },
        {
          id: 5,
          name: "Crazy Time",
          provider: "Evolution",
          image: "/api/placeholder/300/200",
          category: "Live",
          rating: 4.9,
          hot: true,
        },
        {
          id: 6,
          name: "Mega Wheel",
          provider: "Pragmatic",
          image: "/api/placeholder/300/200",
          category: "Live",
          rating: 4.8,
          hot: false,
        },
      ];
      setGames(mockGames);
      setLoading(false);
    };

    loadGames();
  }, []);

  const categories = ["All", "Slots", "Table", "Live", "Jackpot"];

  return (
    <>
      <Helmet>
        <title>Casino Games - mosttiger BD | Play Online Casino Games</title>
        <meta
          name="description"
          content="Play the best online casino games at mosttiger BD. Enjoy slots, table games, live casino, and jackpot games with real money betting."
        />
        <meta
          name="keywords"
          content="online casino Bangladesh, casino games, slots, table games, live casino, jackpot games, mosttiger BD"
        />
        <meta property="og:title" content="Casino Games - mosttiger BD" />
        <meta
          property="og:description"
          content="Experience world-class casino gaming with thousands of games from top providers."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://mosttigerbd.com/casino" />
      </Helmet>

      <div className="min-h-screen bg-primary from-[#0f2a47] via-[#205583] to-[#0f2a47]">
        {/* Hero Section */}
        <section className="relative py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                Casino
              </span>{" "}
              Games
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-8">
              Experience the thrill of world-class casino gaming with thousands
              of games from top providers. Play slots, table games, and live
              casino with real money betting.
            </p>
            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/register"
                  className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
                >
                  Start Playing Now
                </a>
                <a
                  href="/login"
                  className="border-2 border-white/30 hover:border-white/50 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300"
                >
                  Login to Play
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Categories */}
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {categories.map((category) => (
                <button
                  key={category}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Games Grid */}
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="relative">
                      <img
                        src={game.image}
                        alt={game.name}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {game.hot && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <FaFire className="text-xs" />
                          HOT
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        <FaStar className="text-primary text-xs" />
                        {game.rating}
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-3 px-6 rounded-xl flex items-center gap-2 transform hover:scale-105 transition-all duration-300">
                          <FaPlay className="text-sm" />
                          Play Now
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-bold text-lg mb-1">
                        {game.name}
                      </h3>
                      <p className="text-white/60 text-sm mb-2">
                        {game.provider}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-primary text-sm font-medium">
                          {game.category}
                        </span>
                        <span className="text-white/40 text-xs">
                          {game.provider}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
              Why Choose Our Casino?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: FaCrown,
                  title: "Premium Providers",
                  description:
                    "Games from world-renowned providers like JILI, Pragmatic Play, and Evolution Gaming.",
                },
                {
                  icon: FaShieldAlt,
                  title: "Fair & Secure",
                  description:
                    "All games use provably fair systems ensuring random and unbiased outcomes.",
                },
                {
                  icon: FaFire,
                  title: "Instant Play",
                  description:
                    "No downloads required. Play instantly on any device with our HTML5 games.",
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
              Ready to Win Big?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of players who trust mosttiger BD for their casino
              gaming experience.
            </p>
            <a
              href={user ? "/casino" : "/register"}
              className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 inline-block"
            >
              {user ? "Browse All Games" : "Create Account & Play"}
            </a>
          </div>
        </section>
      </div>
    </>
  );
};

export default Casino;
