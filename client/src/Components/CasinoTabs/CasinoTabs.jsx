import React, {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MdPlayArrow } from "react-icons/md";

import { cachedGet } from "../axios/axios";
import SafeGameImage from "../Common/SafeGameImage";

import { normalizeCategory } from "../../utils/categoryNormalizer";

import {
  filterProvidersByCategory,
  deduplicateProviders,
} from "../../utils/providerMapper";
import { useTranslation } from "react-i18next";
import { useCasinoGameLaunch } from "../../hooks/useCasinoGameLaunch";
import { preloadImages, readCache, writeCache } from "../../utils/homeCache";

const LazyProviderGrid = lazy(() => import("./ProviderGrid"));
const LazyLoginModal = lazy(() => import("../Modal/LoginModal"));

// ================= CATEGORY DATA =================

export const STATIC_TABS = Object.freeze([
  {
    name: "Hot",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-hotgame.png?v=1783417384360",
  },
  {
    name: "Casino",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-casino.png?v=1783417384360",
  },
  {
    name: "Slot",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-slot.png?v=1783417384360",
  },
  {
    name: "Sports",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-sport.png?v=1783417384360",
  },
  {
    name: "Crash",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-crash.png?v=1783417384360",
  },

  {
    name: "Flash",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-arcade.png?v=1783417384360",
  },

  {
    name: "MiniGames",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-lottery.png?v=1783417384360",
  },

  {
    name: "Table",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-table.png?v=1783417384360",
  },

  {
    name: "Chess",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-winner-board.png?v=1783417384360",
  },

  {
    name: "Fishing",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-fish.png?v=1783417384360",
  },

  {
    name: "XGames",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-lottery.png?v=1783417384360",
  },

  {
    name: "Arcade",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-vip.png?v=1783417384360",
  },

  {
    name: "CockFight",
    iconSrc:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-promotion.png?v=1783417384360",
  },
]);

const HOT_GAMES_CACHE_KEY = "home:casinoTabs:hotGames";
const PROVIDERS_CACHE_KEY = "home:casinoTabs:providers";
const HOT_GAMES_CACHE_TTL = 4 * 60 * 1000;
const PROVIDERS_CACHE_TTL = 10 * 60 * 1000;
const CATEGORY_SCROLL_MARGIN_STYLE = {
  scrollMarginTop: "calc(var(--mosttiger-mobile-navbar-height, 84px) + 1px)",
};
const TABS_SCROLL_STYLE = {
  WebkitOverflowScrolling: "touch",
  scrollBehavior: "smooth",
};

const imageIdleScheduler =
  typeof window !== "undefined" && window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : (callback) => window.setTimeout(callback, 200);

const imageIdleCanceler =
  typeof window !== "undefined" && window.cancelIdleCallback
    ? window.cancelIdleCallback.bind(window)
    : (handle) => window.clearTimeout(handle);

const preloadIdleImages = (images = []) => {
  if (!images.length) return () => {};

  const handle = imageIdleScheduler(() => {
    preloadImages(images);
  });

  return () => imageIdleCanceler(handle);
};

const TabIcon = memo(function TabIcon({ src, name, active }) {
  return (
    <img
      className={`w-8 transition-all  `}
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
    />
  );
});

