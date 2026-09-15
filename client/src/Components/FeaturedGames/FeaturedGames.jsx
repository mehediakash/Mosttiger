import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { cachedGet } from "../axios/axios";
import LoginModal from "../Modal/LoginModal";
import { useCasinoGame } from "../../hooks/useCasinoGame";
import { preloadImages, readCache, writeCache } from "../../utils/homeCache";
import { useTranslation } from "react-i18next";
const FEATURED_CACHE_KEY = "home:featuredGames";
const FEATURED_CACHE_TTL = 4 * 60 * 1000;

const FeaturedGames = () => {
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const dragFrameRef = useRef(null);
  const pendingDragXRef = useRef(null);

  const cachedFeatured = readCache(FEATURED_CACHE_KEY, FEATURED_CACHE_TTL);
  const [featuredGames, setFeaturedGames] = useState(() => {
    if (cachedFeatured.hasValue && Array.isArray(cachedFeatured.data)) {
      return cachedFeatured.data;
    }
    return [];
  });
  const [loading, setLoading] = useState(!cachedFeatured.hasValue);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { openGame, loading: gameLoading } = useCasinoGame();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    let mounted = true;

    const fetchFeaturedGames = async () => {
      try {
        const response = await cachedGet(
          "/api/games",
          {
            params: {
              featured: "true",
              is_active: "true",
              limit: 10,
            },
          },
          {
            ttl: 30 * 1000,
            key: "games:featured=true:is_active=true:limit=10",
          },
        );

        const games = response.data?.data?.games || [];
        const mappedGames = games.map((game) => ({
          id: game.game_code || game._id,
          title: game.game_name || "Unknown Game",
          image: game.image_url || "/placeholder.jpg",
          gameId: game._id,
          provider: game.brand || "Unknown",
          brand: game.brand || "Unknown",
        }));

        if (!mounted) return;

        setFeaturedGames(mappedGames);
        writeCache(FEATURED_CACHE_KEY, mappedGames);
        preloadImages(mappedGames.slice(0, 6).map((game) => game.image));
      } catch (error) {
        console.error("Failed to fetch featured games:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchFeaturedGames();

    return () => {
      mounted = false;
    };
  }, []);

  const launchGame = (game) => {
    if (!game?.id) return;

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const result = openGame(game);
    if (result?.requiresLogin) {
      setShowLoginModal(true);
    }
  };

  const handleWheel = (e) => {
    const container = scrollRef.current;
    if (!container) return;

    if (Math.abs(e.deltaY) > 0) {
      container.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e) => {
    const container = scrollRef.current;
    if (!container) return;

    setIsDragging(true);
    dragStartX.current = e.pageX - container.offsetLeft;
    dragScrollLeft.current = container.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const container = scrollRef.current;
    if (!container) return;

    pendingDragXRef.current = e.pageX - container.offsetLeft;

    if (dragFrameRef.current) return;

    dragFrameRef.current = requestAnimationFrame(() => {
      dragFrameRef.current = null;

      const x = pendingDragXRef.current;
      if (x == null) return;

      const walk = (x - dragStartX.current) * 1;
      container.scrollLeft = dragScrollLeft.current - walk;
    });
  };

  const stopDragging = () => {
    setIsDragging(false);
    pendingDragXRef.current = null;

    if (dragFrameRef.current) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
  };

  const handleTouchStart = (e) => {
    const container = scrollRef.current;
    if (!container) return;

    dragStartX.current = e.touches[0].pageX - container.offsetLeft;
    dragScrollLeft.current = container.scrollLeft;
  };

  const handleTouchMove = (e) => {
    const container = scrollRef.current;
    if (!container) return;

    const x = e.touches[0].pageX - container.offsetLeft;
    const walk = (x - dragStartX.current) * 1;
    container.scrollLeft = dragScrollLeft.current - walk;
  };
  const { t } = useTranslation();
  useEffect(() => {
    return () => {
      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full bg-[#050912] py-2">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="h-5 bg-primary rounded-full" style={{ width: 5 }} />
        <h2 className="text-[#F5FAFF] text-sm sm:text-base font-semibold">
          {t("FeaturedGames")}
        </h2>
      </div>

      <div
        ref={scrollRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDragging}
        className={`flex items-start gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar scroll-smooth select-none pb-2 transform-gpu will-change-transform ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          WebkitOverflowScrolling: "touch",
          scrollBehavior: "smooth",
        }}
      >
        {loading && featuredGames.length === 0 ? (
          <div className="flex items-center justify-center w-full h-32">
            <div className="h-4 w-44 rounded bg-white/10 animate-pulse" />
          </div>
        ) : featuredGames.length > 0 ? (
          featuredGames.map((game) => (
            <button
              key={game.id}
              onClick={() => launchGame(game)}
              disabled={gameLoading}
              className="shrink-0 bg-[#0B1220] border border-[#16314D] hover:border-primary/50 rounded-md overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ width: 150 }}
            >
              <div className="relative">
                <img
                  src={game.image}
                  alt={game.title}
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  className="w-full object-contain bg-[#050912] transition-all duration-300"
                  style={{ height: 95, padding: 2 }}
                />
              </div>

              <div className="px-2 py-2">
                <p className="text-[#F5FAFF] text-xs sm:text-sm font-medium truncate">
                  {game.title}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="flex items-center justify-center w-full h-32">
            <p className="text-white/50 text-sm">No featured games available</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0B1220;
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(24, 200, 255, 0.5);
          border-radius: 999px;
          transition: all 0.3s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 229, 255, 0.85);
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(24, 200, 255, 0.5) #0B1220;
        }
      `}</style>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};

export default React.memo(FeaturedGames);
