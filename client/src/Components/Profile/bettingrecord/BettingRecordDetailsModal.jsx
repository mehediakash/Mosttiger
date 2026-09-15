import React, { useState, useEffect } from "react";
import { ArrowLeft, CalendarDays, Loader } from "lucide-react";
import bettingRecordsService from "../../../services/bettingRecordsService";
import { useTranslation } from "react-i18next";
const BettingRecordDetailsModal = ({ open, onClose, record }) => {
  const [detailsData, setDetailsData] = useState([]);
  const [summary, setSummary] = useState({ turnover: 0, profitLoss: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useTranslation();
  // Fetch detailed betting records when modal opens or record changes
  useEffect(() => {
    if (!open || !record) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          provider: record.provider,
          category: record.gameType,
          date: record.date,
          status: record.status,
          limit: 200,
        };

        const response =
          await bettingRecordsService.getBettingRecordDetails(params);

        if (response.data?.success && Array.isArray(response.data.data)) {
          const sourceData = response.data.data || [];

          const totalTurnover = sourceData.reduce(
            (sum, item) => sum + Number(item.turnover || 0),
            0,
          );

          const totalProfitLoss = sourceData.reduce(
            (sum, item) => sum + Number(item.profitLoss || 0),
            0,
          );

          setSummary({
            turnover: totalTurnover,
            profitLoss: totalProfitLoss,
          });

          setDetailsData(sourceData);
        } else {
          setSummary({ turnover: 0, profitLoss: 0 });
          setDetailsData([]);
        }
      } catch (err) {
        console.error("[BettingDetails] Error:", err);
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          "Failed to load betting details";
        setError(errorMessage);
        setSummary({ turnover: 0, profitLoss: 0 });
        setDetailsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [open, record]);

  if (!open || !record) return null;

  const formatAmount = (amount) =>
    amount >= 0 ? `+${Number(amount).toFixed(2)}` : Number(amount).toFixed(2);

  return (
    <div
      className="fixed inset-0 z-1000 flex justify-center bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="min-h-screen max-h-screen w-full max-w-md overflow-y-auto border border-[#ffb80022] bg-gradient-to-b from-[#050505] via-[#0d0d0d] to-[#1a1405] text-white shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-[#ffb80022] bg-[#0d0d0d]/95 px-4 py-4 backdrop-blur-md">
          <button
            onClick={onClose}
            className="rounded-full border border-[#ffcc33]/20 bg-[#1a1a1a] p-2 text-[#ffcc33] transition-all duration-300 hover:scale-105 hover:border-[#ffcc33]/40 hover:text-[#ffd95e]"
            aria-label="Back to betting records"
          >
            <ArrowLeft size={26} />
          </button>

          <h2 className="text-2xl font-extrabold tracking-wide text-[#ffcc33] drop-shadow-[0_0_12px_rgba(255,184,0,0.35)]">
            {t("bettingDetails")}
          </h2>

          <div className="w-10" />
        </div>

        {/* SUMMARY */}

        <div className="grid grid-cols-4 border-y border-[#ffb80018] bg-gradient-to-r from-[#1a1200] via-[#2a1d00] to-[#1a1200] text-center">
          <div className="border-r border-[#ffb80018] py-4">
            <p className="text-xs text-[#d0d0d0]">{t("platform")}</p>

            <p className="font-extrabold text-[#ffcc33]">{record.provider}</p>
          </div>

          <div className="border-r border-[#ffb80018] py-4">
            <p className="text-xs text-[#d0d0d0]">{t("gameType")}</p>

            <p className="font-extrabold text-[#ffcc33]">{record.gameType}</p>
          </div>

          <div className="border-r border-[#ffb80018] py-4">
            <p className="text-xs text-[#d0d0d0]">{t("turnover")}</p>

            <p className="font-extrabold text-[#ffcc33]">
              {Number(summary.turnover || 0).toFixed(2)}
            </p>
          </div>

          <div className="py-4">
            <p className="text-xs text-[#d0d0d0]">{t("profitLoss")}</p>

            <p
              className={`font-extrabold ${
                Number(summary.profitLoss) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {formatAmount(Number(summary.profitLoss || 0))}
            </p>
          </div>
        </div>

        {/* TABLE HEADER */}

        <div className="grid grid-cols-4 border-y border-[#ffb80018] bg-[#111111] text-center text-sm font-extrabold uppercase tracking-wide text-[#ffcc33]">
          <div className="border-r border-[#ffb80018] py-3">{t("txnDate")}</div>

          <div className="border-r border-[#ffb80018] py-3">{t("game")}</div>

          <div className="border-r border-[#ffb80018] py-3">
            {t("turnover")}
          </div>
          <div className="py-3">{t("profitLoss")}</div>
        </div>

        {/* LIST */}

        <div className="pb-4">
          <div className="flex items-center justify-between border-y border-[#ffb80010] bg-[#111111] px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-[#d0d0d0]">
              <CalendarDays size={16} className="text-[#ffcc33]" />

              <span>{record.date}</span>
            </div>

            <span className="text-xs text-[#9f9f9f]">{t("gmt6")}</span>
          </div>

          {/* LOADING */}

          {loading && (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <Loader size={40} className="mb-4 animate-spin text-[#ffcc33]" />
              <p className="text-[#d0d0d0]">{t("loadingDetails")}</p>
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-3xl text-red-400">
                !
              </div>

              <p className="mt-4 text-lg font-bold text-red-400">
                {t("error")}
              </p>

              <p className="mt-1 text-sm text-[#bdbdbd]">{error}</p>
            </div>
          )}

          {/* NO DATA */}

          {!loading && !error && detailsData.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center text-[#bdbdbd]">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-[#111111] text-3xl text-[#ffcc33]/40">
                —
              </div>

              <p className="mt-4 text-lg font-bold text-[#ffcc33]">
                {t("noBetDetails")}
              </p>

              <p className="mt-1 text-sm text-[#bdbdbd]">
                {t("noBetDetailsDescription")}
              </p>
            </div>
          )}

          {/* DATA */}

          {!loading &&
            !error &&
            detailsData.length > 0 &&
            detailsData.map((item) => (
              <div
                key={
                  item.id || `${item.txnDate}-${item.gameName}-${item.turnover}`
                }
                className="grid grid-cols-4 items-center border-b border-[#ffffff08] bg-gradient-to-r from-[#0f0f0f] to-[#161616] px-3 py-4 transition-all duration-300 hover:bg-[#1b1b1b] hover:shadow-[0_0_18px_rgba(255,184,0,0.08)]"
              >
                <div className="text-xs text-[#d0d0d0]">{item.txnDate}</div>

                <div className="text-sm font-semibold text-white">
                  {item.gameName}
                </div>

                <div className="text-center font-bold text-[#ffcc33]">
                  {Number(item.turnover || 0).toFixed(2)}
                </div>

                <div
                  className={`text-right font-extrabold ${
                    Number(item.profitLoss || 0) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {formatAmount(Number(item.profitLoss || 0))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default BettingRecordDetailsModal;
