import React from "react";
import logo from "../../assets/logo.png";
import { EmptyState, PageHeader } from "./AffiliateShared";

const tips = [
  "Use your affiliate URL in every campaign so registrations can be tracked.",
  "Focus on quality traffic that can meet minimum deposit and turnover rules.",
  "Avoid misleading claims, spam, and unauthorized brand usage.",
  "Track qualified players and revenue history weekly.",
];

export default function AffiliateMarketingTools() {
  return (
    <>
      <PageHeader
        title="Marketing Tools"
        subtitle="Brand assets and guidance for affiliate promotion."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Logo</h2>
          <div className="mt-4 flex items-center justify-center rounded-xl bg-black p-8">
            <img src={logo} alt="ck369" className="max-h-24" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Promotion Guide</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {tips.map((tip) => (
              <li key={tip} className="rounded-lg bg-slate-50 px-4 py-3">
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-lg font-bold">Banner Images & Brand Assets</h2>
          <div className="mt-4">
            <EmptyState
              title="No backend marketing asset feed is available"
              text="When marketing asset APIs are available, banner images and downloadable brand assets can render here without changing the portal structure."
            />
          </div>
        </div>
      </div>
    </>
  );
}
