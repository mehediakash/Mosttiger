import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../axios/axios";
import { fetchProfile } from "./authSlice";

const STORAGE_KEY = "dexwine_casino_game_v1";

const emptyState = {
  isOpen: false,
  gameUrl: "",
  currentGame: null,
  loading: false,
  isClosing: false,
  launchError: null,
  isFullscreen: false,
  lastOpenedAt: null,
  settlementNotice: null,
  activeNineWicketSession: null,
};

const normalizeLaunchError = (payload) => {
  if (!payload) return null;

  if (typeof payload === "string") {
    return {
      message: payload,
      code: null,
      requiresDeposit: false,
    };
  }

  return {
    message: payload.message || "Failed to launch game.",
    code: payload.code || null,
    requiresDeposit: Boolean(payload.requiresDeposit),
  };
};

export const isNineWicketGame = (game = {}) => {
  if (!game || typeof game !== "object") return false;
  const raw = [
    game.provider,
    game.brand,
    game.title,
    game.name,
    game.id,
    game.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return raw.includes("9wicket") || raw.includes("9wickets") || raw === "9w";
};

const safeStorage = {
  get() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  },
  set(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e) {}
  },
  remove() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  },
};

const persistSession = (state) => {
  if (!state.isOpen || isNineWicketGame(state.currentGame)) {
    safeStorage.remove();
    return;
  }

  safeStorage.set({
    isOpen: true,
    gameUrl: state.gameUrl || "",
    currentGame: state.currentGame || null,
    isFullscreen: Boolean(state.isFullscreen),
    lastOpenedAt: state.lastOpenedAt || Date.now(),
  });
};

const hydrateSession = () => {
  const raw = safeStorage.get();
  if (!raw) return { ...emptyState };

  try {
    const parsed = JSON.parse(raw);
    return {
      ...emptyState,
      isOpen: Boolean(parsed?.isOpen),
      gameUrl: parsed?.gameUrl || "",
      currentGame: parsed?.currentGame || null,
      isFullscreen: Boolean(parsed?.isFullscreen),
      lastOpenedAt: parsed?.lastOpenedAt || null,
    };
  } catch (e) {
    return { ...emptyState };
  }
};

export const launchCasinoGame = createAsyncThunk(
  "casinoGame/launchCasinoGame",
  async ({ game, targetWindow }, { getState, dispatch, rejectWithValue }) => {
    if (!game?.id) {
      if (targetWindow && !targetWindow.closed) {
        try {
          targetWindow.close();
        } catch (e) {}
      }
      return rejectWithValue("Missing game id.");
    }

    const casinoGame = getState()?.casinoGame;
    // Don't check `loading` here because the `pending` action is dispatched
    // before this payload runs, which would make `loading` true for the
    // same request and always reject. Only block launches when a close is
    // actively in progress.
    if (casinoGame?.isClosing) {
      if (targetWindow && !targetWindow.closed) {
        try {
          targetWindow.close();
        } catch (e) {}
      }
      return rejectWithValue("Game is closing.");
    }

    let timeout;
    try {
      // Add a timeout/abort so a hanging network request doesn't leave `loading` stuck.
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 15000);

      const is9W = isNineWicketGame(game);

      const launchUrl = is9W
        ? "/api/9wicket/launch"
        : `/api/games/launch/${game.id}`;
      const response = await api.post(
        launchUrl,
        {
          currency: "BDT",
          language: "en",
        },
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      const responseBody = response?.data;
      const providerCode =
        responseBody?.code ??
        responseBody?.data?.code ??
        (responseBody?.success ? 0 : null);
      const isSuccess = providerCode === 0 || responseBody?.success === true;

      const gameUrl =
        responseBody?.data?.url ||
        responseBody?.data?.gameUrl ||
        responseBody?.url ||
        responseBody?.gameUrl;

      if (!isSuccess || !gameUrl) {
        if (targetWindow && !targetWindow.closed) {
          try {
            targetWindow.close();
          } catch (e) {}
        }
        return rejectWithValue(
          responseBody?.msg ||
            responseBody?.message ||
            "Game URL missing from provider response. Please try again.",
        );
      }

      if (is9W) {
        // Funds were transferred from main wallet to 9Wicket provider on launch.
        // Trigger existing balance refresh to update authoritative balance across UI.
        try {
          await dispatch(fetchProfile());
        } catch (e) {}

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("refreshWalletBalance"));
        }

        // Open 9Wicket game in NEW BROWSER TAB instead of iframe
        if (targetWindow && !targetWindow.closed) {
          targetWindow.location.href = gameUrl;
        } else if (typeof window !== "undefined") {
          window.open(gameUrl, "_blank", "noopener,noreferrer");
        }
      }

      if (getState()?.casinoGame?.isClosing) {
        return rejectWithValue("Game is closing.");
      }

      return {
        game,
        gameUrl,
        lastOpenedAt: Date.now(),
      };
    } catch (error) {
      if (timeout) clearTimeout(timeout);
      if (targetWindow && !targetWindow.closed) {
        try {
          targetWindow.close();
        } catch (e) {}
      }
      // Normalize abort errors
      if (error && error.name === "CanceledError") {
        return rejectWithValue("Game launch timed out. Please try again.");
      }

      const errorBody = error?.response?.data;
      if (
        errorBody?.requiresDeposit ||
        errorBody?.code === "INSUFFICIENT_BALANCE"
      ) {
        return rejectWithValue({
          code: errorBody.code || "INSUFFICIENT_BALANCE",
          message:
            errorBody.message ||
            "Your account balance is currently 0. Please deposit funds to start playing.",
          requiresDeposit: true,
        });
      }

      return rejectWithValue(
        errorBody?.message ||
          errorBody?.error ||
          (error?.message === "canceled"
            ? "Game launch timed out. Please try again."
            : "Failed to launch game. Please try again."),
      );
    }
  },
);

