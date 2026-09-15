import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import promotionWalletService from "../services/promotionWalletService";
import { useTranslation } from "react-i18next";
const FreeSpinModal = ({ open, onClose, onClaimRefresh }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const { t, i18n } = useTranslation();
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      try {
        const res = await promotionWalletService.getMyFreeSpins();
        const data = res?.data?.data || res?.data || res || [];
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err?.response?.data?.message || err.message || "Failed to load",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [open]);

  const handleClaim = async (item) => {
    const promotionId = item?.promotion?._id || item?.promotion;
    if (!promotionId) {
      setError("Invalid promotion identifier");
      return;
    }
    try {
      setClaimingId(promotionId);
      setError(null);
      setSuccessMsg(null);
      await promotionWalletService.claimFreeSpins(promotionId);
      const res = await promotionWalletService.getMyFreeSpins();
      const data = res?.data?.data || res?.data || res || [];
      setItems(Array.isArray(data) ? data : []);
      setSuccessMsg("Free spins claimed successfully");
      if (onClaimRefresh) onClaimRefresh();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Claim failed");
    } finally {
      setClaimingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md">
      <div className="mx-auto m-3 w-[calc(100%-1.5rem)] max-w-md max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-[#ffb80022] bg-linear-to-b from-[#050505] via-[#0d0d0d] to-[#1a1405] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ffb80022] px-4 py-4 bg-[#0d0d0d]/95">
          <h2 className="text-2xl font-extrabold tracking-wide text-[#ffcc33]">
            {t("freeSpins")}
          </h2>
          <button onClick={onClose} className="text-[#ffcc33] hover:rotate-90">
            <X size={24} />
          </button>
        </div>

        {successMsg ? (
          <div className="px-4 py-3 bg-green-900/40 border-b border-green-700/50 text-green-300 text-sm text-center">
            {successMsg}
          </div>
        ) : null}

        {error ? (
          <div className="px-4 py-3 bg-red-900/40 border-b border-red-700/50 text-red-300 text-sm text-center">
            {error}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {loading ? (
            <div className="py-20 text-center text-[#d0d0d0]">
              {t("loadingFreeSpins")}
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-[#d0d0d0]">
              {t("noFreeSpinsAvailable")}
            </div>
          ) : (
            items.map((s) => {
              const remainingSpins =
                s.remainingFreeSpins ?? s.remainingSpins ?? 0;
              const spinValue = s.freeSpinValue ?? s.spinValue ?? s.value ?? 0;
              const title =
                s.promotionTitle ||
                s.promotion?.title ||
                s.title ||
                t("freeSpins");
              const provider =
                s.freeSpinProvider ||
                s.promotion?.freeSpinConfig?.freeSpinProvider ||
                s.provider ||
                t("notAvailable");
              const imageUrl = s.promotionImage || s.promotion?.imageUrl || "";
              const claimed = !!s.claimed;
              const id = s.userPromotionId || s._id || s.id;
              const promotionId = s.promotion?._id || s.promotion;
              return (
                <div
                  key={id}
                  className={`rounded-2xl border p-3 sm:p-4 ${
                    claimed
                      ? "border-[#666] bg-linear-to-r from-[#0a0a0a] to-[#101010] opacity-85"
                      : "border-[#ffb80022] bg-linear-to-r from-[#101010] to-[#181818]"
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-extrabold text-white wrap-break-word">
                          {title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-[#ffcc33] font-semibold uppercase mt-1">
                          {claimed ? t("claimed") : s.status || t("active")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold uppercase ${
                          claimed
                            ? "bg-gray-700 text-gray-300"
                            : "bg-[#201600] text-[#ffcc33]"
                        }`}
                      >
                        {claimed ? t("claimed") : t("available")}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-start">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full sm:w-24 h-32 sm:h-20 object-cover rounded-lg shrink-0"
                        />
                      ) : null}

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-[#d0d0d0]">
                          <div className="rounded-lg bg-black/30 px-3 py-2">
                            <div className="text-[#999]">{t("provider")}</div>
                            <div className="text-white font-semibold wrap-break-word">
                              {provider}
                            </div>
                          </div>
                          <div className="rounded-lg bg-black/30 px-3 py-2">
                            <div className="text-[#999]">
                              {t("remainingSpins")}
                            </div>
                            <div className="text-[#ffcc33] font-bold">
                              {remainingSpins}
                            </div>
                          </div>
                          <div className="rounded-lg bg-black/30 px-3 py-2 sm:col-span-2">
                            <div className="text-[#999]">{t("spinValue")}</div>
                            <div className="text-white font-semibold">
                              ৳
                              {Number(spinValue).toLocaleString(
                                i18n.language === "bn" ? "bn-BD" : "en-US",
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-[#d0d0d0] leading-relaxed">
                          {t("freeSpinsTurnoverNotice")}
                        </p>

                        <button
                          onClick={() => handleClaim(s)}
                          disabled={
                            claimed ||
                            remainingSpins === 0 ||
                            !promotionId ||
                            claimingId === promotionId
                          }
                          className={`w-full mt-1 px-3 py-2.5 rounded-md font-bold text-black transition-all ${
                            claimed ||
                            remainingSpins === 0 ||
                            !promotionId ||
                            claimingId === promotionId
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-primary hover:brightness-95 active:scale-[0.99]"
                          }`}
                        >
                          {claimed
                            ? t("claimed")
                            : claimingId === promotionId
                              ? t("claiming")
                              : t("claimSpins")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FreeSpinModal;
