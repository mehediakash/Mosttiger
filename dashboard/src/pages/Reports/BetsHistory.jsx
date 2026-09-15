import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  ConfigProvider,
  theme as antdTheme,
  DatePicker,
  Input,
  Button,
  Table,
  Tooltip,
  message,
  Spin,
  Alert,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  CopyOutlined,
  CheckOutlined,
  DollarOutlined,
  TrophyOutlined,
  SwapOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { adminBetsAPI } from "../../services/api";

const formatBDT = (val) => {
  const num = Number(val) || 0;
  const isNegative = num < 0;
  const formatted = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? "-" : ""}৳ ${formatted}`;
};

const formatDate = (isoString) => {
  if (!isoString) return { date: "—", time: "" };
  try {
    const d = dayjs(isoString);
    if (!d.isValid()) return { date: "—", time: "" };
    return {
      date: d.format("D MMM YYYY"),
      time: d.format("h:mm a"),
    };
  } catch {
    return { date: "—", time: "" };
  }
};

const BetsHistory = () => {
  const [, startTransition] = useTransition();

  // Filter states
  const [range, setRange] = useState("all");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bets, setBets] = useState([]);
  const [summary, setSummary] = useState({
    totalBet: 0,
    totalWin: 0,
    totalPL: 0,
    records: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  // Copied indicator state
  const [copiedId, setCopiedId] = useState(null);

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setActiveSearch(searchInput.trim());
        setPage(1);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch data
  const fetchBets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
      };

      if (range) {
        params.range = range;
      }

      if (startDate) {
        params.startDate = startDate.format("YYYY-MM-DD");
      }

      if (endDate) {
        params.endDate = endDate.format("YYYY-MM-DD");
      }

      if (activeSearch) {
        params.search = activeSearch;
      }

      const res = await adminBetsAPI.getBets(params);
      if (res?.data?.success) {
        const payload = res.data.data;
        setSummary(
          payload.summary || {
            totalBet: 0,
            totalWin: 0,
            totalPL: 0,
            records: 0,
          },
        );
        setPagination(
          payload.pagination || {
            page: 1,
            limit: 25,
            total: 0,
            totalPages: 1,
          },
        );
        setBets(payload.bets || []);
      } else {
        throw new Error(
          res?.data?.message || "Failed to fetch betting records",
        );
      }
    } catch (err) {
      console.error("[BetsHistory] Error fetching bets:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load betting history";
      setError(errMsg);
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, range, startDate, endDate, activeSearch]);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  // Quick range button handler
  const handleRangeChange = (newRange) => {
    setRange(newRange);
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  // Custom date handlers
  const handleStartDateChange = (date) => {
    setStartDate(date);
    setRange("");
    setPage(1);
  };

  const handleEndDateChange = (date) => {
    setEndDate(date);
    setRange("");
    setPage(1);
  };

  // Reset all filters
  const handleReset = () => {
    setRange("all");
    setStartDate(null);
    setEndDate(null);
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
  };

  // Copy order ID helper
  const handleCopy = (orderId) => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopiedId(orderId);
    message.success("Order ID copied to clipboard");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Table columns definition
  const columns = [
    {
      title: "TIME",
      key: "time",
      width: 170,
      render: (_, record) => {
        const { date, time } = formatDate(record.time);
        return (
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-white text-[13px]">{date}</div>
            <div className="text-slate-400 font-medium text-[11px]">{time}</div>
          </div>
        );
      },
    },
    {
      title: "USER",
      key: "user",
      width: 200,
      render: (_, record) => {
        const user = record.user || {};
        const displayId = user.userId ? `#${user.userId}` : "—";
        const displayName =
          user.username || user.phone || user.fullName || "Unknown";
        return (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                {displayId}
              </span>
            </div>
            <div className="text-white font-bold text-[13px] truncate max-w-[170px]">
              {displayName}
            </div>
            {user.phone && user.username && (
              <div className="text-[11px] text-slate-400 font-mono">
                {user.phone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "GAME",
      key: "game",
      width: 190,
      render: (_, record) => {
        return (
          <div className="text-xs space-y-1">
            <div className="font-bold text-white text-[13px] truncate max-w-[170px]">
              {record.game || "Unknown Game"}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-300 font-medium">
                {record.provider || "Unknown"}
              </span>
              {record.category && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  {record.category}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "BET",
      key: "bet",
      width: 130,
      align: "right",
      render: (_, record) => (
        <span className="font-mono text-[13px] font-bold text-white">
          {formatBDT(record.bet)}
        </span>
      ),
    },
    {
      title: "WIN",
      key: "win",
      width: 130,
      align: "right",
      render: (_, record) => {
        const winAmount = record.win || 0;
        return (
          <span
            className={`font-mono text-[13px] font-bold ${
              winAmount > 0 ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            {formatBDT(winAmount)}
          </span>
        );
      },
    },
    {
      title: "P/L",
      key: "netResult",
      width: 140,
      align: "right",
      render: (_, record) => {
        const pl =
          record.netResult !== undefined
            ? record.netResult
            : (record.win || 0) - (record.bet || 0);
        const isPositive = pl > 0;
        const isNegative = pl < 0;

        return (
          <span
            className={`font-mono text-[13px] font-black ${
              isPositive
                ? "text-emerald-400"
                : isNegative
                  ? "text-rose-400"
                  : "text-slate-400"
            }`}
          >
            {isPositive ? `+${formatBDT(pl)}` : formatBDT(pl)}
          </span>
        );
      },
    },
    {
      title: "ORDER",
      key: "order",
      width: 170,
      render: (_, record) => {
        const orderId = record.order || record.id || "—";
        const shortOrder =
          orderId && orderId.length > 14
            ? `${orderId.substring(0, 12)}...`
            : orderId;

        const isCopied = copiedId === orderId;

        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Tooltip title={orderId} placement="topLeft">
              <span className="font-mono text-slate-200 select-all cursor-pointer bg-slate-800 px-2 py-1 rounded border border-slate-700 max-w-[130px] truncate inline-block text-[11px]">
                {shortOrder}
              </span>
            </Tooltip>
            <Tooltip title={isCopied ? "Copied!" : "Copy Order ID"}>
              <button
                type="button"
                onClick={() => handleCopy(orderId)}
                className="p-1.5 rounded text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors"
              >
                {isCopied ? (
                  <CheckOutlined className="text-emerald-400 text-xs" />
                ) : (
                  <CopyOutlined className="text-xs" />
                )}
              </button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorBgBase: "#0b1522",
          colorBgContainer: "#112233",
          colorBorder: "#1e3a52",
          colorText: "#f1f5f9",
          colorTextSecondary: "#94a3b8",
          colorPrimary: "#f59e0b",
        },
      }}
    >
      <div className="bets-history-wrapper bg-[#0b1522] -m-6 p-6 min-h-[calc(100vh-100px)] rounded-lg text-slate-100 space-y-6">
        {/* Scoped CSS to completely override default white antd tables/pickers */}
        <style>{`
          .bets-history-wrapper {
            background-color: #0b1522 !important;
            color: #f1f5f9 !important;
          }
          .bets-history-wrapper .ant-table {
            background: transparent !important;
            color: #f1f5f9 !important;
          }
          .bets-history-wrapper .ant-table-thead > tr > th {
            background: #0d1e2e !important;
            color: #94a3b8 !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            letter-spacing: 0.05em !important;
            border-bottom: 1px solid #1e3a52 !important;
          }
          .bets-history-wrapper .ant-table-tbody > tr > td {
            background: #112233 !important;
            border-bottom: 1px solid #182e42 !important;
            color: #f1f5f9 !important;
          }
          .bets-history-wrapper .ant-table-tbody > tr:hover > td {
            background: #172f45 !important;
          }
          .bets-history-wrapper .ant-picker {
            background: #0d1e2e !important;
            border-color: #1e3a52 !important;
            color: #ffffff !important;
          }
          .bets-history-wrapper .ant-picker-input > input {
            color: #ffffff !important;
          }
          .bets-history-wrapper .ant-picker-suffix {
            color: #94a3b8 !important;
          }
          .bets-history-wrapper .ant-input {
            background: #0d1e2e !important;
            border-color: #1e3a52 !important;
            color: #ffffff !important;
          }
          .bets-history-wrapper .ant-input-affix-wrapper {
            background: #0d1e2e !important;
            border-color: #1e3a52 !important;
            color: #ffffff !important;
          }
        `}</style>

        {/* Header & Breadcrumb */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold mb-1.5">
            <span className="text-slate-400">Home</span>
            <span className="text-slate-500">→</span>
            <span className="text-amber-400 font-bold">Bets</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Bets
          </h1>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#1e3a52] pb-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Bets history
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Live ledger · demo user excluded from totals
              </p>
            </div>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={() => fetchBets()}
              size="middle"
              className="bg-[#132638] border-[#1e3a52] text-slate-200 hover:text-amber-400 hover:border-amber-400 font-medium"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: BET */}
          <div className="bg-[#132638] rounded-xl p-5 border border-[#1e3a52] shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                BET
              </span>
              <span className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center text-base border border-blue-500/30">
                <DollarOutlined />
              </span>
            </div>
            <div className="text-3xl font-black text-white font-mono tracking-tight">
              {formatBDT(summary.totalBet)}
            </div>
            <div className="mt-2.5 text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 font-bold font-mono text-[11px] border border-slate-700">
                {summary.records.toLocaleString()}
              </span>
              <span>records</span>
            </div>
          </div>

          {/* Card 2: WIN */}
          <div className="bg-[#132638] rounded-xl p-5 border border-[#1e3a52] shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                WIN
              </span>
              <span className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-base border border-emerald-500/30">
                <TrophyOutlined />
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
              {formatBDT(summary.totalWin)}
            </div>
            <div className="mt-2.5 text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <span>Player wins</span>
            </div>
          </div>

          {/* Card 3: P/L (WIN - BET) */}
          <div className="bg-[#132638] rounded-xl p-5 border border-[#1e3a52] shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                P/L (WIN - BET)
              </span>
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-base border ${
                  summary.totalPL >= 0
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                }`}
              >
                <SwapOutlined />
              </span>
            </div>
            <div
              className={`text-3xl font-black font-mono tracking-tight ${
                summary.totalPL >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatBDT(summary.totalPL)}
            </div>
            <div className="mt-2.5 text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <span>
                {summary.totalPL < 0 ? "House profit" : "Player net positive"}
              </span>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-[#132638] rounded-xl p-4 border border-[#1e3a52] shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Quick Range Pills */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRangeChange("all")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  range === "all"
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                }`}
              >
                All time
              </button>
              <button
                type="button"
                onClick={() => handleRangeChange("today")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  range === "today"
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleRangeChange("yesterday")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  range === "yesterday"
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                }`}
              >
                Yesterday
              </button>
            </div>

            {/* Custom Date Inputs & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-300 font-medium mr-1 text-xs">
                  Start:
                </span>
                <DatePicker
                  value={startDate}
                  onChange={handleStartDateChange}
                  placeholder="Start date"
                  size="middle"
                  className="w-32 bg-[#0d1e2e] border-[#1e3a52] text-white"
                />
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-300 font-medium mr-1 text-xs">
                  End:
                </span>
                <DatePicker
                  value={endDate}
                  onChange={handleEndDateChange}
                  placeholder="End date"
                  size="middle"
                  className="w-32 bg-[#0d1e2e] border-[#1e3a52] text-white"
                />
              </div>

              {/* Search Input */}
              <Input
                prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                placeholder="User / order / game"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                allowClear
                size="middle"
                className="w-48 bg-[#0d1e2e] border-[#1e3a52] text-white"
              />

              {/* Reset Button */}
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                size="middle"
                className="bg-[#132638] border-[#1e3a52] text-slate-200 hover:text-amber-400 hover:border-amber-400 font-medium"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            message="Failed to load betting records"
            description={error}
            showIcon
            action={
              <Button size="small" danger onClick={() => fetchBets()}>
                Retry
              </Button>
            }
            className="rounded-xl border-rose-800/50 bg-rose-950/20 text-rose-200"
          />
        )}

        {/* Ledger Card & Table */}
        <div className="bg-[#132638] rounded-xl border border-[#1e3a52] shadow-md overflow-hidden">
          {/* Ledger Header */}
          <div className="px-5 py-4 border-b border-[#1e3a52] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Ledger
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                {pagination.total.toLocaleString()} records
              </span>
            </div>
            <div className="text-xs text-slate-300 font-mono font-medium">
              Page {pagination.page} of {pagination.totalPages || 1}
            </div>
          </div>

          {/* Table Body */}
          <div className="relative overflow-x-auto">
            {loading && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] z-10 flex items-center justify-center min-h-[300px]">
                <div className="text-center p-5 bg-slate-900 rounded-xl border border-slate-700 shadow-2xl">
                  <Spin size="large" />
                  <p className="mt-3 text-xs text-slate-300 font-semibold">
                    Loading ledger records...
                  </p>
                </div>
              </div>
            )}

            {bets.length === 0 && !loading ? (
              <div className="py-20 text-center text-slate-400">
                <InboxOutlined className="text-5xl text-slate-500 mb-3" />
                <p className="text-base font-bold text-slate-200">
                  No betting records found.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your date range or search filters.
                </p>
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={bets.map((b) => ({ ...b, key: b.id }))}
                pagination={false}
                size="middle"
                className="bets-ledger-table"
                rowClassName="hover:bg-slate-800/40 border-b border-slate-800/60"
              />
            )}
          </div>

          {/* Server-Side Pagination Footer */}
          <div className="px-5 py-3.5 border-t border-[#1e3a52] bg-[#0c1a27] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <div>
              Showing{" "}
              <span className="font-bold text-white font-mono">
                {pagination.total > 0
                  ? (pagination.page - 1) * pagination.limit + 1
                  : 0}
              </span>{" "}
              to{" "}
              <span className="font-bold text-white font-mono">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-white font-mono">
                {pagination.total.toLocaleString()}
              </span>{" "}
              records
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="middle"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="bg-slate-800 border-slate-700 text-slate-200 disabled:opacity-40 font-medium"
              >
                Previous
              </Button>
              <span className="font-mono text-white px-2.5 font-bold text-sm">
                {pagination.page} / {pagination.totalPages || 1}
              </span>
              <Button
                size="middle"
                disabled={
                  pagination.page >= (pagination.totalPages || 1) || loading
                }
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages || 1, p + 1))
                }
                className="bg-slate-800 border-slate-700 text-slate-200 disabled:opacity-40 font-medium"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default BetsHistory;
