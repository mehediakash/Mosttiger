import React, { useEffect, useMemo, useState } from "react";
import { affiliateAPI } from "../../Components/services/affiliateService";
import { AffiliateCard, EmptyState, ErrorState, LoadingState, PageHeader, TableShell } from "./AffiliateShared";
import { dateText, getAffiliateError, money, StatusPill } from "./affiliateUtils";

export default function AffiliateWithdrawPage() {
  const [stats, setStats] = useState({});
  const [profile, setProfile] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [form, setForm] = useState({ amount: "", paymentMethod: "bkash", paymentNumber: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, profileRes, withdrawRes] = await Promise.all([
        affiliateAPI.getStatistics(),
        affiliateAPI.getProfile(),
        affiliateAPI.getWithdrawals({ page: 1, limit: 50 }),
      ]);
      setStats(statsRes.data?.data || {});
      setProfile(profileRes.data?.data || null);
      setWithdrawals(withdrawRes.data?.data?.withdrawals || []);
    } catch (err) {
      setError(getAffiliateError(err, "Failed to load withdraw page"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pendingWithdraw = useMemo(
    () =>
      withdrawals
        .filter((item) => item.status === "pending")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [withdrawals],
  );

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const amount = Number(form.amount);
    const minimum = Number(profile?.user?.affiliate?.config?.minimumWithdraw || 0);
    const available = Number(stats.withdrawableBalance || 0);

    if (!amount || amount < minimum) {
      setError(`Minimum withdraw amount is ${money(minimum)}.`);
      return;
    }
    if (amount > available) {
      setError("Withdrawal amount exceeds available balance.");
      return;
    }

    setSubmitting(true);
    try {
      await affiliateAPI.requestWithdrawal({
        amount,
        paymentMethod: form.paymentMethod,
        paymentNumber: form.paymentNumber,
      });
      setMessage("Withdraw request submitted. Status is pending.");
      setForm({ ...form, amount: "", paymentNumber: "" });
      load();
    } catch (err) {
      setError(getAffiliateError(err, "Failed to submit withdraw request"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState text="Loading withdraw page..." />;

  return (
    <>
      <PageHeader title="Withdraw" subtitle="Request affiliate commission withdrawal." />
      <ErrorState message={error} />
      {message && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <AffiliateCard title="Withdrawable Balance" value={money(stats.withdrawableBalance)} />
        <AffiliateCard title="Pending Withdraw" value={money(pendingWithdraw)} />
        <AffiliateCard title="Total Withdrawn" value={money(stats.lifetimeWithdraw || stats.totalWithdrawn)} />
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-bold">Withdrawal Form</h2>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
          <input
            type="number"
            min="0"
            className="rounded-lg border border-slate-300 px-4 py-3"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <select
            className="rounded-lg border border-slate-300 px-4 py-3"
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
          >
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
            <option value="bank">Bank</option>
          </select>
          <input
            className="rounded-lg border border-slate-300 px-4 py-3"
            placeholder="Payment Number"
            value={form.paymentNumber}
            onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })}
            required
          />
          <button
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>

      {!withdrawals.length ? (
        <EmptyState text="No withdraw history found." />
      ) : (
        <TableShell>
          <table className="min-w-[780px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{["Date", "Amount", "Payment Method", "Status"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {withdrawals.map((item) => (
                <tr key={item._id}>
                  <td className="px-4 py-3">{dateText(item.createdAt)}</td>
                  <td className="px-4 py-3">{money(item.amount)}</td>
                  <td className="px-4 py-3">{item.paymentMethod?.toUpperCase()}</td>
                  <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </>
  );
}
