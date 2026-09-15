import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { useCasinoGame } from "./useCasinoGame";

export const useCasinoGameLaunch = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { openGame, loading: gameLoading } = useCasinoGame();
  const { user } = useSelector((state) => state.auth);

  const launchGame = useCallback(
    (game) => {
      if (!game?.id) return;

      if (!user) {
        setShowLoginModal(true);
        return;
      }

      const result = openGame(game);
      if (result?.requiresLogin) {
        setShowLoginModal(true);
      }
    },
    [openGame, user],
  );

  const closeLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  return {
    launchGame,
    gameLoading,
    showLoginModal,
    closeLoginModal,
  };
};

export default useCasinoGameLaunch;