const CategoryTabs = memo(function CategoryTabs({
  activeTab,
  isDragging,
  onCategoryClick,
  scrollContainerRef,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  stopDragging,
  handleTouchStart,
  handleTouchMove,
}) {
  const { t } = useTranslation();

  return (
    <div
      ref={scrollContainerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={stopDragging}
      className={`
        flex
        items-center
        flex-nowrap
        whitespace-nowrap

        gap-2

        overflow-x-auto
        overflow-y-hidden

        scroll-smooth
        scrollbar-hide

        px-2
        py-2

        select-none

        touch-pan-x

        ${isDragging ? "cursor-grabbing" : "cursor-grab"}
      `}
      style={TABS_SCROLL_STYLE}
    >
      {STATIC_TABS.map((tab) => (
        <button
          key={tab.name}
          onClick={() => onCategoryClick(tab.name)}
          className={`
            flex
            flex-col
            items-center
            justify-center

            shrink-0

            min-w-18
            sm:min-w-21

            h-14
            sm:h-16

            px-3
            py-1

            transition-all
            duration-300
            ease-out

            ${
              activeTab === tab.name
                ? "bg-[#1b1b1b] rounded-md !text-white shadow-lg shadow-primary/20"
                : "!text-white hover:bg-white/10"
            }
          `}
        >
          <span className="text-base sm:text-lg">
            <TabIcon
              src={tab.iconSrc}
              name={tab.name}
              active={activeTab === tab.name}
            />
          </span>

          <span
            className={`text-xs sm:text-sm font-semibold mt-1 whitespace-nowrap ${
              activeTab === tab.name ? "text-white" : "!text-black"
            }`}
          >
            {t(`categories.${tab.name}`)}
          </span>
        </button>
      ))}
    </div>
  );
});

const FeaturedGameCard = memo(function FeaturedGameCard({
  game,
  index,
  onLaunch,
  disabled,
}) {
  const handleClick = useCallback(() => onLaunch(game), [game, onLaunch]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="
        group
        relative
        bg-[#1b1b1b]
        rounded-lg
        overflow-hidden
        cursor-pointer
        transition-all
        duration-300
        hover:scale-[1.03]
        hover:shadow-lg
        hover:shadow-primary/20
        disabled:opacity-50
        disabled:cursor-not-allowed
        transform-gpu
        will-change-transform
        backface-hidden
      "
      title={game.name}
    >
      <div className="relative overflow-hidden aspect-square bg-[#111111] transform-gpu will-change-transform backface-hidden">
        <SafeGameImage
          src={game.img}
          alt={game.name}
          className="
            w-full
            h-full
            object-cover
            group-hover:scale-110
            transition-transform
            duration-500
            transform-gpu
            will-change-transform
            backface-hidden
          "
          loading="lazy"
          decoding="async"
        />

        <div className="absolute top-0 right-0 w-0 h-0 border-l-20 border-l-transparent border-t-20 border-t-primary group-hover:border-l-24 group-hover:border-t-24 transition-all duration-300 z-10" />

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center transform-gpu will-change-transform backface-hidden">
          <div className="bg-primary rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <MdPlayArrow className="text-black text-2xl" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-black/40 to-transparent group-hover:from-black/60 transition-all duration-300" />
      </div>

      <div className="px-2 py-2 bg-[#1b1b1b] border-t border-white/5">
        <p className="text-white text-xs sm:text-sm font-medium truncate text-left">
          {game.name}
        </p>
      </div>
    </button>
  );
});

const HotGamesSection = memo(function HotGamesSection({
  hotLoading,
  featuredGames,
  onLaunch,
  gameLoading,
}) {
  return (
    <div className="w-full bg-[#111111] px-2 py-4">
      {hotLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="h-4 w-44 rounded bg-white/10 animate-pulse" />
        </div>
      ) : featuredGames.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {featuredGames.map((game, index) => (
            <FeaturedGameCard
              key={game.id}
              game={game}
              index={index}
              onLaunch={onLaunch}
              disabled={gameLoading}
            />
          ))}
        </div>
      ) : (
        <div className="flex justify-center items-center py-8">
          <div className="text-white/50 text-sm">
            No featured games available
          </div>
        </div>
      )}
    </div>
  );
});

const ProviderSection = memo(function ProviderSection({
  loading,
  providers,
  selectedCategory,
  onProviderSelect,
}) {
  if (
    loading ||
    !providers?.length ||
    selectedCategory?.toLowerCase() === "hot"
  ) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyProviderGrid
        providers={providers}
        selectedCategory={selectedCategory}
        onProviderSelect={onProviderSelect}
      />
    </Suspense>
  );
});

// ================= HOT GAMES =================

