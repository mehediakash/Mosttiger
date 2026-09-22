import React, { useState } from "react";
import { Layout, Menu, Button } from "antd";
import { FaChevronRight, FaChevronLeft } from "react-icons/fa";
import { BiSolidCricketBall } from "react-icons/bi";
import {
  HomeOutlined,
  FireOutlined,
  TeamOutlined,
  GiftOutlined,
  LineChartOutlined,
  PhoneOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  CrownOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";

import Footer from "../shared/Footer";

import { useEffect, useMemo, useCallback, useRef } from "react";
import { HiMenu } from "react-icons/hi";
import { IoChevronDown, IoClose, IoSearch } from "react-icons/io5";
import { MdClose } from "react-icons/md";
import logo from "../../assets/logo.png";
import { useSelector, useDispatch } from "react-redux";
import { FaUserCircle } from "react-icons/fa";
import { TbRefresh } from "react-icons/tb";
import { BsCreditCard2BackFill } from "react-icons/bs";

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
import { MdLanguage } from "react-icons/md";
import api from "../axios/axios";
import LoginModal from "../Modal/LoginModal";
import { loginUser, registerUser } from "../store/authSlice";
import { validatePromoCode } from "../services/promoService";
import { useLanguage } from "../../context/LanguageContext";
import { normalizeCategory } from "../../utils/categoryNormalizer";
import {
  filterProvidersByCategory,
  deduplicateProviders,
} from "../../utils/providerMapper";
import { STATIC_TABS } from "../CasinoTabs/CasinoTabs";
import { useCasinoGame } from "../../hooks/useCasinoGame";
import { useTranslation } from "react-i18next";
import {
  clearStoredAffiliateCode,
  clearStoredReferralCode,
  getStoredAffiliateCode,
  getStoredReferralCode,
} from "../../utils/affiliateTracking";
import { getAppDownloadLinkProps } from "../../utils/appDownload";
const { Header, Sider: AntSider, Content } = Layout;

const DesktopLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [gameCategories, setGameCategories] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'register'
  const location = useLocation();
  const { openGame, loading: gameLoading } = useCasinoGame();

  const { t, i18n } = useTranslation();

  const language = i18n.language;

  const toggleLanguage = () => {
    const newLang = language === "bn" ? "en" : "bn";

    i18n.changeLanguage(newLang);

    localStorage.setItem("language", newLang);
  };

  // Listen for global requests to open the shared AuthModal
  useEffect(() => {
    const handler = (e) => {
      const mode = e?.detail?.mode || "login";
      setAuthMode(mode);
      setShowAuthModal(true);
      setShowLoginModal(false);
    };

    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, []);
  const { user } = useSelector((state) => state.auth); // get login state
  const [walletBalance, setWalletBalance] = useState(null);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [hotGames, setHotGames] = useState([]);
  const [hotGamesLoading, setHotGamesLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const navigate = useNavigate();
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

  const refreshBalance = async () => {
    if (!user) {
      setShowLoginModal(true);
      try {
        navigate("/login");
      } catch (e) {}
      return;
    }

    setRefreshingBalance(true);
    try {
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

  // ================= FETCH HOT GAMES =================
  useEffect(() => {
    let mounted = true;
    const fetchHotGames = async () => {
      try {
        setHotGamesLoading(true);
        const response = await api.get("/api/games", {
          params: {
            is_active: "true",
            is_hot: "true",
            limit: 20,
          },
        });

        const gamesData =
          response.data?.data?.games || response.data?.games || [];
        const games = gamesData.map((g) => ({
          id: g.game_code || g._id,
          name: g.game_name || g.title || "Unknown Game",
          image: g.image_url || "/placeholder.jpg",
          code: g.game_code,
        }));

        if (mounted) setHotGames(games);
      } catch (error) {
        console.error("Failed to fetch hot games:", error);
      } finally {
        if (mounted) setHotGamesLoading(false);
      }
    };

    fetchHotGames();
    // fetch providers for sidebar
    const fetchProviders = async () => {
      try {
        setProvidersLoading(true);
        const response = await api.get("https://igamingapis.com/provider/");
        if (response.data?.games) {
          if (mounted) setProviders(response.data.games);
        }
      } catch (err) {
        console.error("Failed to fetch providers:", err);
      } finally {
        if (mounted) setProvidersLoading(false);
      }
    };

    fetchProviders();
    return () => {
      mounted = false;
    };
  }, []);

  const handleProviderClick = (providerName) => {
    if (!providerName) return;
    navigate(`/games?provider=${encodeURIComponent(providerName)}`);
  };

  const sidebarMenuRef = useRef(null);

  const launchHotGame = useCallback(
    (game) => {
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
    [openGame, user],
  );

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
    confirmPassword: "",
    agreedToTerms: true,
  });

  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoValidation, setPromoValidation] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);

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
    if (registerForm.password !== registerForm.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (!phoneRegex.test(registerForm.phone.trim())) {
      alert("Invalid Bangladesh phone number");
      return;
    }
    try {
      const affiliateCode = getStoredAffiliateCode();
      const referralCode = getStoredReferralCode();
      const registrationData = {
        username: registerForm.username.trim().toLowerCase(),
        phone: registerForm.phone.trim(),
        password: registerForm.password,
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
        confirmPassword: "",
        agreedToTerms: true,
      });
      setPromoCode("");
      setPromoValidation(null);
      setShowPromo(false);
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
      agreedToTerms: true,
    });
    setPromoCode("");
    setPromoValidation(null);
    setShowPromo(false);
  };

  // ================= MENU =================
  const menuItems = useMemo(
    () => [
      {
        key: "/",
        icon: <HomeOutlined />,
        label: <Link to="/">{t("home")}</Link>,
      },
      {
        key: "/hot",
        icon: (
          <img
            src="https://img.d4040p.com/dp/h5/assets/images/icon-set/theme-icon/icon-hotgame.png?v=1783417384360"
            alt="Hot"
            className="w-8"
          />
        ),
        label: t("categories.Hot"),
        children: hotGames.map((game) => ({
          key: `hot:${encodeURIComponent(game.id)}`,
          label: (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 0",
              }}
              title={game.name}
            >
              <img
                src={game.image}
                alt={game.name}
                style={{
                  width: "32px",
                  height: "32px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
                loading="lazy"
              />
              <span
                style={{
                  fontSize: "12px",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {game.name}
              </span>
            </div>
          ),
        })),
      },
      ...[
        "Slot",
        "Flash",
        "MiniGames",
        "Casino",
        "Sports",
        "Table",
        "Crash",
        "Chess",
        "Fishing",
        "XGames",
        "Arcade",
        "CockFight",
      ].map((cat) => {
        const display = cat;
        const normalized = normalizeCategory(cat);
        let providersForCat = [];

        try {
          providersForCat = deduplicateProviders(
            filterProvidersByCategory(providers, normalized),
          );
        } catch (e) {
          providersForCat = [];
        }

        const children = providersForCat.map((p, idx) => {
          const providerName = p.brand_title || p.name || "Unknown";
          const logo = p.logo || p.provider_logo || p.image || "";

          return {
            key: `prov:${encodeURIComponent(providerName)}`,
            label: (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 0",
                }}
                title={providerName}
              >
                {logo ? (
                  <img
                    src={logo}
                    className="bg-white"
                    alt={providerName}
                    style={{ width: 28, height: 20, objectFit: "contain" }}
                    loading="lazy"
                  />
                ) : null}
                <span
                  style={{
                    fontSize: "12px",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {providerName}
                </span>
              </div>
            ),
          };
        });

        const tabData = (STATIC_TABS || []).find(
          (s) => s.name?.toLowerCase() === cat.toLowerCase(),
        );

        const tabIcon = tabData?.iconSrc ? (
          <img
            src={tabData.iconSrc}
            alt={tabData.name}
            style={{
              width: 22,
              height: 22,
              objectFit: "contain",
            }}
          />
        ) : null;

        return {
          key: `/cat-${cat.toLowerCase()}`,
          icon: tabIcon,
          label: (
            <Link
              className="text-white"
              to={`/games?category=${encodeURIComponent(cat)}`}
            >
              {t(`categories.${cat}`)}
            </Link>
          ),
          children,
        };
      }),
      {
        type: "divider",
      },
      {
        key: "/promotions",
        icon: <GiftOutlined />,
        label: <Link to="/promotions">{t("promotions")}</Link>,
      },
      {
        key: "/refer-bonus",
        icon: <ShareAltOutlined />,
        label: t("referBonus"),
      },
      {
        key: "/app-download",
        icon: <DownloadOutlined />,
        label: <a {...getAppDownloadLinkProps()}>{t("appDownload")}</a>,
      },
      {
        key: "/affiliate",
        icon: <LineChartOutlined />,
        label: t("affiliate"),
      },
      {
        key: "/contact",
        icon: <PhoneOutlined />,
        label: <Link to="/contact">{t("contact")}</Link>,
      },
    ],
    [hotGames, launchHotGame, providers, language],
  );

  const getSelectedKey = () => {
    return location.pathname;
  };

  return (
    <Layout style={{ minHeight: "100vh" }} className="bg-gray-900">
      {/* ================= SIDEBAR ================= */}
      <AntSider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        collapsedWidth={70}
        theme="dark"
        style={{
          background: "#1a1a1a",
          boxShadow: "2px 0 12px rgba(0,0,0,0.4)",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,

          display: "flex",
          flexDirection: "column",

          height: "100vh",
          overflow: "visible",

          transition: "all 0.3s ease",
        }}
      >
        {/* ================= TOP AREA ================= */}
        <div
          style={{
            height: "72px",
            borderBottom: "1px solid #333",
            marginBottom: "8px",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "center",
            transition: "all 0.3s ease",
          }}
        >
          {/* ================= LOGO ================= */}
          {!collapsed && (
            <Link
              to="/deposit"
              className="flex w-[80%] justify-center text-center  items-center gap-1 !bg-[#F3F3F3] !text-black text-md font-bold  px-4 py-2 mx-4 rounded-lg transition"
            >
              <div className="flex items-center">
                <BiSolidCricketBall className="!text-black" size={22} />

                <p className="hidden sm:block !text-black text-center w-[100%]">
                  {t("categories.Cricket")}
                </p>
              </div>
            </Link>
          )}
          {/* ================= TOGGLE BUTTON ================= */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              right: collapsed ? "50%" : "-18px",
              transform: collapsed
                ? "translate(50%, -50%)"
                : "translateY(-50%)",
              zIndex: 99999,
              transition: "all 0.35s ease",
            }}
          >
            <Button
              type="text"
              onClick={() => setCollapsed(!collapsed)}
              icon={
                collapsed ? (
                  <FaChevronRight size={14} />
                ) : (
                  <FaChevronLeft size={14} />
                )
              }
              className="sidebar-toggle-btn"
            />
          </div>
        </div>

        {/* ================= MENU ================= */}
        <div
          ref={sidebarMenuRef}
          className="sidebar-scroll-wrapper"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",

            WebkitOverflowScrolling: "touch",

            scrollbarWidth: "thin",
            scrollbarColor: "#000000 #1a1a1a",
          }}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            defaultOpenKeys={[]}
            inlineIndent={16}
            items={menuItems}
            className="desktop-sidebar-menu"
            onClick={(info) => {
              const { key } = info;
              if (!key) return;

              // hot game launch
              if (key.startsWith("hot:")) {
                const gameId = decodeURIComponent(key.replace("hot:", ""));
                const game = hotGames.find(
                  (g) => String(g.id) === String(gameId),
                );
                if (game) launchHotGame(game);
                return;
              }

              // provider toggle
              if (key.startsWith("prov:")) {
                const providerName = decodeURIComponent(
                  key.replace("prov:", ""),
                );
                // toggle provider in URL (use 'providers' param)
                try {
                  const params = new URLSearchParams(location.search);
                  const raw =
                    params.get("providers") || params.get("provider") || "";
                  const list = raw
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean);

                  const exists = list.find((p) => p === providerName);
                  let next;
                  if (exists) {
                    next = list.filter((p) => p !== providerName);
                  } else {
                    next = [...list, providerName];
                  }

                  if (next.length === 0) {
                    params.delete("providers");
                    params.delete("provider");
                  } else {
                    params.set("providers", next.join(","));
                    params.delete("provider");
                  }

                  navigate({ pathname: "/games", search: params.toString() });
                } catch (e) {
                  console.error("Failed to toggle provider in URL", e);
                }
                return;
              }
            }}
            style={{
              background: "#1a1a1a",
              border: "none",
            }}
          />
        </div>
      </AntSider>

      {/* ================= MAIN ================= */}
      <Layout
        style={{
          marginLeft: collapsed ? 70 : 240,
          transition: "all 0.3s ease",
        }}
      >
        {/* ================= HEADER ================= */}
        <Header
          style={{
            background: "#0f0f0f",
            padding: "0 26px",
            height: "72px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #333",
            position: "sticky",
            top: 0,
            zIndex: 999,
          }}
          className="desktop-header"
        >
          {/* Menu Button */}
          <div className="w-full">
            <div className="  flex  items-center gap-x-2 justify-between">
              {/* Logo */}
              <div className="flex-1 flex ">
                <Link to={"/"}>
                  <img src={logo} alt="ck369" className="h-10" />
                </Link>
              </div>

              {!user ? (
                <>
                  {/* Deposit Button */}
                  <div>
                    <Link
                      to="/login"
                      className="
hidden md:flex
items-center
justify-center
h-10
px-5
text-sm
!bg-[#D7D7D7]
border border-primary
rounded-lg
font-semibold
transition
hover:bg-white/20
!text-black
whitespace-nowrap
"
                    >
                      {t("login")}
                    </Link>
                  </div>
                  <div>
                    <Link
                      to={"/register"}
                      className="
hidden md:flex
items-center
justify-center
h-10
px-5
text-sm
!bg-primary
!text-black
rounded-lg
font-semibold
hover:opacity-90
transition
whitespace-nowrap
"
                    >
                      {t("signup")}
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    to="/deposit"
                    className="flex items-center gap-1 !bg-primary !text-black text-sm  p-2 rounded-lg transition"
                  >
                    <BsCreditCard2BackFill size={15} />

                    <p className="hidden sm:block !text-black">
                      {t("deposit")}
                    </p>
                  </Link>
                  <div className="flex items-center gap-1 !bg-[#F3F3F3] !text-black text-sm  p-2 rounded-lg transition">
                    <TbRefresh
                      size={22}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        refreshBalance();
                      }}
                      className="cursor-pointer"
                    />

                    <p className="hidden sm:block !text-black">
                      {t("mainWallet")}: {t("BDT")}{" "}
                      {formatWalletBalance(walletBalance)}{" "}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 !text-white hover:opacity-90"
                  >
                    <FaUserCircle className="text-2xl" />
                  </Link>
                </div>
              )}

              <div
                onClick={toggleLanguage}
                className=" !w-12  sm:w-6 text-white rounded-lg transition group"
                title="Switch Language"
              >
                <img
                  src={
                    language && language.toLowerCase() === "en"
                      ? "https://cdn-icons-png.flaticon.com/512/197/197484.png"
                      : "https://img.d4040p.com/dp/h5/assets/images/flag/BD.png?v=1783417384360&source=mcdsrc"
                  }
                  alt={
                    language && language.toLowerCase() === "en"
                      ? "US Flag"
                      : "Bangladesh Flag"
                  }
                  className=" w-6 "
                />
              </div>
            </div>
          </div>
        </Header>

        {/* ================= CONTENT ================= */}
        <Content
          style={{
            padding: "24px",
            background: "#0f0f0f",
            minHeight: "calc(100vh - 64px)",
          }}
        >
          <Outlet />
        </Content>

        {/* ================= FOOTER ================= */}
        <Footer />
      </Layout>

      {/* ================= STYLES ================= */}
      <style>{`
    /* ================= SCROLLBAR STYLING ================= */

    /* desktop-sidebar-menu scrollbar removed; sidebar-scroll-wrapper handles scrolling */

    /* ================= TOGGLE BUTTON ================= */
    .desktop-sidebar-menu .ant-menu-item-selected::after {
  display: none !important;
}

    .sidebar-toggle-btn {
      background: var(--color-primary) !important;
      border-radius: 999px !important;
      width: 36px !important;
      height: 36px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #000 !important;
      border: 2px solid #1a1a1a !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      transition: all 0.35s ease !important;
    }

    .sidebar-toggle-btn:hover {
      background: #ffd24d !important;
      transform: scale(1.06);
    }

    /* ================= MENU ================= */

    .desktop-sidebar-menu .ant-menu-item-selected {
      background-color: var(--color-primary) !important;
      color: #000 !important;
    }

    .desktop-sidebar-menu .ant-menu-item-selected::after {
      display: none !important;
    }

    .desktop-sidebar-menu .ant-menu-item:hover {
      background-color: rgba(255, 184, 12, 0.1) !important;
      color: var(--color-primary) !important;
      border-radius: 4px;
      transition: all 0.3s ease;
    }

    .desktop-sidebar-menu .ant-menu-item {
      color: #ffffff;
      transition: all 0.3s ease;
      border-radius: 4px;
      margin: 4px 8px;
      height: 40px;
      line-height: 40px;
    }

    .desktop-sidebar-menu .ant-menu-submenu-title:hover {
      background-color: rgba(255, 184, 12, 0.1) !important;
      color: var(--color-primary) !important;
      border-radius: 4px;
    }

    .desktop-sidebar-menu .ant-menu-submenu-title {
      color: #ffffff !important;
      border-radius: 4px;
      margin: 4px 8px;
      transition: all 0.3s ease;
    }

    .desktop-sidebar-menu .ant-menu-submenu-open > .ant-menu-submenu-title {
      color: var(--color-primary) !important;
    }

    .desktop-sidebar-menu .ant-menu-item a {
      color: inherit;
      text-decoration: none;
    }

    .desktop-sidebar-menu .ant-menu-item-selected a {
      color: #000 !important;
      font-weight: 600;
    }

    .desktop-sidebar-menu .ant-menu-item-divider {
      background-color: #333;
      margin: 8px 0;
    }

    /* ================= SIDEBAR SCROLL WRAPPER ================= */

    .sidebar-scroll-wrapper {
      overflow-y: auto;
      overflow-x: hidden;
      height: 100%;
      scroll-behavior: smooth;

      scrollbar-width: thin;
      scrollbar-color: #222222 #111111;
    }

    /* Chrome, Edge */

    .sidebar-scroll-wrapper::-webkit-scrollbar {
      width: 6px;
    }

    .sidebar-scroll-wrapper::-webkit-scrollbar-track {
      background: #111111;
      border-radius: 999px;
    }

    .sidebar-scroll-wrapper::-webkit-scrollbar-thumb {
      background: #222222;
      border-radius: 999px;
    }

    .sidebar-scroll-wrapper::-webkit-scrollbar-thumb:hover {
      background: #333333;
    }

    /* ================= HEADER ================= */

    .desktop-header {
      background: linear-gradient(
        135deg,
        #1a1a1a 0%,
        #0f0f0f 100%
      );
    }

    /* ================= LAYOUT ================= */

    .ant-layout {
      background: #0f0f0f;
    }
      .desktop-sidebar-menu .ant-menu-item-selected::after {
  display: none !important;
}
  `}</style>
    </Layout>
  );
};

export default DesktopLayout;
