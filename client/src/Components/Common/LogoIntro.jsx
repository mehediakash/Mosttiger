import React, { useState, useEffect, useCallback, useRef } from "react";
import logo from "../../assets/logo.png";

const STORAGE_KEY = "mosttiger_intro_seen";

function checkHasSeen() {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export default function LogoIntro() {
  // Check once synchronously so return null on subsequent page refreshes/routes
  const [shouldRender, setShouldRender] = useState(() => !checkHasSeen());
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitingRef = useRef(false);

  const handleExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setIsExiting(true);

    // After fade-out transition finishes (450ms), unmount completely
    setTimeout(() => {
      setShouldRender(false);
      try {
        document.body.style.overflow = "";
      } catch {
        // ignore
      }
    }, 450);
  }, []);

  useEffect(() => {
    if (!shouldRender) return;

    // Mark as seen in this session
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // safe fallback if storage is restricted
    }

    // Lock scroll during entrance
    try {
      document.body.style.overflow = "hidden";
    } catch {
      // ignore
    }

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Trigger mounted state on next animation frame for smooth CSS transitions
    const mountRaf = requestAnimationFrame(() => {
      setIsMounted(true);
    });

    // Timing config
    // Reduced motion: quick clean fade in/out
    // Normal: entrance (0-600ms), shimmer & alive aura (500-1550ms), fade out at 1650ms
    const exitDelay = prefersReducedMotion ? 900 : 1650;
    const safetyTimeoutDelay = prefersReducedMotion ? 1600 : 2500;

    const exitTimer = setTimeout(handleExit, exitDelay);
    const safetyTimer = setTimeout(handleExit, safetyTimeoutDelay);

    // Allow user to dismiss with Escape key
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleExit();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(mountRaf);
      clearTimeout(exitTimer);
      clearTimeout(safetyTimer);
      window.removeEventListener("keydown", onKeyDown);
      try {
        document.body.style.overflow = "";
      } catch {
        // ignore
      }
    };
  }, [shouldRender, handleExit]);

  if (!shouldRender) return null;

  return (
    <aside
      aria-label="Mosttiger Intro"
      aria-hidden={isExiting ? "true" : "false"}
      role="presentation"
      onClick={handleExit}
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#050912] select-none cursor-pointer overflow-hidden transition-opacity duration-450 ease-out ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Dynamic Scoped Keyframes */}
      <style>{`
        @keyframes mosttiger-shimmer-sweep {
          0% {
            transform: translateX(-150%) skewX(-20deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateX(250%) skewX(-20deg);
            opacity: 0;
          }
        }

        @keyframes mosttiger-ambient-pulse {
          0%, 100% {
            opacity: 0.45;
            transform: scale(0.96);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.08);
          }
        }

        @keyframes mosttiger-alive-float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-3px) scale(1.018);
          }
        }

        @keyframes mosttiger-glow-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 16px rgba(0, 229, 255, 0.4)) drop-shadow(0 0 35px rgba(20, 123, 255, 0.25));
          }
          50% {
            filter: drop-shadow(0 0 26px rgba(0, 229, 255, 0.65)) drop-shadow(0 0 50px rgba(24, 200, 255, 0.45));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mosttiger-animated-shimmer,
          .mosttiger-animated-float,
          .mosttiger-animated-ambient {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Subtle Radial Ambient Glow behind logo */}
      <div
        aria-hidden="true"
        className={`absolute pointer-events-none w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] rounded-full transition-opacity duration-700 ease-out ${
          isMounted ? "opacity-100" : "opacity-0"
        } mosttiger-animated-ambient`}
        style={{
          background:
            "radial-gradient(circle, rgba(0, 229, 255, 0.16) 0%, rgba(20, 123, 255, 0.08) 38%, rgba(5, 9, 18, 0) 70%)",
          animation: "mosttiger-ambient-pulse 2.2s ease-in-out infinite",
        }}
      />

      {/* Center Logo Container */}
      <div
        className={`relative flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMounted
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-[0.86] opacity-0 translate-y-2"
        }`}
      >
        <div
          className="relative mosttiger-animated-float"
          style={{
            animation: isMounted
              ? "mosttiger-alive-float 2.4s ease-in-out infinite 0.6s"
              : "none",
          }}
        >
          {/* Base Logo with Electric Cyan/Blue drop-shadow */}
          <img
            src={logo}
            alt="Mosttiger"
            draggable={false}
            onError={handleExit}
            className="w-48 sm:w-60 md:w-72 max-w-[80vw] h-auto object-contain select-none pointer-events-none"
            style={{
              animation: isMounted
                ? "mosttiger-glow-pulse 2.4s ease-in-out infinite 0.5s"
                : "none",
            }}
          />

          {/* Masked Shimmer Sweep: Confined strictly to the logo silhouette */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none overflow-hidden select-none"
            style={{
              WebkitMaskImage: `url(${logo})`,
              WebkitMaskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskImage: `url(${logo})`,
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "center",
            }}
          >
            <div
              className="absolute inset-y-0 w-3/4 mosttiger-animated-shimmer"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(24, 200, 255, 0.1) 20%, rgba(0, 229, 255, 0.75) 50%, rgba(245, 250, 255, 0.95) 53%, rgba(0, 229, 255, 0.75) 56%, rgba(20, 123, 255, 0.1) 80%, transparent 100%)",
                animation: isMounted
                  ? "mosttiger-shimmer-sweep 1.25s cubic-bezier(0.4, 0, 0.2, 1) 0.35s 1 forwards"
                  : "none",
              }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
