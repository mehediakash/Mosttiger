import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile } from "../store/authSlice";
import { Link } from "react-router-dom";

import api from "../axios/axios";
import walletService from "../services/walletService";
import { formatMoney as formatWalletBalance } from "../../utils/currencyFormatter";
import { affiliateAPI } from "../services/affiliateService";

import { useLanguage } from "../../context/LanguageContext";
import { useTranslation } from "react-i18next";
import TransactionRecordsModal from "./TransactionRecordsModal";
import TransactionDetailsModal from "./TransactionDetailsModal";
import TurnoverModal from "./turnover/TurnoverModal";
import BettingRecordsModal from "./bettingrecord/BettingRecordsModal";
import BonusWalletModal from "./BonusWalletModal";
import FreeSpinModal from "./FreeSpinModal";
import ReferralBonusModal from "./ReferralBonusModal";
import PersonalInfoModal from "./PersonalInfoModal/PersonalInfoModal";
import ChangePasswordModal from "./ChangePasswordModal/ChangePasswordModal";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  LockKeyhole,
  Mail,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  Send,
  UserRound,
  UserRoundPlus,
  Wallet,
} from "lucide-react";

import {
  FaWallet,
  FaGift,
  FaHistory,
  FaUserCog,
  FaTelegramPlane,
  FaEnvelope,
  FaComments,
  FaCoins,
} from "react-icons/fa";

const MobileProfileIcon = ({ name }) => {
  const icons = {
    deposit: ArrowDownToLine,
    withdraw: ArrowUpFromLine,
    bonusWallet: Wallet,
    freeSpin: RefreshCw,
    bettingRecords: ClipboardList,
    turnover: RefreshCw,
    transactions: ReceiptText,
    personalInfo: UserRound,
    changePassword: LockKeyhole,
    referBonus: UserRoundPlus,
    liveChat: MessageCircle,
    email: Mail,
    telegram: Send,
    messenger: MessageCircle,
  };
  const Icon = icons[name] || MessageCircle;
  return <Icon size={18} strokeWidth={1.8} />;
};

import {
  MdOutlineAccountBalanceWallet,
  MdOutlineLock,
  MdOutlineSupportAgent,
} from "react-icons/md";

import { RiSecurePaymentLine, RiMoneyDollarCircleLine } from "react-icons/ri";

import { HiOutlineRefresh } from "react-icons/hi";

