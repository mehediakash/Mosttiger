import { useState, useEffect, useMemo, useRef } from "react";
import { HiMenu } from "react-icons/hi";
import { IoChevronDown, IoClose, IoSearch } from "react-icons/io5";
import { MdClose } from "react-icons/md";
import logo from "../../assets/logo.png";
import { useSelector, useDispatch } from "react-redux";
import { FaUserCircle, FaWallet, FaHome, FaSignOutAlt } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { TbRefresh } from "react-icons/tb";
import { BsCreditCard2BackFill } from "react-icons/bs";

import { useTranslation } from "react-i18next";

import walletService from "../services/walletService";
import { formatMoney as formatWalletBalance } from "../../utils/currencyFormatter";
import { TbCoinTaka } from "react-icons/tb";
import { IoIosAddCircle } from "react-icons/io";
import {
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiX,
  FiGift,
} from "react-icons/fi";
import { MdLanguage, MdRefresh } from "react-icons/md";
import api from "../axios/axios";
import LoginModal from "../Modal/LoginModal";
import GuestSidebarHeader from "./GuestSidebarHeader";
import { normalizeCategory } from "../../utils/categoryNormalizer";
import {
  filterProvidersByCategory,
  deduplicateProviders,
} from "../../utils/providerMapper";
import { loginUser, registerUser, logout } from "../store/authSlice";
import { validatePromoCode } from "../services/promoService";
import Button from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";
import { useCasinoGame } from "../../hooks/useCasinoGame";
import {
  clearStoredAffiliateCode,
  clearStoredReferralCode,
  getStoredAffiliateCode,
  getStoredReferralCode,
} from "../../utils/affiliateTracking";
import { getAppDownloadLinkProps } from "../../utils/appDownload";

// ================= MOBILE SIDEBAR STATIC CATEGORIES =================
// Use exact categories from CasinoTabs.jsx to avoid API mismatch
const MOBILE_CATEGORY_TABS = [
  { name: "Hot" },
  { name: "Sports" },
  { name: "Casino" },
  { name: "Slot" },
  { name: "Table" },
  { name: "Crash" },
  { name: "MiniGames" },
  { name: "Fishing" },
  { name: "Arcade" },
  { name: "CockFight" },
];

