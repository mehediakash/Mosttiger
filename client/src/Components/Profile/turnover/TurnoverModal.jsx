import React, { useMemo, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import TurnoverDetailsModal from "./TurnoverDetailsModal";
import api from "../../axios/axios";
import { useTranslation } from "react-i18next";
const TurnoverModal = ({ open, onClose, turnovers = [], loading = false }) => {
  const [tab, setTab] = useState("active");
  const [selectedItem, setSelectedItem] = useState(null);
  const [apiTurnovers, setApiTurnovers] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    if (!open) return;

    let mounted = true;

    (async () => {
      try {
        setApiLoading(true);
        setApiError(null);

        const response = await api.get("/api/turnover-tracking/status");
        const payload = response?.data?.data || response?.data;

        if (mounted && payload && payload.turnovers) {
          const normalized = payload.turnovers.map((t) => ({
            _id: t.turnoverId,
            title: t.promotion?.title || "Promotion",
            status: t.status || "active",
            transactionAmount: t.depositAmount || 0,
            bonus: t.bonusAmount || 0,
            bonusAmount: t.bonusAmount || 0,
            depositAmount: t.depositAmount || 0,
            turnoverRequirement: t.turnoverRequired || 0,
            turnoverCompleted: t.turnoverCompleted || 0,
            completedRatio: Math.round(parseFloat(t.turnoverPercentage) || 0),
            createdAt: t.createdAt
              ? new Date(t.createdAt).toLocaleDateString()
              : "N/A",
            endDate: t.expiresAt
              ? new Date(t.expiresAt).toLocaleDateString()
              : "N/A",
            turnoverPercentage: t.turnoverPercentage,
            promotionTitle: t.promotion?.title,
            expiresAt: t.expiresAt,
            remainingTurnover: t.remainingTurnover,
            allowedCategories: t.allowedCategories,
            allowedProviders: t.allowedProviders,
            withdrawLocked: t.withdrawLocked,
          }));

          setApiTurnovers(normalized);
        }
      } catch (error) {
        console.error("Failed to fetch turnovers:", error);
        if (mounted) {
          setApiError(
            error?.response?.data?.message || "Failed to load turnovers",
          );
          setApiTurnovers([]);
        }
      } finally {
        if (mounted) {
          setApiLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  const source = turnovers && turnovers.length > 0 ? turnovers : apiTurnovers;

  const filteredData = useMemo(() => {
    if (tab === "active") {
      return source.filter(
        (item) => item.status === "active" || item.status === "pending",
      );
    } else {
      return source.filter((item) => item.status === "completed");
    }
  }, [source, tab]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md">
        <div className="mx-auto m-4 flex h-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#ffb80022] bg-gradient-to-b from-[#050505] via-[#0d0d0d] to-[#1a1405] text-white shadow-2xl shadow-black/60">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-[#ffb80022] bg-[#0d0d0d]/95 px-4 py-4 backdrop-blur-md">
            <h2 className="text-2xl font-extrabold tracking-wide text-[#ffcc33] drop-shadow-[0_0_12px_rgba(255,184,0,0.35)]">
              {t("turnover")}
            </h2>

            <button
              onClick={onClose}
              className="text-[#ffcc33] transition-all duration-300 hover:rotate-90 hover:text-[#ffd95e]"
            >
              <X size={26} />
            </button>
          </div>

          {/* TABS */}
          <div className="flex border-b border-[#ffb8001f] bg-[#111111] text-sm font-bold">
            <button
              onClick={() => setTab("active")}
              className={`flex-1 py-4 transition-all duration-200 ${
                tab === "active"
                  ? "border-b-[3px] border-[#ffcc33] bg-gradient-to-r from-[#1a1200] to-[#2a1d00] text-[#ffcc33]"
                  : "text-[#d0d0d0] hover:text-[#ffcc33]"
              }`}
            >
              {t("active")}
            </button>

            <button
              onClick={() => setTab("completed")}
              className={`flex-1 py-4 transition-all duration-200 ${
                tab === "completed"
                  ? "border-b-[3px] border-[#ffcc33] bg-gradient-to-r from-[#1a1200] to-[#2a1d00] text-[#ffcc33]"
                  : "text-[#d0d0d0] hover:text-[#ffcc33]"
              }`}
            >
              {t("completed")}
            </button>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#090909] to-[#141414] p-3">
            {apiLoading || loading ? (
              <div className="py-20 text-center text-[#d0d0d0]">
                {t("loading")}
              </div>
            ) : apiError ? (
              <div className="py-20 text-center text-red-400 text-sm">
                {apiError}
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-20 text-center text-[#d0d0d0]">
                {t("noTurnoverFound")}
              </div>
            ) : (
              filteredData.map((item) => {
                const progress =
                  item.turnoverRequirement > 0
                    ? Math.min(
                        100,
                        (item.turnoverCompleted / item.turnoverRequirement) *
                          100,
                      )
                    : 0;

                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedItem(item)}
                    className="relative mb-4 cursor-pointer overflow-hidden rounded-2xl border border-[#ffb80022] bg-gradient-to-r from-[#101010] to-[#181818] shadow-lg shadow-black/40 transition-all duration-300 hover:scale-[1.01] hover:border-[#ffcc33]/40 hover:shadow-[0_0_20px_rgba(255,184,0,0.12)]"
                  >
                    <div className="flex">
                      {/* LEFT */}
                      <div className="flex-1 p-4">
                        <h3 className="line-clamp-1 border-l-4 border-[#ffcc33] pl-3 text-[15px] font-extrabold text-white">
                          {item.promotionTitle || item.title}
                        </h3>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#c7c7c7]">
                          <span>{t("eventEndsIn")} :</span>
                          <span className="font-semibold text-[#ffcc33]">
                            {item.endDate}
                          </span>

                          <button className="ml-2 rounded-lg border border-primary bg-[#1b1b1b] px-2 py-[2px] text-[10px] font-bold text-[#ffcc33] transition-all duration-200 hover:bg-[#2a1d00]">
                            {t("detail")}
                          </button>
                        </div>

                        <div className="mt-3 text-[30px] font-black leading-none text-[#ffcc33] drop-shadow-[0_0_10px_rgba(255,184,0,0.25)]">
                          ৳ {item.turnoverRequirement}
                        </div>

                        {/* PROGRESS */}
                        <div className="mt-4">
                          <div className="h-[9px] overflow-hidden rounded-full bg-[#2a2a2a]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40] shadow-[0_0_12px_rgba(255,184,0,0.45)]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>

                          <div className="mt-2 flex justify-between text-[11px] text-[#bdbdbd]">
                            <span>{item.turnoverCompleted}</span>
                            <span>{item.turnoverRequirement}</span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT */}
                      <div className="flex w-[95px] flex-col items-center justify-center border-l border-dashed border-[#ffb80022] bg-gradient-to-b from-[#111111] to-[#1a1405]">
                        <CheckCircle2
                          size={30}
                          className="text-[#ffcc33] drop-shadow-[0_0_10px_rgba(255,184,0,0.4)]"
                        />

                        <span className="mt-2 text-sm font-bold capitalize text-[#ffcc33]">
                          {item.status === "active"
                            ? t("active")
                            : item.status === "completed"
                              ? t("completed")
                              : item.status === "pending"
                                ? t("pending")
                                : item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <TurnoverDetailsModal
        open={!!selectedItem}
        data={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
};

export default TurnoverModal;
