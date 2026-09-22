import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Gift,
  Gamepad2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

const DOWNLOAD_URL = "https://mosttiger.com/downloads/ck369.apk";
const STORAGE_KEY = "ck369_app_download_popup_closed_at";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 2000;
const EXIT_ANIMATION_MS = 260;

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function AppDownloadPopup() {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const closeTimerRef = useRef(null);

  const features = useMemo(
    () => [
      {
        label: "Faster Loading",
        icon: Zap,
        accent: "from-amber-300 to-yellow-500",
      },
      {
        label: "Exclusive App Offers",
        icon: Gift,
        accent: "from-emerald-300 to-lime-400",
      },
      {
        label: "Secure Login",
        icon: LockKeyhole,
        accent: "from-cyan-300 to-emerald-400",
      },
      {
        label: "Better Gaming Experience",
        icon: Gamepad2,
        accent: "from-fuchsia-300 to-amber-300",
      },
    ],
    [],
  );

  const rememberClose = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore storage failures so closing still works in restricted browsers.
    }
  }, []);

  const closePopup = useCallback(() => {
    rememberClose();
    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false);
    }, EXIT_ANIMATION_MS);
  }, [rememberClose]);

  const handleDownload = useCallback(() => {
    window.location.href = DOWNLOAD_URL;
  }, []);

  useEffect(() => {
    let showTimer;

    try {
      const closedAt = Number(localStorage.getItem(STORAGE_KEY));
      if (closedAt && Date.now() - closedAt < THREE_DAYS_MS) {
        return undefined;
      }
    } catch {
      // If storage is unavailable, still allow the visitor to see the popup.
    }

    showTimer = window.setTimeout(() => {
      previousFocusRef.current = document.activeElement;
      setShouldRender(true);
      window.requestAnimationFrame(() => setIsVisible(true));
    }, SHOW_DELAY_MS);

    return () => {
      window.clearTimeout(showTimer);
    };
  }, []);

  useEffect(() => {
    if (!shouldRender) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePopup();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll(focusableSelector),
      ).filter(
        (element) =>
          element instanceof HTMLElement && element.offsetParent !== null,
      );

      if (!focusableElements.length) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePopup, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-[max(20px,env(safe-area-inset-top))] backdrop-blur-md transition-opacity duration-300 sm:px-6 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-labelledby="app-download-title"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={modalRef}
        className={`relative w-full max-w-[390px] overflow-hidden rounded-[28px] border border-amber-300/25 bg-[#07100d]/95 text-white shadow-[0_28px_90px_rgba(0,0,0,0.75)] outline-none transition-all duration-300 sm:max-w-[430px] md:max-w-[720px] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-5 scale-95 opacity-0"
        }`}
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />

        <button
          ref={closeButtonRef}
          type="button"
          onClick={closePopup}
          className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 shadow-lg backdrop-blur transition hover:border-amber-200/50 hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-300"
          aria-label="Close app download popup"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="relative grid gap-0 md:grid-cols-[0.92fr_1.08fr]">
          <div className="relative min-h-[190px] overflow-hidden bg-gradient-to-br from-[#17231d] via-[#102119] to-[#050807] px-6 pb-5 pt-8 md:min-h-full md:px-7 md:py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(250,204,21,0.24),transparent_34%),radial-gradient(circle_at_78%_78%,rgba(34,197,94,0.24),transparent_36%)]" />
            <div className="relative mx-auto flex max-w-[250px] flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] border border-amber-200/25 bg-gradient-to-br from-amber-300 via-yellow-500 to-emerald-500 p-1 shadow-[0_16px_50px_rgba(250,204,21,0.24)]">
                <div className="flex h-full w-full items-center justify-center rounded-[20px] bg-[#07100d]">
                  <ShieldCheck
                    className="h-10 w-10 text-amber-200"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Android APK
              </div>
              <div className="mt-5 w-full rounded-[22px] border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur">
                <div className="mx-auto flex aspect-[5/3] w-full max-w-[210px] items-center justify-center rounded-[18px] border border-amber-200/15 bg-gradient-to-br from-[#19231c] via-[#09120f] to-black">
                  <div className="text-center">
                    <Sparkles
                      className="mx-auto h-8 w-8 text-amber-200"
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-bold text-white">
                      ck369 App
                    </p>
                    <p className="text-xs text-emerald-200/80">
                      Premium mobile play
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-6 sm:px-7 sm:pb-7 md:py-8">
            <div className="mb-5 pr-10">
              <p className="mb-2 inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                Premium App Experience
              </p>
              <h2
                id="app-download-title"
                className="text-2xl font-black leading-tight text-white sm:text-3xl"
              >
                Download ck369 Android App
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                Play faster, safer and enjoy exclusive rewards.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {features.map(({ label, icon: Icon, accent }) => (
                <div
                  key={label}
                  className="rounded-[18px] border border-white/10 bg-white/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur"
                >
                  <div
                    className={`mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-[#06100c] shadow-lg`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold leading-snug text-white">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleDownload}
                className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-emerald-400 px-5 text-base font-black text-[#07100d] shadow-[0_16px_38px_rgba(250,204,21,0.28)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-amber-100 focus:ring-offset-2 focus:ring-offset-[#07100d] active:scale-[0.99]"
              >
                Download App
              </button>
              <button
                type="button"
                onClick={closePopup}
                className="flex min-h-13 w-full items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] px-5 text-sm font-bold text-white/90 transition hover:border-emerald-200/35 hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-[#07100d]"
              >
                Continue Website
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
