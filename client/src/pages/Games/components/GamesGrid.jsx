import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { MdPlayArrow } from "react-icons/md";
import SafeGameImage from "../../../Components/Common/SafeGameImage";

const getGameKey = (game, index) => {
  return `${game.provider || "provider"}-${game.code || game.id || game.title || "game"}-${index}`;
};

const GameCard = memo(function GameCard({ game, onGameLaunch }) {
  const handleClick = useCallback(() => {
    onGameLaunch(game);
  }, [game, onGameLaunch]);

  return (
    <div className="group cursor-pointer" onClick={handleClick}>
      <div className="relative overflow-hidden rounded-lg bg-[#0B1220] border border-[#16314D] hover:border-[#18C8FF]/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(0,229,255,0.2)]">
        <div className="relative w-full aspect-square bg-[#050912] overflow-hidden">
          <SafeGameImage
            src={game.image}
            alt={game.title}
            fallbackSrc="/placeholder.jpg"
            className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-300"
          />

          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
            <div className="bg-primary p-3 rounded-full transform transition-transform duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(0,229,255,0.4)]">
              <MdPlayArrow className="w-6 h-6 text-[#050912]" />
            </div>
          </div>

          {game.provider && (
            <div className="absolute top-2 right-2 bg-primary text-[#050912] px-2 py-1 rounded text-xs font-bold shadow-md">
              {game.provider.slice(0, 3).toUpperCase()}
            </div>
          )}
        </div>

        <div className="p-2 sm:p-3">
          <h3 className="text-[#F5FAFF] font-medium text-xs sm:text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {game.title}
          </h3>
          {game.category && (
            <p className="text-[#8FA6BC] text-xs mt-1">{game.category}</p>
          )}
        </div>
      </div>
    </div>
  );
});

const LoadingSkeletonGrid = memo(function LoadingSkeletonGrid() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4 mb-8">
      {Array.from({ length: 14 }).map((_, index) => (
        <div
          key={`game-skeleton-${index}`}
          className="overflow-hidden rounded-lg bg-[#0B1220] border border-[#16314D]"
        >
          <div className="relative w-full aspect-square bg-[#050912] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
          </div>
          <div className="p-2 sm:p-3 space-y-2">
            <div className="h-3 w-4/5 rounded bg-[#16314D] animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-[#16314D]/60 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
});

function GamesGrid({
  games = [],
  loading = false,
  hasMore = false,
  onLoadMore = () => {},
  onGameLaunch = () => {},
  gameLoading = false,
}) {
  const observerTarget = useRef(null);
  const loadMoreTriggeredRef = useRef(false);

  // Keep latest prop values in refs to avoid stale closures inside the
  // IntersectionObserver callback without re-creating the observer every render.
  const latestHasMoreRef = useRef(hasMore);
  const latestLoadingRef = useRef(loading);
  const latestOnLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    latestHasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    latestLoadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    latestOnLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const renderedGrid = useMemo(() => {
    if (!games.length) return null;

    return (
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4 mb-8">
        {games.map((game, index) => (
          <GameCard
            key={getGameKey(game, index)}
            game={game}
            onGameLaunch={onGameLaunch}
          />
        ))}
      </div>
    );
  }, [games, onGameLaunch]);

  // ================= INTERSECTION OBSERVER FOR INFINITE SCROLL =================
  // IntersectionObserver: create when the observer node becomes available.
  useEffect(() => {
    const node = observerTarget.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries && entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          if (process.env.NODE_ENV !== "production") {
            // Dev-only diagnostic to help trace intermittent misses.
            // eslint-disable-next-line no-console
            console.debug("GamesGrid: observer intersect", {
              hasMore: latestHasMoreRef.current,
              loading: latestLoadingRef.current,
            });
          }

          if (
            latestHasMoreRef.current &&
            !latestLoadingRef.current &&
            !loadMoreTriggeredRef.current
          ) {
            loadMoreTriggeredRef.current = true;
            try {
              latestOnLoadMoreRef.current?.();
            } catch (err) {
              // swallow - parent handles errors
              // eslint-disable-next-line no-console
              if (process.env.NODE_ENV !== "production") console.error(err);
            }

            // Reset trigger guard after a short debounce or when loading completes.
            const t = setTimeout(() => {
              loadMoreTriggeredRef.current = false;
            }, 500);

            // Ensure timer cleaned up if observer disconnects early
            // store on observer so it can be cleared in cleanup below.
            // @ts-ignore
            observer._resetTimer = t;
          }
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(node);

    return () => {
      if (observer) {
        try {
          observer.disconnect();
        } catch (e) {}
        // clear any pending reset timer
        // @ts-ignore
        if (observer._resetTimer) {
          clearTimeout(observer._resetTimer);
        }
      }
    };
  }, [games.length, hasMore, loading, onLoadMore]);

  // Ensure the loadMore trigger guard resets when loading completes so a
  // previous guard doesn't block further loads after route/provider changes.
  useEffect(() => {
    if (!loading) {
      loadMoreTriggeredRef.current = false;
    }
  }, [loading]);

  // If the games list shrinks (likely due to provider/route change), clear
  // the loadMore guard so a new series of loads can proceed.
  const prevGamesLengthRef = useRef(games.length);
  useEffect(() => {
    if (games.length < prevGamesLengthRef.current) {
      loadMoreTriggeredRef.current = false;
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug(
          "GamesGrid: games length decreased - reset loadMore guard",
          {
            previous: prevGamesLengthRef.current,
            current: games.length,
          },
        );
      }
    }
    prevGamesLengthRef.current = games.length;
  }, [games.length]);

  // ================= NO GAMES MESSAGE =================
  if (!loading && games.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <p className="text-[#8FA6BC] text-lg">No games available</p>
          <p className="text-[#8FA6BC]/60 text-sm mt-2">
            Try adjusting your filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Games Grid */}
      {loading && games.length === 0 ? <LoadingSkeletonGrid /> : renderedGrid}

      {/* Load More Trigger */}
      <div
        ref={observerTarget}
        className="h-10 flex items-center justify-center"
      >
        {loading && games.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
        )}

        {!hasMore && games.length > 0 && (
          <p className="text-[#8FA6BC]/70 text-sm">No more games to load</p>
        )}
      </div>
    </div>
  );
}

export default memo(GamesGrid);