export default function Profile() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { t, i18n } = useTranslation();

  const [walletBalance, setWalletBalance] = useState(null);
  const [bonusBalance, setBonusBalance] = useState(null);
  const [affiliateStatus, setAffiliateStatus] = useState("");
  const [affiliateLoading, setAffiliateLoading] = useState(false);

  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [turnoverOpen, setTurnoverOpen] = useState(false);
  const [bettingRecordsOpen, setBettingRecordsOpen] = useState(false);

  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [freeSpinModalOpen, setFreeSpinModalOpen] = useState(false);

  const [openReferralModal, setOpenReferralModal] = useState(false);
  const [openPersonalInfoModal, setOpenPersonalInfoModal] = useState(false);

  const [openChangePasswordModal, setOpenChangePasswordModal] = useState(false);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const loadStats = async () => {
      try {
        const wb = await api.get("/api/wallet/balance");

        const wdata = wb.data || {};
        const payload = wdata.data ?? wdata;

        let balance = null;
        let bonus = null;

        if (payload) {
          if (typeof payload.main === "number") {
            balance = payload.main;
          } else if (typeof payload.balance === "number") {
            balance = payload.balance;
          } else if (payload.wallet && typeof payload.wallet === "object") {
            balance =
              payload.wallet.main ??
              payload.wallet.balance ??
              Object.values(payload.wallet).find(
                (v) => typeof v === "number",
              ) ??
              null;
          } else if (typeof payload === "number") {
            balance = payload;
          }

          if (payload.bonus !== undefined) {
            bonus = payload.bonus;
          } else if (payload.wallet?.bonus !== undefined) {
            bonus = payload.wallet.bonus;
          }
        }

        if (mounted) setWalletBalance(balance);
        if (mounted) setBonusBalance(bonus);
      } catch (e) {
        console.error("Failed to load profile stats", e);
      }
    };

    loadStats();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    setAffiliateLoading(true);

    affiliateAPI
      .getStatus()
      .then((res) => {
        if (!mounted) return;
        const payload = res.data?.data || res.data || {};
        setAffiliateStatus(
          payload?.access?.status || payload?.affiliate?.status || "",
        );
      })
      .catch(() => {
        if (mounted) setAffiliateStatus("");
      })
      .finally(() => {
        if (mounted) setAffiliateLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const formatMoney = (v) =>
    v === null || v === undefined
      ? "--"
      : Math.floor(Number(v)).toLocaleString(
          i18n.language === "bn" ? "bn-BD" : "en-US",
        );

  const refreshWalletBalances = async () => {
    try {
      const wb = await api.get("/api/wallet/balance");
      const wdata = wb.data || {};
      const payload = wdata.data ?? wdata;

      let balance = null;
      let bonus = null;

      if (payload) {
        if (typeof payload.main === "number") {
          balance = payload.main;
        } else if (typeof payload.balance === "number") {
          balance = payload.balance;
        } else if (payload.wallet && typeof payload.wallet === "object") {
          balance =
            payload.wallet.main ??
            payload.wallet.balance ??
            Object.values(payload.wallet).find((v) => typeof v === "number") ??
            null;
        } else if (typeof payload === "number") {
          balance = payload;
        }

        if (payload.bonus !== undefined) {
          bonus = payload.bonus;
        } else if (payload.wallet?.bonus !== undefined) {
          bonus = payload.wallet.bonus;
        }
      }

      setWalletBalance(balance);
      setBonusBalance(bonus);
    } catch (err) {
      console.error("Failed to refresh wallet balances", err);
    }
  };

  useEffect(() => {
    const handleRefresh = () => {
      refreshWalletBalances();
    };
    window.addEventListener("refreshWalletBalance", handleRefresh);
    window.addEventListener("gameSessionsClosed", handleRefresh);
    return () => {
      window.removeEventListener("refreshWalletBalance", handleRefresh);
      window.removeEventListener("gameSessionsClosed", handleRefresh);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050505] mb-18 via-[#0d0d0d] to-[#1a1405] px-3 py-4 text-white">
      {/* HEADER */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#ffb80022] bg-gradient-to-r from-[#111111] to-[#1a1a1a] p-5 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-4">
          {/* AVATAR */}

          <div className="h-[78px] w-[78px] overflow-hidden rounded-full border-2 border-primary bg-primary shadow-lg shadow-[#ffb80033]">
            <img
              src={`https://ui-avatars.com/api/?name=${
                user?.fullName || user?.name || "User"
              }&background=FFB80C&color=000&bold=true`}
              alt="user"
              className="h-full w-full object-cover"
            />
          </div>

          {/* USER INFO */}

          <div className="flex-1">
            <h2 className="text-[30px] font-black tracking-wide text-white">
              {user?.fullName || user?.name || "User"}
            </h2>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#ffcc33]/20 bg-[#1a1a1a] px-4 py-1">
              <span className="text-sm text-[#d0d0d0]">{t("playerId")}</span>

              <span className="font-bold text-white">
                {user?._id?.slice(-6) || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WALLET */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#ffb80022] bg-[#111111] shadow-xl shadow-black/30">
        <div className="grid grid-cols-2 divide-x divide-[#ffb80014]">
          {/* MAIN WALLET */}

          <div className="p-5">
            <div className="flex items-center gap-2 text-white">
              <FaWallet size={20} />

              <span className="">{t("mainWallet")}</span>

              <button
                onClick={refreshWalletBalances}
                className="transition-all duration-300 hover:rotate-180"
              >
                <HiOutlineRefresh />
              </button>
            </div>

            <div className="mt-4 text-[22px] font-black text-white">
              ৳ {formatWalletBalance(walletBalance)}
            </div>
          </div>

          {/* BONUS WALLET */}

          <div className="p-5">
            <div className="flex items-center gap-2 text-white">
              <MdOutlineAccountBalanceWallet size={20} />

              <span className="">{t("bonusWallet")}</span>

              <button
                onClick={refreshWalletBalances}
                className="transition-all duration-300 hover:rotate-180"
              >
                <HiOutlineRefresh />
              </button>
            </div>

            <div className="mt-4 text-[22px] font-black text-white">
              ৳ {formatMoney(bonusBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION TITLE COMPONENT */}

      {[
        {
          title: "Funds",
        },
      ].map(() => null)}

      {/* FUNDS */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#ffb80022] bg-[#111111] shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-[#ffb80014] px-4 py-4">
          <div className="h-6 w-[5px] rounded-full primary" />

          <h3 className="text-xl font-black text-white">{t("funds")}</h3>
        </div>

        <div className="grid grid-cols-4">
          {/* DEPOSIT */}

          <Link
            to="/deposit"
            className="group flex flex-col items-center gap-3 py-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-[60px] sm:w-[60px] sm:text-[28px]">
              <span className="sm:hidden">
                <MobileProfileIcon name="deposit" />
              </span>
              <span className="hidden sm:block">
                <RiMoneyDollarCircleLine />
              </span>
            </div>

            <span className="text-sm font-medium text-white">
              {t("deposit")}
            </span>
          </Link>

          {/* WITHDRAW */}

          <Link
            to="/withdraw"
            className="group flex flex-col items-center gap-3 py-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-[60px] sm:w-[60px] sm:text-[28px]">
              <span className="sm:hidden">
                <MobileProfileIcon name="withdraw" />
              </span>
              <span className="hidden sm:block">
                <RiSecurePaymentLine />
              </span>
            </div>

            <span className="text-sm font-medium text-white">
              {t("withdraw")}
            </span>
          </Link>

          {/* BONUS WALLET */}

          <div
            onClick={() => setBonusModalOpen(true)}
            className="group text-center flex cursor-pointer flex-col items-center gap-3 py-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-[60px] sm:w-[60px] sm:text-[28px]">
              <span className="sm:hidden">
                <MobileProfileIcon name="bonusWallet" />
              </span>
              <span className="hidden sm:block">
                <FaWallet />
              </span>
            </div>

            <span className="text-sm font-medium text-white">
              {t("bonusWallet")}
            </span>
          </div>

          {/* FREE SPIN */}

          <div
            onClick={() => setFreeSpinModalOpen(true)}
            className="group flex cursor-pointer flex-col items-center gap-3 py-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-[60px] sm:w-[60px] sm:text-[28px]">
              <span className="sm:hidden">
                <MobileProfileIcon name="freeSpin" />
              </span>
              <span className="hidden sm:block">
                <FaGift />
              </span>
            </div>

            <span className="text-sm font-medium text-white">
              {t("freeSpin")}
            </span>
          </div>
        </div>
      </div>

      {/* HISTORY */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#ffb80022] bg-[#111111] shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-[#ffb80014] px-4 py-4">
          <div className="h-6 w-[5px] rounded-full primary" />

          <h3 className="text-xl font-black text-white">History</h3>
        </div>

        <div className="grid grid-cols-3">
          {/* BETTING */}

          <div
            onClick={() => setBettingRecordsOpen(true)}
            className="group flex cursor-pointer flex-col items-center gap-3 py-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-[60px] sm:w-[60px] sm:text-[28px]">
              <span className="sm:hidden">
                <MobileProfileIcon name="bettingRecords" />
              </span>
              <span className="hidden sm:block">
                <FaHistory />
              </span>
            </div>

            <span className="text-center text-sm font-medium text-white">
              {t("bettingRecords")}
            </span>
          </div>

          {/* TURNOVER */}

          <div
            onClick={() => setTurnoverOpen(true)}
            className="group flex cursor-pointer flex-col items-center gap-3 py-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-[60px] sm:w-[60px] sm:text-[28px]">
              <span className="sm:hidden">
                <MobileProfileIcon name="turnover" />
              </span>
              <span className="hidden sm:block">
                <FaCoins />
              </span>
            </div>

            <span className="text-sm font-medium text-white">
              {t("turnover")}
            </span>
          </div>

          {/* TRANSACTION */}

          <div
            onClick={async () => {
              setRecordsModalOpen(true);
              setRecordsLoading(true);
              setRecordsError("");
              try {
                const res = await walletService.getWalletTransactions({
                  page: 1,
                  limit: 200,
                });

                const body = res?.data ?? {};

                let txs = [];

                if (Array.isArray(body.data?.transactions))
                  txs = body.data.transactions;
                else if (Array.isArray(body.data)) txs = body.data;
                else if (Array.isArray(body.transactions))
                  txs = body.transactions;
                else if (Array.isArray(body.data?.data)) txs = body.data.data;

                const normalized = txs.map((t) => ({
                  _id: t._id || t.id,
                  referenceId: t.referenceId || t.ref || t.reference,

                  type: t.type || t.category || "unknown",

                  provider: t.provider || t.paymentMethod,
                  paymentProvider: t.paymentProvider || t.paymentMethod,
                  gatewayReference:
                    t.gatewayReference ||
                    t.gateway_reference ||
                    t.payment24x7Reference ||
                    t.payment24x7_reference ||
                    null,
                  gatewayStatus:
                    t.gatewayStatus ||
                    t.gateway_status ||
                    t.paymentStatus ||
                    null,

                  amount: t.amount ?? t.total ?? 0,

                  status: t.status || t.state || "pending",

                  createdAt: t.createdAt || t.created_at || t.date,

                  timeline: t.timeline || t.progress || [],
                }));

                setRecords(normalized);
              } catch (e) {
                console.error("Failed to load transactions", e);
                setRecords([]);
                setRecordsError("Failed to load transactions");
              } finally {
                setRecordsLoading(false);
              }
            }}
            className="group flex flex-col items-center gap-3 py-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-[60px] sm:w-[60px] sm:text-[28px]">
              <span className="sm:hidden">
                <MobileProfileIcon name="transactions" />
              </span>
              <span className="hidden sm:block">
                <MdOutlineAccountBalanceWallet />
              </span>
            </div>

            <button className="text-center text-sm font-medium text-white">
              {t("transactions")}
              <br />
              {t("records")}
            </button>
          </div>
        </div>
      </div>

      {/* PROFILE */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#ffb80022] bg-[#111111] shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-[#ffb80014] px-4 py-4">
          <div className="h-6 w-[5px] rounded-full primary" />

          <h3 className="text-xl font-black text-white">{t("myAccount")}</h3>
        </div>

        <div className="grid grid-cols-3">
          {/* PERSONAL INFO */}

          <div
            className="group flex cursor-pointer flex-col items-center gap-3 py-5"
            role="button"
            tabIndex={0}
            onClick={() => setOpenPersonalInfoModal(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setOpenPersonalInfoModal(true);
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-[60px] sm:w-[60px] sm:text-[28px]">
              <span className="sm:hidden">
                <MobileProfileIcon name="personalInfo" />
              </span>
              <span className="hidden sm:block">
                <FaUserCog />
              </span>
            </div>

            <span className="text-sm font-medium text-white">
              {t("personalInfo")}
            </span>
          </div>

          {/* CHANGE PASSWORD */}

          <div
            className="group flex cursor-pointer flex-col items-center gap-3 py-5"
            role="button"
            tabIndex={0}
            onClick={() => setOpenChangePasswordModal(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setOpenChangePasswordModal(true);
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-[60px] sm:w-[60px] sm:text-[28px]">
              <span className="sm:hidden">
                <MobileProfileIcon name="changePassword" />
              </span>
              <span className="hidden sm:block">
                <MdOutlineLock />
              </span>
            </div>

            <span className="text-sm font-medium text-white">
              {t("changePassword")}
            </span>
          </div>

          {/* REFERRAL */}

          <div
            className="group flex cursor-pointer flex-col items-center gap-3 py-5"
            role="button"
            tabIndex={0}
            onClick={() => setOpenReferralModal(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setOpenReferralModal(true);
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-[60px] sm:w-[60px] sm:text-[28px]">
              <span className="sm:hidden">
                <MobileProfileIcon name="referBonus" />
              </span>
              <span className="hidden sm:block">
                <FaComments />
              </span>
            </div>

            <span className="text-sm font-medium text-white">
              {t("referBonus")}
            </span>
          </div>
        </div>
      </div>

      {/* CONTACT */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#ffb80022] bg-[#111111] shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-[#ffb80014] px-4 py-4">
          <div className="h-6 w-[5px] rounded-full primary" />

          <h3 className="text-xl font-black text-white">{t("contactUs")}</h3>
        </div>

        <div className="grid grid-cols-4">
          {[
            {
              icon: <MdOutlineSupportAgent />,
              iconName: "liveChat",
              label: t("liveChat"),
              onClick: () => window.dispatchEvent(new Event("open-live-chat")),
            },
            {
              icon: <FaEnvelope />,
              iconName: "email",
              label: t("email"),
            },
            {
              icon: <FaTelegramPlane />,
              iconName: "telegram",
              label: t("telegram"),
            },
            {
              icon: <FaComments />,
              iconName: "messenger",
              label: t("messenger"),
            },
          ].map((item, index) => (
            <div
              key={index}
              className="group flex cursor-pointer flex-col items-center gap-3 py-5"
              onClick={item.onClick}
              onKeyDown={(e) => {
                if (item.onClick && (e.key === "Enter" || e.key === " ")) {
                  item.onClick();
                }
              }}
            >
              <div
                className={`flex items-center justify-center rounded-full border transition-all duration-300 group-hover:scale-110 ${
                  item.label === t("messenger")
                    ? "h-10 w-10 border-green-500/20 bg-green-600 text-base text-white sm:h-[64px] sm:w-[64px] sm:text-[30px]"
                    : "h-10 w-10 border-[#ffcc33]/20 bg-primary from-[#1a1200] to-[#2a1d00] text-base text-white sm:h-[60px] sm:w-[60px] sm:text-[28px]"
                }`}
              >
                <span className="sm:hidden">
                  <MobileProfileIcon name={item.iconName} />
                </span>
                <span className="hidden sm:block">{item.icon}</span>
              </div>

              <span className="text-center text-sm font-medium text-white">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AFFILIATE */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#ffb80022] bg-[#111111] shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-[#ffb80014] px-4 py-4">
          <div className="h-6 w-[5px] rounded-full primary" />

          <h3 className="text-xl font-black text-white">Affiliate</h3>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-white/60">Affiliate Status</p>
            <p className="mt-1 text-lg font-black capitalize text-white">
              {affiliateLoading
                ? "Checking..."
                : affiliateStatus || "Not Applied"}
            </p>
          </div>

          {affiliateStatus === "approved" ? (
            <Link
              to="/affiliate/dashboard"
              className="rounded-xl bg-primary px-5 py-3 text-center text-sm font-black text-black transition hover:opacity-90"
            >
              Affiliate Dashboard
            </Link>
          ) : !affiliateStatus ? (
            <Link
              to="/affiliate/signup"
              className="rounded-xl bg-primary px-5 py-3 text-center text-sm font-black text-black transition hover:opacity-90"
            >
              Become Affiliate
            </Link>
          ) : null}
        </div>
      </div>
      {/* MODALS */}

      <BettingRecordsModal
        open={bettingRecordsOpen}
        onClose={() => setBettingRecordsOpen(false)}
      />

      <TransactionRecordsModal
        isOpen={recordsModalOpen}
        onClose={() => setRecordsModalOpen(false)}
        records={records}
        loading={recordsLoading}
        error={recordsError}
        onSelect={(item) => {
          setSelectedTransaction(item);
          setDetailsOpen(true);
        }}
      />

      <TransactionDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        transaction={selectedTransaction}
      />

      <TurnoverModal
        open={turnoverOpen}
        onClose={() => setTurnoverOpen(false)}
      />

      <BonusWalletModal
        open={bonusModalOpen}
        onClose={() => setBonusModalOpen(false)}
        onClaimRefresh={refreshWalletBalances}
      />

      <FreeSpinModal
        open={freeSpinModalOpen}
        onClose={() => setFreeSpinModalOpen(false)}
        onClaimRefresh={refreshWalletBalances}
      />

      <ReferralBonusModal
        open={openReferralModal}
        onClose={() => setOpenReferralModal(false)}
      />

      <PersonalInfoModal
        open={openPersonalInfoModal}
        onClose={() => setOpenPersonalInfoModal(false)}
      />

      <ChangePasswordModal
        open={openChangePasswordModal}
        onClose={() => setOpenChangePasswordModal(false)}
      />
    </div>
  );
}
