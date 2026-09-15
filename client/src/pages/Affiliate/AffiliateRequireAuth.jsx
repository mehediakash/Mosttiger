import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { affiliateAPI } from "../../Components/services/affiliateService";

const getStatusValue = (payload = {}) =>
  payload?.data?.access?.status ||
  payload?.data?.affiliate?.status ||
  payload?.access?.status ||
  payload?.affiliate?.status ||
  "";

const statusMessages = {
  pending: "Your affiliate application is pending approval.",
  rejected: "Your affiliate application has been rejected.",
  suspended: "Your affiliate account has been suspended.",
};

export default function AffiliateRequireAuth({ children, approvedOnly = false }) {
  const { token } = useSelector((state) => state.auth);
  const location = useLocation();
  const [statusState, setStatusState] = useState({
    loading: approvedOnly,
    status: "",
    error: "",
  });

  useEffect(() => {
    if (!token || !approvedOnly) return;

    let mounted = true;
    setStatusState({ loading: true, status: "", error: "" });

    affiliateAPI
      .getStatus()
      .then((response) => {
        if (!mounted) return;
        setStatusState({
          loading: false,
          status: getStatusValue(response.data),
          error: "",
        });
      })
      .catch((error) => {
        if (!mounted) return;
        setStatusState({
          loading: false,
          status: "",
          error:
            error?.response?.data?.message ||
            "Unable to verify affiliate access.",
        });
      });

    return () => {
      mounted = false;
    };
  }, [approvedOnly, token]);

  if (!token) {
    return (
      <Navigate
        to="/affiliate/login"
        replace
        state={{ returnTo: location.pathname }}
      />
    );
  }

  if (approvedOnly) {
    if (statusState.loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
          Verifying affiliate access...
        </div>
      );
    }

    if (statusState.status !== "approved") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
          <div className="w-full max-w-md rounded-2xl border border-[#ffcc33]/20 bg-[#111111] p-6 text-center shadow-2xl shadow-black/40">
            <h1 className="text-2xl font-black text-[#ffcc33]">
              Affiliate Access
            </h1>
            <p className="mt-3 text-sm text-white/75">
              {statusMessages[statusState.status] ||
                statusState.error ||
                "Become an approved affiliate to access this area."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {!statusState.status && (
                <Link
                  to="/affiliate/signup"
                  className="rounded-xl bg-[#ffcc33] px-5 py-3 text-sm font-bold text-black"
                >
                  Become Affiliate
                </Link>
              )}
              <Link
                to="/affiliate"
                className="rounded-xl border border-[#ffcc33]/30 px-5 py-3 text-sm font-bold text-[#ffcc33]"
              >
                Affiliate Home
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
}