const CasinoTabs = () => {
  // ================= STATE =================

  const [activeTab, setActiveTab] = useState("Hot");

  const cachedProviders = readCache(PROVIDERS_CACHE_KEY, PROVIDERS_CACHE_TTL);
  const cachedHotGames = readCache(HOT_GAMES_CACHE_KEY, HOT_GAMES_CACHE_TTL);

  const [providers, setProviders] = useState(() => {
    if (cachedProviders.hasValue && Array.isArray(cachedProviders.data)) {
      return cachedProviders.data;
    }
    return [];
  });

  const [loading, setLoading] = useState(!cachedProviders.hasValue);

  const [isDragging, setIsDragging] = useState(false);

  const [featuredGames, setFeaturedGames] = useState(() => {
    if (cachedHotGames.hasValue && Array.isArray(cachedHotGames.data)) {
      return cachedHotGames.data;
    }
    return [];
  });

  const [hotLoading, setHotLoading] = useState(!cachedHotGames.hasValue);

  const { launchGame, gameLoading, showLoginModal, closeLoginModal } =
    useCasinoGameLaunch();

  // ================= REFS =================

  const scrollContainerRef = useRef(null);

  const categoryBarRef = useRef(null);

  const dragStartX = useRef(0);

  const dragStartScrollLeft = useRef(0);

  const providerFilterCacheRef = useRef(new Map());

  const dragFrameRef = useRef(null);

  const pendingDragXRef = useRef(null);

  const idleCleanupRef = useRef([]);

  const handleCategoryClick = useCallback((tabName) => {
    setActiveTab(tabName);

    categoryBarRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  // ================= FETCH FEATURED GAMES =================

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const fetchFeaturedGames = async () => {
      try {
        if (!featuredGames.length) {
          setHotLoading(true);
        }

        const response = await cachedGet(
          "/api/games",
          {
            params: {
              is_active: "true",
              is_hot: "true",
              limit: 16,
            },
          },
          {
            ttl: 30 * 1000,
            key: "games:is_active=true:is_hot=true:limit=16",
            signal: controller.signal,
          },
        );

        const gamesData = response.data?.data?.games || [];

        const mappedGames = gamesData.map((game) => ({
          id: game.game_code || game._id,
          name: game.game_name || "Unknown Game",
          img: game.image_url || "/placeholder.jpg",
          category: game.category || "Casino",
          brand: game.brand || "Unknown",
          provider: game.brand || "Unknown",
        }));

        if (!mounted) return;

        setFeaturedGames(mappedGames);
        writeCache(HOT_GAMES_CACHE_KEY, mappedGames);
        const cancelIdle = preloadIdleImages(
          mappedGames.slice(0, 8).map((game) => game.img),
        );
        idleCleanupRef.current.push(cancelIdle);
      } catch (error) {
        if (error?.name === "AbortError" || error?.name === "CanceledError") {
          return;
        }
        console.error("Failed to fetch featured games:", error);
        console.error("Error response:", error.response?.data);
      } finally {
        if (mounted) {
          setHotLoading(false);
        }
      }
    };

    // Fetch featured games on mount
    fetchFeaturedGames();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  // ================= FETCH PROVIDERS =================

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const fetchProviders = async () => {
      try {
        if (!providers.length) {
          setLoading(true);
        }

        const response = await cachedGet(
          "https://igamingapis.com/provider/",
          {},
          {
            ttl: 60 * 1000,
            key: "igaming:providers",
            signal: controller.signal,
          },
        );

        let allProviders = response.data?.games || [];

        // ================= ADD LUCKYSPORT FROM LOCAL DATABASE =================
        try {
          const localResponse = await cachedGet(
            "/api/games",
            {
              params: {
                is_active: "true",
                category: "Sports",
                limit: 100,
              },
            },
            {
              ttl: 60 * 1000,
              key: "games:is_active=true:category=Sports:limit=100",
              signal: controller.signal,
            },
          );

          const localGames = localResponse.data?.data?.games || [];

          // Filter for LuckySport brand and map to provider format
          const luckySportGames = localGames
            .filter((game) => game.brand?.toLowerCase() === "luckysport")
            .map((game) => ({
              name: game.brand || "LuckySport",
              brand_title: game.brand || "LuckySport",
              logo: game.image_url || "",
              provider_name: game.brand || "LuckySport",
              category: game.category || "Sports",
              game_code: game.game_code,
              game_name: game.game_name,
            }));

          // Add LuckySport games to the provider list
          allProviders = [...allProviders, ...luckySportGames];
        } catch (localError) {
          console.error(
            "Failed to fetch LuckySport from local database:",
            localError,
          );
        }

        if (!mounted) return;

        setProviders(allProviders);
        writeCache(PROVIDERS_CACHE_KEY, allProviders);
        const cancelIdle = preloadIdleImages(
          allProviders
            .slice(0, 12)
            .map((provider) => provider.logo)
            .filter(Boolean),
        );
        idleCleanupRef.current.push(cancelIdle);
      } catch (error) {
        if (error?.name === "AbortError" || error?.name === "CanceledError") {
          return;
        }
        console.error("Failed to fetch providers:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchProviders();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  // ================= NORMALIZED TAB =================

  const normalizedActiveTab = useMemo(() => {
    return normalizeCategory(activeTab);
  }, [activeTab]);

  // ================= FILTERED PROVIDERS =================

  const filteredProviders = useMemo(() => {
    // ================= HOT TAB FIX =================

    if (
      activeTab?.toLowerCase() === "hot" ||
      normalizedActiveTab?.toLowerCase() === "hot"
    ) {
      return [];
    }

    // ================= EMPTY =================

    if (!providers?.length) {
      return [];
    }

    // ================= FILTER =================

    const cacheKey = `${normalizedActiveTab}__${providers.length}`;
    const cached = providerFilterCacheRef.current.get(cacheKey);
    if (cached?.source === providers) {
      return cached.value;
    }

    const filtered = filterProvidersByCategory(providers, normalizedActiveTab);

    // ================= REMOVE DUPLICATES =================

    const deduped = deduplicateProviders(filtered);
    providerFilterCacheRef.current.set(cacheKey, {
      source: providers,
      value: deduped,
    });

    return deduped;
  }, [providers, normalizedActiveTab, activeTab]);

  // ================= WHEEL SCROLL =================

  const handleWheel = useCallback((e) => {
    const el = scrollContainerRef.current;

    if (!el) return;

    if (Math.abs(e.deltaY) > 0) {
      el.scrollLeft += e.deltaY;
    }
  }, []);

  // ================= MOUSE DRAG =================

  const handleMouseDown = useCallback((e) => {
    const el = scrollContainerRef.current;

    if (!el) return;

    setIsDragging(true);

    dragStartX.current = e.pageX - el.offsetLeft;

    dragStartScrollLeft.current = el.scrollLeft;
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;

      const el = scrollContainerRef.current;

      if (!el) return;

      pendingDragXRef.current = e.pageX - el.offsetLeft;

      if (dragFrameRef.current) return;

      dragFrameRef.current = requestAnimationFrame(() => {
        dragFrameRef.current = null;

        const x = pendingDragXRef.current;
        if (x == null) return;

        const walk = (x - dragStartX.current) * 1;
        el.scrollLeft = dragStartScrollLeft.current - walk;
      });
    },
    [isDragging],
  );

  const stopDragging = useCallback(() => {
    setIsDragging(false);
    pendingDragXRef.current = null;

    if (dragFrameRef.current) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
  }, []);

  // ================= TOUCH =================

  const handleTouchStart = useCallback((e) => {
    const el = scrollContainerRef.current;

    if (!el) return;

    dragStartX.current = e.touches[0].pageX - el.offsetLeft;

    dragStartScrollLeft.current = el.scrollLeft;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const el = scrollContainerRef.current;

    if (!el) return;

    const x = e.touches[0].pageX - el.offsetLeft;

    const walk = (x - dragStartX.current) * 1;

    el.scrollLeft = dragStartScrollLeft.current - walk;
  }, []);

  useEffect(() => {
    return () => {
      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
      }
      idleCleanupRef.current.forEach((cancel) => {
        try {
          cancel?.();
        } catch (e) {}
      });
      idleCleanupRef.current = [];
    };
  }, []);

  // ================= RENDER =================

  return (
    <>
      <div
        ref={categoryBarRef}
        data-mobile-sticky-tabs
        className="sticky top-[var(--mosttiger-mobile-navbar-height,0px)] md:top-[7%] z-90 w-full bg-primary"
        style={CATEGORY_SCROLL_MARGIN_STYLE}
      >
        <CategoryTabs
          activeTab={activeTab}
          isDragging={isDragging}
          onCategoryClick={handleCategoryClick}
          scrollContainerRef={scrollContainerRef}
          handleWheel={handleWheel}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          stopDragging={stopDragging}
          handleTouchStart={handleTouchStart}
          handleTouchMove={handleTouchMove}
        />
      </div>

      <ProviderSection
        loading={loading}
        providers={filteredProviders}
        selectedCategory={normalizedActiveTab}
        onProviderSelect={handleCategoryClick}
      />

      {(activeTab?.toLowerCase() === "hot" ||
        normalizedActiveTab?.toLowerCase() === "hot") && (
        <HotGamesSection
          hotLoading={hotLoading}
          featuredGames={featuredGames}
          onLaunch={launchGame}
          gameLoading={gameLoading}
        />
      )}

      <Suspense fallback={null}>
        {showLoginModal ? (
          <LazyLoginModal isOpen={showLoginModal} onClose={closeLoginModal} />
        ) : null}
      </Suspense>

      {/* ================= STYLE ================= */}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .touch-pan-x {
          touch-action: pan-x;
        }

        .scroll-smooth {
          scroll-behavior: smooth;
        }
      `}</style>
    </>
  );
};

export default React.memo(CasinoTabs);
