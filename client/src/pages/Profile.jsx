import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, logout } from "../store/authSlice";
import Button from "../ui/Button";
import api from "../axios/axios";
import { getBetHistory } from "../services/sportsService";
import walletService from "../services/walletService";
import { TbCoinTaka } from "react-icons/tb";
import { useLanguage } from "../../context/LanguageContext";

export default function Profile() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { t } = useLanguage();
  const [walletBalance, setWalletBalance] = useState(null);
  const [bonusBalance, setBonusBalance] = useState(null);
  const [totalBets, setTotalBets] = useState(0);
  const [totalWinning, setTotalWinning] = useState(0);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const loadStats = async () => {
      try {
        // Wallet balance
        const wb = await api.get("/api/wallet/balance");
        const wdata = wb.data || {};
        const payload = wdata.data ?? wdata;
        let balance = null;
        let bonus = null;
        if (payload) {
          if (typeof payload.main === "number") balance = payload.main;
          else if (typeof payload.balance === "number")
            balance = payload.balance;
          else if (payload.wallet && typeof payload.wallet === "object") {
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

          // Extract bonus wallet
          if (payload.bonus !== undefined) {
            bonus = payload.bonus;
          } else if (payload.wallet?.bonus !== undefined) {
            bonus = payload.wallet.bonus;
          }
        }
        if (mounted) setWalletBalance(balance);
        if (mounted) setBonusBalance(bonus);

        // Bets history
        const res = await getBetHistory({ page: 1, limit: 100 });
        const bets = (res.data && res.data.bets) || [];
        if (mounted) setTotalBets(bets.length);

        const win = bets.reduce((acc, b) => {
          const val =
            b.payout ||
            b.winnings ||
            b.winAmount ||
            b.wonAmount ||
            b.payoutAmount ||
            0;
          return acc + (typeof val === "number" ? val : parseFloat(val) || 0);
        }, 0);
        if (mounted) setTotalWinning(win);
      } catch (e) {
        console.error("Failed to load profile stats", e);
      }
    };

    loadStats();

    const handleRefresh = () => {
      loadStats();
    };
    window.addEventListener("refreshWalletBalance", handleRefresh);
    window.addEventListener("gameSessionsClosed", handleRefresh);

    return () => {
      mounted = false;
      window.removeEventListener("refreshWalletBalance", handleRefresh);
      window.removeEventListener("gameSessionsClosed", handleRefresh);
    };
  }, [user]);

  const formatMoney = (v) =>
    v === null || v === undefined
      ? "--"
      : Number(v).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  return (
    <div className="min-h-screen ">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary from-indigo-500 via-purple-500 to-pink-500 p-1">
                  <div className="w-full h-full rounded-full bg-[#205583] flex items-center justify-center text-black text-4xl md:text-5xl font-bold">
                    {user?.fullName?.[0]?.toUpperCase() ||
                      user?.name?.[0]?.toUpperCase() ||
                      "U"}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full border-4 border-[#205583]"></div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
                  {user?.fullName || user?.name || "User"}
                </h1>
                <p className="text-lg text-black/80">
                  {user?.email || "user@example.com"}
                </p>
                <p className="text-sm text-black/60 mt-2">
                  Member since{" "}
                  {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>

              {/* Logout */}
              <div className="md:ml-auto">
                <Button
                  onClick={() => dispatch(logout())}
                  className="bg-red-600 hover:bg-red-700 text-black font-medium px-8 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  {t("logout")}
                </Button>
              </div>
            </div>

            {console.log(walletBalance)}
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
              {[
                {
                  label: t("wallet_balance"),
                  value: formatMoney(walletBalance),
                  icon: "Wallet",
                },
                {
                  label: t("bonus"),
                  value: formatMoney(bonusBalance),
                  icon: "Bet",
                },
                {
                  label: t("total_winning"),
                  value: formatMoney(totalWinning),
                  icon: "Trophy",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="backdrop-blur-md bg-white/10 rounded-2xl p-6 border border-black hover:bg-white/15 transition-all"
                >
                  <div className="text-black/70 text-sm font-medium">
                    {stat.label}
                  </div>
                  <div className="text-3xl font-bold flex gap-x-2 items-center text-black mt-2">
                    <TbCoinTaka />
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wallet & Payments Panel */}
        <div className="mt-10">
          <WalletPanel />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Modern Wallet Panel
// ──────────────────────────────────────────────────────────────
function WalletPanel() {
  const { user } = useSelector((s) => s.auth);
  const [depositMethods, setDepositMethods] = useState([]);
  const [withdrawMethods, setWithdrawMethods] = useState([]);
  const [depositHistory, setDepositHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [depositForm, setDepositForm] = useState({
    amount: "",
    paymentMethod: "",
    fromNumber: "",
    toNumber: "",
    transactionId: "",
    proofImage: null,
  });
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    paymentMethod: "",
    toNumber: "",
    accountName: "",
  });
  const [transferForm, setTransferForm] = useState({
    fromWallet: "main",
    toWallet: "bonus",
    amount: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [d, w, t] = await Promise.all([
          walletService.getDepositMethods(),
          walletService.getWithdrawalMethods(),
          walletService.getTransactions({ page: 1, limit: 10 }),
        ]);
        if (!mounted) return;

        // Normalize responses safely to handle multiple API shapes.
        const normalize = (resp) => {
          const body = resp?.data;
          if (!body) return [];

          // Common shapes handled:
          // 1) { data: { transactions: [...] } }
          if (Array.isArray(body.data?.transactions))
            return body.data.transactions;
          // 2) { data: [...] }
          if (Array.isArray(body.data)) return body.data;
          // 3) { transactions: [...] }
          if (Array.isArray(body.transactions)) return body.transactions;
          // 4) { data: { data: [...] } }
          if (Array.isArray(body.data?.data)) return body.data.data;

          // 5) Sometimes API returns wrapper: { success:true, data: { ... } }
          // If body.data is an object with array-like values, try to find the first array
          if (body.data && typeof body.data === "object") {
            const vals = Object.values(body.data);
            const firstArray = vals.find((v) => Array.isArray(v));
            if (firstArray) return firstArray;
          }

          return [];
        };

        const dm = normalize(d);
        const wm = normalize(w);
        const tx = normalize(t);

        console.log("Withdrawal methods raw response:", w);
        console.log("Withdrawal methods normalized:", wm);

        // Use the payment method `name` (e.g. 'bkash') as the option value
        // because the server's controller expects `paymentMethod` to be the
        // method name when validating.
        setDepositMethods(
          dm.map((m) => ({
            id: m.name || m._id || m.id,
            name: m.name || m.title || m.code,
            minDeposit: m.minDeposit ?? m.min,
          })),
        );
        setWithdrawMethods(
          wm.map((m) => ({
            id: m.name || m._id || m.id,
            name: m.name || m.title || m.code,
            minWithdraw: m.minWithdraw ?? m.min,
          })),
        );
        // If no methods from API, add defaults for testing
        if (wm.length === 0) {
          setWithdrawMethods([
            { id: "bkash", name: "bKash", minWithdraw: 100 },
            { id: "nogod", name: "Nagad", minWithdraw: 100 },
            { id: "rocket", name: "Rocket", minWithdraw: 100 },
          ]);
        }
        setTransactions(
          tx.map((t) => ({
            id: t._id || t.id,
            type: t.type || t.category || "unknown",
            amount: t.amount ?? t.total,
            status: t.status,
            date: t.createdAt || t.date,
            note: t.description || t.note || "",
          })),
        );
      } catch (e) {
        console.error("Failed to load wallet data", e);
      }
    };
    if (user) load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const fetchDepositHistory = async () => {
    try {
      const res = await walletService.getDepositHistory({ page: 1, limit: 10 });

      // Server response shapes can vary. Common shapes handled:
      // 1) { success: true, data: { deposits: [...] } }
      // 2) { data: { deposits: [...] } }
      // 3) { data: [...] }
      // 4) { deposits: [...] }
      const body = res?.data ?? {};
      const payload = body.data ?? body;

      let deposits = [];
      if (Array.isArray(payload.deposits)) deposits = payload.deposits;
      else if (Array.isArray(payload)) deposits = payload;
      else if (Array.isArray(body.deposits)) deposits = body.deposits;

      setDepositHistory(
        deposits.map((d) => ({
          id: d._id || d.id,
          paymentMethod:
            d.paymentMethod ||
            d.method ||
            (d.paymentDetails && d.paymentDetails.method) ||
            d.methodName,
          status: d.status,
          amount: d.amount ?? d.total,
          date: d.createdAt || d.created_at || d.date,
          referenceId: d.referenceId || d.reference || d.ref,
          fromNumber:
            d.paymentDetails?.fromNumber ||
            d.paymentDetails?.from ||
            d.fromNumber ||
            d.from,
          toNumber:
            d.paymentDetails?.toNumber ||
            d.paymentDetails?.to ||
            d.toNumber ||
            d.to,
          transactionId:
            d.paymentDetails?.transactionId ||
            d.paymentDetails?.txnId ||
            d.transactionId ||
            d.txnId,
          proofImage:
            d.paymentDetails?.proofImage || d.paymentDetails?.proof || null,
        })),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDepositFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setDepositForm((s) => ({ ...s, proofImage: f }));
  };

  const submitDeposit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const payload = new FormData();
      Object.keys(depositForm).forEach((key) => {
        if (depositForm[key] !== "" && depositForm[key] !== null) {
          payload.append(key, depositForm[key]);
        }
      });
      const res = await walletService.createDeposit(payload);
      alert("Deposit request submitted successfully!");
      fetchDepositHistory();
      setDepositForm({
        amount: "",
        paymentMethod: "",
        fromNumber: "",
        toNumber: "",
        transactionId: "",
        proofImage: null,
      });
    } catch (e) {
      alert(e.response?.data?.message || "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  const submitWithdrawal = async (ev) => {
    ev.preventDefault();
    if (
      !withdrawForm.amount ||
      !withdrawForm.paymentMethod ||
      !withdrawForm.toNumber ||
      !withdrawForm.accountName
    ) {
      alert("All required fields must be provided");
      return;
    }
    setLoading(true);
    try {
      await walletService.createWithdrawal(withdrawForm);
      alert("Withdrawal requested successfully!");
    } catch (e) {
      alert(e.response?.data?.message || "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  const submitTransfer = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      await walletService.transferBetweenWallets(transferForm);
      alert("Transfer completed!");
    } catch (e) {
      alert(e.response?.data?.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-black mb-8">
        Wallet & Payments
      </h2>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Deposit Form */}
        {/* <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-semibold text-black mb-5">
            Deposit Funds
          </h3>
          <form onSubmit={submitDeposit} className="space-y-5">
            <Input
              label="Amount"
              type="number"
              value={depositForm.amount}
              onChange={(e) =>
                setDepositForm((s) => ({ ...s, amount: e.target.value }))
              }
              required
            />
            <Select
              label="Payment Method"
              value={depositForm.paymentMethod}
              onChange={(e) =>
                setDepositForm((s) => ({ ...s, paymentMethod: e.target.value }))
              }
              options={depositMethods}
            />
            <Input
              label="From Number (Sender)"
              value={depositForm.fromNumber}
              onChange={(e) =>
                setDepositForm((s) => ({ ...s, fromNumber: e.target.value }))
              }
            />
            <Input
              label="To Number (Receiver)"
              value={depositForm.toNumber}
              onChange={(e) =>
                setDepositForm((s) => ({ ...s, toNumber: e.target.value }))
              }
            />
            <Input
              label="Transaction ID"
              value={depositForm.transactionId}
              onChange={(e) =>
                setDepositForm((s) => ({ ...s, transactionId: e.target.value }))
              }
            />
            <div>
              <label className="block text-sm font-medium text-black/80 mb-2">
                Proof of Payment (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleDepositFile}
                className="block w-full text-sm text-black/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-600 file:text-black hover:file:bg-indigo-700"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-black font-bold py-3 rounded-xl transition"
              >
                {loading ? "Submitting..." : "Submit Deposit"}
              </button>
              <button
                type="button"
                onClick={fetchDepositHistory}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-black rounded-xl transition"
              >
                History
              </button>
            </div>
          </form>
        </div> */}

        {/* Withdrawal Form */}
        <div className="bg-white/5 rounded-2xl p-6 border border-black">
          <h3 className="text-xl font-semibold text-black mb-5">
            Withdraw Funds
          </h3>
          <form onSubmit={submitWithdrawal} className="space-y-5">
            <Input
              label="Amount"
              type="number"
              value={withdrawForm.amount}
              className="!border-black "
              onChange={(e) =>
                setWithdrawForm((s) => ({ ...s, amount: e.target.value }))
              }
              required
            />
            <Select
              label="Withdrawal Method"
              value={withdrawForm.paymentMethod}
              onChange={(e) =>
                setWithdrawForm((s) => ({
                  ...s,
                  paymentMethod: e.target.value,
                }))
              }
              options={withdrawMethods}
            />
            <Input
              label="Account Number / Phone"
              value={withdrawForm.toNumber}
              onChange={(e) =>
                setWithdrawForm((s) => ({ ...s, toNumber: e.target.value }))
              }
              required
            />
            <Input
              label="Account Name"
              value={withdrawForm.accountName}
              onChange={(e) =>
                setWithdrawForm((s) => ({ ...s, accountName: e.target.value }))
              }
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-primary font-bold py-3 rounded-xl transition"
            >
              {loading ? "Processing..." : "Request Withdrawal"}
            </button>
          </form>
        </div>
      </div>

      {/* Transfer + Transactions */}
      <div className="grid lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white/5 rounded-2xl p-6 border border-black">
          <h3 className="text-xl font-semibold  mb-5">
            Transfer Between Wallets
          </h3>
          <form onSubmit={submitTransfer} className="space-y-5">
            <Select
              label="From Wallet"
              value={transferForm.fromWallet}
              onChange={(e) =>
                setTransferForm((s) => ({ ...s, fromWallet: e.target.value }))
              }
              options={[
                { id: "main", name: "Main" },
                { id: "bonus", name: "Bonus" },
                { id: "freeBets", name: "Free Bets" },
              ]}
            />
            <Select
              label="To Wallet"
              value={transferForm.toWallet}
              onChange={(e) =>
                setTransferForm((s) => ({ ...s, toWallet: e.target.value }))
              }
              options={[
                { id: "bonus", name: "Bonus" },
                { id: "main", name: "Main" },
                { id: "freeBets", name: "Free Bets" },
              ]}
            />
            <Input
              label="Amount"
              type="number"
              value={transferForm.amount}
              onChange={(e) =>
                setTransferForm((s) => ({ ...s, amount: e.target.value }))
              }
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-primary font-bold py-3 rounded-xl transition"
            >
              Transfer Now
            </button>
          </form>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 border border-black">
          <h3 className="text-xl font-semibold text-black mb-5">
            Recent Transactions
          </h3>
          {transactions.length === 0 ? (
            <p className="text-black/60 text-center py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white/5 rounded-xl p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium text-black">{tx.type}</div>
                    <div className="text-sm text-black/70">
                      {tx.note || tx.description || "—"}
                    </div>
                    <div className="text-xs text-black/50">
                      {tx.date ? new Date(tx.date).toLocaleString() : ""}
                    </div>
                  </div>
                  <div
                    className={`font-bold flex justify-center items-center ${
                      tx.type === "win" || tx.type === "won"
                        ? "text-green-400"
                        : tx.type === "bet"
                          ? "text-red-400"
                          : Number(tx.amount) > 0
                            ? "text-green-400"
                            : "text-black"
                    }`}
                  >
                    {tx.type === "win" || tx.type === "won"
                      ? "+"
                      : tx.type === "bet"
                        ? "-"
                        : Number(tx.amount) > 0
                          ? "+"
                          : ""}
                    <TbCoinTaka />
                    {Number(tx.amount || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deposit History */}
      {depositHistory.length > 0 && (
        <div className="mt-8 bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-semibold text-black mb-4">
            Recent Deposits
          </h3>
          <div className="space-y-3">
            {depositHistory.map((d) => (
              <div
                key={d.id}
                className="bg-white/5 rounded-xl p-4 flex justify-between items-center text-sm"
              >
                <div>
                  <span className="text-black font-medium">
                    {d.paymentMethod}
                  </span>
                  <span className="mx-2 text-black/50">•</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${d.status === "approved" ? "bg-green-500/20 text-green-300" : "primary/20 text-yellow-300"}`}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="text-black font-semibold">
                  ₦{Number(d.amount || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Input & Select Components
function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-black/80 mb-2">
        {label}
      </label>
      <input
        {...props}
        className="w-full px-4 py-3 bg-white/10 border border-black rounded-xl text-black placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
      />
    </div>
  );
}

function Select({ label, options = [], ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-black/80 mb-2">
        {label}
      </label>
      <select
        {...props}
        className="w-full px-4 py-3 bg-white/10 border border-black rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((opt) => (
          <option key={opt.id || opt.name} value={opt.id || opt.name}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
