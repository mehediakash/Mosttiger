import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  checkNineWicketActiveSession,
  clearActiveNineWicketSession,
  clearCasinoLaunchError,
  clearSettlementNotice,
  closeCasinoGame,
  isNineWicketGame,
  launchCasinoGame,
  restoreCasinoSession,
  selectCasinoGame,
  setCasinoFullscreen,
  setCasinoLaunchError,
} from "../Components/store/casinoGameSlice";

// Module-level state to reliably track the active 9Wicket tab across component lifecycles
const POLLING_INTERVAL_MS = 1000; // Lightweight 1s polling (only checks window.closed, 0 API calls)
let activeTargetWindow = null;
let activePollingInterval = null;
let settlementTriggered = false;
let globalDispatch = null;
let lastCheckedUserId = null;
let isCheckingActiveSession = false;

const injectBrandedLoadingScreen = (win) => {
  if (!win || win.closed) return;
  try {
    const doc = win.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Launching 9Wicket — GameBetX</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0d0e12;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2.5rem 2rem;
      max-width: 440px;
      width: 100%;
      background: #14171f;
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
    }
    .badge {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 0.35rem 0.9rem;
      border-radius: 9999px;
      margin-bottom: 1.75rem;
    }
    .spinner-wrap {
      width: 60px;
      height: 60px;
      margin-bottom: 1.5rem;
    }
    .spinner {
      width: 100%;
      height: 100%;
      border: 3.5px solid rgba(245, 158, 11, 0.18);
      border-top-color: #f59e0b;
      border-radius: 50%;
      animation: spin 0.9s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 {
      font-size: 1.3rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.6rem;
    }
    p {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.65);
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">9Wicket Exchange</div>
    <div class="spinner-wrap">
      <div class="spinner"></div>
    </div>
    <h1>Launching 9Wicket...</h1>
    <p>Preparing your secure gaming session. You will be redirected automatically.</p>
  </div>
</body>
</html>`);
    doc.close();
  } catch (e) {
    console.debug("Could not inject loading screen into target window:", e);
  }
};

const injectErrorScreen = (win, errorMessage) => {
  if (!win || win.closed) return;
  try {
    const doc = win.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unable to Launch — GameBetX</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0d0e12;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2.5rem 2rem;
      max-width: 440px;
      width: 100%;
      background: #14171f;
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
    }
    .icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: bold;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.6rem;
    }
    p {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .btn {
      background: #f59e0b;
      color: #000000;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.65rem 1.6rem;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h1>Unable to Launch Game</h1>
    <p>${errorMessage || "An error occurred while preparing your session. Please return to GameBetX and try again."}</p>
    <button class="btn" onclick="window.close()">Close Tab</button>
  </div>
</body>
</html>`);
    doc.close();
  } catch (e) {
    try {
      win.close();
    } catch (_) {}
  }
};

const isWindowClosed = (win) => {
  if (!win) return true;
  try {
    return win.closed === true;
  } catch (e) {
    // If access is temporarily restricted by WebView/sandbox, do NOT prematurely assume closed
    return false;
  }
};

const stopPolling = () => {
  if (activePollingInterval) {
    clearInterval(activePollingInterval);
    activePollingInterval = null;
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("focus", handleRecheckOpportunity);
    window.removeEventListener("visibilitychange", handleVisibilityChange);
  }
  activeTargetWindow = null;
};

const triggerSettlementOnce = () => {
  if (settlementTriggered) return;
  settlementTriggered = true;
  stopPolling();
  if (globalDispatch) {
    globalDispatch(closeCasinoGame({ isNineWicket: true }));
  }
};

const checkTabClosed = () => {
  if (isWindowClosed(activeTargetWindow)) {
    triggerSettlementOnce();
  }
};

const handleRecheckOpportunity = () => {
  // Only recheck if targetWindow is actually closed.
  // Never settles if the 9Wicket window is still open.
  if (activeTargetWindow && isWindowClosed(activeTargetWindow)) {
    triggerSettlementOnce();
  }
};

const handleVisibilityChange = () => {
  // Only inspect when returning to visible state, never on hidden or blur!
  if (
    typeof document !== "undefined" &&
    document.visibilityState === "visible"
  ) {
    handleRecheckOpportunity();
  }
};

const startPolling = (targetWindow, dispatch) => {
  stopPolling();
  activeTargetWindow = targetWindow;
  globalDispatch = dispatch;
  settlementTriggered = false;

  // Lightweight 2.5-second interval: purely reads window.closed with zero network requests
  activePollingInterval = setInterval(checkTabClosed, POLLING_INTERVAL_MS);
  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleRecheckOpportunity);
    window.addEventListener("visibilitychange", handleVisibilityChange);
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("gameSessionsClosed", stopPolling);
  window.addEventListener("beforeunload", stopPolling);
}