export const closeCasinoGame = createAsyncThunk(
  "casinoGame/closeCasinoGame",
  async (arg = {}, { getState, dispatch, rejectWithValue }) => {
    let settlementResult = null;
    let is9W = false;
    const isReloadRecovery = Boolean(arg?.isReloadRecovery);
    try {
      const currentGame = getState()?.casinoGame?.currentGame;
      is9W = Boolean(arg?.isNineWicket) || isNineWicketGame(currentGame);
      if (is9W) {
        dispatch(
          setSettlementNotice({
            status: "settling",
            title: "Returning Balance",
            message: "Returning your balance securely...",
            isReloadRecovery,
          }),
        );
        const res = await api.post("/api/9wicket/settle-active");
        settlementResult = res?.data?.data || res?.data;
      } else {
        await api.post("/api/games/close-all-sessions");
      }
    } catch (error) {
      console.error("Failed to close game sessions:", error);
      const errorBody = error?.response?.data;
      if (errorBody) {
        settlementResult = errorBody.data || errorBody;
      } else {
        settlementResult = {
          success: false,
          message: error?.message || "Network error during settlement",
        };
      }
    }

    if (is9W) {
      const status = settlementResult?.status;
      const isConfirmedSuccess =
        status === "completed" ||
        status === "already_completed" ||
        status === "no_active_session" ||
        (settlementResult?.success === true &&
          ![
            "settlement_in_progress",
            "reconciliation_required",
            "failed",
          ].includes(status));

      if (isConfirmedSuccess) {
        // Settlement is CONFIRMED successful -> trigger existing balance refresh mechanism!
        try {
          await dispatch(fetchProfile());
        } catch (e) {}

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("refreshWalletBalance"));
          window.dispatchEvent(new CustomEvent("gameSessionsClosed"));
        }

        dispatch(clearActiveNineWicketSession());

        dispatch(
          setSettlementNotice({
            status: "success",
            title: "Session closed successfully",
            message: "Balance returned successfully",
            isReloadRecovery,
          }),
        );
      } else {
        // Settlement is processing, reconciliation_required, or failed.
        // Do NOT pretend settlement succeeded. Do NOT overwrite frontend balance with 0.
        // Do NOT remove activeNineWicketSession so the user can retry.
        let errorMsg = settlementResult?.message;
        let noticeStatus = "error";

        if (status === "settlement_in_progress") {
          noticeStatus = "warning";
          errorMsg =
            errorMsg ||
            "Settlement is currently in progress with provider. Please wait a moment and retry.";
        } else if (status === "reconciliation_required") {
          noticeStatus = "warning";
          errorMsg =
            errorMsg ||
            "Session closed, but balance reconciliation is required. Please check back shortly.";
        } else {
          errorMsg =
            errorMsg ||
            "Failed to return balance. Please try again or contact support.";
        }

        dispatch(
          setSettlementNotice({
            status: noticeStatus,
            title: "Unable to return balance",
            message: errorMsg,
            isReloadRecovery,
          }),
        );

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("nineWicketSettlementPending", {
              detail: { settlement: settlementResult },
            }),
          );
        }
      }
    } else {
      // Non-9Wicket games: preserve existing behavior and refresh balance
      try {
        await dispatch(fetchProfile());
      } catch (e) {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshWalletBalance"));
        window.dispatchEvent(new CustomEvent("gameSessionsClosed"));
      }
    }

    return { closedAt: Date.now(), settlement: settlementResult };
  },
  {
    condition: (_, { getState }) => {
      const state = getState()?.casinoGame;
      if (state?.isClosing) {
        return false;
      }
      return true;
    },
  },
);

