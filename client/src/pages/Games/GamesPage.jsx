import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { IoChevronBack } from "react-icons/io5";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../Components/axios/axios";
import LoginModal from "../../Components/Modal/LoginModal";
import ProviderFilterBar from "./components/ProviderFilterBar";
import GamesGrid from "./components/GamesGrid";
import { useDebounce } from "./hooks/useDebounce";
import { normalizeProviderName } from "../../utils/normalizeProvider";
import { useCasinoGame } from "../../hooks/useCasinoGame";

export default function GamesPage() {
  // ================= URL PARAMS =================
  const [searchParams, setSearchParams] = useSearchParams();
  // support both 'providers' (preferred) and legacy 'provider' param
  const providerParam =
    searchParams.get("providers") || searchParams.get("provider");
  const searchParam = searchParams.get("search");

  // ================= STATE =================
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [allProviders, setAllProviders] = useState([]);
  const [selectedProviders, setSelectedProviders] = useState(
    providerParam ? providerParam.split(",") : [],
  );
  const [searchTerm, setSearchTerm] = useState(searchParam || "");
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Mobile-only provider auto-scroll refs. These do not affect business logic;
  // they only keep the active pill visible inside the horizontal provider bar.
  const providerRefs = useRef({});
  const providerScrollRef = useRef(null);

  const { openGame, loading: gameLoading } = useCasinoGame();

  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // ================= DEBOUNCE SEARCH =================
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    // This forces the window to scroll to the very top (0, 0) on load
    window.scrollTo(0, 0);
  }, []);

  // ================= FETCH PROVIDERS =================
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await api.get("/api/games/providers");
        let providersData = Array.isArray(response.data?.data)
          ? response.data.data
          : response.data?.data?.providers || [];

        // Map to provider names
        let providers = providersData.map((p) =>
          typeof p === "string" ? p : p.brand || p,
        );

        // Deduplicate and sort
        providers = Array.from(new Set(providers))
          .filter((p) => p && p.trim())
          .sort();

        setAllProviders(providers);

        // If URL has provider query param, map param values to actual provider names
        if (providerParam) {
          const paramList = providerParam
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);

          const matched = [];
          paramList.forEach((pp) => {
            const npp = normalizeProviderName(pp);
            const hit = providers.find(
              (pr) => normalizeProviderName(pr) === npp,
            );
            if (hit) matched.push(hit);
          });

          if (matched.length > 0) {
            setSelectedProviders(matched);
          }
        }
      } catch (error) {
        console.error("Failed to fetch providers:", error);
        setAllProviders([]);
      }
    };

    fetchProviders();
  }, []);

  // respond to URL provider(s) changes while page is mounted
  useEffect(() => {
    const param = searchParams.get("providers") || searchParams.get("provider");
    if (!allProviders || allProviders.length === 0) return;

    if (param) {
      const paramList = param
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const matched = [];
      paramList.forEach((pp) => {
        const npp = normalizeProviderName(pp);
        const hit = allProviders.find(
          (pr) => normalizeProviderName(pr) === npp,
        );
        if (hit) matched.push(hit);
      });

      setSelectedProviders(matched);
    } else {
      setSelectedProviders([]);
    }
  }, [searchParams, allProviders]);

  // ================= FETCH GAMES =================
  const fetchGames = useCallback(
    async (pageNum = 1, reset = false) => {
      try {
        setLoading(true);

        const params = new URLSearchParams();
        params.append("page", pageNum);
        params.append("limit", 20);
        params.append("is_active", "true");

        if (debouncedSearchTerm) {
          params.append("search", debouncedSearchTerm);
        } else if (selectedProviders.length > 0) {
          // Keep provider filtering for normal browsing, but make search global.
          params.append("brand", selectedProviders.join(","));
        }

        const response = await api.get("/api/games", { params });

        const newGames =
          response.data?.data?.games ||
          response.data?.games ||
          response.data ||
          [];

        const mappedGames = newGames.map((game) => ({
          id: game.game_code || game._id,
          title: game.game_name || "Unknown Game",
          image: game.image_url || "/placeholder.jpg",
          category: game.category || "Casino",
          provider: game.brand || "Unknown",
          code: game.game_code,
        }));

        if (reset) {
          if (process.env.NODE_ENV !== "production") {
            // Dev logs
            // eslint-disable-next-line no-console
            console.debug("GamesPage: fetchGames reset", {
              pageNum,
              mapped: mappedGames.length,
              provider: selectedProviders,
            });
          }

          setGames(mappedGames);
          setHasMore(mappedGames.length === 20);
        } else {
          // Prevent duplicates and determine how many *new* items were actually added.
          setGames((prev) => {
            const existingIds = new Set(prev.map((g) => g.id));
            const filtered = mappedGames.filter((g) => !existingIds.has(g.id));

            if (process.env.NODE_ENV !== "production") {
              // Dev logs for debugging infinite-scroll issues
              // eslint-disable-next-line no-console
              console.debug("GamesPage: fetchGames", {
                pageNum,
                apiReturned: mappedGames.length,
                newAdded: filtered.length,
                prevTotal: prev.length,
                provider: selectedProviders,
              });
            }

            const next = [...prev, ...filtered];

            // Set hasMore based on whether the API returned a full page of *new* items.
            // This prevents the case where API returns 20 items but all were duplicates
            // (so nothing gets appended) which would otherwise keep hasMore=true
            // and cause repeated empty loads.
            setHasMore(filtered.length === 20);

            return next;
          });
        }
      } catch (error) {
        console.error("Failed to fetch games:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [selectedProviders, debouncedSearchTerm],
  );

  // ================= SYNC URL WITH FILTERS =================
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedProviders.length > 0) {
      params.set("providers", selectedProviders.join(","));
    }

    if (debouncedSearchTerm) {
      params.set("search", debouncedSearchTerm);
    }

    setSearchParams(params, { replace: true });
  }, [selectedProviders, debouncedSearchTerm, setSearchParams]);

  // Auto-scroll the active provider pill into view on mobile when provider
  // selection is restored from the URL or changed by navigation.
  useEffect(() => {
    if (!selectedProviders.length) return;

    const activeProvider = selectedProviders[0];
    const activeElement = providerRefs.current[activeProvider];

    if (!activeElement || !providerScrollRef.current) return;

    const rafId = requestAnimationFrame(() => {
      activeElement.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [selectedProviders, allProviders]);

  // ================= RESET AND FETCH ON FILTER CHANGE =================
  useEffect(() => {
    setPage(1);
    fetchGames(1, true);
  }, [selectedProviders, debouncedSearchTerm, fetchGames]);

  // ================= HANDLE PROVIDER TOGGLE =================
  const handleToggleProvider = useCallback((provider) => {
    setSelectedProviders((prev) => {
      if (provider === "ALL") {
        return prev.length === 0 ? [] : [];
      }

      if (prev.includes(provider)) {
        return prev.filter((p) => p !== provider);
      } else {
        // Remove ALL when selecting specific provider
        const filtered = prev.filter((p) => p !== "ALL");
        return [...filtered, provider];
      }
    });
  }, []);

  // ================= LAUNCH GAME =================
  const launchGame = useCallback(
    async (game) => {
      if (!game?.id) return;

      if (!user) {
        setShowLoginModal(true);
        try {
          navigate("/login");
        } catch (e) {}
        return;
      }

      const result = openGame(game);
      if (result?.requiresLogin) {
        setShowLoginModal(true);
      }
    },
    [navigate, openGame, user],
  );

  // ================= LOAD MORE GAMES =================
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchGames(nextPage, false);
    }
  }, [page, loading, hasMore, fetchGames]);

  return (
    <div className="w-full min-h-screen bg-[#050912] text-[#F5FAFF]">
      {/* Mobile-only pinned search + provider pills.
          Why: mobile sticky can be broken by ancestor stacking/scroll contexts,
          so this uses a fixed shell under the existing header while keeping
          desktop and all business logic unchanged. */}
      <div className="md:hidden">
        <div className="fixed left-0 right-0 top-16 z-60 bg-[#050912]/90 backdrop-blur-md px-3 py-2 shadow-lg shadow-black/40 border-b border-[#16314D]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                try {
                  navigate(-1);
                } catch (e) {}
              }}
              className="p-2 bg-[#0B1220] border border-[#16314D] rounded-lg text-[#8FA6BC] hover:text-[#18C8FF] transition-colors"
              aria-label="Back"
            >
              <IoChevronBack size={18} />
            </button>

            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA6BC] pointer-events-none">
                <FiSearch size={16} />
              </div>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search games"
                className="w-full bg-[#0B1220] border border-[#16314D] focus:border-[#18C8FF] text-[#F5FAFF] rounded-full pl-10 pr-3 py-2 focus:outline-none placeholder-[#8FA6BC]/60 transition-colors"
              />
            </div>
          </div>

          {/* Provider pills - mobile only, sticky under search */}
          <div
            ref={providerScrollRef}
            className="mt-2 overflow-x-auto scrollbar-hide"
          >
            <div className="flex items-center gap-2">
              {/* Always include ALL pill */}
              <button
                onClick={() => handleToggleProvider("ALL")}
                className={`shrink-0 px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                  selectedProviders.length === 0
                    ? "bg-primary text-[#050912] font-bold shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                    : "bg-[#0B1220] text-[#8FA6BC] border border-[#16314D] hover:text-[#F5FAFF]"
                }`}
              >
                All
              </button>

              {allProviders.map((p) => {
                const active = selectedProviders.includes(p);
                return (
                  <button
                    key={`mobile-pill-${p}`}
                    ref={(el) => {
                      if (el) providerRefs.current[p] = el;
                    }}
                    onClick={() => handleToggleProvider(p)}
                    className={`shrink-0 px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                      active
                        ? "bg-primary text-[#050912] font-bold shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                        : "bg-[#0B1220] text-[#8FA6BC] border border-[#16314D] hover:text-[#F5FAFF]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for the fixed mobile toolbar so game cards don't render underneath it */}
      <div className="md:hidden h-27" aria-hidden="true" />

      {/* Provider Filter Bar (desktop/tablet only) */}
      <div className="hidden md:block">
        <ProviderFilterBar
          providers={allProviders}
          selectedProviders={selectedProviders}
          onToggleProvider={handleToggleProvider}
          searchTerm={searchTerm}
          onSearchTerm={setSearchTerm}
        />
      </div>

      {/* Games Grid */}
      <div className="px-2 sm:px-4 py-4">
        <GamesGrid
          games={games}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onGameLaunch={launchGame}
          gameLoading={gameLoading}
        />
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
