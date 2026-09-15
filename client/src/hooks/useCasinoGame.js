import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  clearCasinoLaunchError,
  closeCasinoGame,
  launchCasinoGame,
  restoreCasinoSession,
  selectCasinoGame,
  setCasinoFullscreen,
} from "../Components/store/casinoGameSlice";

export const useCasinoGame = () => {
  const dispatch = useDispatch();
  const casinoGame = useSelector(selectCasinoGame);
  const { user } = useSelector((state) => state.auth);

  const openGame = useCallback(
    (game) => {
      if (!game?.id) {
        return { ok: false, reason: "missing-game" };
      }

      if (!user) {
        return { ok: false, reason: "login-required", requiresLogin: true };
      }

      if (casinoGame.loading || casinoGame.isClosing) {
        return { ok: false, reason: "busy" };
      }

      dispatch(launchCasinoGame({ game }));
      return { ok: true };
    },
    [casinoGame.isClosing, casinoGame.loading, dispatch, user],
  );

  const closeGame = useCallback(() => {
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

  return {
    ...casinoGame,
    openGame,
    closeGame,
    toggleFullscreen,
    restoreGame,
    clearLaunchError,
  };
};

export default useCasinoGame;
