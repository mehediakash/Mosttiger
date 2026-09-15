import React from "react";
import { Loader2 } from "lucide-react";

export function AffiliateCard({ title, value, helper, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {title && (
        <div className="text-sm font-medium text-slate-500">{title}</div>
      )}
      {value !== undefined && (
        <div className="mt-2 text-2xl font-bold text-primary">{value}</div>
      )}
      {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ text = "Loading..." }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-slate-500">
      <Loader2 className="mr-2 animate-spin" size={18} />
      {text}
    </div>
  );
}

export function EmptyState({ title = "No data found", text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="font-semibold text-slate-800">{title}</div>
      {text && <div className="mt-1 text-sm text-slate-500">{text}</div>}
    </div>
  );
}

export function ErrorState({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function TableShell({ children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
