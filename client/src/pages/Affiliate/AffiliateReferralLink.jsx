import React, { useEffect, useState } from "react";
import { Facebook, MessageCircle, Send, Twitter } from "lucide-react";
import { affiliateAPI } from "../../Components/services/affiliateService";
import { ErrorState, LoadingState, PageHeader } from "./AffiliateShared";
import { getAffiliateError } from "./affiliateUtils";

export default function AffiliateReferralLink() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await affiliateAPI.getProfile();
        setProfile(res.data?.data || null);
      } catch (err) {
        setError(getAffiliateError(err, "Failed to load referral link"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState text="Loading referral link..." />;

  const code = profile?.user?.affiliate?.affiliateCode || "";
  const url =
    profile?.marketingUrl ||
    `${window.location.origin}/register?aff=${encodeURIComponent(code)}`;
  const encoded = encodeURIComponent(url);

  return (
    <>
      <PageHeader title="Referral Link" subtitle="Share your affiliate URL with players." />
      <ErrorState message={error} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="text-sm font-semibold text-slate-500">Affiliate Code</label>
          <div className="mt-2 rounded-lg bg-slate-50 px-4 py-3 text-xl font-black">{code || "N/A"}</div>

          <label className="mt-5 block text-sm font-semibold text-slate-500">Affiliate URL</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input className="flex-1 rounded-lg border border-slate-300 px-4 py-3" value={url} readOnly />
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              }}
              className="rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Share href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} icon={Facebook} label="Facebook" />
            <Share href={`https://t.me/share/url?url=${encoded}`} icon={Send} label="Telegram" />
            <Share href={`https://wa.me/?text=${encoded}`} icon={MessageCircle} label="WhatsApp" />
            <Share href={`https://twitter.com/intent/tweet?url=${encoded}`} icon={Twitter} label="Twitter" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
          <div className="text-sm font-semibold text-slate-500">QR Code</div>
          <img
            className="mx-auto mt-4 h-56 w-56 rounded-lg border border-slate-200"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=224x224&data=${encoded}`}
            alt="Affiliate QR Code"
          />
        </div>
      </div>
    </>
  );
}

function Share({ href, icon: Icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      <Icon size={16} />
      {label}
    </a>
  );
}
