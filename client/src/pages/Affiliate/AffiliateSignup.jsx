import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { affiliateAPI } from "../../Components/services/affiliateService";
import { getAffiliateError } from "./affiliateUtils";

const initialForm = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  country: "Bangladesh",
  preferredPaymentMethod: "bkash",
  paymentNumber: "",
  promotionMethod: "",
  trafficSource: "",
  estimatedMonthlyPlayers: "",
  previousExperience: "",
  previousBettingSite: "",
  facebook: "",
  telegram: "",
  website: "",
  youtube: "",
  terms: false,
};

export default function AffiliateSignup() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    ...initialForm,
    fullName: user?.fullName || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!form.terms) {
      setMessage("You must accept the affiliate terms and conditions.");
      return;
    }

    setLoading(true);
    try {
      await affiliateAPI.apply({
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        phone: form.phone,
        country: form.country,
        preferredPaymentMethod: form.preferredPaymentMethod,
        paymentNumber: form.paymentNumber,
        promotionMethod: form.promotionMethod,
        trafficSource: form.trafficSource,
        estimatedMonthlyPlayers: Number(form.estimatedMonthlyPlayers),
        previousExperience: form.previousExperience,
        previousBettingSite: form.previousBettingSite,
        facebook: form.facebook,
        telegram: form.telegram,
        website: form.website,
        youtube: form.youtube,
      });
      setMessage(
        "Affiliate application submitted successfully. Your application is pending approval.",
      );
    } catch (error) {
      setMessage(getAffiliateError(error, "Failed to submit application"));
    } finally {
      setLoading(false);
    }
  };

  const input = (key, label, props = {}) => (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 ">
        {label}
      </label>
      <input
        className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        {...props}
      />
    </div>
  );

  return (
    <div className="bg-slate-50 px-4 py-10 mb-10">
      <form
        onSubmit={submit}
        className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-black text-primary">Affiliate Signup</h1>
          <p className="mt-2 text-sm text-slate-500">
            This application is attached to your existing mosttiger account.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <Section title="Basic Information">
          {input("fullName", "Full Name", { required: true })}
          {input("username", "Username", { required: true })}
          {input("email", "Email", { required: true, type: "email" })}
          {input("phone", "Phone", { required: true })}
          {input("country", "Country", { required: true })}
        </Section>

        <Section title="Payment Information">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Preferred Payment Method
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
              value={form.preferredPaymentMethod}
              onChange={(e) =>
                setField("preferredPaymentMethod", e.target.value)
              }
            >
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          {input("paymentNumber", "Payment Number", { required: true })}
        </Section>

        <Section title="Marketing Information">
          {input("promotionMethod", "Promotion Method", { required: true })}
          {input("trafficSource", "Traffic Source", { required: true })}
          {input("estimatedMonthlyPlayers", "Estimated Monthly Players", {
            required: true,
            type: "number",
            min: 0,
          })}
          {input("previousExperience", "Previous Experience")}
          {input("previousBettingSite", "Previous Betting Site")}
        </Section>

        <Section title="Social Links">
          {input("facebook", "Facebook")}
          {input("telegram", "Telegram")}
          {input("website", "Website")}
          {input("youtube", "YouTube")}
        </Section>

        <label className="mb-6 flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.terms}
            onChange={(e) => setField("terms", e.target.checked)}
            className="mt-1"
          />
          I confirm that my affiliate activity will follow mosttiger terms and
          marketing rules.
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/affiliate")}
            className="rounded-lg border border-slate-300 px-5 py-3 font-bold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-bold text-primary">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}
