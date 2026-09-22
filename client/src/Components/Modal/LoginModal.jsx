import React from "react";
import { MdClose } from "react-icons/md";
import { FaUserCircle, FaUserPlus, FaCrown } from "react-icons/fa";

export default function LoginModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleLogin = () => {
    // Close this modal then request the global/shared AuthModal to open in login mode
    try {
      onClose();
    } catch (e) {}
    window.dispatchEvent(
      new CustomEvent("open-auth-modal", { detail: { mode: "login" } }),
    );
  };

  const handleSignup = () => {
    // Close this modal then request the global/shared AuthModal to open in register mode
    try {
      onClose();
    } catch (e) {}
    window.dispatchEvent(
      new CustomEvent("open-auth-modal", { detail: { mode: "register" } }),
    );
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="animate-fadeIn fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={handleOverlayClick}
    >
      {/* BACKGROUND GLOW */}

      <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[#ffb800]/10 blur-3xl" />

      <div className="absolute bottom-[-120px] right-[-120px] h-[320px] w-[320px] rounded-full primary/10 blur-3xl" />

      {/* MODAL */}

      <div className="animate-scaleIn relative w-full max-w-md overflow-hidden rounded-[32px] border border-[#ffb80022] bg-gradient-to-b from-[#121212] via-[#111111] to-[#1a1405] shadow-[0_0_60px_rgba(0,0,0,0.75)] backdrop-blur-xl">
        {/* GOLD TOP EFFECT */}

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,184,0,0.08),transparent_40%)]" />

        {/* CLOSE BUTTON */}

        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#ffcc33]/15 bg-[#1b1b1b] text-[#d0d0d0] transition-all duration-300 hover:rotate-90 hover:border-[#ffcc33]/40 hover:text-[#ffcc33]"
        >
          <MdClose size={24} />
        </button>

        {/* CONTENT */}

        <div className="relative z-10 p-8">
          {/* ICON */}

          <div className="mb-7 flex justify-center">
            <div className="relative">
              {/* OUTER GLOW */}

              <div className="absolute inset-0 rounded-full bg-[#ffb800]/20 blur-2xl" />

              {/* ICON BOX */}

              <div className="relative flex h-[110px] w-[110px] items-center justify-center rounded-full border border-[#ffcc33]/20 bg-primary shadow-2xl shadow-[#ffb80033]">
                <FaCrown size={48} className="text-black drop-shadow-md" />
              </div>
            </div>
          </div>

          {/* TITLE */}

          <div className="text-center">
            <h2 className="text-[38px] font-black leading-none tracking-tight text-white">
              Login Required
            </h2>

            <p className="mt-4 text-[16px] leading-relaxed text-[#d0d0d0]">
              Please login or create an account to start playing games and enjoy
              all premium casino features.
            </p>
          </div>

          {/* ACTION BUTTONS */}

          <div className="mt-8 space-y-4">
            {/* LOGIN BUTTON */}

            <button
              onClick={handleLogin}
              className="group flex h-[60px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#d89b00] via-[#ffb800] to-[#ffd54a] text-[17px] font-black tracking-wide text-black shadow-xl shadow-[#ffb80033] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(255,184,0,0.35)] active:scale-[0.98]"
            >
              <FaUserCircle
                size={22}
                className="transition-transform duration-300 group-hover:scale-110"
              />

              <span>Login to Your Account</span>
            </button>

            {/* REGISTER BUTTON */}

            <button
              onClick={handleSignup}
              className="group flex h-[60px] w-full items-center justify-center gap-3 rounded-2xl border border-[#ffcc33]/20 bg-[#1a1a1a] text-[17px] font-black tracking-wide text-[#ffcc33] shadow-xl shadow-black/40 transition-all duration-300 hover:scale-[1.02] hover:border-[#ffcc33]/50 hover:bg-[#202020] hover:shadow-[0_0_20px_rgba(255,184,0,0.15)] active:scale-[0.98]"
            >
              <FaUserPlus
                size={22}
                className="transition-transform duration-300 group-hover:scale-110"
              />

              <span>Create New Account</span>
            </button>

            {/* CANCEL BUTTON */}

            <button
              onClick={onClose}
              className="h-[54px] w-full rounded-2xl border border-[#ffffff10] bg-[#141414] text-[16px] font-semibold text-[#d0d0d0] transition-all duration-300 hover:border-[#ffffff20] hover:bg-[#1b1b1b] hover:text-white"
            >
              Maybe Later
            </button>
          </div>

          {/* FOOTER */}

          <div className="mt-8 border-t border-[#ffb80014] pt-6">
            <div className="rounded-2xl border border-[#ffb80014] bg-[#111111]/70 p-4 text-center backdrop-blur-md">
              <p className="text-sm leading-relaxed text-[#bdbdbd]">
                🎮 Join thousands of players enjoying premium casino games and
                exclusive rewards every day.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ANIMATIONS */}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.92);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.22s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.28s ease-out;
        }
      `}</style>
    </div>
  );
}
