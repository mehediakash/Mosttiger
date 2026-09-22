import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { message } from "antd";
import {
  Crown,
  CalendarDays,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Plus,
  Star,
  Trash2,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { fetchProfile, updateProfile } from "../../store/authSlice";
import { useTranslation } from "react-i18next";
const PHONE_REGEX = /^01[3-9]\d{8}$/;
const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

const createPhoneRow = (number = "", isPrimary = false) => ({
  id:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  number,
  isPrimary,
});

const formatDateForInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const getPhoneRowsFromUser = (profile) => {
  const phones =
    Array.isArray(profile?.phones) && profile.phones.length
      ? profile.phones
      : profile?.phone
        ? [{ number: profile.phone, isPrimary: true }]
        : [];

  const normalized = phones
    .map((entry) => ({
      number: typeof entry?.number === "string" ? entry.number : "",
      isPrimary: Boolean(entry?.isPrimary),
    }))
    .filter((entry) => entry.number);

  if (!normalized.length) {
    return [createPhoneRow("", true)];
  }

  const primaryIndex = normalized.findIndex((entry) => entry.isPrimary);

  return normalized.map((entry, index) =>
    createPhoneRow(
      entry.number,
      primaryIndex === -1 ? index === 0 : index === primaryIndex,
    ),
  );
};

const getProfileDisplayName = (profile) => {
  const name = profile?.fullName?.trim();
  return name || profile?.username || "Player";
};

const extractErrorMessage = (error) => {
  if (!error) return "Something went wrong";
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  if (typeof error?.error?.message === "string") return error.error.message;
  if (typeof error?.payload?.message === "string") return error.payload.message;
  if (typeof error?.data?.message === "string") return error.data.message;
  return "Something went wrong";
};

const PersonalInfoModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);

  const [saving, setSaving] = useState(false);
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    birthday: "",
    phones: [createPhoneRow("", true)],
  });
  const [errors, setErrors] = useState({});

  const profileSummary = useMemo(
    () => ({
      name: getProfileDisplayName(user),
      role: user?.role || "user",
      createdAt: user?.createdAt ? new Date(user.createdAt) : null,
    }),
    [user],
  );

  useEffect(() => {
    if (!open) return;

    const syncProfile = async () => {
      try {
        await dispatch(fetchProfile()).unwrap();
      } catch (err) {
        message.error(extractErrorMessage(err));
      }
    };

    syncProfile();
  }, [dispatch, open]);

  useEffect(() => {
    if (!open) {
      setErrors({});
      setSaving(false);
      setShowAddPhone(false);
      setNewPhoneNumber("");
      return;
    }

    setForm({
      fullName: user?.fullName || "",
      username: user?.username || "",
      email: user?.email || "",
      birthday: formatDateForInput(user?.dateOfBirth || user?.birthday),
      phones: getPhoneRowsFromUser(user),
    });
  }, [open, user]);

  const updatePhoneRow = (rowId, field, value) => {
    const registeredPrimaryPhone =
      user?.phone ||
      user?.phones?.find((phone) => phone?.isPrimary)?.number ||
      "";
    if (
      field === "number" &&
      form.phones.some(
        (row) =>
          row.id === rowId &&
          registeredPrimaryPhone &&
          row.number === registeredPrimaryPhone,
      )
    ) {
      return;
    }

    setForm((current) => ({
      ...current,
      phones: current.phones.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row,
      ),
    }));
    setErrors((current) => ({ ...current, phones: "" }));
  };

  const commitInlinePhone = () => {
    const trimmedPhone = newPhoneNumber.trim();

    if (!trimmedPhone) {
      setErrors((current) => ({
        ...current,
        phones: "Please enter a phone number",
      }));
      return;
    }

    if (!PHONE_REGEX.test(trimmedPhone)) {
      setErrors((current) => ({
        ...current,
        phones: "Invalid Bangladesh phone number",
      }));
      return;
    }

    const duplicatePhone = form.phones.some(
      (row) => row.number.trim() === trimmedPhone,
    );

    if (duplicatePhone) {
      setErrors((current) => ({
        ...current,
        phones: "Phone numbers must be unique",
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      phones: [
        ...current.phones,
        createPhoneRow(trimmedPhone, current.phones.length === 0),
      ],
    }));
    setNewPhoneNumber("");
    setShowAddPhone(false);
    setErrors((current) => ({ ...current, phones: "" }));
  };

  const removePhoneRow = (rowId) => {
    const registeredPrimaryPhone =
      user?.phone ||
      user?.phones?.find((phone) => phone?.isPrimary)?.number ||
      "";
    if (
      registeredPrimaryPhone &&
      form.phones.some(
        (row) => row.id === rowId && row.number === registeredPrimaryPhone,
      )
    ) {
      return;
    }

    setForm((current) => {
      const nextPhones = current.phones.filter((row) => row.id !== rowId);

      if (!nextPhones.length) {
        return { ...current, phones: [createPhoneRow("", true)] };
      }

      if (!nextPhones.some((row) => row.isPrimary)) {
        nextPhones[0] = { ...nextPhones[0], isPrimary: true };
      }

      return { ...current, phones: nextPhones };
    });
    setErrors((current) => ({ ...current, phones: "" }));
  };

  const setPrimaryPhone = (rowId) => {
    const registeredPrimaryPhone =
      user?.phone ||
      user?.phones?.find((phone) => phone?.isPrimary)?.number ||
      "";
    if (
      registeredPrimaryPhone &&
      form.phones.some((row) => row.number === registeredPrimaryPhone)
    ) {
      return;
    }

    setForm((current) => ({
      ...current,
      phones: current.phones.map((row) => ({
        ...row,
        isPrimary: row.id === rowId,
      })),
    }));
  };

  const handleSave = async () => {
    const nextErrors = {};
    const trimmedFullName = form.fullName.trim();
    const normalizedEmail = form.email.trim().toLowerCase();
    const birthday = form.birthday ? new Date(form.birthday) : null;
    const registeredPrimaryPhone =
      user?.phone ||
      user?.phones?.find((phone) => phone?.isPrimary)?.number ||
      "";

    const phoneRows = form.phones
      .map((row) => ({
        ...row,
        number: row.number.trim(),
      }))
      .filter((row) => row.number);

    if (
      registeredPrimaryPhone &&
      !phoneRows.some((row) => row.number === registeredPrimaryPhone)
    ) {
      nextErrors.phones = "Primary phone number cannot be removed";
    }

    const hasEmptyPhoneRow = form.phones.some((row) => !row.number.trim());
    if (hasEmptyPhoneRow && !phoneRows.length) {
      nextErrors.phones = "At least one phone number is required";
    }

    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      nextErrors.email = "Invalid email format";
    }

    if (birthday && Number.isNaN(birthday.getTime())) {
      nextErrors.birthday = "Invalid birthday";
    } else if (birthday && birthday > new Date()) {
      nextErrors.birthday = "Birthday cannot be in the future";
    }

    const seenPhones = new Set();
    const normalizedPhones = [];

    for (const row of phoneRows) {
      if (!PHONE_REGEX.test(row.number)) {
        nextErrors.phones = "Invalid Bangladesh phone number";
        break;
      }

      if (seenPhones.has(row.number)) {
        nextErrors.phones = "Phone numbers must be unique";
        break;
      }

      seenPhones.add(row.number);
      normalizedPhones.push({
        number: row.number,
        isPrimary: Boolean(row.isPrimary),
      });
    }

    if (!normalizedPhones.length && !nextErrors.phones) {
      nextErrors.phones = "At least one valid phone number is required";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const primaryIndex = normalizedPhones.findIndex((row) => row.isPrimary);
    const resolvedPhones = normalizedPhones.map((row, index) => ({
      number: row.number,
      isPrimary: registeredPrimaryPhone
        ? row.number === registeredPrimaryPhone
        : primaryIndex === -1
          ? index === 0
          : index === primaryIndex,
    }));

    setSaving(true);
    setErrors({});

    try {
      const result = await dispatch(
        updateProfile({
          fullName: trimmedFullName,
          email: normalizedEmail,
          dateOfBirth: birthday ? birthday.toISOString() : null,
          phones: resolvedPhones,
        }),
      ).unwrap();

      message.success(result?.message || "Profile updated successfully");
      setForm({
        fullName: result?.user?.fullName || trimmedFullName,
        username: result?.user?.username || form.username,
        email: result?.user?.email || normalizedEmail,
        birthday: formatDateForInput(
          result?.user?.dateOfBirth || result?.user?.birthday || birthday,
        ),
        phones: getPhoneRowsFromUser(result?.user || user),
      });
    } catch (err) {
      const apiError = extractErrorMessage(err);
      setErrors((current) => ({
        ...current,
        form: apiError,
      }));
      message.error(apiError);
    } finally {
      setSaving(false);
    }
  };

  const { t, i18n } = useTranslation();
  if (!open) return null;

  const currentPhones = form.phones;
  const registeredPrimaryPhone =
    user?.phone ||
    user?.phones?.find((phone) => phone?.isPrimary)?.number ||
    "";

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-4">
      <div className="relative mx-auto flex h-[92vh] w-full max-w-130 flex-col overflow-hidden border border-[#ffb80022] bg-linear-to-b from-[#050505] via-[#0d0d0d] to-[#1a1405] text-white shadow-2xl shadow-black/60 sm:h-[90vh] sm:rounded-[28px]">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-[#ffb80022] bg-[#0d0d0d]/95 px-4 py-4 backdrop-blur-md sm:px-5">
          <h2 className="text-xl font-extrabold tracking-wide text-[#ffcc33] drop-shadow-[0_0_12px_rgba(255,184,0,0.35)] sm:text-2xl">
            {t("personalInfo")}
          </h2>

          <button
            onClick={onClose}
            className="rounded-full border border-[#ffcc33]/20 bg-[#1a1a1a] p-2 text-[#ffcc33] transition-all duration-300 hover:rotate-90 hover:border-[#ffcc33]/40 hover:text-[#ffd95e]"
            aria-label="Close profile modal"
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {/* VIP CARD */}

          <div className="relative overflow-hidden rounded-3xl border border-[#ffb80022] bg-linear-to-r from-[#1a1200] via-[#2a1d00] to-[#120d00] p-4 shadow-xl shadow-black/40 sm:p-5">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full primary/10 blur-3xl" />

            <div className="relative flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#ffcc33]/20 bg-linear-to-br from-[#ffb800] to-[#8a5a00] shadow-lg shadow-[#ffb80033]">
                <Crown size={36} className="text-black drop-shadow-md" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-2xl font-black tracking-wide text-[#ffcc33]">
                  {profileSummary.name}
                </h3>

                <div className="mt-1 inline-flex rounded-full border border-[#ffcc33]/20 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#ffcc33]">
                  {profileSummary.role.replace(/_/g, " ")}
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-[#d0d0d0]">
                  <CalendarDays size={14} />
                  <span>
                    {t("registered")}:{" "}
                    <span className="font-semibold text-white">
                      {profileSummary.createdAt
                        ? profileSummary.createdAt.toLocaleDateString()
                        : "—"}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* EDIT FORM */}

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-[#ffb80014] bg-linear-to-r from-[#111111] to-[#1a1a1a] p-4 shadow-lg shadow-black/30">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#d0d0d0]">
                <User size={16} className="text-[#ffcc33]" />
                {t("fullName")}
              </div>
              <input
                value={form.fullName}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    fullName: e.target.value,
                  }))
                }
                placeholder={t("addFullName")}
                className="w-full rounded-xl border border-[#ffcc33]/10 bg-[#0f0f0f] px-4 py-3 text-white outline-none transition-all duration-200 placeholder:text-[#7f7f7f] focus:border-[#ffcc33] focus:ring-2 focus:ring-[#ffcc33]/20"
              />
            </div>

            <div className="rounded-2xl border border-[#ffb80014] bg-linear-to-r from-[#111111] to-[#1a1a1a] p-4 shadow-lg shadow-black/30">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#d0d0d0]">
                <User size={16} className="text-[#ffcc33]" />
                {t("username")}
              </div>
              <input
                value={form.username}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-[#ffcc33]/10 bg-[#0b0b0b] px-4 py-3 text-[#c9c9c9] outline-none"
              />
            </div>

            <div className="rounded-2xl border border-[#ffb80014] bg-linear-to-r from-[#111111] to-[#1a1a1a] p-4 shadow-lg shadow-black/30">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#d0d0d0]">
                <Mail size={16} className="text-[#ffcc33]" />
                {t("email")}
              </div>
              <input
                value={form.email}
                onChange={(e) =>
                  setForm((current) => ({ ...current, email: e.target.value }))
                }
                placeholder={t("addEmail")}
                inputMode="email"
                autoComplete="email"
                className="w-full rounded-xl border border-[#ffcc33]/10 bg-[#0f0f0f] px-4 py-3 text-white outline-none transition-all duration-200 placeholder:text-[#7f7f7f] focus:border-[#ffcc33] focus:ring-2 focus:ring-[#ffcc33]/20"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            <div className="rounded-2xl border border-[#ffb80014] bg-linear-to-r from-[#111111] to-[#1a1a1a] p-4 shadow-lg shadow-black/30">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#d0d0d0]">
                <CalendarDays size={16} className="text-[#ffcc33]" />
                {t("birthday")}
              </div>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    birthday: e.target.value,
                  }))
                }
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-xl border border-[#ffcc33]/10 bg-[#0f0f0f] px-4 py-3 text-white outline-none transition-all duration-200 focus:border-[#ffcc33] focus:ring-2 focus:ring-[#ffcc33]/20"
              />
              {!form.birthday && (
                <p className="mt-2 text-sm text-[#9b9b9b]">
                  {t("setBirthday")}
                </p>
              )}
              {errors.birthday && (
                <p className="mt-2 text-sm text-red-400">{errors.birthday}</p>
              )}
            </div>

            <div className="rounded-2xl border border-[#ffb80014] bg-linear-to-r from-[#111111] to-[#1a1a1a] p-4 shadow-lg shadow-black/30">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-[#d0d0d0]">
                  <Phone size={16} className="text-[#ffcc33]" />
                  {t("phoneNumbers")}
                  <span className="rounded-full border border-[#ffcc33]/20 bg-[#2a1d00] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ffcc33]">
                    {currentPhones.length} {t("saved")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddPhone((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#ffcc33]/20 bg-[#1b1b1b] px-3 py-1.5 text-xs font-semibold text-[#ffcc33] transition-all duration-200 hover:border-[#ffcc33]/40 hover:bg-[#232323]"
                >
                  <Plus size={14} />
                  {t("addNumber")}
                </button>
              </div>

              {showAddPhone && (
                <div className="mb-3 rounded-2xl border border-[#ffcc33]/10 bg-[#0e0e0e] p-3 transition-all duration-200">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 rounded-xl border border-[#ffcc33]/10 bg-[#111111] px-3 py-2 text-sm text-[#ffcc33] sm:min-w-19.5 sm:justify-center">
                      +88
                    </div>
                    <input
                      value={newPhoneNumber}
                      onChange={(e) => {
                        setNewPhoneNumber(
                          e.target.value.replace(/[^0-9]/g, ""),
                        );
                        setErrors((current) => ({ ...current, phones: "" }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitInlinePhone();
                        }
                      }}
                      placeholder={t("phonePlaceholder")}
                      inputMode="numeric"
                      maxLength={11}
                      className="flex-1 rounded-xl border border-[#ffcc33]/10 bg-[#111111] px-4 py-2.5 text-white outline-none transition-all duration-200 placeholder:text-[#7f7f7f] focus:border-[#ffcc33] focus:ring-2 focus:ring-[#ffcc33]/20"
                    />
                    <div className="flex items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={commitInlinePhone}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-r from-[#a66d00] to-[#ffcf40] text-black shadow-lg shadow-[#ffb80033] transition-all duration-200 hover:scale-[1.03]"
                        aria-label={t("savePhone")}
                        title={t("savePhone")}
                      >
                        <Save size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddPhone(false);
                          setNewPhoneNumber("");
                          setErrors((current) => ({ ...current, phones: "" }));
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ffcc33]/15 bg-[#171717] text-[#d0d0d0] transition-all duration-200 hover:border-primary hover:text-white"
                        aria-label={t("cancelAddPhone")}
                        title={t("cancelAddPhone")}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {currentPhones.length ? (
                  currentPhones.map((phoneRow) => {
                    const isPrimary = Boolean(phoneRow.isPrimary);
                    const isRegisteredPrimary =
                      Boolean(registeredPrimaryPhone) &&
                      phoneRow.number === registeredPrimaryPhone;

                    return (
                      <div
                        key={phoneRow.id}
                        className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition-all duration-200 sm:px-4 ${
                          isPrimary
                            ? "border border-primary bg-[#151000] shadow-[0_0_0_1px_rgba(255,204,51,0.08),0_0_18px_rgba(255,184,0,0.08)]"
                            : "border border-[#ffffff10] bg-[#0f0f0f] hover:border-[#ffcc33]/15"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                              isPrimary
                                ? "border-[#ffcc33]/25 primary/10 text-[#ffcc33]"
                                : "border-[#ffffff10] bg-[#151515] text-[#ffcc33]"
                            }`}
                          >
                            <Phone size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                value={phoneRow.number}
                                readOnly={isRegisteredPrimary}
                                onChange={(e) =>
                                  updatePhoneRow(
                                    phoneRow.id,
                                    "number",
                                    e.target.value.replace(/[^0-9]/g, ""),
                                  )
                                }
                                inputMode="numeric"
                                maxLength={11}
                                className="w-full min-w-0 bg-transparent text-sm font-semibold tracking-wide text-white outline-none placeholder:text-[#7f7f7f]"
                                placeholder="01XXXXXXXXX"
                              />
                              {isPrimary && (
                                <span className="shrink-0 rounded-full primary px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                                  {t("primary")}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-[#8d8d8d]">
                              {isPrimary
                                ? t("primaryPhoneDescription")
                                : t("optionalPhoneDescription")}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {!isPrimary && !isRegisteredPrimary && (
                            <button
                              type="button"
                              onClick={() => setPrimaryPhone(phoneRow.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ffcc33]/15 bg-[#171717] text-[#ffcc33] transition-all duration-200 hover:border-[#ffcc33]/35 hover:bg-[#1f1f1f]"
                              aria-label={t("setAsPrimary")}
                              title={t("setAsPrimary")}
                            >
                              <Star size={15} />
                            </button>
                          )}

                          {!isRegisteredPrimary && (
                            <button
                              type="button"
                              onClick={() => removePhoneRow(phoneRow.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-500/15 bg-red-500/10 text-red-400 transition-all duration-200 hover:bg-red-500/20"
                              aria-label="Remove phone number"
                              title="Remove"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#ffcc33]/12 bg-[#0f0f0f] px-4 py-4 text-sm text-[#9b9b9b]">
                    {t("noAdditionalPhones")}
                  </div>
                )}

                {errors.phones && (
                  <p className="pt-1 text-sm text-red-400">{errors.phones}</p>
                )}
              </div>
            </div>

            {errors.form && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {errors.form}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {extractErrorMessage(error)}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#a66d00] via-[#ffb800] to-[#ffcf40] px-4 py-3 text-sm font-bold text-black shadow-lg shadow-[#ffb80033] transition-all duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving || loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {t("saveChanges")}
                </>
              )}
            </button>
          </div>

          {/* FOOTER NOTE */}

          <div className="mt-6 rounded-2xl border border-[#ffb80014] bg-[#111111] p-4 shadow-lg shadow-black/30">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-[#ffcc33]">
                <ShieldCheck size={20} />
              </div>

              <p className="text-sm leading-relaxed text-[#d0d0d0]">
                {t("manageProfileSecurely")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoModal;