const NavbarSidebar = () => {
  const dispatch = useDispatch();
  const { language, toggleLanguage } = useLanguage();
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, message: "" });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'register'
  const navigate = useNavigate();
  const { openGame, loading: gameLoading } = useCasinoGame();

  // Listen for global requests to open the shared AuthModal
  useEffect(() => {
    const handler = (e) => {
      const mode = e?.detail?.mode || "login";
      setAuthMode(mode);
      setShowAuthModal(true);
      // ensure any local LoginModal is closed
      setShowLoginModal(false);
    };

    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, []);

  // Track language changes from i18n
  useEffect(() => {
    const handleLanguageChanged = (lng) => {
      setCurrentLanguage(lng);
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  const handleLanguageToggle = () => {
    const newLanguage = currentLanguage === "en" ? "bn" : "en";
    i18n.changeLanguage(newLanguage);
    localStorage.setItem("language", newLanguage);
    setCurrentLanguage(newLanguage);
  };

  const toggleSidebar = () => setOpen(!open);
  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const { user } = useSelector((state) => state.auth); // get login state
  const affiliateStatus = user?.affiliate?.status;
  const affiliatePath =
    affiliateStatus === "approved"
      ? "/affiliate/dashboard"
      : "/affiliate/signup";
  const [walletBalance, setWalletBalance] = useState(null);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [showWalletActions, setShowWalletActions] = useState(false);
  const walletActionsRef = useRef(null);

  const refreshBalance = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    try {
      setRefreshingBalance(true);
      const res = await walletService.getBalance();
      const body = res?.data ?? {};
      const payload = body.data ?? body;
      const balance = extractBalance(payload);
      setWalletBalance(balance);
    } catch (err) {
      console.debug("Failed to refresh wallet balance", err);
    } finally {
      setRefreshingBalance(false);
    }
  };

  // close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        showWalletActions &&
        walletActionsRef.current &&
        !walletActionsRef.current.contains(e.target)
      ) {
        setShowWalletActions(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showWalletActions]);

  // Search games with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await api.get("/api/games", {
          params: {
            search: searchQuery,
            is_active: "true",
            limit: 10,
          },
        });

        const gamesData = response.data?.data?.games || [];
        const mappedGames = gamesData.map((game) => ({
          id: game.game_code || game._id,
          name: game.game_name || "Unknown Game",
          img: game.image_url || "/placeholder.jpg",
          category: game.category || "Casino",
          brand: game.brand || "Unknown",
        }));

        setSearchResults(mappedGames);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Close search on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && searchOpen) {
        toggleSearch();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [searchOpen]);

  // Handle game click from search
  const handleGameClick = async (game) => {
    if (!game?.id) return;

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    toggleSearch();

    const result = openGame(game);
    if (result?.requiresLogin) {
      setShowLoginModal(true);
    }
  };

  // Handle game category click
  const handleCategoryClick = (category) => {
    // Store selected category in sessionStorage
    sessionStorage.setItem("selectedGameCategory", category);
    // Navigate to home page
    navigate("/?category=" + encodeURIComponent(category));
    // Close sidebar
    setOpen(false);
  };

  // Mobile sidebar right panel state (providers / hot games)
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelCategory, setPanelCategory] = useState("");
  const [providersList, setProvidersList] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [featuredGames, setFeaturedGames] = useState([]);
  const [hotLoading, setHotLoading] = useState(false);

  // Fetch providers (reuse same endpoint as CasinoTabs)
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setProvidersLoading(true);
        const response = await api.get("https://igamingapis.com/provider/");
        if (response.data?.games) {
          setProvidersList(response.data.games);
        }
      } catch (err) {
        console.error("Failed to fetch providers for sidebar panel:", err);
      } finally {
        setProvidersLoading(false);
      }
    };

    fetchProviders();
  }, []);

  // Fetch featured / hot games (reuse same API logic)
  useEffect(() => {
    const fetchFeaturedGames = async () => {
      try {
        setHotLoading(true);
        const response = await api.get("/api/games", {
          params: { is_active: "true", is_hot: "true", limit: 16 },
        });

        const gamesData = response.data?.data?.games || [];
        const mappedGames = gamesData.map((game) => ({
          id: game.game_code || game._id,
          name: game.game_name || "Unknown Game",
          img: game.image_url || "/placeholder.jpg",
          category: game.category || "Casino",
          provider: game.brand || "Unknown",
        }));

        setFeaturedGames(mappedGames);
      } catch (err) {
        console.error("Failed to fetch featured games for sidebar:", err);
        setFeaturedGames([]);
      } finally {
        setHotLoading(false);
      }
    };

    fetchFeaturedGames();
  }, []);

  // Handle category clicks from the sidebar grid — open panel for all mobile categories
  const handleSidebarCategoryClick = (category) => {
    // All MOBILE_CATEGORY_TABS categories open the panel
    setPanelCategory(category);
    setPanelOpen(true);
  };

  // Category icon mapping - Same as CasinoTabs.jsx - reuse exact URLs
  const getCategoryIcon = (categoryName) => {
    const name = categoryName.toString().toLowerCase().trim();

    const iconMap = {
      hot: "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-hotgame.png",
      sports:
        "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-sport.png",
      casino:
        "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-casino.png",
      slots:
        "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-slot.png?v=1772072468542",
      table:
        "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-arcade.png?v=1772072468542",
      crash:
        "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-crash.png?v=1772072468542",
      lottery:
        "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-lottery.png?v=1772072468542",
      fishing:
        "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-fish.png?v=1772072468542",
      arcade:
        "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-arcade.png?v=1772072468542",
      cockfight:
        "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-lottery.png?v=1772072468542",
    };

    return (
      iconMap[name] ||
      "https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-slot.png?v=1772072468542"
    );
  };

  const extractBalance = useMemo(
    () => (payload) => {
      if (!payload) return 0;
      if (typeof payload.main === "number") return payload.main;
      if (typeof payload.balance === "number") return payload.balance;
      if (payload.wallet && typeof payload.wallet === "object") {
        return (
          payload.wallet.main ??
          payload.wallet.balance ??
          Object.values(payload.wallet).find((v) => typeof v === "number") ??
          0
        );
      }
      if (typeof payload === "number") return payload;
      return 0;
    },
    [],
  );

  useEffect(() => {
    if (!user) return; // fetch for any logged-in user

    let mounted = true;
    const loadBalance = async () => {
      try {
        const res = await walletService.getBalance();
        const body = res?.data ?? {};
        const payload = body.data ?? body; // normalize wrapper
        const balance = extractBalance(payload);
        if (mounted) setWalletBalance(balance);
      } catch (e) {
        console.debug("Failed to load wallet balance for navbar", e);
      }
    };

    loadBalance();
    return () => {
      mounted = false;
    };
  }, [user, extractBalance]);

  useEffect(() => {
    if (!user) return;

    const handleRefresh = () => {
      refreshBalance();
    };

    window.addEventListener("refreshWalletBalance", handleRefresh);
    window.addEventListener("gameSessionsClosed", handleRefresh);

    return () => {
      window.removeEventListener("refreshWalletBalance", handleRefresh);
      window.removeEventListener("gameSessionsClosed", handleRefresh);
    };
  }, [user]);

  // Auth Modal States and Logic
  const { status: authStatus, error: authError } = useSelector((s) => s.auth);
  const phoneRegex = /^01[3-9]\d{8}$/;

  // Login Form State
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
    rememberMe: true,
  });

  // Register Form State
  const [registerForm, setRegisterForm] = useState({
    username: "",
    phone: "",
    password: "",
    agreedToTerms: false,
  });

  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoValidation, setPromoValidation] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [termsError, setTermsError] = useState("");

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) {
      setPromoValidation({
        isValid: false,
        message: "Please enter a promo code",
      });
      return;
    }

    setPromoLoading(true);
    setPromoValidation(null);

    try {
      const response = await validatePromoCode(promoCode.trim().toUpperCase());
      setPromoValidation({
        isValid: true,
        promoName: response.data.promoName,
        bonusPercentage: response.data.bonusPercentage,
        bonusAmount: response.data.bonusAmount,
        message: response.data.message || "Promo code is valid!",
      });
    } catch (error) {
      setPromoValidation({
        isValid: false,
        message:
          error.response?.data?.message || "Invalid or expired promo code",
      });
    }

    setPromoLoading(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(loginUser(loginForm)).unwrap();
      setShowAuthModal(false);
      setLoginForm({ username: "", password: "", rememberMe: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registerForm.agreedToTerms) {
      setTermsError("You must agree to the terms and conditions");
      return;
    }
    if (!phoneRegex.test(registerForm.phone)) {
      alert("Invalid Bangladesh phone number (01XXXXXXXXX)");
      return;
    }
    try {
      const affiliateCode = getStoredAffiliateCode();
      const referralCode = getStoredReferralCode();
      const registrationData = {
        username: registerForm.username.trim().toLowerCase(),
        phone: registerForm.phone,
        password: registerForm.password,
        agreedToTerms: registerForm.agreedToTerms,
        ...(promoValidation?.isValid && promoCode
          ? { promoCode: promoCode.trim().toUpperCase() }
          : {}),
        ...(affiliateCode ? { aff: affiliateCode } : {}),
        ...(referralCode ? { ref: referralCode, referralCode } : {}),
      };
      await dispatch(registerUser(registrationData)).unwrap();
      clearStoredAffiliateCode();
      clearStoredReferralCode();
      alert("Registration successful!");
      setShowAuthModal(false);
      setRegisterForm({
        username: "",
        phone: "",
        password: "",
        agreedToTerms: false,
      });
      setPromoCode("");
      setPromoValidation(null);
      setShowPromo(false);
      setTermsError("");
    } catch (err) {
      console.error(err);
    }
  };

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
    setLoginForm({ username: "", password: "", rememberMe: true });
    setRegisterForm({
      username: "",
      phone: "",
      password: "",
      confirmPassword: "",
      agreedToTerms: false,
    });
    setPromoCode("");
    setPromoValidation(null);
    setShowPromo(false);
    setTermsError("");
  };

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <header
        data-mobile-sticky-navbar
        className="sticky top-0 z-50 bg-black shadow-md py-2 px-3 border-primary border-b-4"
      >
        {/* Menu Button */}
        <button
          onClick={toggleSidebar}
          className="text-primary absolute top-[50%] translate-y-[-50%] left-0 text-3xl p-2"
        >
          <HiMenu />
        </button>
        <div className="max-w-[1240px] mx-auto flex items-center gap-x-2 justify-between">
          {/* Logo */}
          <div className="flex-1 ml-10 flex justify-between">
            <Link to={"/"}>
              <img src={logo} alt="Baba88" className="h-8" />
            </Link>
          </div>

          {/* Desktop Actions */}
          {!user ? (
            <>
              {/* Deposit Button */}

              <Link
                to="/login"
                className="hidden md:block px-4 py-2 bg-white/10 border-primary border hover:bg-white/20 text-white rounded-lg font-semibold transition"
              >
                {t("login")}
              </Link>
              <a
                href="/register"
                className="hidden md:block px-4 py-2 bg-primary text-black rounded-lg font-semibold hover:opacity-90 transition"
              >
                {t("sign_up")}
              </a>
            </>
          ) : (
            <div className="flex items-center ">
              <div className="flex items-center bg-[#0f0f0f] text-white  px-1 py-1 border border-[#222]">
                <TbCoinTaka size={18} className="text-primary" />
                <span className="text-sm font-semibold truncate max-w-[120px]">
                  {formatWalletBalance(walletBalance)}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    refreshBalance();
                  }}
                  aria-label="Refresh balance"
                  className={`p-1  text-white hover:bg-white/5 transition ${refreshingBalance ? "animate-spin" : ""}`}
                >
                  <TbRefresh size={16} />
                </button>
              </div>

              <div className="" ref={walletActionsRef}>
                <button
                  onClick={() => setShowWalletActions((s) => !s)}
                  className="bg-primary hover:bg-primary text-black p-2  transition shadow-md"
                  aria-expanded={showWalletActions}
                >
                  <IoIosAddCircle size={18} />
                </button>

                {showWalletActions && (
                  <div
                    className={`absolute flex w-full left-0 mt-2  bg-gray-900 text-white rounded-lg sm:rounded-lg shadow-2xl p-2 z-50 transform origin-top-right transition ease-out duration-150`}
                  >
                    <button
                      onClick={() => {
                        setShowWalletActions(false);
                        navigate("/withdraw");
                      }}
                      className="w-full text-center py-2 px-3  bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition"
                    >
                      {t("withdraw")}
                    </button>
                    <button
                      onClick={() => {
                        setShowWalletActions(false);
                        navigate("/deposit");
                      }}
                      className="w-full text-center py-2 px-3  bg-primary text-black hover:bg-yellow-300 transition"
                    >
                      {t("deposit")}
                    </button>
                  </div>
                )}
              </div>
              <div
                onClick={handleLanguageToggle}
                className=" !w-8  sm:w-6 ml-3 text-white rounded-lg transition group"
                title="Switch Language"
              >
                <img
                  src={
                    currentLanguage === "bn"
                      ? "https://img.d4040p.com/dp/h5/assets/images/flag/BD.png?v=1783417384360&source=mcdsrc"
                      : "https://bajiwala88.live/img/flags/us_flag.png"
                  }
                  alt={currentLanguage === "bn" ? "Bangladesh Flag" : "US Flag"}
                  className=""
                />
              </div>
            </div>
          )}
          {/* Language Switcher Button */}
        </div>
      </header>

      {/* ================= LOGIN MODAL ================= */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* ================= OVERLAY ================= */}
      <div
        className={`fixed inset-0 z-[9999] transition-all duration-300 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        {/* BLUR BACKGROUND */}
        <div
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        <button
          onClick={() => setOpen(false)}
          className="absolute top-0 right-[0%] !z-50 text-white text-4xl  hover:opacity-70 transition"
        >
          <IoClose />
        </button>

        <div
          className={`absolute top-0 right-0 h-full w-[30%] max-w-[260px] transition-all duration-300 z-60 pointer-events-auto
              ${panelOpen ? "translate-x-0 visible opacity-100" : "translate-x-full invisible opacity-0"}`}
          style={{ WebkitOverflowScrolling: "touch" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full bg-white/20 backdrop-blur-md p-2 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-semibold text-sm px-2">
                {panelCategory}
              </h4>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-white p-1"
                aria-label="Close panel"
              >
                <MdClose />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 px-1">
              {(() => {
                const categoryLower = panelCategory.toLowerCase().trim();
                const isHot = categoryLower === "hot";

                if (isHot) {
                  return hotLoading ? (
                    <div className="text-white text-center py-6">
                      Loading...
                    </div>
                  ) : featuredGames && featuredGames.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {featuredGames.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => handleGameClick(game)}
                          disabled={gameLoading}
                          className="flex-col justify-center center items-center gap-3 bg-[#1b1b1b] rounded-lg overflow-hidden p-2"
                        >
                          <div className="w-14 mx-auto h-14 bg-gray-900 rounded-md overflow-hidden flex-shrink-0">
                            <img
                              src={game.img}
                              alt={game.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="text-center">
                            <div className="text-white text-xs font-medium truncate">
                              {game.name}
                            </div>
                            <div className="text-white/60 text-[11px] truncate">
                              {game.provider}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-white/50 text-sm text-center py-6">
                      No featured games
                    </div>
                  );
                }

                // Show providers for non-Hot categories
                return (
                  <div className="flex flex-col gap-2">
                    {providersLoading ? (
                      <div className="text-white text-center py-6">
                        Loading...
                      </div>
                    ) : (
                      (() => {
                        try {
                          const normalized = normalizeCategory(panelCategory);
                          const filtered = filterProvidersByCategory(
                            providersList,
                            normalized,
                          );
                          const unique = deduplicateProviders(filtered);

                          if (!unique || unique.length === 0) {
                            return (
                              <div className="text-white/50 text-sm text-center py-6">
                                No providers
                              </div>
                            );
                          }

                          return unique.map((provider, idx) => {
                            const name =
                              provider.brand_title || provider.name || provider;
                            const logo = provider.logo || provider.image || "";
                            return (
                              <button
                                key={`${name}-${idx}`}
                                onClick={() => {
                                  setOpen(false);
                                  setPanelOpen(false);
                                  navigate(
                                    `/games?provider=${encodeURIComponent(name)}`,
                                  );
                                }}
                                className="flex-col justify-center center items-center gap-3 bg-[#1b1b1b] rounded-lg overflow-hidden p-2"
                              >
                                <div className="w-12 h-12 bg-white rounded-md mx-auto overflow-hidden flex-shrink-0 flex items-center justify-center">
                                  {logo ? (
                                    <img
                                      src={logo}
                                      alt={name}
                                      className="w-full h-full object-contain"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="text-primary text-xs font-semibold text-center px-1">
                                      {name}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 text-center">
                                  <div className="text-white text-sm font-medium truncate">
                                    {name}
                                  </div>
                                </div>
                              </button>
                            );
                          });
                        } catch (e) {
                          console.error("Provider filtering error:", e);
                          return (
                            <div className="text-white text-center py-6">
                              Error
                            </div>
                          );
                        }
                      })()
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        {/* ================= SIDEBAR ================= */}
        <div
          className={`absolute top-0 left-0 h-full w-[70%] max-w-[420px] overflow-y-auto transition-all duration-300 hide-scrollbar ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* CLOSE BUTTON */}

          {/* SIDEBAR CONTENT */}
          <div className="p-4 pt-12 mb-20">
            {/* PROFILE CARD - Only when logged in */}
            {user && (
              <div className="bg-gradient-to-r from-[#2d2d2d] to-[#222222] rounded-2xl overflow-hidden mb-4 border border-primary/10">
                {/* USER INFO SECTION */}
                <div className="flex items-center p-4">
                  {/* AVATAR */}
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-3xl font-black text-white shadow-lg flex-shrink-0">
                    {user?.username?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </div>

                  {/* USER NAME & PROFILE */}
                  <div className="ml-4 flex-1">
                    <h3 className="text-primary text-lg font-bold truncate">
                      {user?.fullName ||
                        user?.username ||
                        user?.email ||
                        "User"}
                    </h3>
                    <p className="text-gray-400 text-sm">{t("profile")}</p>
                  </div>

                  <div className="text-primary text-3xl">›</div>
                </div>

                {/* WALLET SECTION */}
                <div className="bg-primary px-4 py-4 flex items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="!text-black font-semibold text-lg">
                        {t("mainWallet")}
                      </span>
                      <button
                        onClick={refreshBalance}
                        className={`!text-black hover:opacity-70 transition ${
                          refreshingBalance ? "animate-spin" : ""
                        }`}
                        aria-label="Refresh balance"
                      >
                        <MdRefresh className="text-lg" />
                      </button>
                    </div>
                    <h2 className="!text-black text-lg font-black mt-1">
                      {formatWalletBalance(walletBalance)}
                    </h2>
                  </div>

                  <div className="w-16 h-16 rounded-full bg-black/20 flex items-center justify-center">
                    <FaWallet className="text-black text-3xl" />
                  </div>
                </div>
              </div>
            )}

            {/* DEPOSIT / WITHDRAW BUTTONS */}
            {user && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/deposit");
                  }}
                  className="sidebar-card"
                >
                  <FaWallet className="sidebar-icon" />
                  <span>{t("deposit")}</span>
                </button>

                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/withdraw");
                  }}
                  className="sidebar-card"
                >
                  <FaWallet className="sidebar-icon" />
                  <span>{t("withdrawal")}</span>
                </button>
              </div>
            )}

            {/* GAME CATEGORIES GRID - Use exact categories from CasinoTabs */}
            {/* AUTH SECTION - Guest header component (handles its own visibility) */}
            <GuestSidebarHeader
              onLogin={() => openAuthModal("login")}
              onSignUp={() => openAuthModal("register")}
            />
            <div className="grid grid-cols-3 gap-3 mb-4 mt-4">
              {/* Static Game Categories from CasinoTabs */}
              {MOBILE_CATEGORY_TABS.map((tab, index) => (
                <button
                  key={index}
                  onClick={() => handleSidebarCategoryClick(tab.name)}
                  className="sidebar-card min-h-[110px]"
                >
                  <img
                    src={getCategoryIcon(tab.name)}
                    className="w-10 object-contain mb-2"
                    alt={tab.name}
                  />
                  <span className="text-center leading-5 text-xs">
                    {t(`categories.${tab.name}`)}
                  </span>
                </button>
              ))}
            </div>

            {/* ACTIONS SECTION */}
            <div className="bg-gradient-to-r from-[#2d2d2d] to-[#222222] rounded-2xl p-4 mb-4 border border-primary/10">
              <div className="grid grid-cols-2 gap-5">
                <Link
                  to="/promotions"
                  className="flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-80 transition"
                >
                  <FiGift className="text-primary text-4xl mb-2" />
                  <span className="text-white text-sm font-semibold leading-4">
                    {t("promotions")}
                  </span>
                </Link>
                <a {...getAppDownloadLinkProps()}>
                  <div className="flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-80 transition">
                    <img
                      src="https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-download.png?v=1783417384360"
                      className="text-primary w-8 h-8 mb-2"
                      alt="App"
                    />
                    <span className="text-white text-sm font-semibold leading-4">
                      {t("appDownload")}
                    </span>
                  </div>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(affiliatePath);
                  }}
                  className="flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-80 transition"
                >
                  <FiGift className="text-primary text-4xl mb-2" />
                  <span className="text-white text-sm font-semibold leading-4">
                    {t("affiliate")}
                  </span>
                </button>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="bg-gradient-to-r from-[#2d2d2d] to-[#222222] rounded-2xl overflow-hidden grid grid-cols-2 border border-primary/10">
              <button
                onClick={() => {
                  navigate("/");
                  setOpen(false);
                }}
                className="flex items-center justify-center gap-3 py-4 border-r border-white/10 hover:bg-white/5 transition"
              >
                <FaHome className="text-primary text-3xl" />
                <span className="text-white font-semibold">{t("home")}</span>
              </button>

              {user && (
                <button
                  onClick={() => {
                    // Properly logout: dispatch action, close sidebar, and navigate to home
                    dispatch(logout());
                    setOpen(false);
                    navigate("/");
                  }}
                  className="flex items-center justify-center gap-3 py-4 hover:bg-white/5 transition"
                >
                  <FaSignOutAlt className="text-primary text-3xl" />
                  <span className="text-white font-semibold">
                    {t("logout")}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* CUSTOM STYLES */}
          <style>{`
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }

            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }

            .sidebar-card {
              background: linear-gradient(to right, #2d2d2d, #222222);
              border: 1px solid #2563eb;
              border-radius: 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 14px;
              color: white;
              font-weight: 600;
              transition: 0.3s;
              cursor: pointer;
            }

            .sidebar-card:hover {
              transform: translateY(-2px);
              border-color: rgba(255, 224, 0, 0.4);
            }

            .sidebar-icon {
              color: #FFE100;
              font-size: 32px;
              margin-bottom: 8px;
            }
          `}</style>
        </div>
      </div>

      {/* Fixed Bottom Login/Signup Bar for Mobile - Only when not logged in */}
      {!user && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
          <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] shadow-2xl">
            <div className="flex items-stretch h-16">
              {/* Language Section */}
              <div className="flex-1 border-r border-[#2A2A2A]">
                <button
                  onClick={handleLanguageToggle}
                  className="w-full h-full flex items-center justify-center gap-2 px-2
                  hover:bg-[#252525] transition-all duration-300"
                >
                  <img
                    src={
                      currentLanguage === "bn"
                        ? "https://bajiwala88.live/img/flags/bdflag.png"
                        : "https://bajiwala88.live/img/flags/us_flag.png"
                    }
                    alt={
                      currentLanguage === "bn" ? "Bangladesh Flag" : "US Flag"
                    }
                    className="w-6 h-6 rounded-full object-cover"
                  />

                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-[11px] text-gray-400">
                      {currentLanguage === "bn"
                        ? "Bangladesh"
                        : "United States"}
                    </span>
                    <span className="text-xs font-medium text-white">
                      {currentLanguage === "bn" ? "বাংলা" : "English"}
                    </span>
                  </div>
                </button>
              </div>

              {/* Login */}
              <div className="flex-1">
                <button
                  onClick={() => openAuthModal("login")}
                  className="w-full h-full flex flex-col items-center justify-center
              bg-[#232323] text-white
              hover:bg-[#2d2d2d]
              transition-all duration-300"
                >
                  <span className="text-sm font-semibold">{t("login")}</span>
                </button>
              </div>

              {/* Signup */}
              <div className="flex-1">
                <button
                  onClick={() => openAuthModal("register")}
                  className="w-full h-full flex flex-col items-center justify-center
              bg-primary
              !text-black font-bold
              hover:brightness-110
              transition-all duration-300"
                >
                  <span className="text-sm !text-black">{t("signup")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= AUTH MODAL (Login/Register) ================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="relative w-full max-w-md bg-[#0f0f0f] rounded-xl shadow-[0_10px_50px_rgba(255,215,0,0.08)] border max-h-[90vh] overflow-y-auto"
            style={{ borderColor: "rgba(255,215,0,0.15)" }}
          >
            {/* Close Button */}
            <button
              onClick={closeAuthModal}
              className="absolute top-0 right-0 z-10 p-2  text-white rounded-full transition-all hover:scale-110"
            >
              <MdClose size={24} />
            </button>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 pt-12">
              {/* Toggle Tabs */}
              <div className="flex gap-2 mb-6 bg-[#111111] p-1 rounded-xl">
                <button
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${
                    authMode === "login"
                      ? "bg-primary text-black shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {t("login")}
                </button>
                <button
                  onClick={() => setAuthMode("register")}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${
                    authMode === "register"
                      ? "bg-primary text-black shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {t("signup")}
                </button>
              </div>

              {/* Login Form */}
              {authMode === "login" && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#FFD700] mb-1">
                      {t("welcomeBack")}
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">
                      {t("loginToYourAccount")}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      {t("userName")}
                    </label>
                    <input
                      name="username"
                      type="text"
                      value={loginForm.username}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, username: e.target.value })
                      }
                      required
                      className="w-full p-3 rounded-xl bg-[#111111] border !border-primary text-white placeholder-white/50 focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20 transition-colors"
                      placeholder={t("username")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      {t("password")}
                    </label>
                    <input
                      name="password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, password: e.target.value })
                      }
                      required
                      className="w-full p-3 rounded-xl bg-[#111111] border !border-primary text-white placeholder-white/50 focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loginForm.rememberMe}
                        onChange={(e) =>
                          setLoginForm({
                            ...loginForm,
                            rememberMe: e.target.checked,
                          })
                        }
                        className="w-4 h-4"
                      />
                      {t("rememberMe")}
                    </label>
                    <Link
                      to="/forgot"
                      className="text-primary hover:underline"
                      onClick={closeAuthModal}
                    >
                      {t("forgotPassword")}
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={authStatus === "loading"}
                    className="w-full py-3 bg-primary text-black font-bold rounded-xl
                      hover:from-[#FFB800] hover:to-[#FFD700] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-300 shadow-lg"
                  >
                    {authStatus === "loading" ? t("loggingIn") : t("login")}
                  </button>

                  {authError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      {typeof authError === "string"
                        ? authError
                        : authError.message || "Login failed"}
                    </div>
                  )}
                </form>
              )}

              {/* Register Form */}
              {authMode === "register" && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#FFD700] mb-1">
                      {t("createAccount")}
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">
                      {t("joinAndStartWinning")}
                    </p>
                  </div>

                  <input
                    name="username"
                    value={registerForm.username}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, ""),
                      })
                    }
                    required
                    placeholder={t("username")}
                    className="w-full p-3 rounded-xl bg-[#111111] text-white placeholder-white/50 border !border-primary focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20 transition"
                  />

                  {/* BD phone input: [🇧🇩 +88] [phone input] */}
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-2 bg-[#0f0f0f] rounded-xl p-2"
                      style={{ border: "1px solid primary" }}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center">
                        <img
                          src="https://img.d4040p.com/dp/h5/assets/images/flag/BD.png?v=1778569350194"
                          alt="BD Flag"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-white/90 font-medium pl-1 pr-2">
                        +88
                      </div>
                    </div>

                    <input
                      name="phone"
                      type="tel"
                      value={registerForm.phone}
                      onChange={(e) =>
                        setRegisterForm({
                          ...registerForm,
                          phone: e.target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 11),
                        })
                      }
                      required
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="01708376600"
                      className="flex-1 p-3 rounded-xl bg-[#111111] text-white placeholder-white/50 border !border-primary focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20 transition"
                    />
                  </div>

                  <input
                    name="password"
                    type="password"
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        password: e.target.value,
                      })
                    }
                    required
                    placeholder={t("password")}
                    className="w-full p-3 rounded-xl bg-[#111111] text-white placeholder-white/50 border !border-primary focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20 transition"
                  />

                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={registerForm.agreedToTerms}
                      onChange={(e) => {
                        setRegisterForm({
                          ...registerForm,
                          agreedToTerms: e.target.checked,
                        });
                        if (e.target.checked) {
                          setTermsError("");
                        }
                      }}
                      className="w-4 h-4"
                    />
                    {t("iAgreeToTermsAndConditions")}
                  </label>

                  {termsError && (
                    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      {termsError}
                    </div>
                  )}

                  {/* Promo Code Section
                  <div>
                    {!showPromo ? (
                      <button
                        type="button"
                        onClick={() => setShowPromo(true)}
                        className="text-sm text-[#FFD700] hover:text-[#FFB800] transition-colors flex items-center gap-1"
                      >
                        <FiGift />
                        Have a promo code?
                        <FiChevronDown className="text-xs" />
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowPromo(false)}
                          className="text-sm text-gray-400 hover:text-gray-300 flex items-center gap-1"
                        >
                          <FiChevronUp className="text-xs" />
                          Hide promo code
                        </button>

                        <div className="bg-[#111111] border border-[rgba(255,215,0,0.15)] rounded-xl p-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={promoCode}
                              onChange={(e) => {
                                setPromoCode(e.target.value.toUpperCase());
                                setPromoValidation(null);
                              }}
                              onBlur={() =>
                                promoCode.trim() && handleValidatePromo()
                              }
                              placeholder="Enter promo code"
                              className="flex-1 p-2 rounded-lg bg-[#0f0f0f] text-white border border-[rgba(255,215,0,0.15)] focus:border-[#FFD700] focus:outline-none uppercase text-sm"
                              maxLength={20}
                            />
                            <button
                              type="button"
                              onClick={handleValidatePromo}
                              disabled={promoLoading || !promoCode.trim()}
                              className="px-3 py-2 bg-primary hover:from-[#FFB800] hover:to-[#FFD700] disabled:bg-gray-600 text-black font-semibold rounded-lg text-sm transition-colors"
                            >
                              {promoLoading ? "..." : "Apply"}
                            </button>
                          </div>

                          {promoValidation && (
                            <div
                              className={`mt-2 p-2 rounded-lg text-sm flex items-start gap-2 ${
                                promoValidation.isValid
                                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                                  : "bg-red-500/10 border border-red-500/30 text-red-400"
                              }`}
                            >
                              {promoValidation.isValid ? (
                                <FiCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              ) : (
                                <FiX className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 text-xs">
                                {promoValidation.isValid ? (
                                  <>
                                    <div className="font-semibold">
                                      Promo Applied!
                                    </div>
                                    <div className="opacity-90">
                                      {promoValidation.bonusPercentage &&
                                        `${promoValidation.bonusPercentage}% bonus`}
                                      {promoValidation.bonusAmount &&
                                        ` up to ৳${promoValidation.bonusAmount.toLocaleString()}`}
                                    </div>
                                  </>
                                ) : (
                                  <div>{promoValidation.message}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div> */}

                  <button
                    type="submit"
                    disabled={authStatus === "loading"}
                    className="w-full py-3 bg-primary text-black font-bold rounded-xl
                      hover:from-[#FFB800] hover:to-[#FFD700] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-300 shadow-lg"
                  >
                    {authStatus === "loading" ? t("creating") : t("Confirme")}
                  </button>

                  {authError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      {typeof authError === "string"
                        ? authError
                        : authError.message || "Registration failed"}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ERROR MODAL ================= */}
      {errorModal.show && (
        <div className="fixed inset-0 z-[9999999] bg-black/50 flex items-center justify-center">
          <div className="bg-[#1b1b1b] text-white rounded-lg p-6 max-w-sm">
            <p className="mb-4">{errorModal.message}</p>
            <button
              onClick={() => setErrorModal({ show: false, message: "" })}
              className="bg-primary hover:primary text-black px-4 py-2 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/* ================== SIDEBAR ITEM COMPONENT ================== */
const sideItem = (icon, title, link) => (
  <li>
    <Link
      to={link}
      className="flex items-center gap-3 text-black hover:bg-white/10 p-2 rounded-lg transition"
    >
      <img
        src={`https://babu88.gold/static/svg/mobileMenu/${icon}.svg`}
        className="w-6"
      />
      <span>{title}</span>
    </Link>
  </li>
);

/* ================== DIVIDER ================== */
const Divider = () => <hr className="my-4 border-black" />;

export default NavbarSidebar;
