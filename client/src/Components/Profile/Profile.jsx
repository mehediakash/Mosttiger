import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile } from "../store/authSlice";
import { Link } from "react-router-dom";

import api from "../axios/axios";
import walletService from "../services/walletService";
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
  FaWallet,
  FaGift,
  FaHistory,
  FaUserCog,
  FaTelegramPlane,
  FaEnvelope,
  FaComments,
  FaCoins,
} from "react-icons/fa";

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
    <div className="min-h-screen bg-[#050912] mb-18 px-3 py-4 text-[#F5FAFF]">
      {/* HEADER */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#16314D] bg-[#0B1220] p-5 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-4">
          {/* AVATAR */}

          <div className="h-[78px] w-[78px] overflow-hidden rounded-full border-2 border-primary bg-primary shadow-lg shadow-[rgba(0,229,255,0.35)]">
            <img
              src={`https://ui-avatars.com/api/?name=${
                user?.fullName || user?.name || "User"
              }&background=18C8FF&color=050912&bold=true`}
              alt="user"
              className="h-full w-full object-cover"
            />
          </div>

          {/* USER INFO */}

          <div className="flex-1">
            <h2 className="text-[30px] font-black tracking-wide text-[#F5FAFF]">
              {user?.fullName || user?.name || "User"}
            </h2>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#16314D] bg-[#050912] px-4 py-1">
              <span className="text-sm text-[#8FA6BC]">{t("playerId")}</span>

              <span className="font-bold text-[#F5FAFF]">
                {user?._id?.slice(-6) || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WALLET */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#16314D] bg-[#0B1220] shadow-xl shadow-black/30">
        <div className="grid grid-cols-2 divide-x divide-[#16314D]">
          {/* MAIN WALLET */}

          <div className="p-5">
            <div className="flex items-center gap-2 text-[#8FA6BC]">
              <FaWallet size={20} className="text-primary" />

              <span className="text-[#F5FAFF] font-semibold">
                {t("mainWallet")}
              </span>

              <button
                onClick={refreshWalletBalances}
                className="transition-all duration-300 hover:rotate-180 hover:text-primary"
              >
                <HiOutlineRefresh />
              </button>
            </div>

            <div className="mt-4 text-[22px] font-black text-[#F5FAFF]">
              ৳ {formatMoney(walletBalance)}
            </div>
          </div>

          {/* BONUS WALLET */}

          <div className="p-5">
            <div className="flex items-center gap-2 text-[#8FA6BC]">
              <MdOutlineAccountBalanceWallet
                size={20}
                className="text-primary"
              />

              <span className="text-[#F5FAFF] font-semibold">
                {t("bonusWallet")}
              </span>

              <button
                onClick={refreshWalletBalances}
                className="transition-all duration-300 hover:rotate-180 hover:text-primary"
              >
                <HiOutlineRefresh />
              </button>
            </div>

            <div className="mt-4 text-[22px] font-black text-[#F5FAFF]">
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

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#16314D] bg-[#0B1220] shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-[#16314D] px-4 py-4">
          <div className="h-6 w-[5px] rounded-full bg-primary shadow-[0_0_8px_#00E5FF]" />

          <h3 className="text-xl font-black text-[#F5FAFF]">{t("funds")}</h3>
        </div>

        <div className="grid grid-cols-4">
          {/* DEPOSIT */}

          <Link
            to="/deposit"
            className="group flex flex-col items-center gap-3 py-5"
          >
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <RiMoneyDollarCircleLine />
            </div>

            <span className="text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
              {t("deposit")}
            </span>
          </Link>

          {/* WITHDRAW */}

          <Link
            to="/withdraw"
            className="group flex flex-col items-center gap-3 py-5"
          >
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <RiSecurePaymentLine />
            </div>

            <span className="text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
              {t("withdraw")}
            </span>
          </Link>

          {/* BONUS WALLET */}

          <div
            onClick={() => setBonusModalOpen(true)}
            className="group text-center flex cursor-pointer flex-col items-center gap-3 py-5"
          >
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <FaWallet />
            </div>

            <span className="text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
              {t("bonusWallet")}
            </span>
          </div>

          {/* FREE SPIN */}

          <div
            onClick={() => setFreeSpinModalOpen(true)}
            className="group flex cursor-pointer flex-col items-center gap-3 py-5"
          >
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <FaGift />
            </div>

            <span className="text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
              {t("freeSpin")}
            </span>
          </div>
        </div>
      </div>

      {/* HISTORY */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#16314D] bg-[#0B1220] shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-[#16314D] px-4 py-4">
          <div className="h-6 w-[5px] rounded-full bg-primary shadow-[0_0_8px_#00E5FF]" />

          <h3 className="text-xl font-black text-[#F5FAFF]">History</h3>
        </div>

        <div className="grid grid-cols-3">
          {/* BETTING */}

          <div
            onClick={() => setBettingRecordsOpen(true)}
            className="group flex cursor-pointer flex-col items-center gap-3 py-5"
          >
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <FaHistory />
            </div>

            <span className="text-center text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
              {t("bettingRecords")}
            </span>
          </div>

          {/* TURNOVER */}

          <div
            onClick={() => setTurnoverOpen(true)}
            className="group flex cursor-pointer flex-col items-center gap-3 py-5"
          >
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <FaCoins />
            </div>

            <span className="text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
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
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <MdOutlineAccountBalanceWallet />
            </div>

            <button className="text-center text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
              {t("transactions")}
              <br />
              {t("records")}
            </button>
          </div>
        </div>
      </div>

      {/* PROFILE */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#16314D] bg-[#0B1220] shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-[#16314D] px-4 py-4">
          <div className="h-6 w-[5px] rounded-full bg-primary shadow-[0_0_8px_#00E5FF]" />

          <h3 className="text-xl font-black text-[#F5FAFF]">
            {t("myAccount")}
          </h3>
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
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <FaUserCog />
            </div>

            <span className="text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
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
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <MdOutlineLock />
            </div>

            <span className="text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
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
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <FaComments />
            </div>

            <span className="text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
              {t("referBonus")}
            </span>
          </div>
        </div>
      </div>

      {/* CONTACT */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#16314D] bg-[#0B1220] shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-[#16314D] px-4 py-4">
          <div className="h-6 w-[5px] rounded-full bg-primary shadow-[0_0_8px_#00E5FF]" />

          <h3 className="text-xl font-black text-[#F5FAFF]">
            {t("contactUs")}
          </h3>
        </div>

        <div className="grid grid-cols-4">
          {[
            {
              icon: <MdOutlineSupportAgent />,
              label: t("liveChat"),
            },
            {
              icon: <FaEnvelope />,
              label: t("email"),
            },
            {
              icon: <FaTelegramPlane />,
              label: t("telegram"),
            },
            {
              icon: <FaComments />,
              label: t("messenger"),
            },
          ].map((item, index) => (
            <div
              key={index}
              className="group flex cursor-pointer flex-col items-center gap-3 py-5"
            >
              <div
                className={`flex items-center justify-center rounded-full border transition-all duration-300 group-hover:scale-110 ${
                  item.label === t("messenger")
                    ? "h-[64px] w-[64px] border-green-500/20 bg-green-600 text-[30px] text-white"
                    : "h-[60px] w-[60px] border-[#16314D] bg-[#050912] text-[28px] text-primary shadow-lg shadow-black/30 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                }`}
              >
                {item.icon}
              </div>

              <span className="text-center text-sm font-medium text-[#F5FAFF] group-hover:text-primary transition-colors">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AFFILIATE */}

      <div className="mb-5 overflow-hidden rounded-3xl border border-[#16314D] bg-[#0B1220] shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-[#16314D] px-4 py-4">
          <div className="h-6 w-[5px] rounded-full bg-primary shadow-[0_0_8px_#00E5FF]" />

          <h3 className="text-xl font-black text-[#F5FAFF]">Affiliate</h3>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#8FA6BC]">Affiliate Status</p>
            <p className="mt-1 text-lg font-black capitalize text-[#F5FAFF]">
              {affiliateLoading
                ? "Checking..."
                : affiliateStatus || "Not Applied"}
            </p>
          </div>

          {affiliateStatus === "approved" ? (
            <Link
              to="/affiliate/dashboard"
              className="rounded-xl bg-primary hover:bg-[#48DDFF] px-5 py-3 text-center text-sm font-black text-[#050912] shadow-[0_0_15px_rgba(0,229,255,0.3)] transition"
            >
              Affiliate Dashboard
            </Link>
          ) : !affiliateStatus ? (
            <Link
              to="/affiliate/signup"
              className="rounded-xl bg-primary hover:bg-[#48DDFF] px-5 py-3 text-center text-sm font-black text-[#050912] shadow-[0_0_15px_rgba(0,229,255,0.3)] transition"
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
