// import React, {
//   useEffect,
//   useState,
//   useCallback,
//   useMemo,
//   useRef,
// } from "react";
// import { useSelector } from "react-redux";
// import api from "../axios/axios";
// import walletService from "../services/walletService";

// export default function AutoLoadGame({ gameId = 897 }) {
//   // This component always loads Game ID 7004 fresh (no caching)
//   // It will ignore any other gameId prop and always load game 7004
//   const ALLOWED_GAME_ID = 897;
//   const actualGameId = ALLOWED_GAME_ID; // Always use 7004 regardless of prop
//   const { user, token } = useSelector((state) => state.auth);
//   const [gameUrl, setGameUrl] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [walletBalance, setWalletBalance] = useState(null);
//   const hasLaunched = useRef(false);

//   // Memoize user authentication status
//   const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);
//   const userId = user?._id;

//   // Fetch wallet balance (no caching)
//   useEffect(() => {
//     if (!isAuthenticated || !userId) return;

//     const loadBalance = async () => {
//       try {
//         const res = await walletService.getBalance();
//         const body = res?.data ?? {};
//         const payload = body.data ?? body;

//         // Extract balance from various possible formats
//         let balance = 0;
//         if (typeof payload.main === "number") {
//           balance = payload.main;
//         } else if (typeof payload.balance === "number") {
//           balance = payload.balance;
//         } else if (payload.wallet && typeof payload.wallet === "object") {
//           balance = payload.wallet.main ?? payload.wallet.balance ?? 0;
//         } else if (typeof payload === "number") {
//           balance = payload;
//         }

//         setWalletBalance(balance);
//       } catch (err) {
//         console.error("Failed to load wallet balance:", err);
//       }
//     };

//     loadBalance();
//   }, [isAuthenticated, userId]);

//   // Launch game function (always fresh, no caching)
//   const launchGame = useCallback(async () => {
//     // Prevent multiple simultaneous launches
//     if (loading || hasLaunched.current) return;

//     hasLaunched.current = true;
//     setLoading(true);
//     setError(null);

//     try {
//       const res = await api.post(`/api/games/launch/${actualGameId}`, {
//         currency: "BDT",
//         language: "en",
//       });

//       const url = res?.data?.data?.gameUrl || res?.data?.gameUrl;

//       if (url) {
//         setGameUrl(url);
//         // No caching - always fresh game URL
//       } else {
//         setError("Game URL missing. Please try again later.");
//         hasLaunched.current = false;
//       }
//     } catch (err) {
//       console.error("Auto-load game failed:", err);
//       setError("Failed to launch game. Please try again later.");
//       hasLaunched.current = false;
//     } finally {
//       setLoading(false);
//     }
//   }, [actualGameId, loading]);

//   useEffect(() => {
//     // Always launch game 7004 when user is authenticated (no caching)
//     if (isAuthenticated && userId && !loading && !hasLaunched.current) {
//       launchGame();
//     }
//   }, [isAuthenticated, userId, loading, launchGame]);

//   // Listen for game session close events and reload
//   useEffect(() => {
//     const handleSessionsClosed = () => {
//       console.log("Game sessions closed, reloading auto-load game...");
//       // Reset and reload the game
//       hasLaunched.current = false;
//       setGameUrl("");
//       setError(null);
//       // Trigger reload
//       if (isAuthenticated && userId && !loading) {
//         launchGame();
//       }
//     };

//     window.addEventListener("gameSessionsClosed", handleSessionsClosed);

//     return () => {
//       window.removeEventListener("gameSessionsClosed", handleSessionsClosed);
//     };
//   }, [isAuthenticated, userId, loading, launchGame]);

//   // Don't render anything if user is not logged in
//   if (!isAuthenticated) {
//     return null;
//   }

//   const formatMoney = (v) =>
//     v === null || v === undefined
//       ? "--"
//       : Number(v).toLocaleString("en-US", {
//           minimumFractionDigits: 2,
//           maximumFractionDigits: 2,
//         });

//   return (
//     <div className="w-full  backdrop-blur-xl  overflow-hidden shadow-2xl mb-6">
//       {/* Wallet Balance Display */}
//       {/* {walletBalance !== null && (
//         <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-6 py-3 flex items-center justify-between border-b border-white/10">
//           <div className="flex items-center gap-2">
//             <span className="text-gray-300 text-sm">Wallet Balance:</span>
//             <span className="text-white font-bold text-lg">{formatMoney(walletBalance)} BDT</span>
//           </div>
//           <span className="text-xs text-gray-400">Game ID: {actualGameId}</span>
//         </div>
//       )} */}

//       {loading ? (
//         <div className="flex items-center justify-center h-[700px]">
//           <div className="text-white text-2xl animate-pulse">
//             Launching game...
//           </div>
//         </div>
//       ) : error ? (
//         <div className="flex items-center justify-center h-[700px]">
//           <div className="text-red-500 text-xl">{error}</div>
//         </div>
//       ) : gameUrl ? (
//         <iframe
//           src={gameUrl}
//           title="Auto-loaded Game"
//           className="w-full h-[700px]"
//           allowFullScreen
//           allow="autoplay; encrypted-media; fullscreen; accelerometer; gyroscope"
//           sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
//         />
//       ) : null}
//     </div>
//   );
// }
