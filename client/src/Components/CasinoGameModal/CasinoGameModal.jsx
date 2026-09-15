import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdClose, MdFullscreen, MdFullscreenExit } from "react-icons/md";
import walletService from "../services/walletService";
import InsufficientBalanceModal from "../shared/InsufficientBalanceModal";
import { useCasinoGame } from "../../hooks/useCasinoGame";

const LiveWinnerTicker = React.memo(() => {
  const config = useMemo(
    () => ({
      names: [
        "রাকিব",
        "হাসান",
        "সুমাইয়া",
        "তানভীর",
        "নাঈম",
        "মেহেদী",
        "রিয়াদ",
        "ফাহিম",
      ],
      providers: ["JILI", "PG Soft", "JDB", "Evolution", "Spribe"],
      games: [
        "Fortune Gems",
        "Mahjong Ways",
        "Cash Truck",
        "Crazy Time",
        "Fishing Master",
        "Sweet Bonanza",
      ],
      amounts: ["৳৫,০০০", "৳১২,৫০০", "৳২৫,০০০", "৳৫০,০০০", "৳১,২৫,০০০"],
      badges: ["🎉", "🔥", "💰", "🎯"],
    }),
    [],
  );

  const makeItems = useCallback(
    (n = 8) => {
      return Array.from({ length: n }, () => {
        const name =
          config.names[Math.floor(Math.random() * config.names.length)];
        const provider =
          config.providers[Math.floor(Math.random() * config.providers.length)];
        const game =
          config.games[Math.floor(Math.random() * config.games.length)];
        const amount =
          config.amounts[Math.floor(Math.random() * config.amounts.length)];
        const badge =
          config.badges[Math.floor(Math.random() * config.badges.length)];
        return `${badge} ${name} ${provider} ${game} খেলতে গিয়ে ${amount} জিতেছে`;
      });
    },
    [config],
  );

  const [items, setItems] = useState(() => makeItems());

  useEffect(() => {
    const id = setInterval(() => setItems(makeItems()), 4500);
    return () => clearInterval(id);
  }, [makeItems]);

  const display = useMemo(() => [...items, ...items], [items]);

  return (
    <div className="w-full pointer-events-none">
      <style>{`
        @keyframes live-marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%);} }
        .live-marquee { display:inline-block; white-space:nowrap; animation: live-marquee 28s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .live-marquee { animation: none; } }
      `}</style>

      <div className="mx-auto max-w-full ">
        <div className="bg-black/50 py-1 text-xs text-yellow-300 font-medium overflow-hidden">
          <div className="live-marquee">
            {display.map((t, i) => (
              <span key={`${t}-${i}`} className="inline-block px-6">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

const CasinoGameModal = React.memo(() => {
  const {
    isOpen,
    gameUrl,
    currentGame,
    loading,
    isClosing,
    launchError,
    isFullscreen,
    closeGame,
    toggleFullscreen,
    restoreGame,
    clearLaunchError,
  } = useCasinoGame();

  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [walletBalance, setWalletBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const extractBalance = useCallback((payload) => {
    if (!payload) return 0;
    if (typeof payload.main === "number") return payload.main;
    if (typeof payload.balance === "number") return payload.balance;
    if (payload.wallet && typeof payload.wallet === "object") {
      return (
        payload.wallet.main ??
        payload.wallet.balance ??
        Object.values(payload.wallet).find(
          (value) => typeof value === "number",
        ) ??
        0
      );
    }
    if (typeof payload === "number") return payload;
    return 0;
  }, []);

  useEffect(() => {
    restoreGame();
  }, [restoreGame]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        toggleFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isFullscreen, toggleFullscreen]);

  useEffect(() => {
    if (!isOpen && !isClosing) {
      document.body.style.overflow = "unset";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isClosing]);

  useEffect(() => {
    if (!isOpen || !user) {
      setWalletBalance(null);
      return;
    }

    let mounted = true;

    const loadBalance = async () => {
      try {
        setBalanceLoading(true);
        const response = await walletService.getBalance();
        const body = response?.data ?? {};
        const payload = body.data ?? body;
        const balance = extractBalance(payload);
        if (mounted) setWalletBalance(balance);
      } catch (error) {
        console.debug("Failed to load wallet balance for casino modal", error);
      } finally {
        if (mounted) setBalanceLoading(false);
      }
    };

    loadBalance();
    return () => {
      mounted = false;
    };
  }, [extractBalance, isOpen, user]);

  const displayBalance = useMemo(() => {
    const raw =
      typeof walletBalance === "number" ? walletBalance : user?.balance;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return balanceLoading ? "..." : "--";
  }, [balanceLoading, user?.balance, walletBalance]);

  const headerLabel = currentGame?.name || currentGame?.title || "Casino Game";
  const modalVisible = isOpen || loading || isClosing || Boolean(launchError);
  const requiresDeposit =
    launchError &&
    typeof launchError === "object" &&
    (launchError.requiresDeposit ||
      launchError.code === "INSUFFICIENT_BALANCE");
  const launchErrorMessage =
    typeof launchError === "string"
      ? launchError
      : launchError?.message || "Failed to launch game. Please try again.";
  const launchErrorTitle = requiresDeposit
    ? "Insufficient Balance"
    : "Game Error";
  const launchErrorCopy = requiresDeposit
    ? "Your account balance is currently 0. Please deposit funds to start playing."
    : launchErrorMessage;

  const handleDepositClick = useCallback(() => {
    clearLaunchError();
    navigate("/deposit");
  }, [clearLaunchError, navigate]);

  if (!modalVisible) return null;

  return (
    <>
      <div
        className={`fixed inset-0 transition-all duration-300 ${isOpen ? "opacity-100 visible" : "opacity-0 visible"}`}
        style={{ zIndex: 9999999 }}
        aria-hidden={!isOpen}
      >
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

        <div className="relative w-full h-full">
          <div className="fixed items-center left-0 top-2 z-[999999] pointer-events-auto">
            <div className="inline-flex items-center gap-3 rounded-full bg-black/40 backdrop-blur-sm  px-3 py-1 ">
              {headerLabel}
            </div>
          </div>

          <div className="fixed right-1 top-1 z-[999999]">
            <button
              type="button"
              onClick={closeGame}
              disabled={isClosing}
              className="
      inline-flex
      h-10
      w-10
      items-center
      justify-center
      rounded-full
      border
      border-white/20
      bg-black/40
      text-primary
      backdrop-blur-xl
      transition-all
      hover:scale-105
      hover:bg-red-500/80
      disabled:opacity-60
    "
              aria-label="Close game"
            >
              <MdClose size={22} />
            </button>
          </div>

          <div className="relative flex h-full items-center justify-center ">
            <div className="relative h-[calc(100vh-6rem)] w-full max-w-6xl overflow-hidden  border border-white/10 bg-black shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
              <div
                className={`absolute inset-0 z-20 transition-opacity duration-300 ${loading || isClosing ? "opacity-100" : "pointer-events-none opacity-0"}`}
              >
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                <div className="relative flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/40 px-8 py-10 backdrop-blur-sm">
                    <div className="h-14 w-14 rounded-full border-4 border-primary/25 border-t-primary animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-semibold text-white">
                        {isClosing ? "Closing Game..." : "Launching Game..."}
                      </p>
                      <p className="text-sm text-white/60">
                        {isClosing
                          ? "Please wait while we close your session."
                          : "Please wait while we prepare your session."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <iframe
                src={gameUrl || "about:blank"}
                title="Casino Game"
                className="h-full w-full border-0"
                allow="autoplay; fullscreen; encrypted-media; payment"
                allowFullScreen
                loading="eager"
                aria-hidden={loading || isClosing}
              />
            </div>
          </div>

          <div className="absolute left-0 right-0 bottom-3 z-50 pointer-events-none">
            <div className="mx-auto max-w-6xl ">
              <LiveWinnerTicker />
            </div>
          </div>
        </div>
      </div>

      {launchError && requiresDeposit && (
        <InsufficientBalanceModal
          message={launchErrorCopy}
          onDismiss={clearLaunchError}
          onDeposit={handleDepositClick}
        />
      )}

      {launchError && !requiresDeposit && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          style={{ zIndex: 10000000 }}
        >
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#111111] p-6 text-white shadow-2xl">
            <p className="mb-2 text-lg font-semibold">{launchErrorTitle}</p>
            <p className="text-sm text-white/70">{launchErrorCopy}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={clearLaunchError}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={closeGame}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Close Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

CasinoGameModal.displayName = "CasinoGameModal";

export default CasinoGameModal;
