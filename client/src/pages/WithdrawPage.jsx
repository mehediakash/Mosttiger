import React, { useEffect, useState } from "react";
import {
  FaWallet,
  FaSyncAlt,
  FaChevronDown,
  FaTimes,
  FaCheck,
  FaPhone,
  FaChevronRight,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import walletService from "../Components/services/walletService";
import bonusService from "../Components/services/bonusService";
import { useTranslation } from "react-i18next";
import PhoneSelectionModal from "../Components/Withdraw/PhoneSelectionModal";

const WithdrawPage = () => {
  const [activeTab, setActiveTab] = useState("withdraw");
  const [amount, setAmount] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [formError, setFormError] = useState("");
  const [withdrawLocked, setWithdrawLocked] = useState(false);
  const [lockDetails, setLockDetails] = useState(null);
  const [loadingLock, setLoadingLock] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  const paymentMethods = [
    {
      id: "bkash",
      name: "bKash",
      image: "https://bajiwala88.live/img/payment/bkash-small.webp",
    },
    {
      id: "nagad",
      name: "Nagad",
      image: "https://bajiwala88.live/img/payment/Nagad.jpeg",
    },
    {
      id: "rocket",
      name: "Rocket",
      image: "https://bajiwala88.live/img/payment/rocket.png",
    },
  ];

  const quickAmounts = [5000, 1000, 500, 100];

  const handleQuickAmount = (value) => {
    setAmount(String(value));
  };

  const { t } = useTranslation();
  const token = useSelector((s) => s.auth?.token);
  const user = useSelector((s) => s.auth?.user);
  const navigate = useNavigate();
  const [withdrawMethods, setWithdrawMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawableBalance, setWithdrawableBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWithdrawalLock = async () => {
    const resp = await bonusService.getActiveBonus();
    const data = resp?.data?.data ?? resp?.data;

    if (data) {
      const locked =
        !!data.withdrawBlocked ||
        (data.remainingTurnover && data.remainingTurnover > 0);
      console.log("TURNOVER RECORD:", data);
      console.log("Withdraw Locked:", data.withdrawLocked);
      console.log("Status:", data.status || data.bonusStatus);
      console.log("Completed:", data.turnoverCompleted);
      console.log("Required:", data.turnoverRequired || data.totalTurnover);
      console.log("Percentage:", data.turnoverPercentage);
      console.log("Can Withdraw:", !locked);
      setWithdrawLocked(locked);
      setLockDetails(data);
      return locked;
    }

    console.log("TURNOVER RECORD:", null);
    console.log("Withdraw Locked:", undefined);
    console.log("Status:", undefined);
    console.log("Completed:", undefined);
    console.log("Required:", undefined);
    console.log("Percentage:", undefined);
    console.log("Can Withdraw:", true);
    setWithdrawLocked(false);
    setLockDetails(null);
    return false;
  };

  // Extract phones from user profile
  const userPhones =
    user?.phones && Array.isArray(user.phones) ? user.phones : [];
  const hasPhones = userPhones.length > 0;
  const primaryPhone = userPhones.find((p) => p.isPrimary) || userPhones[0];

  // Auto-populate primary phone on mount
  useEffect(() => {
    if (primaryPhone && !accountNumber) {
      setAccountNumber(primaryPhone.number);
    }
  }, [primaryPhone, accountNumber]);

  const methodsToShow =
    withdrawMethods && withdrawMethods.length
      ? withdrawMethods
      : paymentMethods;

  useEffect(() => {
    if (methodsToShow && methodsToShow.length && !selectedProvider) {
      setSelectedProvider(methodsToShow[0].id);
    }
  }, [methodsToShow, selectedProvider]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingMethods(true);
      try {
        const res = await walletService.getWithdrawalMethods();
        const payload = res?.data?.data ?? res?.data ?? [];
        if (mounted) setWithdrawMethods(Array.isArray(payload) ? payload : []);
      } catch (err) {
        if (mounted) setWithdrawMethods([]);
      } finally {
        if (mounted) setLoadingMethods(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!token) {
      setWithdrawableBalance(0);
      return () => (mounted = false);
    }

    (async () => {
      try {
        const res = await walletService.getBalance();
        const payload = res?.data?.data ?? res?.data;
        const value = (payload && (payload.main ?? payload.balance)) || 0;
        if (mounted) setWithdrawableBalance(Number(value) || 0);
      } catch (err) {
        if (mounted) setWithdrawableBalance(0);
      }
    })();

    // Also fetch active bonus/turnover lock state
    (async () => {
      if (!token) return;
      try {
        setLoadingLock(true);
        if (!mounted) return;
        await fetchWithdrawalLock();
      } catch (err) {
        // If API returns 404 (no active bonus), treat as unlocked
        if (err?.response?.status === 404) {
          if (mounted) {
            setWithdrawLocked(false);
            setLockDetails(null);
          }
        } else {
          console.error("Failed to fetch active bonus/turnover:", err);
        }
      } finally {
        if (mounted) setLoadingLock(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  const refreshBalance = async () => {
    if (!token) {
      setWithdrawableBalance(0);
      return;
    }
    try {
      setRefreshing(true);
      const res = await walletService.getBalance();
      const payload = res?.data?.data ?? res?.data;
      const value = (payload && (payload.main ?? payload.balance)) || 0;
      setWithdrawableBalance(Number(value) || 0);
    } catch (err) {
      setWithdrawableBalance(0);
    } finally {
      setRefreshing(false);
    }
  };

  const formatAmount = (amount) => {
    const num = Number(amount || 0);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSubmit = async () => {
    setFormError("");
    let latestWithdrawLocked = withdrawLocked;
    try {
      setLoadingLock(true);
      latestWithdrawLocked = await fetchWithdrawalLock();
    } catch (err) {
      console.error("Failed to refresh turnover before withdrawal:", err);
    } finally {
      setLoadingLock(false);
    }

    if (latestWithdrawLocked) {
      setFormError(t("completeTurnoverFirst"));
      return;
    }

    // Check if user has saved phones
    if (!hasPhones || !accountNumber.trim()) {
      setFormError(t("pleaseAddPhoneNumber"));
      return;
    }

    const withdrawAmount = Number(amount);

    if (!withdrawAmount || Number.isNaN(withdrawAmount)) {
      setFormError(t("amount"));
      return;
    }

    if (withdrawAmount < 200) {
      setFormError(t("amount"));
      return;
    }

    if (!selectedProvider) {
      setFormError(t("provider"));
      return;
    }

    if (!accountNumber.trim()) {
      setFormError(t("selectPhoneNumber"));
      return;
    }

    if (withdrawAmount > withdrawableBalance) {
      setFormError(t("withdrawable"));
      return;
    }

    const payload = {
      amount: withdrawAmount,
      provider: selectedProvider,
      accountNumber: accountNumber.trim(),
    };

    console.log("WITHDRAW PAYLOAD:", payload);

    try {
      setSubmitting(true);
      await walletService.createWithdrawal(payload);
      alert(t("submit"));
      setAmount("");
      setAccountNumber("");
      setFormError("");
      await refreshBalance();
    } catch (err) {
      const msg = err?.response?.data?.message || t("withdrawalLocked");
      setFormError(msg);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const defaultMethodImages = {
    bkash: "https://bajiwala88.live/img/payment/bkash-small.webp",
    nagad: "https://bajiwala88.live/img/payment/Nagad.jpeg",
    rocket: "https://bajiwala88.live/img/payment/rocket.png",
  };

  const getMethodImage = (method) => {
    const key = String(method?.id || method?.name || "")
      .toLowerCase()
      .trim();
    return method?.image || method?.logo || defaultMethodImages[key] || "";
  };

  return (
    <div className="min-h-screen bg-black flex justify-center px-2 py-4">
      <div className="w-full max-w-md bg-[#1f1f1f] rounded-t-xl overflow-hidden shadow-2xl">
        {/* HEADER */}
        <div className="relative flex items-center justify-center py-4 border-b border-white/10">
          <h2 className="text-white text-2xl font-bold">{t("funds")}</h2>

          <button
            onClick={() => navigate(-1)}
            className="absolute right-4 text-white/70 hover:text-white transition"
            aria-label="Close"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* TABS */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <Link
              className={`h-11 rounded-md text-center leading-11 font-semibold transition ${
                activeTab === "deposit"
                  ? "bg-primary text-black"
                  : "bg-[#4b4b4b] text-white"
              }`}
              to="/deposit"
            >
              <button onClick={() => setActiveTab("deposit")}>
                {t("deposit")}
              </button>
            </Link>
            <button
              onClick={() => setActiveTab("withdraw")}
              className={`h-11 rounded-md font-semibold transition ${
                activeTab === "withdraw"
                  ? "bg-primary text-black"
                  : "bg-[#4b4b4b] text-white"
              }`}
            >
              {t("withdraw")}
            </button>
          </div>
        </div>

        {/* BALANCE CARD */}
        <div className="bg-[#4a4a4a] px-4 py-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full  flex items-center justify-center text-primary">
            <FaWallet size={20} />
          </div>

          <div className="flex-1">
            <h3 className="text-white font-bold text-2xl leading-6">
              {t("withdrawable")}
            </h3>
            <p className="text-white font-bold text-2xl">{t("amount")}</p>
          </div>

          <button
            onClick={refreshBalance}
            className={`text-primary ${refreshing ? "animate-spin" : ""} hover:rotate-180 transition duration-500`}
            aria-label="Refresh balance"
          >
            <FaSyncAlt size={20} />
          </button>

          <div className="text-white font-bold text-xl">
            {formatAmount(withdrawableBalance)}
          </div>
        </div>

        {/* WITHDRAWAL LOCK INFO */}
        {withdrawLocked && lockDetails && (
          <div className="primary/10 border border-primary/50 rounded-2xl p-4 space-y-2 mx-3 mt-3">
            <div className="flex items-start gap-2">
              <div className="mt-1">
                <FaTimes className="text-primary shrink-0" />
              </div>
              <div className="flex-1">
                <p className="text-yellow-300 font-semibold text-sm">
                  {t("withdrawalLocked")}
                </p>
                <p className="text-yellow-200/80 text-xs mt-1">
                  {t("completeTurnoverRequirement")}
                </p>
              </div>
            </div>
            <div className="space-y-1 text-xs text-yellow-200/70 ml-6">
              <p>
                <span className="text-yellow-300">{t("lockedBonus")}</span> ৳
                {formatAmount(lockDetails.bonusAmount || 0)}
              </p>
              <p>
                <span className="text-yellow-300">
                  {t("remainingTurnover")}
                </span>{" "}
                ৳{formatAmount(lockDetails.remainingTurnover || 0)}
              </p>
              <p>
                <span className="text-yellow-300">{t("totalRequired")}</span> ৳
                {formatAmount(lockDetails.totalTurnover || 0)}
              </p>
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="p-3 space-y-4">
          {/* WITHDRAW AMOUNT */}
          <div className="bg-[#2d2d2d] rounded-2xl p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full"></div>

                <h3 className="text-white font-bold text-xl">
                  {t("withdrawAmount")}
                </h3>
              </div>

              <p className="text-white font-semibold text-lg">
                ৳ 500 - ৳ 25000
              </p>
            </div>

            {/* QUICK BUTTONS */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {quickAmounts.map((item) => (
                <button
                  key={item}
                  onClick={() => handleQuickAmount(item)}
                  className="h-11 bg-[#4b4b4b] rounded-md text-primary font-bold hover:bg-[#5a5a5a] transition"
                >
                  +{item}
                </button>
              ))}
            </div>

            {/* INPUT */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl">
                ৳
              </span>

              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="
                  w-full
                  h-14
                  bg-transparent
                  border
                  border-primary
                  rounded-2xl
                  pl-10
                  pr-4
                  text-white
                  text-xl
                  outline-none
                  focus:border-primary
                "
              />
            </div>
          </div>

          {/* PROVIDER */}
          <div className="bg-[#2d2d2d] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <h3 className="text-white font-bold text-xl">
                  {t("provider")}
                </h3>
              </div>
              <FaChevronDown className="text-primary" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {methodsToShow.map((method) => {
                const isActive = selectedProvider === method.id;

                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedProvider(method.id)}
                    className={`border rounded-xl p-3 transition duration-200 ${
                      isActive
                        ? "border-primary bg-[#3a3a3a] shadow-lg shadow-primary/20 scale-[1.03]"
                        : "border-white/20 bg-[#2a2a2a] opacity-75 hover:opacity-100 hover:border-primary/50"
                    }`}
                  >
                    <div className="h-16 flex items-center justify-center relative">
                      <img
                        src={getMethodImage(method)}
                        alt={method.name}
                        className="max-h-12 object-contain"
                        onError={(e) => {
                          const fallback =
                            defaultMethodImages[
                              String(method?.id || "").toLowerCase()
                            ];
                          if (fallback && e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          }
                        }}
                      />
                      {isActive && (
                        <span className="absolute -top-1 -right-1 bg-primary text-black rounded-full p-1">
                          <FaCheck size={10} />
                        </span>
                      )}
                    </div>

                    <p className="text-white text-sm font-semibold capitalize mt-2">
                      {method.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACCOUNT */}
          <div className="bg-[#2d2d2d] rounded-2xl p-4 mb-20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary rounded-full"></div>

              <h3 className="text-white font-bold text-xl">{t("account")}</h3>
            </div>

            {/* NO PHONES WARNING */}
            {!hasPhones ? (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <FaTimes className="text-red-400 mt-0.5 shrink-0" size={16} />
                  <div>
                    <p className="text-red-300 font-semibold text-sm">
                      {t("noPhoneNumberSaved")}
                    </p>
                    <p className="text-red-200/70 text-xs mt-1">
                      {t("pleaseAddPhoneNumber")}
                    </p>
                  </div>
                </div>

                <Link
                  to="/profile"
                  className="inline-block mt-2 px-4 py-2 bg-primary text-black rounded-lg font-semibold text-sm hover:bg-yellow-300 transition"
                >
                  {t("goToProfile")}
                </Link>
              </div>
            ) : null}

            <div>
              <label className="block text-white mb-2 font-medium text-sm">
                {t("selectPhoneNumber")}
              </label>

              {/* PHONE SELECTOR */}
              <button
                onClick={() => hasPhones && setPhoneModalOpen(true)}
                disabled={!hasPhones}
                className={`w-full h-14 flex items-center justify-between px-4 rounded-2xl border-2 transition ${
                  hasPhones
                    ? "border-primary bg-[#2a2a2a] hover:border-primary cursor-pointer"
                    : "border-red-500/50 bg-[#2a2a2a]/50 cursor-not-allowed opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FaPhone className="text-primary" size={16} />
                  <span className="text-white font-semibold text-lg">
                    {accountNumber || t("selectPhonePlaceholder")}
                  </span>
                </div>
                {hasPhones && (
                  <FaChevronRight className="text-primary" size={14} />
                )}
              </button>

              {/* SELECTED PHONE INFO */}
              {accountNumber &&
                userPhones.find((p) => p.number === accountNumber)
                  ?.isPrimary && (
                  <p className="text-primary text-xs font-semibold mt-2 flex items-center gap-1">
                    <FaCheck size={12} /> {t("primaryPhoneSelected")}
                  </p>
                )}

              {/* MULTIPLE PHONES INFO */}
              {hasPhones && userPhones.length > 1 && (
                <p className="text-white/60 text-xs mt-2">
                  {userPhones.length} {t("phoneNumbersAvailable")}
                </p>
              )}
            </div>

            {formError && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                <FaTimes className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {withdrawLocked && (
              <div className="mt-3 flex items-center gap-2 text-yellow-300 text-sm">
                <FaTimes className="shrink-0" />
                <span>{t("completeTurnoverFirst")}</span>
              </div>
            )}

            {/* SUBMIT */}
            <button
              onClick={handleSubmit}
              disabled={
                submitting || withdrawLocked || loadingLock || !hasPhones
              }
              className={`
                mt-5
                w-full
                h-14
                bg-primary
                rounded-xl
                text-black
                text-2xl
                font-bold
                hover:opacity-90
                transition
                ${submitting || withdrawLocked || loadingLock || !hasPhones ? "opacity-60 cursor-not-allowed" : ""}
              `}
            >
              {submitting ? t("withdrawing") : t("withdraw")}
            </button>
          </div>
        </div>
      </div>

      {/* PHONE SELECTION MODAL */}
      <PhoneSelectionModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        phones={userPhones}
        selectedPhone={accountNumber}
        onSelect={(phone) => setAccountNumber(phone)}
      />
    </div>
  );
};

export default WithdrawPage;
