import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { loginUser } from "../store/authSlice"; // <- FIXED import
import { useLanguage } from "../../context/LanguageContext";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((s) => s.auth);
  const { t } = useLanguage();

  const [form, setForm] = useState({
    username: "",
    password: "",
    rememberMe: true,
  });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(loginUser(form)).unwrap();
      navigate("/profile");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="md:min-h-screen flex items-center justify-center  p-6">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-white/5">
        <h2 className="text-2xl font-extrabold text-white mb-1">
          {t("welcome_back")}
        </h2>
        <p className="text-sm text-white mb-6">{t("login_to_account")}</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm  text-white">Username</span>
            <input
              name="username"
              value={form.username}
              onChange={onChange}
              required
              type="text"
              className="mt-1 w-full rounded-xl p-3 bg-white/5 text-white placeholder-gray-400"
              placeholder="Username"
            />
          </label>

          <label className="block">
            <span className="text-sm text-white">{t("password")}</span>
            <input
              name="password"
              value={form.password}
              onChange={onChange}
              required
              type="password"
              className="mt-1 w-full rounded-xl p-3 bg-white/5 text-white"
              placeholder={t("password_placeholder")}
            />
          </label>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                name="rememberMe"
                checked={form.rememberMe}
                onChange={(e) =>
                  setForm({ ...form, rememberMe: e.target.checked })
                }
              />{" "}
              {t("remember_me_label")}
            </label>
            <Link
              to="/forgot"
              className="text-sm text-indigo-300 hover:underline"
            >
              {t("forgot")}
            </Link>
          </div>

          <Button type="submit" className="w-full bg-primary! text-white!">
            {status === "loading" ? t("logging") : t("login")}
          </Button>

          {error && (
            <div className="text-sm text-red-400">{JSON.stringify(error)}</div>
          )}

          <div className="text-sm text-gray-400 text-center">
            {t("dont_have_account_text")}{" "}
            <Link to="/register" className="text-indigo-300">
              {t("sign_up_link")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
