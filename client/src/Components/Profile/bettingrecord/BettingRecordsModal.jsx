import React, { useMemo, useState, useEffect } from "react";
import { CalendarDays, ChevronRight, Funnel, X, Loader } from "lucide-react";
import bettingRecordsService from "../../../services/bettingRecordsService";
import BettingRecordDetailsModal from "./BettingRecordDetailsModal";
import { useTranslation } from "react-i18next";
const BettingRecordsModal = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState("settled");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [bettingRecords, setBettingRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [days] = useState(7);
  const { t } = useTranslation();
  // Fetch betting records when modal opens or tab changes
  useEffect(() => {
    if (!open) return;

    const fetchBettingRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { status: activeTab, days };
        const response = await bettingRecordsService.getBettingRecords(params);

        if (response.data?.success && response.data?.data) {
          // Map API summary to component items
          const transformedData = response.data.data.map((item) => ({
            id: `${item.provider}-${item.category}-${item.date}`,
            provider: item.provider,
            gameType: item.category,
            turnover: item.totalTurnover || 0,
            profitLoss: item.totalProfitLoss || 0,
            date: item.date,
            status: activeTab,
            raw: item,
          }));

          setBettingRecords(transformedData);
        } else {
          setBettingRecords([]);
        }
      } catch (err) {
        console.error("[BettingRecords] Error:", err);
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          "Failed to fetch betting records";
        setError(errorMessage);
        setBettingRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBettingRecords();
  }, [open, activeTab, days]);

  const filteredRecords = useMemo(() => {
    return bettingRecords
      .filter((item) => item.status === activeTab)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [bettingRecords, activeTab]);

  const groupedRecords = useMemo(() => {
    return filteredRecords.reduce((accumulator, item) => {
      const key = item.date;
      if (!accumulator[key]) accumulator[key] = [];
      accumulator[key].push(item);
      return accumulator;
    }, {});
  }, [filteredRecords]);

  const groupedEntries = useMemo(() => {
    return Object.entries(groupedRecords).sort(
      (a, b) => new Date(b[0]) - new Date(a[0]),
    );
  }, [groupedRecords]);

  if (!open) return null;

  const formatAmount = (amount) => {
    if (amount > 0) return `+${amount.toFixed(2)}`;
    return amount.toFixed(2);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-999 bg-black/85 backdrop-blur-md flex justify-center"
        onClick={onClose}
      >
        <div
          className="min-h-screen max-h-screen w-full max-w-md overflow-y-auto border border-[#ffb80022] bg-gradient-to-b from-[#050505] via-[#0d0d0d] to-[#1a1405] text-white shadow-2xl shadow-black/60"
          onClick={(event) => event.stopPropagation()}
        >
          {/* HEADER */}

          <div className="flex items-center justify-between border-b border-[#ffb80022] bg-[#0d0d0d]/95 px-4 py-4 backdrop-blur-md">
            <div>
              <h2 className="text-2xl font-extrabold tracking-wide text-[#ffcc33] drop-shadow-[0_0_12px_rgba(255,184,0,0.35)]">
                {t("bettingRecords")}
              </h2>

              <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[#d0d0d0]">
                {t("history")}
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-full border border-[#ffcc33]/20 bg-[#1a1a1a] p-2 text-[#ffcc33] transition-all duration-300 hover:rotate-90 hover:border-[#ffcc33]/40 hover:text-[#ffd95e]"
              aria-label="Close betting records"
            >
              <X size={30} />
            </button>
          </div>

          {/* TABS */}

          <div className="relative flex border-b border-[#ffb8001f] bg-[#111111]">
            <button
              onClick={() => setActiveTab("settled")}
              className={`flex-1 py-4 text-lg font-bold transition-all duration-200 ${
                activeTab === "settled" ? "text-[#ffcc33]" : "text-[#d0d0d0]"
              }`}
            >
              {t("settled")}
            </button>

            <button
              onClick={() => setActiveTab("unsettled")}
              className={`flex-1 py-4 text-lg font-bold transition-all duration-200 ${
                activeTab === "unsettled" ? "text-[#ffcc33]" : "text-[#d0d0d0]"
              }`}
            >
              {t("unsettled")}
            </button>

            <div
              className={`absolute bottom-0 h-[3px] w-1/2 bg-gradient-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40] shadow-[0_0_12px_rgba(255,184,0,0.5)] transition-all duration-300 ${
                activeTab === "settled" ? "left-0" : "left-1/2"
              }`}
            />
          </div>

          {/* FILTER */}

          <div className="flex items-center justify-between border-b border-[#ffb80010] bg-[#0c0c0c] px-3 py-3">
            <button className="rounded-full border border-primary bg-gradient-to-r from-[#a66d00] to-[#ffcc33] px-4 py-1 text-sm font-bold text-black shadow-lg shadow-[#ffb80033]">
              {t("last7Days")}
            </button>

            <button
              className="rounded-full border border-[#ffcc33]/20 bg-[#1a1a1a] p-2 text-[#ffcc33] transition-all duration-200 hover:scale-105 hover:text-[#ffd95e]"
              aria-label="Filter betting records"
            >
              <Funnel size={20} />
            </button>
          </div>

          {/* TABLE HEADER */}

          <div className="grid grid-cols-4 border-y border-[#ffb80018] bg-gradient-to-r from-[#1a1200] via-[#2a1d00] to-[#1a1200] text-center text-sm font-extrabold uppercase tracking-wide text-[#ffcc33]">
            <div className="border-r border-[#ffb80018] py-3">
              {t("platform")}
            </div>

            <div className="border-r border-[#ffb80018] py-3">
              {t("gameType")}
            </div>

            <div className="border-r border-[#ffb80018] py-3">
              {t("turnover")}
            </div>
            <div className="py-3">{t("profitLoss")}</div>
          </div>

          {/* EMPTY */}

          {!loading && filteredRecords.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-[#111111] text-3xl text-[#ffcc33]/40">
                —
              </div>

              <p className="mt-4 text-xl font-bold text-[#ffcc33]">
                {t("noBettingRecordsFound")}
              </p>

              <p className="mt-1 text-sm text-[#bdbdbd]">
                {t("noRecordsForSelectedPeriod", {
                  status:
                    activeTab === "settled" ? t("settled") : t("unsettled"),
                })}
              </p>
            </div>
          )}

          {/* LOADING */}

          {loading && (
            <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
              <Loader size={40} className="mb-4 animate-spin text-[#ffcc33]" />
              <p className="text-[#d0d0d0]">{t("loadingBettingRecords")}</p>
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-3xl text-red-400">
                !
              </div>

              <p className="mt-4 text-xl font-bold text-red-400">
                {t("error")}
              </p>

              <p className="mt-1 text-sm text-[#bdbdbd]">{error}</p>
            </div>
          )}

          {/* DATA */}

          {groupedEntries.map(([date, records]) => (
            <div key={date}>
              {/* DATE */}

              <div className="flex items-center justify-between border-y border-[#ffb80010] bg-[#111111] px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-[#d0d0d0]">
                  <CalendarDays size={16} className="text-[#ffcc33]" />

                  <span>{date}</span>
                </div>

                <span className="text-xs text-[#9f9f9f]">{t("gmt6")}</span>
              </div>

              {/* ROWS */}

              {records.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedRecord(item)}
                  className="grid w-full grid-cols-4 items-center border-b border-[#ffffff08] bg-gradient-to-r from-[#0f0f0f] to-[#161616] px-3 py-4 transition-all duration-300 hover:bg-[#1b1b1b] hover:shadow-[0_0_18px_rgba(255,184,0,0.08)] active:bg-[#1f1f1f]"
                >
                  <div className="text-left">
                    <p className="font-extrabold tracking-wide text-[#ffcc33]">
                      {item.provider}
                    </p>
                  </div>

                  <div className="text-center text-sm text-[#d0d0d0]">
                    {item.gameType}
                  </div>

                  <div className="text-center text-sm font-bold text-white">
                    {Number(item.turnover || 0).toFixed(2)}
                  </div>

                  <div className="flex items-center justify-end gap-2 text-sm">
                    <span
                      className={`font-extrabold ${
                        item.profitLoss > 0
                          ? "text-green-400"
                          : item.profitLoss < 0
                            ? "text-red-400"
                            : "text-[#ffcc33]"
                      }`}
                    >
                      {formatAmount(Number(item.profitLoss || 0))}
                    </span>

                    <ChevronRight size={18} className="text-[#ffcc33]/70" />
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <BettingRecordDetailsModal
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />
    </>
  );
};

export default BettingRecordsModal;
