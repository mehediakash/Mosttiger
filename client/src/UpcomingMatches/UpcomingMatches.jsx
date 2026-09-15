import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

const matches = [
  {
    id: 2,
    league: "ICC Women's World Cup",
    time: "2025-10-24T17:47:00",
    team1: {
      name: "Rcb",
      flag: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAoUUXbSosGqQSD2_3106dYaR1WymX6h_TohSthfXbAABfl6YuKeAozSyIx-Er83Njb-8A&s",
    },
    team2: {
      name: "Bangladesh W",
      flag: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Bangladesh_Cricket_Board_Logo.svg/250px-Bangladesh_Cricket_Board_Logo.svg.png",
    },
  },
  {
    id: 3,
    league: "Play back",
    time: "2025-11-15T14:43:00",
    team1: {
      name: "Mumbai",
      flag: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQTgNMYj3dia5BSOLrdqDdxgThHuwuP0L8f5JhSAEOp5BGZVTJSU1GA9nsGlbPfCwOC1xwOg&s",
    },
    team2: {
      name: "Dheli",
      flag: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2f/Delhi_Capitals.svg/1200px-Delhi_Capitals.svg.png",
    },
  },
  // Add more matches to see sliding effect
  {
    id: 4,
    league: "IPL Final",
    time: "2025-12-01T20:00:00",
    team1: {
      name: "CSK",
      flag: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSm6AcHdFUlsr1ca8BUBst3Q-PjzZQyslTcLWxSUZ75PDgo0LjHZFAn8ZJkR9Wo1kyvIBBy&s",
    },
    team2: {
      name: "MI",
      flag: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQTgNMYj3dia5BSOLrdqDdxgThHuwuP0L8f5JhSAEOp5BGZVTJSU1GA9nsGlbPfCwOC1xwOg&s",
    },
  },
];

const UpcomingMatchesSlider = () => {
  const [[page, direction], setPage] = React.useState([0, 0]);
  const [autoPlay, setAutoPlay] = React.useState(true);

  const paginate = (newDirection) => {
    setPage([page + newDirection, newDirection]);
  };

  // Auto slide every 5 seconds
  React.useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      paginate(1);
    }, 5000);
    return () => clearInterval(interval);
  }, [page, autoPlay]);

  const index = ((page % matches.length) + matches.length) % matches.length;

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-primary from-gray-900 via-[#205583] to-black py-12 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-black text-center mb-10  bg-clip-text bg-gradient-to-r  text-white"
        >
          Upcoming Matches
        </motion.h1>

        <div className="relative">
          {/* Slider Container */}
          <div className="overflow-hidden rounded-3xl shadow-2xl">
            <div
              className="relative h-[500px] md:h-[600px] bg-black/40 backdrop-blur-xl border border-white/10"
              onMouseEnter={() => setAutoPlay(false)}
              onMouseLeave={() => setAutoPlay(true)}
            >
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={page}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.3 },
                  }}
                  className="absolute inset-0 flex items-center justify-center p-6 md:p-12"
                >
                  {matches[index] && (
                    <div className="w-full max-w-5xl">
                      {/* League Header */}
                      <div className="text-center mb-8">
                        <span className="inline-block px-6 py-2 bg-gradient-to-r from-primary to-orange-600 text-white text-sm font-bold rounded-full shadow-lg animate-pulse">
                          UPCOMING
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 tracking-wider">
                          {matches[index].league}
                        </h2>
                      </div>

                      {/* Date & Time */}
                      <div className="text-center mb-10">
                        <p className="text-4xl md:text-6xl font-black text-[#205583]">
                          {format(new Date(matches[index].time), "dd MMM yyyy")}
                        </p>
                        <p className="text-2xl md:text-4xl text-[#205583] mt-2">
                          {format(new Date(matches[index].time), "hh:mm a")}
                        </p>
                      </div>

                      {/* Teams VS */}
                      <div className="grid grid-cols-3 items-center gap-8">
                        {/* Team 1 */}
                        <div className="flex flex-col items-center">
                          <div className="relative group mb-6">
                            <div className="absolute -inset-4 bg-[#205583]/50 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                            <img
                              src={matches[index].team1.flag}
                              alt={matches[index].team1.name}
                              className="relative w-32 h-32 md:w-48 md:h-48 object-cover rounded-full border-8 border-white/30 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:border-purple-500"
                            />
                          </div>
                          <h3 className="text-3xl md:text-5xl font-black text-white tracking-wider">
                            {matches[index].team1.name}
                          </h3>
                        </div>

                        {/* VS Animation */}
                        <div className="flex justify-center">
                          <motion.div
                            animate={{
                              scale: [1, 1.3, 1],
                              rotate: [0, -15, 15, -15, 0],
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="relative"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-[#205583] to-pink-600 rounded-full blur-3xl animate-ping"></div>
                            <div className="relative bg-gradient-to-r from-[#205583] to-pink-600 text-white text-6xl md:text-9xl font-black px-12 py-8 rounded-3xl shadow-2xl border-4 border-white/30">
                              VS
                            </div>
                          </motion.div>
                        </div>

                        {/* Team 2 */}
                        <div className="flex flex-col items-center">
                          <div className="relative group mb-6">
                            <div className="absolute -inset-4 bg-pink-600/50 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                            <img
                              src={matches[index].team2.flag}
                              alt={matches[index].team2.name}
                              className="relative w-32 h-32 md:w-48 md:h-48 object-cover rounded-full border-8 border-white/30 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:border-pink-500"
                            />
                          </div>
                          <h3 className="text-3xl md:text-5xl font-black text-white tracking-wider">
                            {matches[index].team2.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={() => paginate(-1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md hover:bg-white/30 text-white p-4 rounded-full shadow-2xl transition-all duration-300 z-10"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={() => paginate(1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md hover:bg-white/30 text-white p-4 rounded-full shadow-2xl transition-all duration-300 z-10"
            >
              <ChevronRight size={32} />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
              {matches.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage([i, i > index ? 1 : -1])}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    i === index
                      ? "bg-[#205583] w-12"
                      : "bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Auto-play indicator */}
        <div className="text-center mt-8">
          <p className="text-white/70 text-sm">Auto-sliding • Hover to pause</p>
        </div>
      </div>
    </div>
  );
};

export default UpcomingMatchesSlider;
