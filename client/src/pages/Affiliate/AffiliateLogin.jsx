import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../Components/store/authSlice";
import { getAffiliateAccessMessage } from "./affiliateUtils";

export default function AffiliateLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    username: "",
    password: "",
    rememberMe: true,
  });
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const data = await dispatch(loginUser(form)).unwrap();
      const access = data.affiliateDashboard;
      if (access?.allowed) {
        navigate(location.state?.returnTo || "/affiliate/dashboard", {
          replace: true,
        });
        return;
      }
      setMessage(getAffiliateAccessMessage(access));
    } catch (error) {
      setMessage(error?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-[70vh] bg-slate-50 px-4 py-10 mb-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        <div className="bg-black p-8 text-white">
          <div className="text-sm font-semibold text-primary">
            Affiliate Login
          </div>
          <h1 className="mt-4 text-3xl font-black">
            Access your partner dashboard.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Use your existing ck369 account. Dashboard access is available only
            after affiliate approval.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          {message && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {message}
            </div>
          )}
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Username
          </label>
          <input
            className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Password
          </label>
          <input
            type="password"
            className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <div className="mb-6 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(e) =>
                  setForm({ ...form, rememberMe: e.target.checked })
                }
              />
              Remember Me
            </label>
            <Link to="/forgot" className="font-semibold text-emerald-700">
              Forgot Password
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <div className="mt-5 text-center text-sm text-slate-600">
            Not an affiliate yet?{" "}
            <Link
              to="/affiliate/signup"
              className="font-semibold text-emerald-700"
            >
              Apply now
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
