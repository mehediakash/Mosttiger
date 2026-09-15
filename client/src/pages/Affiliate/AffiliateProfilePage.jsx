import React, { useEffect, useState } from "react";
import { affiliateAPI } from "../../Components/services/affiliateService";
import { ErrorState, LoadingState, PageHeader } from "./AffiliateShared";
import { dateText, getAffiliateError, money, StatusPill } from "./affiliateUtils";

export default function AffiliateProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await affiliateAPI.getProfile();
        setProfile(res.data?.data || null);
      } catch (err) {
        setError(getAffiliateError(err, "Failed to load profile"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState text="Loading affiliate profile..." />;

  const user = profile?.user || {};
  const affiliate = user.affiliate || {};
  const application = affiliate.application || {};
  const payment = application.payment || {};
  const marketing = application.marketing || {};
  const config = affiliate.config || {};

  return (
    <>
      <PageHeader title="Profile" subtitle="Affiliate account, payment, marketing and configuration summary." />
      <ErrorState message={error} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Affiliate Information">
          <Detail label="Name" value={user.fullName || "N/A"} />
          <Detail label="Username" value={user.username || "N/A"} />
          <Detail label="Phone" value={user.phone || "N/A"} />
          <Detail label="Affiliate Code" value={affiliate.affiliateCode || "N/A"} />
          <Detail label="Status" value={<StatusPill status={affiliate.status} />} />
          <Detail label="Approved At" value={dateText(affiliate.approvedAt)} />
        </Panel>

        <Panel title="Payment Information">
          <Detail label="Method" value={payment.preferredPaymentMethod || "N/A"} />
          <Detail label="Payment Number" value={payment.paymentNumber || "N/A"} />
          <Detail label="Bank" value={payment.bankName || "N/A"} />
          <Detail label="Account Name" value={payment.accountName || "N/A"} />
        </Panel>

        <Panel title="Marketing Information">
          <Detail label="Promotion Method" value={marketing.promotionMethod || "N/A"} />
          <Detail label="Traffic Source" value={marketing.trafficSource || "N/A"} />
          <Detail label="Estimated Monthly Players" value={marketing.estimatedMonthlyPlayers || 0} />
          <Detail label="Previous Experience" value={marketing.previousExperience || "N/A"} />
        </Panel>

        <Panel title="Configuration Summary">
          <Detail label="Current Revenue Share" value={`${config.revenueSharePercentage || 0}%`} />
          <Detail label="Minimum Deposit" value={money(config.minimumDeposit)} />
          <Detail label="Required Turnover" value={money(config.requiredTurnover)} />
          <Detail label="Negative Carry" value={config.enableNegativeCarry ? "Enabled" : "Disabled"} />
          <Detail label="Settlement" value={config.settlementFrequency || "N/A"} />
          <Detail label="Minimum Withdraw" value={money(config.minimumWithdraw)} />
        </Panel>
      </div>
    </>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}
