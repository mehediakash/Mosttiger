import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Copy,
  Share2,
  Gift,
  Users,
  Trophy,
  Lock,
  Loader,
  Eye,
} from "lucide-react";
import { useSelector } from "react-redux";
import referralService from "../services/referralService";

const getPayload = (res) => res?.data?.data || res?.data || {};

const money = (value) => `BDT ${Number(value || 0).toLocaleString()}`;

const dateText = (value) =>
  value ? new Date(value).toLocaleDateString() : "N/A";

const normalizeStatus = (status) =>
  status
    ? String(status)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "N/A";

const statusClass = (status) => {
  if (["qualified", "completed"].includes(status))
    return "bg-green-900/50 text-green-300";
  if (["pending_claim", "waiting_deposit"].includes(status))
    return "bg-yellow-900/50 text-yellow-300";
  if (["claimed", "turnover_active", "waiting_turnover"].includes(status))
    return "bg-blue-900/50 text-blue-300";
  if (status === "cancelled") return "bg-red-900/50 text-red-300";
  return "bg-gray-900/50 text-gray-300";
};

const getUserName = (user) =>
  user?.username || user?.fullName || user?.name || "N/A";

const getReferredUserId = (value) =>
  typeof value === "string" ? value : value?._id || value?.id || "";

const getBonusForReferral = (referral, bonuses) => {
  if (referral?.bonus) return referral.bonus;
  const referredUserId = getReferredUserId(referral?.referredUser);
  return (
    bonuses.find(
      (bonus) => getReferredUserId(bonus?.referredUser) === referredUserId,
    ) || null
  );
};

const uniqueById = (items = []) =>
  Array.from(
    new Map(
      items
        .filter(Boolean)
        .map((item) => [
          item._id || item.id || `${item.referredUser}-${item.status}`,
          item,
        ]),
    ).values(),
  );

const getTurnoverPercent = (completed, required) => {
  const requiredValue = Number(required || 0);
  if (!requiredValue) return 0;
  return Math.min(
    100,
    Math.round((Number(completed || 0) / requiredValue) * 100),
  );
};