export const checkNineWicketActiveSession = createAsyncThunk(
  "casinoGame/checkNineWicketActiveSession",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/9wicket/active-session");
      const data = response?.data;
      if (data?.success && data?.hasActiveSession && data?.session) {
        return data.session;
      }
      return null;
    } catch (err) {
      return null;
    }
  },
);

const casinoGameSlice = createSlice({
  name: "casinoGame",
  initialState: hydrateSession(),
  reducers: {
    restoreCasinoSession: () => hydrateSession(),
    clearCasinoLaunchError: (state) => {
      state.launchError = null;
    },
    setCasinoLaunchError: (state, action) => {
      state.launchError = normalizeLaunchError(action.payload);
    },
    setCasinoFullscreen: (state, action) => {
      state.isFullscreen = Boolean(action.payload);
      persistSession(state);
    },
    setSettlementNotice: (state, action) => {
      state.settlementNotice = action.payload;
    },
    clearSettlementNotice: (state) => {
      state.settlementNotice = null;
    },
    clearActiveNineWicketSession: (state) => {
      state.activeNineWicketSession = null;
    },
    syncCasinoSession: (state, action) => {
      const payload = action.payload || {};
      state.isOpen = Boolean(payload.isOpen);
      state.gameUrl = payload.gameUrl || "";
      state.currentGame = payload.currentGame || null;
      state.isFullscreen = Boolean(payload.isFullscreen);
      state.lastOpenedAt = payload.lastOpenedAt || null;
      state.loading = false;
      state.isClosing = false;
      state.launchError = null;
      state.settlementNotice = null;
      persistSession(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkNineWicketActiveSession.fulfilled, (state, action) => {
        state.activeNineWicketSession = action.payload || null;
      })
      .addCase(launchCasinoGame.pending, (state, action) => {
        const is9W = isNineWicketGame(action.meta.arg?.game);
        state.loading = true;
        state.isOpen = !is9W;
        state.isClosing = false;
        state.launchError = null;
        state.settlementNotice = null;
        state.activeNineWicketSession = null;
        state.currentGame = action.meta.arg?.game || state.currentGame;
      })
      .addCase(launchCasinoGame.fulfilled, (state, action) => {
        const is9W = isNineWicketGame(action.payload.game);
        state.loading = false;
        state.isOpen = !is9W;
        state.isClosing = false;
        state.launchError = null;
        state.gameUrl = is9W ? "" : action.payload.gameUrl;
        state.currentGame = action.payload.game;
        state.lastOpenedAt = action.payload.lastOpenedAt || Date.now();
        if (!is9W) {
          persistSession(state);
        } else {
          safeStorage.remove();
        }
      })
      .addCase(launchCasinoGame.rejected, (state, action) => {
        state.loading = false;
        state.isOpen = false;
        state.isClosing = false;
        state.launchError = normalizeLaunchError(
          action.payload || "Failed to launch game.",
        );
      })
      .addCase(closeCasinoGame.pending, (state) => {
        state.isClosing = true;
        state.launchError = null;
      })
      .addCase(closeCasinoGame.fulfilled, (state) => {
        state.isOpen = false;
        state.loading = false;
        state.isClosing = false;
        state.launchError = null;
        state.isFullscreen = false;
        state.currentGame = null;
        state.activeNineWicketSession = null;
        safeStorage.remove();

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("gameSessionsClosed"));
        }
      })
      .addCase(closeCasinoGame.rejected, (state) => {
        state.isOpen = false;
        state.loading = false;
        state.isClosing = false;
        safeStorage.remove();

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("gameSessionsClosed"));
        }
      });
  },
});

export const {
  restoreCasinoSession,
  clearCasinoLaunchError,
  setCasinoLaunchError,
  setCasinoFullscreen,
  setSettlementNotice,
  clearSettlementNotice,
  clearActiveNineWicketSession,
  syncCasinoSession,
} = casinoGameSlice.actions;

export const selectCasinoGame = (state) => state.casinoGame || emptyState;
export const selectCasinoGameLoading = (state) =>
  Boolean(state.casinoGame?.loading || state.casinoGame?.isClosing);

export default casinoGameSlice.reducer;
