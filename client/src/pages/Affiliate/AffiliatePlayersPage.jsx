import React, { useEffect, useMemo, useState } from "react";
import { affiliateAPI } from "../../Components/services/affiliateService";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  TableShell,
} from "./AffiliateShared";
import {
  dateText,
  getAffiliateError,
  money,
  StatusPill,
} from "./affiliateUtils";

export default function AffiliatePlayersPage({ qualifiedOnly = false }) {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    qualified: qualifiedOnly ? "true" : "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await affiliateAPI.getPlayers({
          page: 1,
          limit: 100,
          qualified: qualifiedOnly ? true : filters.qualified || undefined,
        });
        setPlayers(res.data?.data?.players || []);
      } catch (err) {
        setError(getAffiliateError(err, "Failed to load players"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [qualifiedOnly, filters.qualified]);

  const rows = useMemo(() => {
    const search = filters.search.toLowerCase();
    return players.filter((item) => {
      const username = item.player?.username || "";
      return !search || username.toLowerCase().includes(search);
    });
  }, [players, filters.search]);

  if (loading) return <LoadingState text="Loading players..." />;

  return (
    <>
      <PageHeader
        title={qualifiedOnly ? "Qualified Players" : "My Players"}
        subtitle="Player-level affiliate metrics without exposing sensitive account data."
      />
      <ErrorState message={error} />
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row">
        <input
          className="rounded-lg border border-slate-300 px-4 py-2"
          placeholder="Search username"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        {!qualifiedOnly && (
          <select
            className="rounded-lg border border-slate-300 px-4 py-2"
            value={filters.qualified}
            onChange={(e) =>
              setFilters({ ...filters, qualified: e.target.value })
            }
          >
            <option value="">All players</option>
            <option value="true">Qualified</option>
            <option value="false">Not qualified</option>
          </select>
        )}
      </div>
      {!rows.length ? (
        <EmptyState text="No affiliate players matched the current filters." />
      ) : (
        <TableShell>
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Username",
                  "Registration Date",
                  "First Deposit",
                  "Total Deposit",
                  "Turnover",
                  "Qualified",
                  "Net Revenue",
                  "Commission",
                  "Status",
                ].map((head) => (
                  <th key={head} className="px-4 py-3">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr
                  key={row._id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelectedPlayer(row)}
                >
                  <td className="px-4 py-3 font-semibold">
                    {row.player?.username || "N/A"}
                  </td>
                  <td className="px-4 py-3">{dateText(row.registeredAt)}</td>
                  <td className="px-4 py-3">{money(row.firstDepositAmount)}</td>
                  <td className="px-4 py-3">{money(row.totalDeposit)}</td>
                  <td className="px-4 py-3">{money(row.turnover)}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      status={row.qualified ? "approved" : "pending"}
                    />
                  </td>
                  <td className="px-4 py-3">{money(row.netLoss)}</td>
                  <td className="px-4 py-3">
                    {money(row.commissionGenerated)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      status={row.qualified ? "approved" : "pending"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Player Details</h2>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-slate-500"
              >
                Close
              </button>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <Detail
                label="Username"
                value={selectedPlayer.player?.username || "N/A"}
              />
              <Detail
                label="Registration Date"
                value={dateText(selectedPlayer.registeredAt)}
              />
              <Detail
                label="First Deposit"
                value={money(selectedPlayer.firstDepositAmount)}
              />
              <Detail
                label="Total Deposit"
                value={money(selectedPlayer.totalDeposit)}
              />
              <Detail
                label="Current Turnover"
                value={money(selectedPlayer.turnover)}
              />
              <Detail
                label="Qualified Status"
                value={selectedPlayer.qualified ? "Qualified" : "Not qualified"}
              />
              <Detail
                label="Net Revenue"
                value={money(selectedPlayer.netLoss)}
              />
              <Detail
                label="Generated Commission"
                value={money(selectedPlayer.commissionGenerated)}
              />
              <Detail
                label="Registration Source"
                value={selectedPlayer.affiliateCode || "Affiliate Link"}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
