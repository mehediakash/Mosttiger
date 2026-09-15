export const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

export const number = (value) => new Intl.NumberFormat("en-BD").format(value || 0);

export const dateText = (value) =>
  value
    ? new Intl.DateTimeFormat("en-BD", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(value))
    : "N/A";

export const statusClass = (status) => {
  const map = {
    approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    suspended: "bg-rose-100 text-rose-700",
    settled: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
  };
  return map[status] || "bg-slate-100 text-slate-700";
};

export const StatusPill = ({ status }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
      status,
    )}`}
  >
    {status ? status.replaceAll("_", " ").toUpperCase() : "N/A"}
  </span>
);

export const getAffiliateError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const getAffiliateAccessMessage = (dashboard) => {
  if (dashboard?.message) return dashboard.message;
  return "Affiliate dashboard access is not available for this account.";
};
