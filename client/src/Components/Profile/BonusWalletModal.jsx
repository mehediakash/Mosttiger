import React, { useEffect, useState } from "react";
import { X, Loader } from "lucide-react";
import promotionWalletService from "../services/promotionWalletService";
import { useTranslation } from "react-i18next";

const getPayload = (res) => res?.data?.data || res?.data || {};

const getReferralPercent = (turnover) => {
  const required = Number(turnover?.turnoverRequired || 0);
  if (!required) return 0;
  return Math.min(
    100,
    Math.round((Number(turnover?.turnoverCompleted || 0) / required) * 100),
  );
};

const uniqueById = (items = []) =>
  Array.from(
    new Map(
      items
        .filter(Boolean)
        .map((item) => [item._id || item.id || `${item.referredUser}-${item.status}`, item]),
    ).values(),
  );

const BonusWalletModal = ({ open, onClose, onClaimRefresh }) => {
  const [items, setItems] = useState([]);
  const [referralStatus, setReferralStatus] = useState(null);
  const [referralTurnovers, setReferralTurnovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const { t, i18n } = useTranslation();
  useEffect(() => {
    if (!open) return;
    let mounted = true;

    const loadBonuses = async () => {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      try {
        const [res, referralRes, referralStatusRes, referralTurnoverRes] =
          await Promise.allSettled([
            promotionWalletService.getMyBonuses(),
            promotionWalletService.getReferralBonuses(),
            promotionWalletService.getReferralBonusStatus(),
            promotionWalletService.getReferralTurnover(),
          ]);
        // Handle both { data: [...] } and { success: true, data: [...] }
        const bonusData =
          res.status === "fulfilled" ? res.value.data?.data || res.value.data || [] : [];
        const referralData =
          referralRes.status === "fulfilled" ? getPayload(referralRes.value) : {};
        const statusData =
          referralStatusRes.status === "fulfilled"
            ? getPayload(referralStatusRes.value)
            : {};
        const referralBonuses = Array.isArray(referralData.bonuses)
          ? referralData.bonuses
          : [];
        const latestReferralBonuses = Array.isArray(statusData.latestBonuses)
          ? statusData.latestBonuses
          : [];

        if (mounted) {
          setItems([
            ...(Array.isArray(bonusData)
              ? bonusData.map((item) => ({ ...item, walletType: "promotion" }))
              : []),
            ...uniqueById([...referralBonuses, ...latestReferralBonuses]).map((item) => ({
              ...item,
              walletType: "referral",
            })),
          ]);
          if (referralStatusRes.status === "fulfilled") {
            setReferralStatus(statusData);
          }
          if (referralTurnoverRes.status === "fulfilled") {
            setReferralTurnovers(getPayload(referralTurnoverRes.value).turnovers || []);
          }
        }
      } catch (err) {
        const errorMsg =
          err?.response?.data?.message ||
          err.message ||
          "Failed to load bonuses";
        if (mounted) setError(errorMsg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadBonuses();
    return () => {
      mounted = false;
    };
  }, [open]);

  const reloadBonuses = async () => {
    const [res, referralRes, referralStatusRes, referralTurnoverRes] =
      await Promise.allSettled([
        promotionWalletService.getMyBonuses(),
        promotionWalletService.getReferralBonuses(),
        promotionWalletService.getReferralBonusStatus(),
        promotionWalletService.getReferralTurnover(),
      ]);
    const bonusData =
      res.status === "fulfilled" ? res.value.data?.data || res.value.data || [] : [];
    const referralData =
      referralRes.status === "fulfilled" ? getPayload(referralRes.value) : {};
    const statusData =
      referralStatusRes.status === "fulfilled" ? getPayload(referralStatusRes.value) : {};
    const referralBonuses = Array.isArray(referralData.bonuses)
      ? referralData.bonuses
      : [];
    const latestReferralBonuses = Array.isArray(statusData.latestBonuses)
      ? statusData.latestBonuses
      : [];

    setItems([
      ...(Array.isArray(bonusData)
        ? bonusData.map((item) => ({ ...item, walletType: "promotion" }))
        : []),
      ...uniqueById([...referralBonuses, ...latestReferralBonuses]).map((item) => ({
        ...item,
        walletType: "referral",
      })),
    ]);
    if (referralStatusRes.status === "fulfilled") {
      setReferralStatus(statusData);
    }
    if (referralTurnoverRes.status === "fulfilled") {
      setReferralTurnovers(getPayload(referralTurnoverRes.value).turnovers || []);
    }
  };

  const handleClaim = async (bonus) => {
    const claimId = bonus.walletType === "referral" ? bonus._id : bonus.turnoverId || bonus._id;
    if (claimingId || !claimId) return;

    if (bonus.walletType === "referral") {
      const confirmed = window.confirm(
        "Claiming this Referral Bonus will\n\nMove the bonus into your Main Wallet.\nActivate 1x Referral Turnover.\nTemporarily lock your Withdraw until the Referral Turnover is completed.\n\nDo you want to continue?",
      );
      if (!confirmed) return;
    }

    try {
      setClaimingId(claimId);
      setError(null);
      setSuccessMsg(null);

      if (bonus.walletType === "referral") {
        await promotionWalletService.claimReferralBonus(claimId);
      } else {
        await promotionWalletService.claimBonus(claimId);
      }

      // Refresh bonuses list
      await reloadBonuses();

      setSuccessMsg(
        bonus.walletType === "referral"
          ? "Referral Bonus Claimed. Referral Turnover Activated."
          : "Bonus claimed successfully! Moved to Main Wallet",
      );

      // Notify parent to refresh balances
      if (onClaimRefresh) {
        await onClaimRefresh();
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message || err.message || "Failed to claim bonus";
      setError(errorMsg);
    } finally {
      setClaimingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
      <div className="mx-auto max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-[#ffb80022] bg-gradient-to-b from-[#050505] via-[#0d0d0d] to-[#1a1405] text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ffb80022] px-4 py-4 bg-[#0d0d0d]/95 flex-shrink-0">
          <h2 className="text-2xl font-extrabold tracking-wide text-[#ffcc33]">
            {t("bonusWallet")}
          </h2>
          <button
            onClick={onClose}
            className="text-[#ffcc33] hover:rotate-90 transition-transform"
          >
            <X size={24} />
          </button>
        </div>

        {/* Success Message */}
        {successMsg && (
          <div className="px-4 py-3 bg-green-900/40 border-b border-green-700/50 text-green-300 text-sm text-center">
            {successMsg}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 bg-red-900/40 border-b border-red-700/50 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <Loader className="animate-spin text-[#ffcc33]" size={32} />
              <p className="text-[#d0d0d0]">{t("loadingBonuses")}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-[#d0d0d0]">
              <p className="text-lg font-semibold">{t("noBonusesAvailable")}</p>
              <p className="text-sm text-[#999] mt-2">
                {t("completePromotionsToEarnBonuses")}
              </p>
            </div>
          ) : (
            items.map((bonus) => {
              // Map backend response fields
              const isReferral = bonus.walletType === "referral";
              const turnoverId = isReferral ? bonus._id : bonus.turnoverId || bonus._id;
              const referralTurnover = referralTurnovers.find(
                (turnover) => turnover.bonus === bonus._id || turnover.bonus?._id === bonus._id,
              );
              const title = isReferral
                ? "Referral Bonus"
                : bonus.promotion?.title || t("bonus");
              const imageUrl = bonus.promotion?.imageUrl || "";
              const claimed = isReferral
                ? ["claimed", "turnover_active", "completed"].includes(bonus.status)
                : !!bonus.claimed;
              const completed = isReferral ? bonus.status === "completed" : false;
              const bonusAmount = bonus.bonusAmount || 0;
              const turnoverRequired = isReferral
                ? referralTurnover?.turnoverRequired || bonus.requiredTurnover || 0
                : bonus.turnoverRequired || 0;
              const turnoverCompleted = isReferral
                ? referralTurnover?.turnoverCompleted || bonus.turnoverCompleted || 0
                : bonus.turnoverCompleted || 0;
              const turnoverPct = isReferral
                ? getReferralPercent(referralTurnover)
                : Number(bonus.turnoverPercentage || 0);
              const claimable = isReferral ? bonus.status === "pending_claim" : !claimed;
              const statusText = isReferral
                ? bonus.status?.replace(/_/g, " ") || "Pending Claim"
                : claimed
                  ? t("claimed")
                  : "Claimable";

              return (
                <div
                  key={turnoverId}
                  className={`rounded-2xl border p-4 transition-all ${
                    claimed
                      ? "border-[#666] bg-gradient-to-r from-[#0a0a0a] to-[#0f0f0f] opacity-60"
                      : "border-[#ffb80022] bg-gradient-to-r from-[#101010] to-[#181818]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Image */}
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={title}
                        className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Title & Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-white truncate">
                          {title}
                        </h3>
                        <span
                          className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                            claimable
                              ? "bg-green-900/50 text-green-300"
                              : completed
                                ? "bg-blue-900/50 text-blue-300"
                              : "bg-gray-900/50 text-gray-300"
                          }`}
                        >
                          {statusText}
                        </span>
                      </div>

                      {/* Bonus Amount */}
                      <div className="mt-2 text-[#ffcc33] text-2xl font-black">
                        ৳
                        {Number(bonusAmount).toLocaleString(
                          i18n.language === "bn" ? "bn-BD" : "en-US",
                        )}
                      </div>

                      {/* Turnover Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#999]">
                            {t("turnoverProgress")}
                          </span>
                          <span className="text-xs text-[#ffcc33] font-bold">
                            {turnoverPct}%
                          </span>
                        </div>
                        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#333]">
                          <div
                            className="h-full bg-gradient-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40] transition-all"
                            style={{ width: `${Math.min(100, turnoverPct)}%` }}
                          />
                        </div>
                        <div className="mt-2 text-xs text-[#999] flex justify-between">
                          <span>
                            ৳ {Number(turnoverCompleted).toLocaleString()}
                          </span>
                          <span>
                            ৳ {Number(turnoverRequired).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Info Text */}
                      <p className="text-xs text-[#888] mt-3">
                        {isReferral
                          ? bonus.status === "pending_claim"
                            ? "Referral bonus is ready to claim."
                            : bonus.status === "completed"
                              ? "Referral bonus has been completed."
                              : "Referral bonus has already been claimed."
                          : claimed
                            ? "Bonus has already been claimed."
                            : "This bonus is ready to claim."}
                      </p>

                      {isReferral && referralTurnover && (
                        <div className="mt-3 rounded-lg border border-[#ffb80010] bg-[#111] p-3 text-xs text-[#d0d0d0]">
                          <div className="flex justify-between">
                            <span>Remaining</span>
                            <span className="font-bold text-[#ffcc33]">
                              à§³ {Number(referralTurnover.turnoverRemaining || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between">
                            <span>Withdraw Status</span>
                            <span className="font-bold text-[#ffcc33]">
                              {referralStatus?.withdrawLocked ? "Locked" : "Unlocked"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Claim Button */}
                  <button
                    onClick={() => handleClaim(bonus)}
                    disabled={!claimable || !!claimingId}
                    className={`mt-4 bg-primary w-full py-2 px-4 rounded-lg font-bold text-sm transition-all ${
                      !claimable
                        ? "bg-primary text-gray-400 cursor-not-allowed"
                        : claimingId === turnoverId
                          ? "bg-blue-500 text-white cursor-wait"
                          : "primary text-black hover:bg-[#ffd633] active:scale-95"
                    }`}
                  >
                    {!claimable
                      ? completed
                        ? "Completed"
                        : claimed
                          ? t("claimed")
                          : "Unavailable"
                      : claimingId === turnoverId
                        ? t("claiming")
                        : t("claimBonus")}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BonusWalletModal;
