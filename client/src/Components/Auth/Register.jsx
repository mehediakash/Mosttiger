import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser, loginUser, setTempUserId } from "../store/authSlice";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { validatePromoCode } from "../services/promoService";
import SEO from "../SEO/SEO";
import { getSEO } from "../SEO/seoData";
import {
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiX,
  FiGift,
} from "react-icons/fi";
import { useLanguage } from "../../context/LanguageContext";
import {
  clearStoredAffiliateCode,
  clearStoredReferralCode,
  getStoredAffiliateCode,
  getStoredReferralCode,
} from "../../utils/affiliateTracking";

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((s) => s.auth);
  const { t } = useLanguage();
  const phoneRegex = /^01[3-9]\d{8}$/;

  const [form, setForm] = useState({
    username: "",
    phone: "",
    password: "",
    agreedToTerms: false,
  });
  const [phoneError, setPhoneError] = useState("");
  const [termsError, setTermsError] = useState("");

  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoValidation, setPromoValidation] = useState(null); // { isValid, message, bonusPercentage, bonusAmount, promoName }
  const [promoLoading, setPromoLoading] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      // Allow user to type full 01XXXXXXXXX
      const digits = value.replace(/[^0-9]/g, "");
      setForm({ ...form, phone: digits });
      if (digits && !/^01[3-9]\d{8}$/.test(digits)) {
        setPhoneError("Invalid Bangladesh phone number (01XXXXXXXXX)");
      } else {
        setPhoneError("");
      }
      return;
    }

    if (name === "username") {
      setForm({ ...form, username: value.toLowerCase().replace(/\s+/g, "") });
      return;
    }

    if (name === "agreedToTerms") {
      setForm({ ...form, agreedToTerms: e.target.checked });
      setTermsError("");
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) {
      setPromoValidation({
        isValid: false,
        message: t("enter_promo_first"),
      });
      return;
    }

    setPromoLoading(true);
    setPromoValidation(null);

    try {
      const response = await validatePromoCode(promoCode.trim().toUpperCase());
      setPromoValidation({
        isValid: true,
        promoName: response.data.promoName,
        bonusPercentage: response.data.bonusPercentage,
        bonusAmount: response.data.bonusAmount,
        message: response.data.message || t("promo_code_valid"),
      });
    } catch (error) {
      setPromoValidation({
        isValid: false,
        message: error.response?.data?.message || t("invalid_promo"),
      });
    }

    setPromoLoading(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.agreedToTerms) {
      setTermsError("You must agree to the terms and conditions");
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(form.phone)) {
      setPhoneError("Invalid Bangladesh phone number (01XXXXXXXXX)");
      return;
    }
    try {
      const affiliateCode = getStoredAffiliateCode();
      const referralCode = getStoredReferralCode();
      const registrationData = {
        username: form.username.trim().toLowerCase(),
        phone: form.phone,
        password: form.password,
        agreedToTerms: form.agreedToTerms,
        ...(promoValidation?.isValid && promoCode
          ? { promoCode: promoCode.trim().toUpperCase() }
          : {}),
        ...(affiliateCode ? { aff: affiliateCode } : {}),
        ...(referralCode ? { ref: referralCode, referralCode } : {}),
      };
      const result = await dispatch(registerUser(registrationData)).unwrap();
      clearStoredAffiliateCode();
      clearStoredReferralCode();
      if (result?.token && result?.user) {
        navigate("/profile");
      } else {
        try {
          await dispatch(
            loginUser({
              username: form.username.trim().toLowerCase(),
              password: form.password,
              rememberMe: true,
            }),
          ).unwrap();
          navigate("/profile");
        } catch {
          navigate("/login");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#111111]">
      <div
        className="w-full max-w-lg bg-[#0f0f0f] rounded-xl p-6 shadow-[0_10px_40px_rgba(255,215,0,0.06)] border"
        style={{ borderColor: "rgba(255,215,0,0.15)" }}
      >
        <h2 className="text-2xl font-extrabold text-[#FFD700] mb-1">
          {t("create_account")}
        </h2>
        <p className="text-sm text-white/80 mb-6">{t("join_and_play")}</p>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
          <input
            name="username"
            value={form.username}
            onChange={onChange}
            required
            autoFocus
            placeholder="Username"
            className="p-3 rounded-xl bg-[#111111] text-white placeholder-white/50 border border-transparent focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700]/20 transition"
          />
          {/* Phone input with BD flag and +88 box */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 bg-[#0f0f0f] rounded-xl p-2"
              style={{ border: "1px solid rgba(255,215,0,0.15)" }}
            >
              <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center text-sm">
                🇧🇩
              </div>
              <div className="text-white/90 font-medium pl-1 pr-2">+88</div>
            </div>
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              required
              inputMode="numeric"
              maxLength={11}
              placeholder="01600000000"
              className="flex-1 p-3 rounded-xl bg-[#111111] text-white placeholder-white/50 border border-transparent focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700]/20 transition"
            />
          </div>
          {phoneError && (
            <div className="text-sm text-red-400">{phoneError}</div>
          )}
          <input
            name="password"
            value={form.password}
            onChange={onChange}
            required
            type="password"
            placeholder={t("password")}
            className="p-3 rounded-xl bg-[#111111] text-white placeholder-white/50 border border-transparent focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700]/20 transition"
          />

          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              name="agreedToTerms"
              checked={form.agreedToTerms}
              onChange={onChange}
              className="w-4 h-4 cursor-pointer"
            />
            {t("agree_terms")}
          </label>
          {termsError && (
            <div className="text-sm text-red-400">{termsError}</div>
          )}

          <Button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-3 bg-primary !text-black font-bold rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading" ? t("submitting") : t("sign_up")}
          </Button>

          {error && (
            <div className="text-sm text-red-400">{JSON.stringify(error)}</div>
          )}
        </form>
      </div>
    </div>
  );
}
