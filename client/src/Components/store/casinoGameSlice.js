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
};

const extractMainBalance = (payload) => {
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
      Object.values(payload.wallet).find(
        (value) => typeof value === "number",
      ) ??
      0
    );
  }
  if (typeof payload === "number") return payload;
  return 0;
};

const insufficientBalancePayload = (message) => ({
  code: "INSUFFICIENT_BALANCE",
  message:
    message ||
    "Your account balance is currently 0. Please deposit funds to start playing.",
  requiresDeposit: true,
});

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

const isNineWicketGame = (game = {}) => {
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
  if (!state.isOpen) {
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
  async ({ game }, { getState, dispatch, rejectWithValue }) => {
    if (!game?.id) {
      return rejectWithValue("Missing game id.");
    }

    const casinoGame = getState()?.casinoGame;
    // Don't check `loading` here because the `pending` action is dispatched
    // before this payload runs, which would make `loading` true for the
    // same request and always reject. Only block launches when a close is
    // actively in progress.
    if (casinoGame?.isClosing) {
      return rejectWithValue("Game is closing.");
    }

    let timeout;
    try {
      // Add a timeout/abort so a hanging network request doesn't leave `loading` stuck.
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 15000);

      const balanceResponse = await api.get("/api/wallet/balance", {
        signal: controller.signal,
      });
      const balanceBody = balanceResponse?.data ?? {};
      const balancePayload = balanceBody.data ?? balanceBody;
      const availableBalance = extractMainBalance(balancePayload);

      if (availableBalance <= 0) {
        clearTimeout(timeout);
        return rejectWithValue(insufficientBalancePayload());
      }

      const launchUrl = isNineWicketGame(game)
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

      const gameUrl =
        response?.data?.data?.gameUrl ||
        response?.data?.data?.url ||
        response?.data?.gameUrl;

      if (!gameUrl) {
        return rejectWithValue("Game URL missing. Please try again.");
      }

      if (isNineWicketGame(game)) {
        // Funds were transferred from main wallet to 9Wicket provider on launch.
        // Trigger existing balance refresh to update authoritative balance across UI.
        try {
          await dispatch(fetchProfile());
        } catch (e) {}

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("refreshWalletBalance"));
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
  async (_, { getState, dispatch }) => {
    let settlementResult = null;
    let is9W = false;
    try {
      const currentGame = getState()?.casinoGame?.currentGame;
      is9W = isNineWicketGame(currentGame);
      if (is9W) {
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
      }
    }

    if (is9W) {
      const status = settlementResult?.status;
      const isConfirmedSuccess =
        status === "completed" ||
        status === "already_completed" ||
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
      } else {
        // Settlement is processing, reconciliation_required, or failed.
        // Do NOT pretend settlement succeeded. Do NOT overwrite frontend balance with 0.
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
);

const casinoGameSlice = createSlice({
  name: "casinoGame",
  initialState: hydrateSession(),
  reducers: {
    restoreCasinoSession: () => hydrateSession(),
    clearCasinoLaunchError: (state) => {
      state.launchError = null;
    },
    setCasinoFullscreen: (state, action) => {
      state.isFullscreen = Boolean(action.payload);
      persistSession(state);
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
      persistSession(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(launchCasinoGame.pending, (state, action) => {
        state.loading = true;
        state.isOpen = true;
        state.isClosing = false;
        state.launchError = null;
        state.currentGame = action.meta.arg?.game || state.currentGame;
      })
      .addCase(launchCasinoGame.fulfilled, (state, action) => {
        state.loading = false;
        state.isOpen = true;
        state.isClosing = false;
        state.launchError = null;
        state.gameUrl = action.payload.gameUrl;
        state.currentGame = action.payload.game;
        state.lastOpenedAt = action.payload.lastOpenedAt || Date.now();
        persistSession(state);
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
  setCasinoFullscreen,
  syncCasinoSession,
} = casinoGameSlice.actions;

export const selectCasinoGame = (state) => state.casinoGame || emptyState;
export const selectCasinoGameLoading = (state) =>
  Boolean(state.casinoGame?.loading || state.casinoGame?.isClosing);

export default casinoGameSlice.reducer;