const ReferralBonusModal = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState("invite");
  const [dashboard, setDashboard] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [bonusStatus, setBonusStatus] = useState(null);
  const [turnovers, setTurnovers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);

  const referralCode = dashboard?.referralCode || user?.referenceCode || "";
  const publicSiteUrl =
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_SITE_URL ||
    window.location.origin;
  const referralUrl = referralCode
    ? `${String(publicSiteUrl).replace(/\/$/, "")}/register?ref=${encodeURIComponent(referralCode)}`
    : "";
  const encodedReferralUrl = encodeURIComponent(referralUrl);

  const loadReferralData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        dashboardRes,
        statisticsRes,
        referralRes,
        pendingRes,
        bonusStatusRes,
        turnoverRes,
        historyRes,
      ] = await Promise.all([
        referralService.getDashboard(),
        referralService.getStatistics(),
        referralService.getReferrals({ page: 1, limit: 50 }),
        referralService.getPendingBonuses({ page: 1, limit: 20 }),
        referralService.getBonusStatus(),
        referralService.getTurnover(),
        referralService.getBonusHistory({ page: 1, limit: 100 }),
      ]);

      const dashboardData = getPayload(dashboardRes);
      const bonusStatusData = getPayload(bonusStatusRes);
      const pendingData = getPayload(pendingRes);
      const latestBonuses = uniqueById([
        ...(Array.isArray(dashboardData.pendingBonuses)
          ? dashboardData.pendingBonuses
          : []),
        ...(Array.isArray(bonusStatusData.latestBonuses)
          ? bonusStatusData.latestBonuses
          : []),
        ...(Array.isArray(pendingData.bonuses) ? pendingData.bonuses : []),
      ]);

      setDashboard({ ...dashboardData, latestBonuses });
      setStatistics(getPayload(statisticsRes));
      setReferrals(getPayload(referralRes).referrals || []);
      setBonusStatus(bonusStatusData);
      setTurnovers(getPayload(turnoverRes).turnovers || []);
      setTransactions(getPayload(historyRes).transactions || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load referral data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadReferralData();

    const interval = window.setInterval(() => {
      referralService
        .getBonusStatus()
        .then((res) => setBonusStatus(getPayload(res)))
        .catch(() => {});
      referralService
        .getTurnover()
        .then((res) => setTurnovers(getPayload(res).turnovers || []))
        .catch(() => {});
    }, 30000);

    return () => window.clearInterval(interval);
  }, [open]);

  const bonuses = dashboard?.latestBonuses || [];
  const pendingBonuses = bonuses.filter(
    (bonus) => bonus.status === "pending_claim",
  );
  const pendingBonusTotal = pendingBonuses.reduce(
    (sum, bonus) => sum + Number(bonus.bonusAmount || 0),
    0,
  );
  const completedBonusTotal = bonuses
    .filter((bonus) => bonus.status === "completed")
    .reduce((sum, bonus) => sum + Number(bonus.bonusAmount || 0), 0);

  const todayKey = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  const dailyBonus = useMemo(() => {
    return transactions.reduce(
      (acc, item) => {
        const createdKey = item.createdAt
          ? new Date(item.createdAt).toDateString()
          : "";
        const amount = Number(item.amount || 0);
        if (createdKey === todayKey) acc.today += amount;
        if (createdKey === yesterdayKey) acc.yesterday += amount;
        return acc;
      },
      { today: 0, yesterday: 0 },
    );
  }, [transactions, todayKey, yesterdayKey]);

  if (!open) return null;

  const activeTurnover =
    bonusStatus?.activeTurnover ||
    turnovers.find(
      (turnover) => turnover.status === "active" || turnover.withdrawLocked,
    );
  const turnoverPercent = activeTurnover
    ? getTurnoverPercent(
        activeTurnover.turnoverCompleted,
        activeTurnover.turnoverRequired,
      )
    : 0;

  const dashboardStats = [
    {
      label: "Friends Invited",
      value:
        statistics?.totalInvited || dashboard?.statistics?.totalInvited || 0,
      icon: <Users size={20} />,
    },
    {
      label: "Friends Qualified",
      value: statistics?.qualified || dashboard?.statistics?.qualified || 0,
      icon: <Trophy size={20} />,
    },
    {
      label: "Today's Referral Bonus",
      value: money(dailyBonus.today),
      icon: <Gift size={20} />,
    },
    {
      label: "Yesterday's Referral Bonus",
      value: money(dailyBonus.yesterday),
      icon: <Gift size={20} />,
    },
    {
      label: "Pending Claim Bonus",
      value: money(pendingBonusTotal),
      icon: <Gift size={20} />,
    },
    {
      label: "Completed Bonus",
      value: money(completedBonusTotal),
      icon: <Trophy size={20} />,
    },
  ];

  const copyText = async (value, label) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setSuccessMsg(`${label} copied`);
  };

  const shareReferral = async () => {
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join mosttiger",
          text: "Register with my referral link.",
          url: referralUrl,
        });
        return;
      } catch {
        return;
      }
    }
    await copyText(referralUrl, "Referral link");
  };

  const claimReferralBonus = async (bonusId) => {
    if (!bonusId || claimingId) return;

    const confirmed = window.confirm(
      "Claiming this Referral Bonus will\n\nMove the bonus into your Main Wallet.\nActivate 1x Referral Turnover.\nTemporarily lock your Withdraw until the Referral Turnover is completed.\n\nDo you want to continue?",
    );
    if (!confirmed) return;

    setClaimingId(bonusId);
    setError(null);
    setSuccessMsg(null);
    try {
      await referralService.claimBonus(bonusId);
      setSuccessMsg("Referral Bonus Claimed. Referral Turnover Activated.");
      await loadReferralData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to claim referral bonus",
      );
    } finally {
      setClaimingId(null);
    }
  };

  const openReferralDetails = async (referral) => {
    setSelected(referral);
    setSelectedDetails(null);
    setDetailsLoading(true);
    try {
      const response = await referralService.getReferralDetails(referral._id);
      setSelectedDetails(getPayload(response));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load referral details",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const achievements = [
    {
      level: 4,
      progress: Number(statistics?.qualified || 0),
      reward: money(pendingBonusTotal),
      locked: false,
    },
    {
      level: 8,
      progress: Number(statistics?.qualified || 0),
      reward: money(completedBonusTotal),
      locked: Number(statistics?.qualified || 0) < 8,
    },
  ];

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-screen max-w-md flex-col overflow-hidden border border-[#ffb80022] bg-gradient-to-b from-[#050505] via-[#0d0d0d] to-[#1a1405] text-white shadow-2xl shadow-black/60">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-[#ffb80022] bg-[#0d0d0d]/95 px-4 py-4 backdrop-blur-md">
          <h2 className="text-2xl font-extrabold tracking-wide text-[#ffcc33] drop-shadow-[0_0_12px_rgba(255,184,0,0.35)]">
            Refer Bonus
          </h2>

          <button
            onClick={onClose}
            className="rounded-full border border-[#ffcc33]/20 bg-[#1a1a1a] p-2 text-[#ffcc33] transition-all duration-300 hover:rotate-90 hover:border-[#ffcc33]/40 hover:text-[#ffd95e]"
          >
            <X size={24} />
          </button>
        </div>

        {successMsg && (
          <div className="border-b border-green-700/50 bg-green-900/40 px-4 py-3 text-center text-sm text-green-300">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="border-b border-red-700/50 bg-red-900/40 px-4 py-3 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        {/* TABS */}

        <div className="relative flex border-b border-[#ffb8001f] bg-[#111111]">
          <button
            onClick={() => setActiveTab("invite")}
            className={`flex-1 py-4 text-lg font-bold transition-all duration-200 ${
              activeTab === "invite" ? "text-[#ffcc33]" : "text-whtie"
            }`}
          >
            Invite
          </button>

          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-4 text-lg font-bold transition-all duration-200 ${
              activeTab === "details" ? "text-[#ffcc33]" : "text-whtie"
            }`}
          >
            Details
          </button>

          <div
            className={`absolute bottom-0 h-[3px] w-1/2 bg-gradient-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40] shadow-[0_0_12px_rgba(255,184,0,0.5)] transition-all duration-300 ${
              activeTab === "invite" ? "left-0" : "left-1/2"
            }`}
          />
        </div>

        {/* CONTENT */}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <Loader className="animate-spin text-[#ffcc33]" size={32} />
              <p className="text-whtie">Loading referral bonus...</p>
            </div>
          ) : activeTab === "invite" ? (
            <div className="space-y-5">
              {/* BANNER */}

              <div className="overflow-hidden rounded-2xl border border-[#ffb80022] bg-gradient-to-r from-[#1a1200] to-[#2a1d00]">
                <div className="p-5">
                  <h3 className="text-xl font-extrabold text-[#ffcc33]">
                    Refer Your Friends & Earn
                  </h3>

                  <p className="mt-2 text-sm text-whtie">
                    Invite friends and earn referral bonuses when they qualify.
                  </p>
                </div>
              </div>

              {/* QR + LINK */}

              <div className="rounded-2xl border border-[#ffb80022] bg-[#111111] p-4 shadow-lg shadow-black/40">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* QR */}

                  <div className="flex flex-col items-center">
                    <p className="mb-3 text-sm font-bold text-[#ffcc33]">
                      Invitation QR Code
                    </p>

                    <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-[#ffcc33]/20 bg-white p-3">
                      {referralUrl ? (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodedReferralUrl}`}
                          alt="Referral QR Code"
                          className="h-full w-full rounded-xl"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-black text-white">
                          N/A
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CODE */}

                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-bold text-[#ffcc33]">
                      Invitation URL
                    </p>

                    <div className="mt-2 break-all rounded-xl border border-[#ffb80018] bg-[#1a1a1a] px-3 py-3 text-sm text-whtie">
                      {referralUrl || "Referral URL unavailable"}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyText(referralUrl, "Referral link")}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40] py-3 font-bold text-whtie shadow-lg shadow-[#ffb80033] transition-all duration-200 hover:scale-[1.02]"
                      >
                        <Copy size={18} />
                        Copy Link
                      </button>

                      <button
                        onClick={() => {
                          setShareOpen((value) => !value);
                          shareReferral();
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40] py-3 font-bold text-whtie shadow-lg shadow-[#ffb80033] transition-all duration-200 hover:scale-[1.02]"
                      >
                        <Share2 size={18} />
                        Share
                      </button>
                    </div>

                    {shareOpen && referralUrl && (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                        <a
                          className="rounded-lg bg-[#1a1a1a] px-2 py-2 text-[#ffcc33]"
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedReferralUrl}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Facebook
                        </a>
                        <a
                          className="rounded-lg bg-[#1a1a1a] px-2 py-2 text-[#ffcc33]"
                          href={`https://t.me/share/url?url=${encodedReferralUrl}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Telegram
                        </a>
                        <a
                          className="rounded-lg bg-[#1a1a1a] px-2 py-2 text-[#ffcc33]"
                          href={`https://wa.me/?text=${encodedReferralUrl}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      </div>
                    )}

                    <p className="mt-5 text-sm font-bold text-[#ffcc33]">
                      Invitation Code
                    </p>

                    <div className="mt-2 flex items-center justify-between rounded-xl border border-[#ffb80018] bg-[#1a1a1a] px-4 py-3">
                      <span className="font-extrabold tracking-widest text-white">
                        {referralCode || "N/A"}
                      </span>

                      <button
                        onClick={() => copyText(referralCode, "Referral code")}
                        className="text-[#ffcc33] transition hover:scale-110"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* DASHBOARD */}

              <div>
                <h3 className="mb-3 text-lg font-extrabold text-[#ffcc33]">
                  Dashboard
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {dashboardStats.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-[#ffb80018] bg-primary from-[#111111] to-[#1b1b1b] p-4 shadow-lg shadow-black/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-black">{item.icon}</div>

                        <span className="text-right text-xl font-black text-black">
                          {item.value}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-black">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* REBATE BONUS */}

              <div className="rounded-2xl border border-[#ffb80018] bg-[#111111] p-4">
                <h3 className="text-lg font-extrabold text-[#ffcc33]">
                  Referral Bonus
                </h3>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#1a1200] to-[#2a1d00] p-4">
                  <div>
                    <p className="text-sm text-whtie">Pending Claim Bonus</p>

                    <h2 className="mt-1 text-3xl font-black text-[#ffcc33]">
                      {money(pendingBonusTotal)}
                    </h2>
                  </div>

                  <button
                    onClick={() => claimReferralBonus(pendingBonuses[0]?._id)}
                    disabled={!pendingBonuses[0] || !!claimingId}
                    className={`rounded-xl px-5 py-3 font-bold ${
                      pendingBonuses[0] && !claimingId
                        ? "bg-gradient-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40] text-whtie"
                        : "bg-[#2a2a2a] text-[#777]"
                    }`}
                  >
                    {claimingId
                      ? "Claiming..."
                      : pendingBonuses[0]
                        ? "Claim"
                        : "No Claim"}
                  </button>
                </div>
              </div>

              {/* TURNOVER PROGRESS */}

              {activeTurnover && (
                <div className="rounded-2xl border border-[#ffb80018] bg-[#111111] p-4">
                  <h3 className="text-lg font-extrabold text-[#ffcc33]">
                    Referral Turnover Progress
                  </h3>

                  <div className="mt-4 space-y-3">
                    {[
                      [
                        "Referral Bonus Amount",
                        money(activeTurnover.bonusAmount),
                      ],
                      [
                        "Required Turnover",
                        money(activeTurnover.turnoverRequired),
                      ],
                      [
                        "Completed Turnover",
                        money(activeTurnover.turnoverCompleted),
                      ],
                      [
                        "Remaining Turnover",
                        money(activeTurnover.turnoverRemaining),
                      ],
                      ["Progress Percentage", `${turnoverPercent}%`],
                      [
                        "Withdraw Status",
                        bonusStatus?.withdrawLocked
                          ? "Withdraw Locked"
                          : "Withdraw Available",
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-xl border border-[#ffb80010] bg-[#1a1a1a] px-4 py-3"
                      >
                        <span className="text-whtie">{label}</span>

                        <span className="font-bold text-[#ffcc33]">
                          {value}
                        </span>
                      </div>
                    ))}

                    <div className="h-3 overflow-hidden rounded-full bg-[#2a2a2a]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40]"
                        style={{ width: `${turnoverPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* REQUIREMENT */}

              <div className="rounded-2xl border border-[#ffb80018] bg-[#111111] p-4">
                <h3 className="text-lg font-extrabold text-[#ffcc33]">
                  Requirement
                </h3>

                <div className="mt-4 space-y-3">
                  {[
                    ["Waiting Deposit", statistics?.waitingDeposit || 0],
                    ["Waiting Turnover", statistics?.waitingTurnover || 0],
                    ["Qualified", statistics?.qualified || 0],
                    ["Pending Claim", statistics?.pendingClaim || 0],
                    ["Cancelled", statistics?.cancelled || 0],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-xl border border-[#ffb80010] bg-[#1a1a1a] px-4 py-3"
                    >
                      <span className="text-whtie">{label}</span>

                      <span className="font-bold text-[#ffcc33]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACHIEVEMENTS */}

              <div className="rounded-2xl border border-[#ffb80018] bg-[#111111] p-4">
                <h3 className="text-lg font-extrabold text-[#ffcc33]">
                  Monthly Achievement Goals
                </h3>

                <div className="mt-4 space-y-4">
                  {achievements.map((item, index) => (
                    <div
                      key={index}
                      className="relative overflow-hidden rounded-2xl border border-[#ffb80010] bg-gradient-to-r from-[#141414] to-[#1d1d1d] p-4"
                    >
                      {item.locked && (
                        <div className="absolute right-4 top-4 text-[#ffcc33]/50">
                          <Lock size={18} />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white">
                            Agent Achievement {item.level}
                          </h4>

                          <p className="mt-1 text-sm text-[#bdbdbd]">
                            {item.progress} / {item.level}
                          </p>
                        </div>

                        <div className="text-xl font-black text-[#ffcc33]">
                          {item.reward}
                        </div>
                      </div>

                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#2a2a2a]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40]"
                          style={{
                            width: `${Math.min(100, (item.progress / item.level) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#ffb80018] bg-[#111111] p-4">
              <h3 className="text-lg font-extrabold text-[#ffcc33]">
                Referral Details
              </h3>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-[#1a1200] text-[#ffcc33]">
                    <tr>
                      <th className="px-3 py-3 text-left">Username</th>
                      <th className="px-3 py-3 text-left">Registration Date</th>
                      <th className="px-3 py-3 text-left">First Deposit</th>
                      <th className="px-3 py-3 text-left">Required Turnover</th>
                      <th className="px-3 py-3 text-left">Current Turnover</th>
                      <th className="px-3 py-3 text-left">Turnover Progress</th>
                      <th className="px-3 py-3 text-left">Bonus Amount</th>
                      <th className="px-3 py-3 text-left">Status</th>
                      <th className="px-3 py-3 text-left">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {referrals.length === 0 ? (
                      <tr className="border-t border-[#ffb80010] bg-[#161616]">
                        <td
                          className="px-3 py-8 text-center text-whtie"
                          colSpan={9}
                        >
                          No referral details found.
                        </td>
                      </tr>
                    ) : (
                      referrals.map((referral) => {
                        const bonus = getBonusForReferral(referral, bonuses);
                        const completed =
                          referral.turnoverCompleted ||
                          bonus?.turnoverCompleted ||
                          0;
                        const required =
                          referral.requiredTurnover ||
                          bonus?.requiredTurnover ||
                          0;
                        const progress = getTurnoverPercent(
                          completed,
                          required,
                        );
                        const status = bonus?.status || referral.status;

                        return (
                          <tr
                            key={referral._id}
                            className="border-t border-[#ffb80010] bg-[#161616]"
                          >
                            <td className="px-3 py-3 text-white">
                              {getUserName(referral.referredUser)}
                            </td>
                            <td className="px-3 py-3 text-whtie">
                              {dateText(
                                referral.registeredAt || referral.createdAt,
                              )}
                            </td>
                            <td className="px-3 py-3 text-whtie">
                              {money(referral.firstDeposit?.amount)}
                            </td>
                            <td className="px-3 py-3 text-whtie">
                              {money(required)}
                            </td>
                            <td className="px-3 py-3 text-whtie">
                              {money(completed)}
                            </td>
                            <td className="px-3 py-3">
                              <div className="min-w-28">
                                <div className="mb-1 text-xs font-bold text-[#ffcc33]">
                                  {progress}%
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-[#2a2a2a]">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40]"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-[#ffcc33]">
                              {money(bonus?.bonusAmount)}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`rounded px-2 py-1 text-xs font-bold uppercase ${statusClass(status)}`}
                              >
                                {normalizeStatus(status)}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <button
                                onClick={() => openReferralDetails(referral)}
                                className="rounded-lg bg-[#2a2a2a] p-2 text-[#ffcc33]"
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {selected && (
          <div className="absolute inset-0 z-10 bg-black/70">
            <div className="ml-auto flex h-full w-[92%] max-w-sm flex-col border-l border-[#ffb80022] bg-[#0d0d0d]">
              <div className="flex items-center justify-between border-b border-[#ffb80022] px-4 py-4">
                <h3 className="text-lg font-extrabold text-[#ffcc33]">
                  Player Details
                </h3>
                <button
                  onClick={() => {
                    setSelected(null);
                    setSelectedDetails(null);
                  }}
                  className="text-[#ffcc33]"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {detailsLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader className="animate-spin text-[#ffcc33]" size={28} />
                  </div>
                ) : (
                  (() => {
                    const relationship =
                      selectedDetails?.relationship || selected;
                    const bonus =
                      selectedDetails?.bonus ||
                      getBonusForReferral(selected, bonuses);
                    const required =
                      relationship.requiredTurnover ||
                      bonus?.requiredTurnover ||
                      0;
                    const completed =
                      relationship.turnoverCompleted ||
                      bonus?.turnoverCompleted ||
                      0;
                    const remaining = Math.max(
                      0,
                      Number(required || 0) - Number(completed || 0),
                    );

                    return (
                      <div className="space-y-3">
                        {[
                          ["Username", getUserName(relationship.referredUser)],
                          [
                            "Registration Date",
                            dateText(
                              relationship.registeredAt ||
                                relationship.createdAt,
                            ),
                          ],
                          [
                            "Deposit Amount",
                            money(
                              relationship.firstDeposit?.amount ||
                                bonus?.firstDepositAmount,
                            ),
                          ],
                          ["Required Turnover", money(required)],
                          ["Completed Turnover", money(completed)],
                          ["Remaining Turnover", money(remaining)],
                          ["Bonus Amount", money(bonus?.bonusAmount)],
                          [
                            "Current Status",
                            normalizeStatus(
                              bonus?.status || relationship.status,
                            ),
                          ],
                          ["Claim Date", dateText(bonus?.claimedAt)],
                          ["Completion Date", dateText(bonus?.completedAt)],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-xl border border-[#ffb80010] bg-[#1a1a1a] px-4 py-3"
                          >
                            <p className="text-xs text-[#999]">{label}</p>
                            <p className="mt-1 font-bold text-[#ffcc33]">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralBonusModal;
