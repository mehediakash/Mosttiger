import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  Link2,
  ShieldCheck,
  Users,
} from "lucide-react";

const sections = [
  {
    title: "Promote",
    text: "Share your affiliate URL across communities, content, groups and campaigns.",
  },
  {
    title: "Track",
    text: "Player registration, qualification and revenue activity are tracked automatically.",
  },
  {
    title: "Earn",
    text: "Revenue share is generated from qualified player net loss after approval.",
  },
];

const faqs = [
  [
    "Do I need a new account?",
    "No. Affiliates use the existing ck369 user login.",
  ],
  [
    "When does commission start?",
    "After your affiliate status is approved and players meet qualification rules.",
  ],
  [
    "Can I withdraw anytime?",
    "Withdrawals follow your approved affiliate configuration and minimum withdraw limit.",
  ],
];

export default function AffiliateLanding() {
  return (
    <div className="bg-black text-white">
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
              ck369 Affiliate Program
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Build your player network and earn revenue share.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Apply as an affiliate, promote ck369 with your unique tracking
              link, and manage players, revenue, settlements and withdrawals
              from one portal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/affiliate/signup"
                className="inline-flex items-center gap-2 rounded-lg !bg-primary px-5 py-3 font-bold !text-black hover:bg-emerald-400"
              >
                Become Affiliate <ArrowRight size={18} />
              </Link>
              <Link
                to="/affiliate/login"
                className="rounded-lg border border-white/20 px-5 py-3 font-bold text-white hover:bg-white/10"
              >
                Login
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Revenue Share", "Dynamic %"],
                ["Tracking", "Real time"],
                ["Withdraw", "Auto"],
                ["Settlement", "Monthly"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-900 p-5">
                  <div className="text-sm text-slate-400">{label}</div>
                  <div className="mt-2 text-2xl font-bold text-primary">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 text-primary sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [
                BadgeDollarSign,
                "Transparent revenue share",
                "Commission is based on positive net revenue from qualified players.",
              ],
              [
                Users,
                "Player qualification",
                "Minimum deposit and turnover rules protect quality and fairness.",
              ],
              [
                ShieldCheck,
                "Admin approved",
                "Every affiliate account is reviewed before dashboard access.",
              ],
            ].map(([Icon, title, text]) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200 p-6"
              >
                <Icon className="text-emerald-600" size={28} />
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {sections.map((item, index) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-white/5 p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-bold text-primary">
                  {index + 1}
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-100 px-4 py-14 text-primary sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">Commission model</h2>
            <p className="mt-3 text-slate-600">
              Revenue share is configured per affiliate by admin approval and is
              calculated only from qualified players with positive net revenue.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              "Flexible revenue share",
              "Minimum deposit qualification",
              "Turnover qualification",
              "Negative carry support",
              "Traceable settlements",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg bg-white p-4"
              >
                <CheckCircle2 className="text-emerald-600" size={20} />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold">Why join us</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[Link2, BarChart3, BadgeDollarSign].map((Icon, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/10 bg-white/5 p-6"
              >
                <Icon className="text-primary" size={28} />
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  Professional tracking, clear approval status, affiliate-only
                  wallet balances and withdrawal history in one responsive
                  portal.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 text-primary sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold">FAQ</h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
            {faqs.map(([q, a]) => (
              <div key={q} className="p-5">
                <div className="font-bold">{q}</div>
                <div className="mt-1 text-sm text-slate-600">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 text-center sm:px-6 lg:px-8 mb-20">
        <h2 className="text-3xl font-black">Ready to grow with ck369?</h2>
        <div className="mt-6 flex justify-center gap-3">
          <div className="rounded-lg !bg-primary !text-black border border-white/20  px-5 py-3 font-bold ">
            <Link to="/affiliate/signup">Become Affiliate</Link>
          </div>
          <Link
            to="/affiliate/login"
            className="rounded-lg border border-white/20 px-5 py-3 font-bold"
          >
            Login
          </Link>
        </div>
      </section>
    </div>
  );
}
