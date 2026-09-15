"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MdClose,
  MdPlayArrow,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdStar,
  MdFavorite,
  MdFavoriteBorder,
  MdFilterList,
} from "react-icons/md";
import { TbCategoryFilled } from "react-icons/tb";
import { IoGameController, IoStar } from "react-icons/io5";
import { useSelector } from "react-redux";
import api from "../axios/axios";
import LoginModal from "../Modal/LoginModal";
import { useLanguage } from "../../context/LanguageContext";
import { useCasinoGame } from "../../hooks/useCasinoGame";

export default function GameTabs({
  games,
  selectedCategory,
  setSelectedCategory,
  categories,
  selectedProvider = "",
  setSelectedProvider = () => {},
  providers = [],
  pagination = {},
  isLoading = false,
}) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [activeGames, setActiveGames] = useState([]);
  const scrollContainerRef = useRef(null);
  const gamesSectionRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const { openGame, loading: gameLoading } = useCasinoGame();

  // Get user from Redux store
  const { user } = useSelector((state) => state.auth);

  // Get translation function
  const { t } = useLanguage();

  // Helper function to get translated category name
  const getCategoryTranslation = (category) => {
    const categoryKey = category.toLowerCase().replace(/\s+/g, "_");
    const translated = t(categoryKey);
    // If translation exists and is different from key, use it; otherwise use original
    return translated !== categoryKey ? translated : category;
  };

  // Category icon mapping
  const categoryIcons = {
    "HOT GAMES":
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-hotgame.png?v=1772072468542",
    SLOTS:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-slot.png?v=1772072468542",
    CRASH:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-crash.png?v=1772072468542",
    CASINO:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-casino.png?v=1772072468542",
    CASINOLIVE:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-casino.png?v=1772072468542",
    HOTSLOTS:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-hotgame.png?v=1772072468542",
    MINIGAMES:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-table.png?v=1772072468542",
    CHESS:
      "	https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-lottery.png?v=1772072468542",
    SPORTS:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-sport.png?v=1772072468542",
    TABLE:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-arcade.png?v=1772072468542",
    FLASH:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-table.png?v=1772072468542",
    LOTTERY:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-lottery.png?v=1772072468542",
    FISHING:
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-fish.png?v=1772072468542",
  };

  const handlePageChange = (newPage) => {
    // Call the parent's page change handler
    if (pagination.onPageChange) {
      pagination.onPageChange(newPage);
    }
    // Scroll to games section header
    setTimeout(() => {
      if (gamesSectionRef.current) {
        gamesSectionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const page = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;
  const pageSize = pagination.pageSize || games.length || 1;
  const totalItems = pagination.totalItems || games.length || 0;

  // Update active games when games prop changes
  useEffect(() => {
    setActiveGames(games);
  }, [games]);

  // please enabele this code
  const launchGame = async (game) => {
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

  // Handle tab scrolling
  const scrollTabs = (direction) => {
    if (scrollContainerRef.current) {
      setIsScrolling(true);
      const scrollAmount = direction === "left" ? -200 : 200;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
      setTimeout(() => setIsScrolling(false), 300);
    }
  };

  // Toggle favorite
  const toggleFavorite = (gameId, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(gameId)) {
        newFavorites.delete(gameId);
      } else {
        newFavorites.add(gameId);
      }
      return newFavorites;
    });
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) closeGame();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  useEffect(() => {
    if (scrollContainerRef.current && selectedCategory && !isScrolling) {
      const activeBtn = scrollContainerRef.current.querySelector(
        `[data-tab="${selectedCategory}"]`,
      );
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [selectedCategory, isScrolling]);

  // Game Card Component (internal)
  const GameCard = ({ game }) => {
    const [isHovered, setIsHovered] = useState(false);
    const isFavorite = favorites.has(game.id);

    return (
      <div
        className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-gray-900/80 to-gray-950/90 shadow-xl cursor-pointer
          hover:scale-[1.03] transform transition-all duration-500 hover:shadow-2xl hover:shadow-purple-900/20"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => launchGame(game)}
      >
        {/* Game Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={game.img || "/placeholder-game.jpg"}
            alt={game.name}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />

          {/* Gradient Overlay */}

          {/* Game Provider Badge */}
          {game.provider && (
            <div className="absolute bottom-0 left-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
              <span className="text-xs font-semibold text-primary">
                {game.provider}
              </span>
            </div>
          )}

          {/* Favorite Button */}
          <button
            className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:primary/80 transition-colors z-10"
            onClick={(e) => toggleFavorite(game.id, e)}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            {isFavorite ? (
              <MdFavorite className="w-4 h-4 text-red-500" />
            ) : (
              <MdFavoriteBorder className="w-4 h-4 text-white" />
            )}
          </button>

          <div className="p-4">
            <h3 className="text-white font-bold text-sm lg:text-base mb-2 truncate group-hover:text-purple-300 transition-colors">
              {game.name}
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {game.rating && (
                  <div className="flex items-center gap-1">
                    <IoStar className="w-4 h-4 text-primary" />
                    <span className="text-xs text-gray-300">{game.rating}</span>
                  </div>
                )}
                {game.volatility && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      game.volatility === "High"
                        ? "bg-red-500/20 text-red-300"
                        : game.volatility === "Medium"
                          ? "primary/20 text-yellow-300"
                          : "bg-green-500/20 text-green-300"
                    }`}
                  >
                    {game.volatility}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-400">
                <MdPlayArrow className="text-purple-500" />
                <span>Play</span>
              </div>
            </div>
          </div>
          {/* Hover Overlay */}
          {isHovered && (
            <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent flex items-end p-4">
              <button
                onClick={() => launchGame(game)}
                className="w-full py-3 bg-primary text-black font-bold rounded-xl shadow-lg hover:shadow-xl hover:shadow transform hover:scale-105 transition-all duration-300"
              >
                PLAY NOW
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Game Skeleton Component (internal)
  const GameSkeleton = () => {
    return (
      <div className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-gray-800/50 to-gray-900/50 animate-pulse">
        <div className="aspect-[4/3] bg-gray-800"></div>
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-800 rounded w-3/4"></div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-800 rounded w-1/4"></div>
            <div className="h-3 bg-gray-800 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gradient-to-b from-gray-900/50 to-gray-950/70 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-gray-800/50">
        <div className="p-4 lg:p-6">
          {/* Category Skeleton */}
          <div className="relative flex items-center mb-6">
            <div className="flex gap-3 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="px-6 py-3 rounded-2xl bg-gray-800/50 animate-pulse h-12 w-32"
                ></div>
              ))}
            </div>
          </div>

          {/* Games Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
            {[...Array(12)].map((_, i) => (
              <GameSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Game Section */}
      <div
        ref={gamesSectionRef}
        className="bg-white backdrop-blur-xl  overflow-hidden shadow-2xl border border-gray-800/50"
      >
        <div className="flex bg-primary items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-black">
              {t("live_games")}
            </h2>
            <p className="text-sm text-black mt-1">{t("select_category")}</p>
          </div>

          <div>
            {providers.length > 0 && (
              <div className="">
                <div
                  className="backdrop-blur-sm 
                rounded-xl lg:rounded-2xl border border-gray-700/50 p-3 lg:p-4 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
                    {/* Filter Icon & Label */}
                    <div className=" hidden md:flex items-center gap-2.5 lg:gap-3 min-w-fit">
                      <div
                        className="w-9 hidden  h-9 lg:w-11 lg:h-11 bg-black
                      rounded-lg lg:rounded-xl md:flex items-center justify-center md:flex-shrink-0 shadow-lg shadow-primary/20"
                      >
                        <MdFilterList className="text-white text-xl lg:text-2xl" />
                      </div>
                      <div>
                        <p className="text-xs lg:text-sm font-bold text-black leading-tight">
                          {t("provider_filter")}
                        </p>
                        <p className="text-[10px] lg:text-xs text-black mt-0.5">
                          {providers.length} {t("providers")}
                        </p>
                      </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="hidden sm:block w-px self-stretch bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>

                    {/* Dropdown & Clear Button Container */}
                    <div className="flex-1 flex items-center gap-2 lg:gap-3">
                      {/* Provider Dropdown */}
                      <div className="relative flex-1 min-w-0 group">
                        <select
                          value={selectedProvider}
                          onChange={(e) => setSelectedProvider(e.target.value)}
                          className="w-[150px]  px-3 py-2.5 lg:px-4 lg:py-3 bg-black/70 border-2 border-gray-700 
                          rounded-lg lg:rounded-xl text-white font-semibold text-xs lg:text-sm
                          hover:border-primary hover:bg-black focus:outline-none focus:border-primary 
                          focus:ring-2 focus:ring-primary/20 focus:bg-black
                          transition-all duration-300 cursor-pointer appearance-none 
                          shadow-lg hover:shadow-primary/20 pr-9 lg:pr-10
                          backdrop-blur-sm"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FFB80C'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 0.5rem center",
                            backgroundSize: "1rem",
                          }}
                        >
                          <option
                            value=""
                            className="bg-gray-900  text-white py-2"
                          >
                            {t("all_providers")}
                          </option>
                          {providers.map((provider) => (
                            <option
                              key={provider}
                              value={provider}
                              className="bg-gray-900 text-2xl text-white py-2"
                            >
                              {provider}
                            </option>
                          ))}
                        </select>

                        {/* Hover Effect Border */}
                        <div
                          className="absolute inset-0 rounded-lg lg:rounded-xl border-2 border-primary/0 
                        group-hover:border-primary/20 transition-all duration-300 pointer-events-none"
                        ></div>
                      </div>

                      {/* Clear Button */}
                      {selectedProvider && (
                        <button
                          onClick={() => setSelectedProvider("")}
                          className="px-3 py-2.5 lg:px-4 lg:py-3 bg-gradient-to-r from-red-600 to-red-700 
                          text-white font-bold text-xs lg:text-sm rounded-lg lg:rounded-xl
                          hover:from-red-700 hover:to-red-800 active:scale-95
                          transition-all duration-300 shadow-lg hover:shadow-red-600/50
                          flex items-center gap-1.5 lg:gap-2 whitespace-nowrap flex-shrink-0"
                        >
                          <MdClose className="text-base lg:text-lg" />
                          <span className="hidden xs:inline">{t("clear")}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Filter Badge */}
                  {selectedProvider && (
                    <div className="mt-3 pt-3 border-t border-gray-700/30">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs lg:text-sm text-gray-400 font-medium">
                          {t("active")}:
                        </span>
                        <div
                          className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 
                        bg-gradient-to-r from-primary/10 to-[#ff9800]/10 
                        border border-primary/40 rounded-lg backdrop-blur-sm
                        shadow-lg shadow-primary/10"
                        >
                          <span className="text-xs lg:text-sm text-primary font-bold">
                            {selectedProvider}
                          </span>
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Category Tabs Section */}
        <div className="relative bg-gradient-to-r from-black via-gray-900 to-black border-b-4 border-primary">
          <div className="px-3 py-4 lg:px-5 lg:py-5">
            <div
              ref={scrollContainerRef}
              className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide scroll-smooth items-center
                [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {categories.map((tab) => {
                const categoryName = tab.toUpperCase();
                const iconUrl = categoryIcons[categoryName];

                return (
                  <button
                    key={tab}
                    data-tab={tab}
                    onClick={() => setSelectedCategory(tab)}
                    className={`
                      relative px-4 py-3 lg:px-5 lg:py-4 rounded-xl lg:rounded-2xl
                      whitespace-nowrap transition-all duration-300 flex-shrink-0 
                      flex flex-col items-center justify-center gap-2 group min-w-[80px] lg:min-w-[100px]
                      ${
                        selectedCategory === tab
                          ? "bg-primary text-black shadow-lg shadow-primary/30 scale-105"
                          : "bg-gray-800/60 text-white hover:bg-gray-700/80 hover:scale-102"
                      }
                    `}
                  >
                    {/* Icon Container */}
                    <div className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center">
                      {iconUrl ? (
                        <span
                          className="w-full h-full bg-center bg-contain bg-no-repeat"
                          style={{ backgroundImage: `url("${iconUrl}")` }}
                        />
                      ) : (
                        <TbCategoryFilled className="text-2xl lg:text-3xl" />
                      )}
                    </div>

                    {/* Category Name */}
                    <p className="text-xs lg:text-sm font-bold uppercase leading-tight text-center">
                      {getCategoryTranslation(tab)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Provider Filter Section - Modern & Responsive */}

        <div className="p-4 lg:p-6">
          {/* Games Grid */}
          {activeGames.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
                {activeGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>

              {/* Pagination */}
              {totalItems > pageSize && (
                <div className="mt-8 lg:mt-12 pt-6 border-t border-gray-800/50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-400">
                      {t("showing_games")}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className={`
                          flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300
                          ${
                            page <= 1
                              ? "bg-gray-800/30 text-black cursor-not-allowed"
                              : "bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:bg-gray-700 hover:text-white shadow-lg hover:shadow-gray-800/50"
                          }
                        `}
                      >
                        <MdKeyboardArrowLeft size={20} />
                        <span className="hidden sm:inline">
                          {t("previous")}
                        </span>
                      </button>

                      <div className="flex items-center gap-2 mx-4">
                        {/* First page */}
                        {page > 2 && (
                          <>
                            <button
                              onClick={() => handlePageChange(1)}
                              className="w-10 h-10 rounded-xl font-semibold transition-all duration-300 bg-gray-800/50 text-gray-300 hover:bg-gray-700"
                            >
                              1
                            </button>
                            {page > 3 && (
                              <span className="text-gray-500 px-1">...</span>
                            )}
                          </>
                        )}

                        {/* Pages around current page */}
                        {[...Array(totalPages)].map((_, i) => {
                          const pageNum = i + 1;
                          // Show current page and 1 page before and after (only valid pages)
                          if (
                            pageNum === page ||
                            (pageNum === page - 1 && pageNum >= 1) ||
                            (pageNum === page + 1 && pageNum <= totalPages)
                          ) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`
                                  w-10 h-10 rounded-xl font-semibold transition-all duration-300
                                  ${
                                    page === pageNum
                                      ? "bg-primary text-black shadow-lg"
                                      : "bg-gray-800/50 text-gray-300 hover:bg-gray-700"
                                  }
                                `}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        })}

                        {/* Last page */}
                        {page < totalPages - 1 && (
                          <>
                            {page < totalPages - 2 && (
                              <span className="text-gray-500 px-1">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(totalPages)}
                              className="w-10 h-10 rounded-xl font-semibold transition-all duration-300 bg-gray-800/50 text-gray-300 hover:bg-gray-700"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          handlePageChange(Math.min(totalPages, page + 1))
                        }
                        disabled={page >= totalPages}
                        className={`
                          flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300
                          ${
                            page >= totalPages
                              ? "bg-gray-800/30 text-gray-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300 hover:bg-gray-700 hover:text-white shadow-lg hover:shadow-gray-800/50"
                          }
                        `}
                      >
                        <span className="hidden sm:inline">{t("next")}</span>
                        <MdKeyboardArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 lg:py-24">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center">
                <IoGameController className="text-4xl text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {t("no_games_available")}
              </h3>
              <p className="text-gray-400 max-w-md mx-auto">
                {t("no_games_description")}
              </p>
              <button
                onClick={() => setSelectedCategory(categories[0])}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-600/30 transition-all"
              >
                {t("view_all_games")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
