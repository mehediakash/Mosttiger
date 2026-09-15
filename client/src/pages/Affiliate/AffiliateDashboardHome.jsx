import React, { useEffect, useState } from "react";
import { affiliateAPI } from "../../Components/services/affiliateService";
import { AffiliateCard, ErrorState, LoadingState, PageHeader } from "./AffiliateShared";
import { getAffiliateError, money, number } from "./affiliateUtils";

export default function AffiliateDashboardHome() {
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, profileRes] = await Promise.all([
          affiliateAPI.getStatistics(),
          affiliateAPI.getProfile(),
        ]);
        setStats(statsRes.data?.data || {});
        setProfile(profileRes.data?.data || {});
      } catch (err) {
        setError(getAffiliateError(err, "Failed to load affiliate dashboard"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState text="Loading affiliate dashboard..." />;

  return (
    <>
      <PageHeader
        title="Affiliate Dashboard"
        subtitle={`Welcome back${profile?.user?.fullName ? `, ${profile.user.fullName}` : ""}.`}
      />
      <ErrorState message={error} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AffiliateCard title="Total Players" value={number(stats?.totalPlayers)} />
        <AffiliateCard title="Qualified Players" value={number(stats?.qualifiedPlayers)} />
        <AffiliateCard title="Pending Commission" value={money(stats?.pendingCommission)} />
        <AffiliateCard title="Settled Commission" value={money(stats?.settledCommission)} />
        <AffiliateCard title="Withdrawable Balance" value={money(stats?.withdrawableBalance)} />
        <AffiliateCard title="Lifetime Earnings" value={money(stats?.totalCommission)} />
        <AffiliateCard title="Lifetime Withdraw" value={money(stats?.lifetimeWithdraw || stats?.totalWithdrawn)} />
        <AffiliateCard title="Net Revenue" value={money(stats?.totalNetRevenue)} />
      </div>
    </>
  );
}
