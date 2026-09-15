import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import BannerSlider from "../Components/HeroBanner/BannerSlider";
import NewsTicker from "../Components/News/NewsTicker";
import api from "../Components/axios/axios";
// import AutoLoadGame from "../Components/AutoLoadGame/AutoLoadGame";
import { useLocation, useNavigate } from "react-router-dom";
import SEO from "../Components/SEO/SEO";
import { getSEO } from "../Components/SEO/seoData";
import { cachedGet } from "../Components/axios/axios";
import Footer from "../Components/shared/Footer";
const CasinoTabs = lazy(() => import("../Components/CasinoTabs/CasinoTabs"));
const FavouriteSlider = lazy(
  () => import("../Components/Favourites Games/FavouriteSlider"),
);
const FeaturedGames = lazy(
  () => import("../Components/FeaturedGames/FeaturedGames"),
);

const LazyMount = React.memo(function LazyMount({
  children,
  minHeight = 160,
  rootMargin = "300px 0px",
}) {
  const [visible, setVisible] = useState(false);
  const hostRef = useRef(null);

  useEffect(() => {
    const target = hostRef.current;
    if (!target || visible) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return (
    <div ref={hostRef} style={{ minHeight }}>
      {visible ? children : null}
    </div>
  );
});

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All Games");
  const [categories, setCategories] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [providers, setProviders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const PAGE_SIZE = 30;

  // Sports betting state
  const [sportsSelectedCategory, setSportsSelectedCategory] = useState("all");
  const [isLiveOnly, setIsLiveOnly] = useState(false);
  const [betSlipItems, setBetSlipItems] = useState([]);

  const prefetchHomeData = useCallback(async () => {
    try {
      await Promise.allSettled([
        cachedGet(
          "/api/games",
          {
            params: {
              is_active: "true",
              featured: "true",
              limit: 10,
            },
          },
          { ttl: 45 * 1000, key: "prefetch:games:featured:10" },
        ),
        cachedGet(
          "/api/games",
          {
            params: {
              is_active: "true",
              is_hot: "true",
              limit: 16,
            },
          },
          { ttl: 45 * 1000, key: "prefetch:games:hot:16" },
        ),
        cachedGet(
          "https://igamingapis.com/provider/",
          {},
          { ttl: 90 * 1000, key: "prefetch:providers" },
        ),
      ]);
    } catch (error) {
      console.debug("Home prefetch skipped:", error);
    }
  }, []);

  // Get category from URL or sessionStorage on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const categoryFromUrl = urlParams.get("category");
    const categoryFromSession = sessionStorage.getItem("selectedGameCategory");

    if (categoryFromUrl) {
      setSelectedCategory(decodeURIComponent(categoryFromUrl));
      sessionStorage.setItem("selectedGameCategory", categoryFromUrl);
    } else if (categoryFromSession) {
      setSelectedCategory(categoryFromSession);
    }
  }, [location.search]);

  // Fetch categories with caching - fast and efficient
  const fetchCategories = async () => {
    try {
      // Check localStorage cache first
      const cachedCategories = localStorage.getItem("gameCategories");
      const cacheTime = localStorage.getItem("gameCategoriesTime");
      const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

      // Use cache if valid
      if (cachedCategories && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < CACHE_DURATION) {
          const parsed = JSON.parse(cachedCategories);
          setCategories(["All Games", ...parsed]);
          return;
        }
      }

      // Fetch from dedicated categories endpoint (much faster)
      const response = await api.get("/api/games/categories");
      const categoriesData = response.data?.data || [];

      console.log("Fetched categories:", categoriesData); // Debug log

      // Cache the categories
      localStorage.setItem("gameCategories", JSON.stringify(categoriesData));
      localStorage.setItem("gameCategoriesTime", Date.now().toString());

      setCategories(["All Games", ...categoriesData]);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      // Fallback to cached data even if expired
      const cachedCategories = localStorage.getItem("gameCategories");
      if (cachedCategories) {
        setCategories(["All Games", ...JSON.parse(cachedCategories)]);
      }
    }
  };

  // Fetch games with server-side pagination
  const fetchGames = async (
    currentPage = 1,
    category = "All Games",
    provider = "",
  ) => {
    setLoading(true);
    try {
      const params = {
        is_active: "true",
        page: currentPage,
        limit: PAGE_SIZE,
      };

      // Add category filter if not "All Games"
      if (category && category !== "All Games") {
        params.category = category;
      }

      // Add provider filter if selected
      console.log("Fetching games with params:", provider); // Debug log
      if (provider) {
        params.brand = provider;
      }

      const response = await api.get("/api/games", { params });

      const gamesData = response.data?.data?.games || [];
      const total =
        response.data?.data?.total ||
        response.data?.data?.totalGames ||
        gamesData.length;

      // Extract filters from response
      const filtersData = response.data?.data?.filters || {};
      if (filtersData.brands && filtersData.brands.length > 0) {
        setProviders(filtersData.brands);
      }

      // Map server games to frontend format
      const mappedGames = gamesData.map((game) => ({
        id: game.game_code || game._id,
        name: game.game_name || "Unknown Game",
        img: game.image_url || "/placeholder.jpg",
        category: game.category || "Casino",
        brand: game.brand || "Unknown",
        provider: game.brand || "Unknown",
      }));

      setGames(mappedGames);
      setTotalGames(total);
    } catch (err) {
      console.error("Failed to fetch games:", err);
      setGames([]);
      setTotalGames(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories on mount (independent of games)
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch games when page changes
  useEffect(() => {
    if (page !== 1) {
      fetchGames(page, selectedCategory, selectedProvider);
    }
  }, [page]);

  // Fetch games when category changes (reset to page 1)
  useEffect(() => {
    if (selectedCategory) {
      fetchGames(1, selectedCategory, selectedProvider);
    }
  }, [selectedCategory]);

  // Fetch games when provider changes (reset to page 1)
  useEffect(() => {
    fetchGames(1, selectedCategory, selectedProvider);
    setPage(1);
  }, [selectedProvider]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalGames / PAGE_SIZE)),
    [totalGames],
  );

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPage(1); // Reset to first page when category changes

    // Update URL and sessionStorage
    sessionStorage.setItem("selectedGameCategory", category);
    navigate("/?category=" + encodeURIComponent(category));
  };

  const handleProviderChange = (provider) => {
    setSelectedProvider(provider);
    setPage(1); // Reset to first page when provider changes
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddToBetSlip = (bet) => {
    // Check if bet already exists
    const exists = betSlipItems.some(
      (item) => item.matchId === bet.matchId && item.market === bet.market,
    );

    if (!exists) {
      setBetSlipItems([...betSlipItems, bet]);
    }
  };

  const handleRemoveBet = (index) => {
    setBetSlipItems(betSlipItems.filter((_, idx) => idx !== index));
  };

  const handleClearAll = () => {
    setBetSlipItems([]);
  };

  useEffect(() => {
    // This forces the window to scroll to the very top (0, 0) on load
    window.scrollTo(0, 0);

    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(() => {
          prefetchHomeData();
        })
      : setTimeout(() => {
          prefetchHomeData();
        }, 400);

    return () => {
      if (typeof idleId === "number") {
        clearTimeout(idleId);
      } else if (window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [prefetchHomeData]);

  return (
    <div className=" min-h-screen">
      {/* SEO Meta Tags */}
      <SEO {...getSEO("home")} />

      {/* Auto-load game 897 for logged-in users */}

      <BannerSlider />
      <NewsTicker />
      <LazyMount minHeight={190} rootMargin="400px 0px">
        <Suspense fallback={null}>
          <CasinoTabs />
        </Suspense>
      </LazyMount>

      <LazyMount minHeight={220} rootMargin="500px 0px">
        <Suspense fallback={null}>
          <FavouriteSlider />
        </Suspense>
      </LazyMount>

      <LazyMount minHeight={220} rootMargin="500px 0px">
        <Suspense fallback={null}>
          <FeaturedGames />
        </Suspense>
      </LazyMount>
      {/* <ReferralBanner /> */}
      {/* <AutoLoadGame gameId={7004} /> */}
      {/* <HeaderTop /> */}
      <div className="flex">{/* singel compoents call to here  */}</div>

      {/* <LiveBettingUI /> */}

      {/* {loading ? (
        <div className="text-white text-center py-12">Loading games...</div>
      ) : (
        <GameTabs
          games={games}
          selectedCategory={selectedCategory}
          setSelectedCategory={handleCategoryChange}
          categories={categories}
          selectedProvider={selectedProvider}
          setSelectedProvider={handleProviderChange}
          providers={providers}
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            totalPages,
            totalItems: totalGames,
            onPageChange: handlePageChange,
          }}
        />
      )} */}
      {/* <VideoSlider /> */}
      {/* <UpcomingMatches /> */}
      <div className="md:hidden block">
        <Footer />
      </div>
    </div>
  );
}
