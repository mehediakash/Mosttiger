import React, { useEffect, useMemo, useState } from "react";
import { affiliateAPI } from "../../Components/services/affiliateService";
import { EmptyState, ErrorState, LoadingState, PageHeader, TableShell } from "./AffiliateShared";
import { dateText, getAffiliateError, money, StatusPill } from "./affiliateUtils";

export function RevenueHistory() {
  return (
    <TransactionHistory
      type="commission"
      title="Revenue History"
      subtitle="Commission generated from positive net revenue of qualified players."
      columns={["Date", "Player", "Net Revenue", "Revenue Share %", "Commission", "Status"]}
      renderRow={(row) => [
        dateText(row.createdAt),
        row.player?.username || "N/A",
        money(row.metadata?.commissionableRevenue || row.metadata?.grossRevenue || row.amount),
        row.metadata?.revenueSharePercentage ? `${row.metadata.revenueSharePercentage}%` : "N/A",
        money(row.amount),
        <StatusPill status={row.status} />,
      ]}
    />
  );
}

export function SettlementHistory() {
  return (
    <TransactionHistory
      type="settlement"
      title="Settlement History"
      subtitle="Traceable settlement movements in your affiliate wallet."
      columns={["Settlement Date", "Settlement Type", "Commission", "Negative Carry", "Carry Reset", "Status"]}
      renderRow={(row) => [
        dateText(row.createdAt),
        row.metadata?.periodStart ? "Period" : "Manual",
        money(row.amount),
        money(row.metadata?.negativeCarryOut || row.metadata?.negativeCarryApplied || 0),
        row.metadata?.carryReset || "N/A",
        <StatusPill status={row.status} />,
      ]}
    />
  );
}

export default function AffiliateHistoryPages({ componentName }) {
  if (componentName === "SettlementHistory") return <SettlementHistory />;
  return <RevenueHistory />;
}

function TransactionHistory({ type, title, subtitle, columns, renderRow }) {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await affiliateAPI.getTransactions({ page: 1, limit: 100, type });
        setTransactions(res.data?.data?.transactions || []);
      } catch (err) {
        setError(getAffiliateError(err, `Failed to load ${title.toLowerCase()}`));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [type, title]);

  const rows = useMemo(() => {
    const query = search.toLowerCase();
    return transactions.filter((row) => {
      if (!query) return true;
      return (
        row.player?.username?.toLowerCase().includes(query) ||
        row.description?.toLowerCase().includes(query) ||
        row.status?.toLowerCase().includes(query)
      );
    });
  }, [transactions, search]);

  if (loading) return <LoadingState text={`Loading ${title.toLowerCase()}...`} />;

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <ErrorState message={error} />
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <input
          className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {!rows.length ? (
        <EmptyState text="No records found." />
      ) : (
        <TableShell>
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50">
                  {renderRow(row).map((value, index) => (
                    <td key={index} className="px-4 py-3">{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </>
  );
}
