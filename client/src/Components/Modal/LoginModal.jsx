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

      <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[#00E5FF]/15 blur-3xl" />

      <div className="absolute bottom-[-120px] right-[-120px] h-[320px] w-[320px] rounded-full bg-[#147BFF]/15 blur-3xl" />

      {/* MODAL */}

      <div className="animate-scaleIn relative w-full max-w-md overflow-hidden rounded-[32px] border border-[#16314D] bg-gradient-to-b from-[#0B1220] via-[#081020] to-[#050912] shadow-[0_0_60px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        {/* CYAN TOP GLOW EFFECT */}

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,229,255,0.12),transparent_50%)]" />

        {/* CLOSE BUTTON */}

        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#16314D] bg-[#050912] text-[#8FA6BC] transition-all duration-300 hover:rotate-90 hover:border-[#18C8FF] hover:text-[#18C8FF]"
        >
          <MdClose size={24} />
        </button>

        {/* CONTENT */}

        <div className="relative z-10 p-8">
          {/* ICON */}

          <div className="mb-7 flex justify-center">
            <div className="relative">
              {/* OUTER GLOW */}

              <div className="absolute inset-0 rounded-full bg-[#00E5FF]/25 blur-2xl" />

              {/* ICON BOX */}

              <div className="relative flex h-[110px] w-[110px] items-center justify-center rounded-full border border-[#18C8FF]/40 bg-primary shadow-[0_0_30px_rgba(0,229,255,0.4)]">
                <FaCrown size={48} className="text-[#050912] drop-shadow-md" />
              </div>
            </div>
          </div>

          {/* TITLE */}

          <div className="text-center">
            <h2 className="text-[38px] font-black leading-none tracking-tight text-[#F5FAFF]">
              Login Required
            </h2>

            <p className="mt-4 text-[16px] leading-relaxed text-[#8FA6BC]">
              Please login or create an account to start playing games and enjoy
              all premium casino features.
            </p>
          </div>

          {/* ACTION BUTTONS */}

          <div className="mt-8 space-y-4">
            {/* LOGIN BUTTON */}

            <button
              onClick={handleLogin}
              className="group flex h-[60px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#147BFF] via-[#18C8FF] to-[#48DDFF] text-[17px] font-black tracking-wide text-[#050912] shadow-xl shadow-[rgba(0,229,255,0.3)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] active:scale-[0.98]"
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
              className="group flex h-[60px] w-full items-center justify-center gap-3 rounded-2xl border border-[#16314D] bg-[#0B1220] text-[17px] font-black tracking-wide text-[#18C8FF] shadow-xl shadow-black/40 transition-all duration-300 hover:scale-[1.02] hover:border-[#18C8FF] hover:bg-[#0B1220]/80 hover:shadow-[0_0_20px_rgba(0,229,255,0.2)] active:scale-[0.98]"
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
              className="h-[54px] w-full rounded-2xl border border-[#16314D] bg-[#050912] text-[16px] font-semibold text-[#8FA6BC] transition-all duration-300 hover:border-[#16314D]/80 hover:bg-[#0B1220] hover:text-[#F5FAFF]"
            >
              Maybe Later
            </button>
          </div>

          {/* FOOTER */}

          <div className="mt-8 border-t border-[#16314D] pt-6">
            <div className="rounded-2xl border border-[#16314D] bg-[#050912]/80 p-4 text-center backdrop-blur-md">
              <p className="text-sm leading-relaxed text-[#8FA6BC]">
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
