import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./Components/store";
import { LanguageProvider } from "./context/LanguageContext";
import CasinoGameModal from "./Components/CasinoGameModal/CasinoGameModal";

// Pages
import Home from "./pages/home";
import NotFound from "./pages/NotFound";

import Login from "./Components/Auth/Login";
import Register from "./Components/Auth/Register";
import VerifyOtp from "./Components/Auth/VerifyOtp";
import ForgotPassword from "./Components/Auth/ForgotPassword";
import ResetPassword from "./Components/Auth/ResetPassword";
import Profile from "./Components/Profile/Profile";
import BetHistory from "./Components/Bet/BetHistory";
import BetDetails from "./Components/Bet/BetDetails";
import PlaceBet from "./Components/Bet/PlaceBet";
import SportsPage from "./Components/Sports/SportsPage";

// Layout & Protected Route
import ResponsiveLayout from "./Components/Layouts/ResponsiveLayout"; // Responsive desktop/mobile layout
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute";
import DepositPage from "./pages/DepositPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import WithdrawPage from "./pages/WithdrawPage";
import PromotionsPage from "./pages/PromotionsPage";
import About from "./pages/About";
import Casino from "./pages/Casino";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import ResponsibleGaming from "./pages/ResponsibleGaming";
import LiveBetting from "./pages/LiveBetting";
import Sports from "./pages/Sports";
import GamesPage from "./pages/Games/GamesPage";
import ScrollToTop from "./Components/ScrollToTop/ScrollToTop";
import CrispChat from "./Components/CrispChat";
import AffiliateRequireAuth from "./pages/Affiliate/AffiliateRequireAuth";
import { storeAffiliateCodeFromSearch } from "./utils/affiliateTracking";
import { useAntiInspect } from "./hooks/useAntiInspect";

const AppDownloadBar = lazy(() => import("./Components/AppDownloadBar"));
const AffiliateLanding = lazy(() => import("./pages/Affiliate/AffiliateLanding"));
const AffiliateLogin = lazy(() => import("./pages/Affiliate/AffiliateLogin"));
const AffiliateSignup = lazy(() => import("./pages/Affiliate/AffiliateSignup"));
const AffiliateDashboardLayout = lazy(() =>
  import("./pages/Affiliate/AffiliateDashboardLayout"),
);
const AffiliateDashboardHome = lazy(() =>
  import("./pages/Affiliate/AffiliateDashboardHome"),
);
const AffiliatePlayersPage = lazy(() =>
  import("./pages/Affiliate/AffiliatePlayersPage"),
);
const AffiliateWithdrawPage = lazy(() =>
  import("./pages/Affiliate/AffiliateWithdrawPage"),
);
const AffiliateReferralLink = lazy(() =>
  import("./pages/Affiliate/AffiliateReferralLink"),
);
const AffiliateMarketingTools = lazy(() =>
  import("./pages/Affiliate/AffiliateMarketingTools"),
);
const AffiliateProfilePage = lazy(() =>
  import("./pages/Affiliate/AffiliateProfilePage"),
);
const AffiliateHistoryPages = lazy(() =>
  import("./pages/Affiliate/AffiliateHistoryPages"),
);

const AffiliateFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
    Loading affiliate portal...
  </div>
);

const AffiliateCodeCapture = () => {
  const location = useLocation();

  useEffect(() => {
    storeAffiliateCodeFromSearch(location.search);
  }, [location.search]);

  return null;
};

export default function App() {
  useAntiInspect();

  return (
    <Provider store={store}>
      <LanguageProvider>
        <BrowserRouter>
          <AffiliateCodeCapture />
          <CrispChat />
          <Suspense fallback={null}>
            <AppDownloadBar />
          </Suspense>
          {/* <ScrollToTop /> */}
          <Routes>
            {/* Public Layout */}
            <Route element={<ResponsiveLayout />}>
              <Route index element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/deposit" element={<DepositPage />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancel" element={<PaymentCancel />} />
              <Route path="/withdraw" element={<WithdrawPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/forgot" element={<ForgotPassword />} />
              <Route path="/reset" element={<ResetPassword />} />
              <Route path="/sports" element={<SportsPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/casino" element={<Casino />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route
                path="/responsible-gaming"
                element={<ResponsibleGaming />}
              />
              <Route path="/live-betting" element={<LiveBetting />} />
              <Route path="/sports-betting" element={<Sports />} />
              <Route path="/games" element={<GamesPage />} />
              <Route
                path="/affiliate"
                element={
                  <Suspense fallback={<AffiliateFallback />}>
                    <AffiliateLanding />
                  </Suspense>
                }
              />
              <Route
                path="/affiliate/login"
                element={
                  <Suspense fallback={<AffiliateFallback />}>
                    <AffiliateLogin />
                  </Suspense>
                }
              />
              <Route
                path="/affiliate/signup"
                element={
                  <AffiliateRequireAuth>
                    <Suspense fallback={<AffiliateFallback />}>
                      <AffiliateSignup />
                    </Suspense>
                  </AffiliateRequireAuth>
                }
              />
            </Route>

            {/* Protected Route */}
            <Route element={<ResponsiveLayout />}>
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bets"
                element={
                  <ProtectedRoute>
                    <BetHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bets/:betSlipId"
                element={
                  <ProtectedRoute>
                    <BetDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/place-bet"
                element={
                  <ProtectedRoute>
                    <PlaceBet />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route
              path="/affiliate/dashboard"
              element={
                <AffiliateRequireAuth approvedOnly>
                  <Suspense fallback={<AffiliateFallback />}>
                    <AffiliateDashboardLayout />
                  </Suspense>
                </AffiliateRequireAuth>
              }
            >
              <Route index element={<AffiliateDashboardHome />} />
              <Route path="players" element={<AffiliatePlayersPage />} />
              <Route
                path="qualified"
                element={<AffiliatePlayersPage qualifiedOnly />}
              />
              <Route
                path="revenue"
                element={
                  <AffiliateHistoryPages
                    componentName="RevenueHistory"
                  />
                }
              />
              <Route
                path="settlements"
                element={
                  <AffiliateHistoryPages
                    componentName="SettlementHistory"
                  />
                }
              />
              <Route path="withdraw" element={<AffiliateWithdrawPage />} />
              <Route path="referral-link" element={<AffiliateReferralLink />} />
              <Route path="marketing-tools" element={<AffiliateMarketingTools />} />
              <Route path="profile" element={<AffiliateProfilePage />} />
            </Route>
            {[
              ["/affiliate/profile", "/affiliate/dashboard/profile"],
              ["/affiliate/withdraw", "/affiliate/dashboard/withdraw"],
              ["/affiliate/revenue", "/affiliate/dashboard/revenue"],
              ["/affiliate/players", "/affiliate/dashboard/players"],
            ].map(([path, to]) => (
              <Route
                key={path}
                path={path}
                element={
                  <AffiliateRequireAuth approvedOnly>
                    <Navigate to={to} replace />
                  </AffiliateRequireAuth>
                }
              />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CasinoGameModal />
        </BrowserRouter>
      </LanguageProvider>
    </Provider>
  );
}
