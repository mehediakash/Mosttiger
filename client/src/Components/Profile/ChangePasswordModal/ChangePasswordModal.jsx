import React, { useEffect, useState } from "react";
import { message } from "antd";
import api from "../../axios/axios";
import { Eye, EyeOff, Lock, CheckCircle2, X, Loader2 } from "lucide-react";

const InputField = ({
  label,
  name,
  type,
  placeholder,
  value,
  show,
  toggle,
  handleChange,
  error,
}) => (
  <div className="rounded-2xl border border-[#ffb80014] bg-linear-to-r from-[#111111] to-[#1a1a1a] p-4 shadow-lg shadow-black/30">
    <label className="mb-3 block text-sm font-bold text-[#ffcc33]">
      {label}
    </label>

    <div className="relative">
      {/* LEFT ICON */}

      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffcc33]/70">
        <Lock size={18} />
      </div>

      {/* INPUT */}

      <input
        type={show ? "text" : type}
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-[#ffb80018] bg-[#0d0d0d] pl-12 pr-14 text-white outline-none transition-all duration-200 placeholder:text-[#777] focus:border-[#ffcc33]/50 focus:shadow-[0_0_18px_rgba(255,184,0,0.15)]"
      />

      {/* EYE */}

      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ffcc33]/70 transition hover:text-[#ffcc33]"
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>

    {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
  </div>
);

const ChangePasswordModal = ({ open, onClose }) => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const passwordChecks = {
    length:
      formData.newPassword.length >= 6 && formData.newPassword.length <= 20,
    alphabet: /[A-Za-z]/.test(formData.newPassword),
    number: /\d/.test(formData.newPassword),
  };

  useEffect(() => {
    if (!open) {
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
      setIsSubmitting(false);
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [open]);

  if (!open) return null;

  const clearFieldError = (fieldName) => {
    setErrors((current) => ({
      ...current,
      [fieldName]: "",
      submit: "",
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (
      name === "currentPassword" ||
      name === "newPassword" ||
      name === "confirmPassword"
    ) {
      clearFieldError(name);
    }
  };

  const getBackendMessage = (error) => {
    const responseMessage = error?.response?.data?.message;
    if (typeof responseMessage === "string" && responseMessage.trim()) {
      return responseMessage;
    }

    if (typeof error?.message === "string" && error.message.trim()) {
      return error.message;
    }

    return "Failed to change password";
  };

  const setValidationErrors = (messageText) => {
    if (messageText === "All password fields are required") {
      setErrors({
        currentPassword: !formData.currentPassword
          ? "Current password is required"
          : "",
        newPassword: !formData.newPassword ? "New password is required" : "",
        confirmPassword: !formData.confirmPassword
          ? "Confirm password is required"
          : "",
        submit: messageText,
      });
      return;
    }

    if (messageText === "Current password is incorrect") {
      setErrors((current) => ({
        ...current,
        currentPassword: messageText,
        submit: "",
      }));
      return;
    }

    if (
      messageText === "New password must contain letters and numbers" ||
      messageText === "New password must be between 6–20 characters" ||
      messageText === "New password cannot be same as current password"
    ) {
      setErrors((current) => ({
        ...current,
        newPassword: messageText,
        submit: "",
      }));
      return;
    }

    if (messageText === "New password and confirm password do not match") {
      setErrors((current) => ({
        ...current,
        confirmPassword: messageText,
        submit: "",
      }));
      return;
    }

    setErrors((current) => ({
      ...current,
      submit: messageText,
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.currentPassword.trim()) {
      nextErrors.currentPassword = "Current password is required";
    }

    if (!formData.newPassword.trim()) {
      nextErrors.newPassword = "New password is required";
    } else {
      if (formData.newPassword.length < 6 || formData.newPassword.length > 20) {
        nextErrors.newPassword = "New password must be between 6–20 characters";
      } else if (
        !/^(?=.*[A-Za-z])(?=.*\d).{6,20}$/.test(formData.newPassword)
      ) {
        nextErrors.newPassword =
          "New password must contain letters and numbers";
      } else if (formData.newPassword === formData.currentPassword) {
        nextErrors.newPassword =
          "New password cannot be same as current password";
      }
    }

    if (!formData.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Confirm password is required";
    } else if (formData.confirmPassword !== formData.newPassword) {
      nextErrors.confirmPassword =
        "New password and confirm password do not match";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await api.patch("/api/users/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      message.success(
        response.data?.message || "Password changed successfully",
      );
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        onClose?.();
      }, 650);
    } catch (error) {
      const backendMessage = getBackendMessage(error);
      setValidationErrors(backendMessage);
      message.error(backendMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ruleItems = [
    {
      valid: passwordChecks.length,
      text: "Between 6~20 characters.",
    },
    {
      valid: passwordChecks.alphabet,
      text: "At least one alphabet.",
    },
    {
      valid: passwordChecks.number,
      text: "At least one number.",
    },
  ];

  return (
    <div className="fixed inset-0 z-99999 bg-black/80 p-2 backdrop-blur-md sm:p-4">
      <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden border border-[#ffb80022] bg-linear-to-b from-[#050505] via-[#0d0d0d] to-[#1a1405] text-white shadow-2xl shadow-black/60 sm:h-screen">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-[#ffb80022] bg-[#0d0d0d]/95 px-4 py-4 backdrop-blur-md">
          <h2 className="text-2xl font-extrabold tracking-wide text-[#ffcc33] drop-shadow-[0_0_12px_rgba(255,184,0,0.35)]">
            Change Password
          </h2>

          <button
            onClick={onClose}
            className="rounded-full border border-[#ffcc33]/20 bg-[#1a1a1a] p-2 text-[#ffcc33] transition-all duration-300 hover:rotate-90 hover:border-[#ffcc33]/40 hover:text-[#ffd95e]"
          >
            <X size={22} />
          </button>
        </div>

        {/* CONTENT */}

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            {/* CURRENT PASSWORD */}

            <InputField
              label="Current Password"
              name="currentPassword"
              type="password"
              placeholder="Current password"
              value={formData.currentPassword}
              show={showCurrent}
              toggle={() => setShowCurrent(!showCurrent)}
              handleChange={handleChange}
              error={errors.currentPassword}
            />

            {/* NEW PASSWORD */}

            <div className="rounded-2xl border border-[#ffb80014] bg-linear-to-r from-[#111111] to-[#1a1a1a] p-4 shadow-lg shadow-black/30">
              <InputField
                label="New Password"
                name="newPassword"
                type="password"
                placeholder="New password"
                value={formData.newPassword}
                show={showNew}
                toggle={() => setShowNew(!showNew)}
                handleChange={handleChange}
                error={errors.newPassword}
              />

              {/* PASSWORD RULES */}

              <div className="mt-4 space-y-2 rounded-2xl border border-[#ffb80010] bg-[#0d0d0d] p-3 sm:p-4">
                {ruleItems.map((rule, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-all duration-200 ${
                      rule.valid
                        ? "primary/10 text-[#ffcc33]"
                        : "text-[#7c7c7c]"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        rule.valid
                          ? "primary/20 text-[#ffcc33]"
                          : "bg-[#2a2a2a] text-[#666]"
                      }`}
                    >
                      {rule.valid ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <X size={12} />
                      )}
                    </div>

                    <span>{rule.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CONFIRM PASSWORD */}

            <InputField
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              show={showConfirm}
              toggle={() => setShowConfirm(!showConfirm)}
              handleChange={handleChange}
              error={errors.confirmPassword}
            />

            {errors.submit && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errors.submit}
              </div>
            )}

            {/* BUTTON */}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40] py-4 text-lg font-extrabold tracking-wide text-black shadow-xl shadow-[#ffb80033] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_22px_rgba(255,184,0,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Changing Password...
                </>
              ) : (
                "Confirm"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
