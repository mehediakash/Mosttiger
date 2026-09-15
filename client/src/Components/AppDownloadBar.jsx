import React, { useCallback, useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { getAppDownloadLinkProps } from "../utils/appDownload";

const APP_ICON_SRC = "/android-chrome-192x192.png";
const STORAGE_KEY = "mosttiger_app_download_bar_closed_at";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 2000;
const EXIT_ANIMATION_MS = 240;
const MOBILE_QUERY = "(max-width: 767px)";
const CHAT_OFFSET_VAR = "--mosttiger-app-download-offset";
const BAR_BOTTOM_OFFSET_PX = 65;
const BAR_GAP_PX = 10;

const canShowAgain = () => {
  try {
    const closedAt = Number(localStorage.getItem(STORAGE_KEY));
    return !closedAt || Date.now() - closedAt >= THREE_DAYS_MS;
  } catch {
    return true;
  }
};

export default function AppDownloadBar() {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const barRef = useRef(null);
  const closeTimerRef = useRef(null);

  const clearChatOffset = useCallback(() => {
    document.documentElement.style.removeProperty(CHAT_OFFSET_VAR);
  }, []);

  const closeBar = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Closing should still work when storage is unavailable.
    }

    setIsVisible(false);
    clearChatOffset();
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false);
    }, EXIT_ANIMATION_MS);
  }, [clearChatOffset]);

  useEffect(() => {
    if (!window.matchMedia(MOBILE_QUERY).matches || !canShowAgain()) {
      return undefined;
    }

    const showTimer = window.setTimeout(() => {
      setShouldRender(true);
      window.requestAnimationFrame(() => setIsVisible(true));
    }, SHOW_DELAY_MS);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(closeTimerRef.current);
      clearChatOffset();
    };
  }, [clearChatOffset]);

  useEffect(() => {
    if (!shouldRender) {
      clearChatOffset();
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_QUERY);

    const updateChatOffset = () => {
      if (!isVisible || !mediaQuery.matches || !barRef.current) {
        clearChatOffset();
        return;
      }

      const height = Math.ceil(barRef.current.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        CHAT_OFFSET_VAR,
        `${height + BAR_GAP_PX}px`,
      );
    };

    const resizeObserver =
      "ResizeObserver" in window ? new ResizeObserver(updateChatOffset) : null;

    if (resizeObserver && barRef.current) {
      resizeObserver.observe(barRef.current);
    }

    updateChatOffset();
    mediaQuery.addEventListener("change", updateChatOffset);
    window.addEventListener("resize", updateChatOffset);

    return () => {
      resizeObserver?.disconnect();
      mediaQuery.removeEventListener("change", updateChatOffset);
      window.removeEventListener("resize", updateChatOffset);
      clearChatOffset();
    };
  }, [clearChatOffset, isVisible, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <section
      ref={barRef}
      aria-label="mosttiger Android app download"
      className={`fixed l z-[9997] md:hidden transition-all duration-300 ease-out ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-5 opacity-0 pointer-events-none"
      }`}
      style={{
        bottom: `calc(${BAR_BOTTOM_OFFSET_PX}px + env(safe-area-inset-bottom))`,
      }}
    >
      <div className="mx-auto flex max-w-[430px] items-center gap-2 overflow-hidden  border border-white/10 bg-[#111]/95 px-2.5 py-2 text-white  min-[375px]:gap-3 min-[375px]:px-3">
        <img
          src={APP_ICON_SRC}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl border border-primary/35 bg-black object-cover shadow-[0_8px_18px_rgba(166,226,46,0.16)] min-[375px]:h-12 min-[375px]:w-12"
          loading="lazy"
        />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[12px] font-black leading-tight text-white min-[360px]:text-[13px] min-[390px]:text-sm">
            mosttiger Android App
          </h2>
          <div
            className="mt-0.5 text-[10px] leading-none text-primary"
            aria-label="Five star rating"
          >
            &#9733;&#9733;&#9733;&#9733;&#9733;
          </div>
          <p className="mt-1 line-clamp-1 text-[10px] font-medium leading-tight text-white/[0.58] min-[390px]:text-[11px]">
            Play Faster & Enjoy Exclusive Bonuses
          </p>
        </div>

        <a
          {...getAppDownloadLinkProps()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-[12px] font-black text-black shadow-[0_10px_24px_rgba(166,226,46,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#111] active:translate-y-0 active:scale-[0.97] min-[390px]:px-4 min-[390px]:text-sm"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download
        </a>

        <button
          type="button"
          onClick={closeBar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/70 transition hover:bg-white/[0.14] hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#111] active:scale-95"
          aria-label="Close app download bar"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
