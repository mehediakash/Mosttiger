// DepositPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import walletService from "../Components/services/walletService";
import paymentService from "../Components/services/paymentService";
import promoService from "../Components/services/promoService";
import SEO from "../Components/SEO/SEO";
import { getSEO } from "../Components/SEO/seoData";
import { useLanguage } from "../context/LanguageContext";
import { useTranslation } from "react-i18next";
import {
  clearSelectedPromotion,
  setSelectedPromotion,
} from "../Components/store/promotionSlice";

const DepositPage = () => {
  const { t } = useTranslation();
  const [depositAmount, setDepositAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [maxAmountModalOpen, setMaxAmountModalOpen] = useState(false);
  const token = useSelector((state) => state.auth?.token);
  const paymentProviders = [
    {
      id: "bkash",
      name: "bKash",
      image:
        "https://img.d4040p.com/dp/h5/assets/images/footer/color-black/pay22.png?v=1783417384360&source=mcdsrc",
    },
    {
      id: "nagad",
      name: "Nagad",
      image:
        "https://img.d4040p.com/dp/h5/assets/images/footer/color-black/pay34.png?v=1783417384360&source=mcdsrc",
    },
    {
      id: "rocket",
      name: "Rocket",
      image:
        "https://img.d4040p.com/dp/h5/assets/images/footer/color-black/pay33.png?v=1783417384360&source=mcdsrc",
    },
  ];

  // Promo Code States
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoData, setPromoData] = useState(null);
  const [promoError, setPromoError] = useState(null);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [availablePromotions, setAvailablePromotions] = useState([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [promotionsError, setPromotionsError] = useState(null);
  const dispatch = useDispatch();
  const selectedPromotion = useSelector(
    (state) => state.promotionSelection?.selectedPromotion || null,
  );
  const [pendingPromotion, setPendingPromotion] = useState(selectedPromotion);
  const location = useLocation();

  const formatPromoBonus = (promo) => {
    if (!promo) return "Special offer";
    const bonusConfig = promo.bonusConfig || {};
    const percentage =
      typeof bonusConfig.bonusPercent === "number"
        ? bonusConfig.bonusPercent
        : promo.percentage;
    const fixedBonus =
      typeof bonusConfig.fixedBonusAmount === "number"
        ? bonusConfig.fixedBonusAmount
        : promo.bonusAmount;

    if (typeof percentage === "number" && percentage > 0) {
      return `${percentage}% bonus`;
    }
    if (typeof fixedBonus === "number" && fixedBonus > 0) {
      return `৳${fixedBonus} bonus`;
    }
    return "Special offer";
  };

  const formatPromoExpiry = (validUntil) => {
    if (!validUntil) return "No expiry";
    const expiryDate = new Date(validUntil);
    if (Number.isNaN(expiryDate.getTime())) return "No expiry";
    return expiryDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    setPendingPromotion(selectedPromotion);
  }, [selectedPromotion]);

  useEffect(() => {
    if (maxAmountModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [maxAmountModalOpen]);

  // Read selected promotion from router state or sessionStorage
  useEffect(() => {
    try {
      const incoming = location?.state?.selectedPromotion;
      if (incoming) {
        // set local pending and promoCode only; final selection is applied
        // by the promotions fetch effect which prefers route state
        setPendingPromotion(incoming);
        setPromoCode(
          incoming.promoCode ? incoming.promoCode.toUpperCase() : "",
        );
        setFormStatus({
          type: "info",
          text: `${incoming.title || incoming.promoCode || "Promotion"} selected from Promotions`,
        });
        return;
      }
    } catch (e) {
      // ignore parse errors
    }
    // run only on mount
  }, []);

  // Auto-apply promo code from promotions page
  useEffect(() => {
    const pendingPromo = localStorage.getItem("pendingPromoCode");
    if (pendingPromo) {
      setPromoCode(pendingPromo);
      setPendingPromotion({ code: pendingPromo, name: pendingPromo });
      localStorage.removeItem("pendingPromoCode");
      // Show notification
      setFormStatus({
        type: "info",
        text: `Promo code "${pendingPromo}" is ready to apply. Enter deposit amount and click Apply.`,
      });
      // Scroll to promo section after a short delay
      setTimeout(() => {
        const promoSection = document.getElementById("promo-section");
        if (promoSection) {
          promoSection.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  }, []);

  const extractBalance = (payload) => {
    if (!payload) return 0;
    if (typeof payload.main === "number") return payload.main;
    if (typeof payload.balance === "number") return payload.balance;
    if (payload.wallet && typeof payload.wallet === "object") {
      return (
        payload.wallet.main ??
        payload.wallet.balance ??
        Object.values(payload.wallet).find((v) => typeof v === "number") ??
        0
      );
    }
    if (typeof payload === "number") return payload;
    return 0;
  };

  const formatAmount = (amount) => {
    const num = Number(amount || 0);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    let mounted = true;
    if (!token) {
      setWalletBalance(0);
      return undefined;
    }

    (async () => {
      console.debug("DepositPage: fetching promotions for deposit selector");
      setLoadingBalance(true);
      try {
        const res = await walletService.getBalance();
        const payload = res?.data?.data ?? res?.data;
        if (mounted) setWalletBalance(extractBalance(payload));
      } catch (e) {
        if (mounted) setWalletBalance(0);
      } finally {
        if (mounted) setLoadingBalance(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  const appliedSelectionRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setPromotionsLoading(true);
        setPromotionsError(null);
        const response = await promoService.getActivePromotions();
        const payload = response?.data?.data ?? response?.data;
        const promotions = Array.isArray(payload) ? payload : [];
        if (mounted) {
          setAvailablePromotions(promotions);

          const navPromo = location?.state?.selectedPromotion;
          const savedRaw = sessionStorage.getItem("selectedPromotion");
          const savedParsed = savedRaw ? JSON.parse(savedRaw) : null;

          const selectedId = navPromo?._id || savedParsed?._id || null;

          const matchingSelected = selectedId
            ? promotions.find(
                (item) =>
                  item._id === selectedId &&
                  item.isEligible !== false &&
                  !item.alreadyUsed,
              )
            : null;

          const firstSelectable = promotions.find(
            (item) => item.isEligible !== false && !item.alreadyUsed,
          );

          if (matchingSelected) {
            setPendingPromotion(matchingSelected);
            if (!appliedSelectionRef.current) {
              dispatch(setSelectedPromotion(matchingSelected));
              appliedSelectionRef.current = true;
            }
          } else if (firstSelectable) {
            setPendingPromotion(firstSelectable);
            if (!appliedSelectionRef.current) {
              dispatch(setSelectedPromotion(firstSelectable));
              appliedSelectionRef.current = true;
            }
          } else {
            setPendingPromotion(null);
            if (!appliedSelectionRef.current) {
              dispatch(clearSelectedPromotion());
              appliedSelectionRef.current = true;
            }
          }
        }
      } catch (error) {
        if (mounted) {
          setPromotionsError(
            error?.response?.data?.message || "Failed to load promotions",
          );
          setAvailablePromotions([]);
          setPendingPromotion(null);
        }
      } finally {
        if (mounted) {
          setPromotionsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
    // run only once on mount to avoid loops
  }, []);

  // Handle Promo Code Apply
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) < 200) {
      setPromoError("Please enter a valid deposit amount first");
      return;
    }

    setPromoLoading(true);
    setPromoError(null);

    try {
      const response = await walletService.applyPromoCode({
        code: promoCode.trim().toUpperCase(),
        depositAmount: parseFloat(depositAmount),
      });

      const data = response?.data?.data || response?.data;

      setPromoData(data);
      setPromoApplied(true);
      setPromoError(null);
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message || "Invalid or expired promo code";
      setPromoError(errorMsg);
      setPromoApplied(false);
      setPromoData(null);
    } finally {
      setPromoLoading(false);
    }
  };

  // Clear promo when deposit amount changes
  const handleDepositAmountChange = (value) => {
    setDepositAmount(value);
    if (promoApplied) {
      setPromoApplied(false);
      setPromoData(null);
      setPromoError(null);
    }
  };

  // Increment deposit amount when preset button is clicked
  const handlePresetAmountClick = (amountToAdd) => {
    const rawCurrent =
      typeof depositAmount === "string"
        ? depositAmount.replace(/,/g, "").trim()
        : String(depositAmount || "");
    const parsedCurrent = parseFloat(rawCurrent);
    const currentNum =
      Number.isFinite(parsedCurrent) && parsedCurrent > 0 ? parsedCurrent : 0;
    const presetNum = Number(amountToAdd) || 0;
    const nextAmount = currentNum + presetNum;
    handleDepositAmountChange(nextAmount.toString());
  };

  // Calculate total bonus amount
  const calculateBonusAmount = () => {
    if (!promoData || !depositAmount) return 0;

    const amount = parseFloat(depositAmount);
    let bonus = 0;

    if (promoData.bonusAmount) {
      bonus = promoData.bonusAmount;
    } else if (promoData.bonusPercentage) {
      bonus = (amount * promoData.bonusPercentage) / 100;
      if (promoData.maxBonus && bonus > promoData.maxBonus) {
        bonus = promoData.maxBonus;
      }
    }

    return bonus;
  };

  const handleOpenPromotionModal = () => {
    setPromotionModalOpen(true);
  };

  const handleSelectPromotion = (promotion) => {
    setPendingPromotion(promotion);
  };

  const handleConfirmPromotion = () => {
    if (!pendingPromotion?._id) return;

    dispatch(setSelectedPromotion(pendingPromotion));
    setPromoCode(
      pendingPromotion.promoCode
        ? pendingPromotion.promoCode.toUpperCase()
        : "",
    );
    setPromoApplied(false);
    setPromoData(null);
    setPromoError(null);
    setFormStatus({
      type: "info",
      text: `${pendingPromotion.title || pendingPromotion.promoCode || "Promotion"} selected. Click Apply to use it.`,
    });
    setPromotionModalOpen(false);
  };

  const handleRemovePromotion = () => {
    setPendingPromotion(null);
    dispatch(clearSelectedPromotion());
    setPromoCode("");
    setPromoApplied(false);
    setPromoData(null);
    setPromoError(null);
    setFormStatus({
      type: "info",
      text: "Promotion removed. Deposit will continue without a bonus.",
    });
  };

  const selectedPromotionRules = useMemo(() => {
    if (!selectedPromotion) return null;
    const bonusConfig = selectedPromotion.bonusConfig || {};
    return {
      minDeposit: selectedPromotion.minDeposit ?? bonusConfig.minDeposit ?? 0,
      maxDeposit:
        selectedPromotion.maxDeposit ?? bonusConfig.maxDeposit ?? null,
    };
  }, [selectedPromotion]);

  useEffect(() => {
    if (!selectedPromotionRules || !depositAmount) return;

    const amount = Number(depositAmount);
    const minValue = Number(selectedPromotionRules.minDeposit || 0);
    const maxValue =
      selectedPromotionRules.maxDeposit == null
        ? null
        : Number(selectedPromotionRules.maxDeposit);

    if (amount < minValue || (maxValue != null && amount > maxValue)) {
      const maxText = maxValue == null ? "∞" : maxValue.toLocaleString();
      setPromoError(
        `BDT must be between ${minValue.toLocaleString()} and ${maxText} for selected promotion`,
      );
    } else if (promoError?.startsWith("BDT must be between")) {
      setPromoError(null);
    }
  }, [depositAmount, selectedPromotionRules, promoError]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    setFormStatus(null);

    if (!selectedPromotion) {
      setFormStatus({ type: "error", text: "Please select a promotion first" });
      return;
    }

    // Validate deposit amount
    if (!depositAmount) {
      setFormStatus({
        type: "error",
        text: "Please enter deposit amount",
      });
      return;
    }

    if (!selectedProvider) {
      setFormStatus({
        type: "error",
        text: "Please select a payment method",
      });
      return;
    }

    // Frontend validation: Maximum deposit limit 30,000 BDT
    const rawAmount =
      typeof depositAmount === "string"
        ? depositAmount.replace(/,/g, "").trim()
        : String(depositAmount || "");
    const numericAmount = parseFloat(rawAmount);

    if (Number.isFinite(numericAmount) && numericAmount > 30000) {
      setMaxAmountModalOpen(true);
      return;
    }

    if (selectedPromotionRules) {
      const amount = Number(depositAmount);
      const minValue = Number(selectedPromotionRules.minDeposit || 0);
      const maxValue =
        selectedPromotionRules.maxDeposit == null
          ? null
          : Number(selectedPromotionRules.maxDeposit);

      if (amount < minValue || (maxValue != null && amount > maxValue)) {
        const maxText = maxValue == null ? "∞" : maxValue.toLocaleString();
        setFormStatus({
          type: "error",
          text: `BDT must be between ${minValue.toLocaleString()} and ${maxText} for selected promotion`,
        });
        return;
      }
    }

    try {
      setSubmitting(true);

      const response = await paymentService.createPayment({
        amount: Number(depositAmount),
        provider: selectedProvider,
        selectedPromotionId: selectedPromotion?._id || null,
      });

      const paymentUrl =
        response?.data?.data?.paymentUrl ||
        response?.data?.data?.payment_url ||
        response?.data?.paymentUrl ||
        response?.data?.payment_url;

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        throw new Error("No redirect URL received from payment gateway");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to initiate payment";
      setFormStatus({ type: "error", text: message });
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [10, 500, 1000, 2000, 5000, 10000];
  const selectedPromotionLabel = selectedPromotion
    ? `${selectedPromotion.title || selectedPromotion.promoCode || "Promotion"}${selectedPromotion.promoCode ? ` (${selectedPromotion.promoCode})` : ""}`
    : "No promotion selected";

  return (
    <>
      {/* SEO Meta Tags */}
      <SEO {...getSEO("deposit")} />

      <div className="min-h-screen bg-[#050912] text-[#F5FAFF] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Panel: Deposit Form */}
            <div className="lg:w-2/3">
              {/* Deposit Form */}
              <div className="bg-[#0B1220] rounded-2xl shadow-2xl p-6 border border-[#16314D]">
                <h2 className="text-xl font-bold mb-6 pb-4 border-b border-[#16314D] flex items-center text-[#F5FAFF]">
                  <svg
                    className="w-6 h-6 mr-3 text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 5a1 1 0 100 2h1a2 2 0 011.732 1H7a1 1 0 100 2h2.732A2 2 0 018 11H7a1 1 0 00-.707 1.707l3 3a1 1 0 001.414-1.414l-1.483-1.484A4.008 4.008 0 0011.874 10H13a1 1 0 100-2h-1.126a3.976 3.976 0 00-.41-1H13a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t("enterDepositDetails")}
                </h2>

                {formStatus && (
                  <div
                    className={`mb-4 rounded-xl px-4 py-3 text-sm ${formStatus.type === "error" ? "bg-red-900/50 text-red-100 border border-red-700" : "bg-emerald-900/40 text-emerald-100 border border-emerald-700"}`}
                  >
                    {formStatus.text}
                  </div>
                )}

                <form onSubmit={handleDeposit}>
                  {/* Deposit Amount Section */}
                  <div className="mb-8">
                    <label className="text-[#F5FAFF] font-bold mb-4 flex items-center">
                      <span className="w-1 h-6 bg-primary rounded-full mr-3 shadow-[0_0_8px_#00E5FF]"></span>
                      {t("depositAmount")}
                    </label>

                    {/* Quick Amount Buttons */}
                    <div className="mb-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                        {[100, 500, 1000, 5000, 10000, 15000, 20000, 25000].map(
                          (amount) => (
                            <button
                              type="button"
                              key={amount}
                              onClick={() => handlePresetAmountClick(amount)}
                              className={`py-2 px-3 rounded-md font-semibold text-sm transition-all duration-200 ${
                                depositAmount === amount.toString()
                                  ? "bg-primary text-[#050912] font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                                  : "bg-[#050912] text-[#18C8FF] border border-[#16314D] hover:bg-[#16314D]/40 hover:shadow-lg hover:shadow-primary/20 active:scale-95"
                              }`}
                            >
                              +{amount.toLocaleString()}
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div className="relative mb-4">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-2xl font-bold text-primary">
                          ৳
                        </span>
                      </div>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) =>
                          handleDepositAmountChange(e.target.value)
                        }
                        className="w-full bg-[#050912] border-2 border-[#16314D] focus:border-primary rounded-xl pl-12 pr-4 py-4 text-2xl font-bold text-[#F5FAFF] focus:outline-none focus:shadow-[0_0_15px_rgba(0,229,255,0.25)] transition-all placeholder-[#8FA6BC]/40"
                        placeholder="0"
                        min="10"
                        max="100000"
                        required
                      />
                    </div>

                    {/* Error Text */}
                    {formStatus?.type === "error" && (
                      <div className="mb-4 flex items-center text-red-400 text-sm">
                        <svg
                          className="w-4 h-4 mr-2 shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {formStatus.text}
                      </div>
                    )}

                    {/* Gentle Reminder Dropdown */}
                    <details className="mb-6">
                      <summary className="flex items-center justify-between bg-[#050912] px-4 py-3 rounded-lg cursor-pointer hover:bg-[#16314D]/30 transition-colors border border-[#16314D]">
                        <span className="text-[#8FA6BC] font-medium">
                          {t("gentleReminder")}
                        </span>
                        <svg
                          className="w-5 h-5 text-[#8FA6BC] transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </summary>
                      <div className="mt-2 bg-[#050912] border border-[#16314D] rounded-lg p-4 text-[#8FA6BC] text-sm">
                        <p>{t("depositReminder")}</p>
                      </div>
                    </details>
                  </div>

                  <div className="mb-8">
                    <label className="text-[#F5FAFF] font-bold mb-4 flex items-center">
                      <span className="w-1 h-6 bg-primary rounded-full mr-3 shadow-[0_0_8px_#00E5FF]"></span>
                      {t("provider")}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {paymentProviders.map((provider) => (
                        <button
                          type="button"
                          key={provider.id}
                          onClick={() => setSelectedProvider(provider.id)}
                          className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-md px-2 py-3 text-sm font-semibold transition-all duration-200 ${
                            selectedProvider === provider.id
                              ? "bg-primary text-[#050912] font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                              : "bg-[#050912] text-[#18C8FF] border border-[#16314D] hover:bg-[#16314D]/40 hover:shadow-lg hover:shadow-primary/20 active:scale-95"
                          }`}
                        >
                          <span className="flex h-10 w-full items-center justify-center rounded bg-white/95 px-2 py-1">
                            <img
                              src={provider.image}
                              alt={`${provider.name} payment`}
                              className="max-h-8 max-w-full object-contain"
                              loading="lazy"
                            />
                          </span>
                          <span className="leading-none">{provider.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Promotion */}
                  <div id="promo-section" className="mb-8">
                    <label className="text-[#F5FAFF] font-bold mb-4 flex items-center">
                      <span className="w-1 h-6 bg-primary rounded-full mr-3 shadow-[0_0_8px_#00E5FF]"></span>
                      {t("selectPromotion")}
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-3 items-center">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setPromotionModalOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            setPromotionModalOpen(true);
                        }}
                        className="relative w-full bg-[#050912] border-2 border-[#16314D] rounded-xl px-4 py-4 text-lg font-semibold text-[#F5FAFF] focus:outline-none cursor-pointer hover:border-primary transition-colors"
                      >
                        {selectedPromotionLabel}
                      </div>
                    </div>

                    <p className="text-sm text-[#8FA6BC] mt-2">
                      {t("promotionHelpText")}
                    </p>

                    {!selectedPromotion && (
                      <p className="mt-3 text-sm text-red-400">
                        {t("pleaseSelectPromotion")}
                      </p>
                    )}

                    {selectedPromotionRules && depositAmount && promoError && (
                      <p className="mt-3 text-sm text-red-400">{promoError}</p>
                    )}
                  </div>

                  {promotionModalOpen && (
                    <div className="fixed inset-0 z-99998 flex items-center justify-center bg-black/70 px-4 py-6">
                      <div className="w-full max-w-2xl rounded-2xl border border-[#16314D] bg-[#0B1220] shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between border-b border-[#16314D] px-5 py-4">
                          <h3 className="text-lg font-bold text-[#F5FAFF]">
                            {t("selectPromotion")}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setPromotionModalOpen(false)}
                            className="text-[#8FA6BC] hover:text-[#F5FAFF] transition-colors"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-5 space-y-3">
                          {promotionsLoading && (
                            <div className="py-12 text-center text-[#8FA6BC]">
                              {t("loadingPromotions")}
                            </div>
                          )}

                          {promotionsError && !promotionsLoading && (
                            <div className="rounded-xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-100">
                              {promotionsError}
                            </div>
                          )}

                          {!promotionsLoading &&
                            !promotionsError &&
                            availablePromotions.length === 0 && (
                              <div className="py-12 text-center text-[#8FA6BC]">
                                {t("noActivePromotions")}
                              </div>
                            )}

                          {!promotionsLoading &&
                            !promotionsError &&
                            availablePromotions.map((promotion) => {
                              const isSelected =
                                pendingPromotion?._id === promotion._id;

                              return (
                                <button
                                  key={
                                    promotion._id ||
                                    `${promotion.promoCode || promotion.title}-${promotion.allowedCategories?.[0] || "all"}`
                                  }
                                  type="button"
                                  onClick={() =>
                                    handleSelectPromotion(promotion)
                                  }
                                  className={`w-full rounded-xl border px-4 py-4 text-left transition-all duration-200 ${
                                    isSelected
                                      ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                                      : "border-[#16314D] bg-[#050912] hover:border-[#18C8FF]/50"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <div className="text-[#F5FAFF] font-bold text-base">
                                        {promotion.title}
                                      </div>
                                      <div className="mt-1 text-sm text-[#8FA6BC]">
                                        {t("category")}:{" "}
                                        {promotion.allowedCategories?.[0] ||
                                          t("all")}
                                      </div>
                                      <div className="mt-1 text-sm text-primary font-semibold">
                                        {formatPromoBonus(promotion)}
                                      </div>
                                      <div className="mt-1 text-xs text-[#8FA6BC]/70">
                                        {promotion.shortDescription ||
                                          promotion.fullDescription ||
                                          t("activePromotion")}
                                      </div>
                                    </div>

                                    <div className="text-right text-xs text-[#8FA6BC]">
                                      <div>
                                        {t("start")}:{" "}
                                        {formatPromoExpiry(promotion.createdAt)}
                                      </div>
                                      <div>
                                        {t("end")}:{" "}
                                        {formatPromoExpiry(promotion.expiresAt)}
                                      </div>
                                      <div>
                                        {t("minimum")}: ৳
                                        {promotion.bonusConfig?.minDeposit || 0}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-[#16314D] px-5 py-4">
                          <div className="text-sm text-[#8FA6BC]">
                            {pendingPromotion
                              ? `{${t("selected")}: ${pendingPromotion.title || pendingPromotion.promoCode || "Promotion"}}`
                              : `{${t("selectPromotionToContinue")}}`}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setPromotionModalOpen(false)}
                              className="h-11 rounded-xl border border-[#16314D] px-4 text-sm font-semibold text-[#8FA6BC] hover:bg-[#050912] hover:text-[#F5FAFF] transition-colors"
                            >
                              {t("cancel")}
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmPromotion}
                              disabled={!pendingPromotion}
                              className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-[#050912] hover:bg-[#48DDFF] shadow-[0_0_12px_rgba(0,229,255,0.35)] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t("confirmSelection")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Terms and Submit */}
                  <div className="flex items-start mb-8">
                    <input
                      type="checkbox"
                      id="terms"
                      className="mt-1 mr-3 h-5 w-5 rounded border-[#16314D] bg-[#050912] text-primary focus:ring-primary"
                      required
                    />
                    <label htmlFor="terms" className="text-[#8FA6BC] text-sm">
                      {t("agreeTerms")}
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-[#48DDFF] active:scale-95 text-[#050912] font-bold text-lg py-4 rounded-lg shadow-lg shadow-[rgba(0,229,255,0.3)] hover:shadow-[0_0_20px_rgba(0,229,255,0.5)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      submitting ||
                      promotionsLoading ||
                      !depositAmount ||
                      !selectedProvider ||
                      !selectedPromotion
                    }
                  >
                    {submitting ? t("processing") : t("submit")}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Security Footer */}
          <div className="mt-12 pt-8 mb-22 border-t border-[#16314D]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-[#050912] border border-[#16314D] rounded-full flex items-center justify-center mr-3">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-[#F5FAFF]">
                      {t("securePayment")}
                    </p>
                    <p className="text-xs text-[#8FA6BC]">
                      {t("sslEncryption")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-[#050912] border border-[#16314D] rounded-full flex items-center justify-center mr-3">
                    <svg
                      className="w-6 h-6 text-[#147BFF]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-[#F5FAFF]">
                      {t("support247")}
                    </p>
                    <p className="text-xs text-[#8FA6BC]">
                      {t("liveChatPhone")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-xs text-[#8FA6BC]">
                    {t("licensedRegulated")}
                  </p>
                  <p className="font-bold text-sm text-[#F5FAFF]">
                    {t("mgaCuracaoEgaming")}
                  </p>
                </div>
                <div className="h-8 w-px bg-[#16314D]"></div>
                <div className="text-center">
                  <p className="text-xs text-[#8FA6BC]">
                    {t("responsibleGambling")}
                  </p>
                  <p className="font-bold text-sm text-[#F5FAFF]">
                    {t("adultsOnly")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maximum Deposit Warning Modal */}
      {maxAmountModalOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setMaxAmountModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#16314D] bg-[#0B1220] p-6 text-center shadow-2xl shadow-black/80"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#F5FAFF] mb-3">
              নোটিফিকেশন
            </h3>

            <p className="text-sm text-[#8FA6BC] leading-relaxed mb-6">
              দুঃখিত! সর্বোচ্চ ৩০,০০০ টাকা পর্যন্ত ডিপোজিট করা যাবে। অনুগ্রহ করে
              ৩০,০০০ টাকা বা তার কম একটি এমাউন্ট দিন।
            </p>

            <button
              type="button"
              onClick={() => setMaxAmountModalOpen(false)}
              className="w-full h-11 rounded-xl bg-primary hover:bg-[#48DDFF] active:scale-95 text-[#050912] font-bold text-base transition-all duration-200 shadow-md shadow-[rgba(0,229,255,0.3)]"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DepositPage;
