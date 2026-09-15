import React from "react";
import { X, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
const TurnoverDetailsModal = ({ open, onClose, data }) => {
  if (!open || !data) return null;
  const { t, i18n } = useTranslation();
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#ffb80022] bg-gradient-to-b from-[#050505] via-[#0d0d0d] to-[#1a1405] shadow-2xl shadow-black/60">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-[#ffb80022] bg-[#0d0d0d]/95 px-4 py-4 text-white backdrop-blur-md">
          <h2 className="text-lg font-extrabold leading-tight tracking-wide text-[#ffcc33] drop-shadow-[0_0_10px_rgba(255,184,0,0.35)]">
            {data.promotionTitle || data.title}
          </h2>

          <button
            onClick={onClose}
            className="text-[#ffcc33] transition-all duration-300 hover:rotate-90 hover:text-[#ffd95e]"
          >
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4">
          <div className="overflow-hidden rounded-2xl border border-[#ffb80022] bg-[#111111] shadow-lg shadow-black/40">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-[#1a1200] via-[#2a1d00] to-[#1a1200] text-[#ffcc33]">
                <tr>
                  <th className="border border-[#ffb80012] px-2 py-3 text-left font-extrabold">
                    {t("transactionAmount")}
                  </th>

                  <th className="border border-[#ffb80012] px-2 py-3 text-left font-extrabold">
                    {t("bonus")}
                  </th>

                  <th className="border border-[#ffb80012] px-2 py-3 text-left font-extrabold">
                    {t("turnoverRequirement")}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr className="bg-[#101010] text-white">
                  <td className="border border-[#ffb80012] px-2 py-4 font-semibold">
                    ৳ {data.depositAmount || data.transactionAmount}
                  </td>

                  <td className="border border-[#ffb80012] px-2 py-4 font-semibold text-[#ffcc33]">
                    ৳ {data.bonusAmount || data.bonus}
                  </td>

                  <td className="relative border border-[#ffb80012] px-2 py-4 font-bold text-[#ffcc33]">
                    ৳ {data.turnoverRequirement}
                    <ChevronDown
                      size={18}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#ffcc33]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* EXTRA DETAILS */}
          <div className="mt-5 space-y-3 rounded-2xl border border-[#ffb80018] bg-[#0f0f0f] p-4 text-sm shadow-lg shadow-black/30">
            <div className="flex justify-between border-b border-[#ffb80010] pb-2">
              <span className="text-[#d0d0d0]">{t("turnoverCompleted")}</span>

              <span className="font-bold text-[#ffcc33]">
                {data.turnoverCompleted} / {data.turnoverRequirement}
              </span>
            </div>

            <div className="flex justify-between border-b border-[#ffb80010] pb-2">
              <span className="text-[#d0d0d0]">{t("completedRatio")}</span>

              <span className="font-bold text-[#ffcc33]">
                {parseFloat(
                  data.turnoverPercentage || data.completedRatio || 0,
                ).toFixed(2)}
                %
              </span>
            </div>

            <div className="flex justify-between border-b border-[#ffb80010] pb-2">
              <span className="text-[#d0d0d0]">{t("remainingTurnover")}</span>

              <span className="font-bold text-[#ffcc33]">
                ৳ {data.remainingTurnover || 0}
              </span>
            </div>

            <div className="flex justify-between border-b border-[#ffb80010] pb-2">
              <span className="text-[#d0d0d0]">{t("expiryDate")}</span>

              <span className="font-bold text-white">
                {formatDate(data.expiresAt)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#d0d0d0]">{t("createDate")}</span>

              <span className="font-bold text-white">
                {formatDate(data.createdAt) || data.createdAt}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TurnoverDetailsModal;