export const useCasinoGame = () => {
  const dispatch = useDispatch();
  const casinoGame = useSelector(selectCasinoGame);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    globalDispatch = dispatch;
  }, [dispatch]);

  // Reload-safe active-session recovery for 9Wicket on app load/reload
  // Runs existing recovery/settlement silently in background without showing toast UI
  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) {
      lastCheckedUserId = null;
      return;
    }

    if (lastCheckedUserId === userId || isCheckingActiveSession) {
      return;
    }

    lastCheckedUserId = userId;
    isCheckingActiveSession = true;

    (async () => {
      try {
        const actionResult = await dispatch(checkNineWicketActiveSession());
        if (actionResult?.payload && actionResult.payload.sessionId) {
          // Existing active session detected on reload -> trigger existing settlement silently
          await dispatch(
            closeCasinoGame({
              isNineWicket: true,
              isReloadRecovery: true,
            }),
          );
        }
      } catch (err) {
        console.debug(
          "Failed to check/settle active 9Wicket session on reload:",
          err,
        );
      } finally {
        isCheckingActiveSession = false;
      }
    })();
  }, [dispatch, user?._id, user?.id]);

  const openGame = useCallback(
    async (game) => {
      if (!game?.id) {
        return { ok: false, reason: "missing-game" };
      }

      if (!user) {
        return { ok: false, reason: "login-required", requiresLogin: true };
      }

      if (casinoGame.loading || casinoGame.isClosing) {
        return { ok: false, reason: "busy" };
      }

      const is9W = isNineWicketGame(game);
      let targetWindow = null;

      // Pre-open a blank tab synchronously during user click for 9Wicket to bypass browser popup blockers
      if (is9W && typeof window !== "undefined") {
        targetWindow = window.open("", "_blank");
        if (!targetWindow) {
          dispatch(
            setCasinoLaunchError(
              "Popup was blocked by your browser. Please allow popups for this site and try again.",
            ),
          );
          return { ok: false, reason: "popup-blocked" };
        }
        injectBrandedLoadingScreen(targetWindow);
      }

      try {
        const actionResult = await dispatch(
          launchCasinoGame({ game, targetWindow }),
        );
        if (is9W) {
          if (launchCasinoGame.fulfilled.match(actionResult)) {
            const gameUrl = actionResult.payload?.gameUrl;
            if (gameUrl && targetWindow && !targetWindow.closed) {
              targetWindow.location.href = gameUrl;
              // Start lightweight tab close detection polling for 9Wicket only
              startPolling(targetWindow, dispatch);
            } else if (!gameUrl && targetWindow && !targetWindow.closed) {
              injectErrorScreen(
                targetWindow,
                "Game URL was not received. Please return to GameBetX and try again.",
              );
              stopPolling();
            }
          } else {
            const errorPayload = actionResult.payload;
            const errorMsg =
              typeof errorPayload === "string"
                ? errorPayload
                : errorPayload?.message ||
                  "Unable to launch 9Wicket session. Please try again.";
            if (targetWindow && !targetWindow.closed) {
              injectErrorScreen(targetWindow, errorMsg);
            }
            stopPolling();
          }
        }
        return { ok: true };
      } catch (e) {
        if (targetWindow && !targetWindow.closed) {
          injectErrorScreen(
            targetWindow,
            "An unexpected error occurred while launching 9Wicket.",
          );
        }
        stopPolling();
        return { ok: false, error: e };
      }
    },
    [casinoGame.isClosing, casinoGame.loading, dispatch, user],
  );

  const closeGame = useCallback(() => {
    stopPolling();
    dispatch(closeCasinoGame());
  }, [dispatch]);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      dispatch(setCasinoFullscreen(false));
      return;
    }

    const target = document.documentElement;
    if (target?.requestFullscreen) {
      target.requestFullscreen().catch(() => {});
      dispatch(setCasinoFullscreen(true));
    }
  }, [dispatch]);

  const restoreGame = useCallback(() => {
    dispatch(restoreCasinoSession());
  }, [dispatch]);

  const clearLaunchError = useCallback(() => {
    dispatch(clearCasinoLaunchError());
  }, [dispatch]);

  const clearNotice = useCallback(() => {
    dispatch(clearSettlementNotice());
  }, [dispatch]);

  const returnActiveBalance = useCallback(() => {
    if (casinoGame.isClosing) return;
    dispatch(closeCasinoGame({ isNineWicket: true }));
  }, [casinoGame.isClosing, dispatch]);

  const clearActiveSession = useCallback(() => {
    dispatch(clearActiveNineWicketSession());
  }, [dispatch]);

  return {
    ...casinoGame,
    openGame,
    closeGame,
    toggleFullscreen,
    restoreGame,
    clearLaunchError,
    clearSettlementNotice: clearNotice,
    settlementNotice: casinoGame.settlementNotice,
    activeNineWicketSession: casinoGame.activeNineWicketSession,
    returnActiveBalance,
    clearActiveNineWicketSession: clearActiveSession,
  };
};

export default useCasinoGame;
