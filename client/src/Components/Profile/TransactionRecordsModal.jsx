import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
const TransactionRecordsModal = ({
  isOpen,
  onClose,
  records = [],
  loading = false,
  error = "",
  onSelect,
}) => {
  const [filter, setFilter] = useState("7days");
  const { t, i18n } = useTranslation();

  const filtered = useMemo(() => {
    if (!records) return [];
    const now = dayjs();

    return records.filter((r) => {
      const type = String(r.type || "").toLowerCase();
      if (type !== "deposit" && type !== "withdrawal") return false;

      const date = dayjs(r.createdAt || r.date);
      if (filter === "7days") return date.isAfter(now.subtract(7, "day"));
      if (filter === "today") return date.isSame(now, "day");
      if (filter === "yesterday")
        return date.isSame(now.subtract(1, "day"), "day");
      return true;
    });
  }, [records, filter]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, item) => {
      const date = dayjs(item.createdAt || item.date).format("YYYY/MM/DD");
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
  }, [filtered]);

  useEffect(() => {
    if (!isOpen) setFilter("7days");
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (["completed", "approved", "paid", "success"].includes(normalized)) {
      return "bg-linear-to-r from-[#0d7a3b] to-[#41d96f]";
    }

    if (["pending", "processing"].includes(normalized)) {
      return "bg-linear-to-r from-[#8f6b00] to-[#ffd54f]";
    }

    if (["failed", "rejected", "cancelled", "expired"].includes(normalized)) {
      return "bg-linear-to-r from-[#7a0000] to-[#ff4b4b] text-white";
    }

    return "bg-linear-to-r from-[#303030] to-[#6b6b6b] text-white";
  };

  const formatStatus = (status) => {
    const normalized = String(status || "unknown").toLowerCase();
    const translated = t(normalized);
    if (translated && translated !== normalized) return translated;
    return normalized.replace(/_/g, " ");
  };

  return (
    <div className="fixed inset-0 z-9999 bg-black/80 backdrop-blur-md">
      <div className="h-full overflow-y-auto bg-linear-to-b from-[#050505] via-[#0d0d0d] to-[#1a1405] text-white">
        {/* HEADER */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#ffb80033] bg-[#0d0d0d]/95 px-4 py-4 backdrop-blur-md">
          <h2 className="text-[22px] font-extrabold tracking-wide text-[#ffcc33] drop-shadow-[0_0_12px_rgba(255,184,0,0.35)]">
            {t("transactionRecords")}
          </h2>

          <button
            onClick={onClose}
            className="text-[30px] font-bold text-[#ffcc33] transition-all duration-200 hover:scale-110 hover:text-[#ffd95e]"
          >
            ×
          </button>
        </div>

        {/* FILTER */}
        <div className="flex items-center justify-between border-b border-[#ffb8001f] px-4 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("7days")}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all duration-200 ${
                filter === "7days"
                  ? "border-[#ffcc33] bg-linear-to-r from-[#a66d00] to-[#ffcc33] text-black shadow-lg shadow-[#ffb80033]"
                  : "border-[#ffffff14] bg-[#121212] text-[#d8d8d8] hover:border-[#ffcc33]/40 hover:text-[#ffcc33]"
              }`}
            >
              {t("last7Days")}
            </button>

            <button
              onClick={() => setFilter("today")}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all duration-200 ${
                filter === "today"
                  ? "border-[#ffcc33] bg-linear-to-r from-[#a66d00] to-[#ffcc33] text-black shadow-lg shadow-[#ffb80033]"
                  : "border-[#ffffff14] bg-[#121212] text-[#d8d8d8] hover:border-[#ffcc33]/40 hover:text-[#ffcc33]"
              }`}
            >
              {t("today")}
            </button>

            <button
              onClick={() => setFilter("yesterday")}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all duration-200 ${
                filter === "yesterday"
                  ? "border-[#ffcc33] bg-linear-to-r from-[#a66d00] to-[#ffcc33] text-black shadow-lg shadow-[#ffb80033]"
                  : "border-[#ffffff14] bg-[#121212] text-[#d8d8d8] hover:border-[#ffcc33]/40 hover:text-[#ffcc33]"
              }`}
            >
              {t("yesterday")}
            </button>
          </div>

          <button className="text-xl text-[#ffcc33] transition-all duration-200 hover:scale-110 hover:text-[#ffd95e]">
            ⌕
          </button>
        </div>

        {/* TABLE HEADER */}
        <div className="grid grid-cols-4 border-y border-[#ffb80022] bg-linear-to-r from-[#1a1200] via-[#2a1d00] to-[#1a1200] px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-[#ffcc33]">
          <div>{t("type")}</div>
          <div>{t("amount")}</div>
          <div>{t("status")}</div>
          <div>{t("txnDate")}</div>
        </div>

        {/* RECORDS */}
        <div className="pb-24">
          {loading && (
            <div className="p-8 text-center text-[#d0d0d0]">
              {t("loading")}
            </div>
          )}

          {!loading && error && (
            <div className="p-8 text-center text-red-300">{error}</div>
          )}

          {!loading && !error && Object.entries(grouped).length === 0 && (
            <div className="p-8 text-center text-[#d0d0d0]">
              {t("noRecordsFound")}
            </div>
          )}

          {!loading && !error && Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              {/* DATE */}
              <div className="flex items-center justify-between border-b border-[#ffb80012] bg-[#141414] px-4 py-3 text-sm text-[#d0d0d0]">
                <span className="font-semibold text-[#ffcc33]">📅 {date}</span>
                <span>{t("gmt6")}</span>
              </div>

              {/* ITEMS */}
              {items.map((item) => (
                <button
                  key={item._id || item.id}
                  onClick={() => onSelect && onSelect(item)}
                  className="grid w-full grid-cols-4 items-center border-b border-[#ffffff08] bg-linear-to-r from-[#0f0f0f] to-[#161616] px-4 py-4 text-sm transition-all duration-200 hover:bg-[#1b1b1b] hover:shadow-[0_0_18px_rgba(255,184,0,0.08)]"
                >
                  <div className="min-w-0 font-medium text-white">
                    <div className="capitalize">{t(item.type)}</div>
                    <div className="mt-1 truncate text-[11px] font-semibold text-[#d0d0d0]">
                      {item.referenceId || item.gatewayReference || "N/A"}
                    </div>
                    {(item.paymentProvider || item.provider) && (
                      <div className="mt-0.5 truncate text-[11px] text-[#ffcc33]">
                        {item.paymentProvider &&
                        item.provider &&
                        item.paymentProvider !== item.provider
                          ? `${item.paymentProvider} - ${item.provider}`
                          : item.provider || item.paymentProvider}
                      </div>
                    )}
                  </div>

                  <div className="font-bold text-[#ffcc33]">৳{item.amount}</div>

                  <div>
                    <span
                      className={`rounded-lg px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-black shadow-md ${getStatusClass(item.status)}`}
                    >
                      {formatStatus(item.status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 font-medium text-[#d0d0d0]">
                    {dayjs(item.createdAt || item.date).format("HH:mm:ss")} →
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TransactionRecordsModal;
