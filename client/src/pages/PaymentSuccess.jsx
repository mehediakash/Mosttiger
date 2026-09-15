import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import paymentService from "../Components/services/paymentService";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_DURATION_MS = 60000;
const SUCCESS_REDIRECT_PATH = "/deposit";
const AUTH_STORAGE_KEY = "betting_app_auth_v1";

const getSavedAuth = () => {
  try {
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    return savedAuth ? JSON.parse(savedAuth) : null;
  } catch {
    return null;
  }
};

const PaymentSuccess = () => {
  const location = useLocation();
  const { token, user, loading } = useSelector((state) => state.auth || {});
  const savedAuth = useMemo(() => getSavedAuth(), []);
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const invoiceId =
    searchParams.get("invoice_id") ||
    searchParams.get("invoiceId") ||
    searchParams.get("reference") ||
    searchParams.get("order_no") ||
    searchParams.get("orderNo");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your payment...");
  const authReady = Boolean(token || savedAuth?.token) && Boolean(user || savedAuth?.user);

  useEffect(() => {
    let cancelled = false;
    let reloading = false;
    let timeoutId = null;
    const startedAt = Date.now();

    const clearPendingTimer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const showStillProcessingMessage = () => {
      if (cancelled) return;

      setStatus("timeout");
      setMessage(
        "Your payment is still being processed. Your wallet will be updated automatically once the gateway confirms the payment.",
      );
    };

    const scheduleNextVerify = () => {
      clearPendingTimer();

      if (Date.now() - startedAt >= MAX_POLL_DURATION_MS) {
        showStillProcessingMessage();
        return;
      }

      timeoutId = window.setTimeout(() => {
        verify();
      }, POLL_INTERVAL_MS);
    };

    const handlePending = () => {
      setStatus("pending");
      setMessage(
        "We are waiting for gateway confirmation. This page will update automatically.",
      );
      scheduleNextVerify();
    };

    const completeSuccessfulPayment = (successMessage) => {
      if (reloading) return;
      reloading = true;
      clearPendingTimer();

      setStatus("success");
      setMessage(successMessage);

      const reloadKey = `payment24x7_success_reload:${invoiceId}`;
      if (window.sessionStorage.getItem(reloadKey)) {
        cancelled = true;
        window.location.replace(SUCCESS_REDIRECT_PATH);
        return;
      }

      window.sessionStorage.setItem(reloadKey, "1");
      cancelled = true;
      window.location.replace(SUCCESS_REDIRECT_PATH);
    };

    const verify = async () => {
      if (!invoiceId) {
        if (!cancelled) {
          setStatus("error");
          setMessage("Missing invoice id in the payment return URL.");
        }
        return;
      }

      if (!authReady || loading) {
        if (!cancelled) {
          setStatus("loading");
          setMessage("Restoring your session before verifying payment...");
        }
        scheduleNextVerify();
        return;
      }

      try {
        if (!cancelled) {
          setStatus((currentStatus) =>
            currentStatus === "loading" ? "loading" : "pending",
          );
        }

        const response = await paymentService.verifyPayment({
          invoice_id: invoiceId,
        });

        if (cancelled) return;

        const isPending =
          response?.status === 202 || response?.data?.success === false;

        if (isPending) {
          handlePending();
          return;
        }

        clearPendingTimer();
        completeSuccessfulPayment(
          response?.data?.message ||
            response?.data?.data?.message ||
            "Payment verified successfully. Your wallet has been updated.",
        );
      } catch (error) {
        if (cancelled) return;

        if (error?.response?.status === 202) {
          handlePending();
          return;
        }

        if (error?.response?.status === 401 || error?.response?.status === 403) {
          setStatus("loading");
          setMessage("Restoring your session before verifying payment...");
          scheduleNextVerify();
          return;
        }

        clearPendingTimer();
        setStatus("error");
        setMessage(
          error?.response?.data?.message ||
            "We could not verify this payment automatically. Please contact support if your wallet was not updated.",
        );
      }
    };

    verify();

    return () => {
      cancelled = true;
      clearPendingTimer();
    };
  }, [authReady, loading, invoiceId]);

  const isWaiting = status === "loading" || status === "pending";
  const title =
    status === "success"
      ? "Payment Successful"
      : status === "error"
        ? "Payment Verification Issue"
        : "Processing Payment";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-2xl text-center">
        {isWaiting && (
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        )}
        {status === "success" && (
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-lg font-bold">
            OK
          </div>
        )}
        {status === "error" && (
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-3xl">
            !
          </div>
        )}
        {status === "timeout" && (
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-600 text-3xl">
            ...
          </div>
        )}

        <h1 className="text-3xl font-bold mb-3">{title}</h1>
        <p className="text-gray-300 mb-6">{message}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/deposit"
            className="rounded-xl primary px-5 py-3 font-semibold text-gray-950 hover:bg-primary"
          >
            Back to Deposit
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-gray-700 px-5 py-3 font-semibold text-white hover:bg-gray-800"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
