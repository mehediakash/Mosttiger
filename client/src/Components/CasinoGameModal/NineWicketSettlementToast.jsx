import React, { useMemo } from "react";
import {
  MdClose,
  MdCheckCircle,
  MdErrorOutline,
  MdSync,
  MdAccountBalanceWallet,
} from "react-icons/md";

const NineWicketSettlementToast = React.memo(
  ({
    settlementNotice,
    isSettling,
    user,
    onReturnBalance,
    onDismissNotice,
  }) => {
    // Format the real wallet balance from backend
    const formattedBalance = useMemo(() => {
      const bal =
        typeof user?.balance === "number"
          ? user.balance
          : typeof user?.wallet?.main === "number"
            ? user.wallet.main
            : null;
      if (bal === null || bal === undefined) return null;
      return `৳${bal.toLocaleString()}`;
    }, [user?.balance, user?.wallet?.main]);

    // If no settlement notice exists, or if this notice is from an automatic reload recovery,
    // prevent mounting/rendering the Toast UI completely so it remains 100% invisible to the user.
    if (!settlementNotice || settlementNotice.isReloadRecovery) {
      return null;
    }

    const isNoticeSettling =
      settlementNotice.status === "settling" || isSettling;
    const isSuccess = settlementNotice.status === "success";
    const isError =
      settlementNotice.status === "error" ||
      settlementNotice.status === "warning";

    return (
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000001] max-w-lg w-[94%] sm:w-auto pointer-events-auto transition-all duration-300"
        role="status"
        aria-live="polite"
      >
        <div
          className={`flex items-center gap-3.5 px-4 py-3 sm:py-3.5 rounded-2xl backdrop-blur-xl border text-sm font-medium shadow-[0_16px_45px_rgba(0,0,0,0.65)] transition-all ${
            isNoticeSettling
              ? "bg-[#111622]/95 border-amber-500/40 text-amber-200 shadow-[0_10px_35px_rgba(245,158,11,0.2)]"
              : isSuccess
                ? "bg-[#0b1d16]/95 border-emerald-500/40 text-emerald-200 shadow-[0_10px_35px_rgba(16,185,129,0.25)]"
                : "bg-[#211216]/95 border-red-500/40 text-red-200 shadow-[0_10px_35px_rgba(239,68,68,0.25)]"
          }`}
        >
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {isNoticeSettling && (
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30">
                <div className="h-4 w-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              </div>
            )}
            {isSuccess && (
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                <MdCheckCircle className="text-emerald-400 text-xl" />
              </div>
            )}
            {isError && (
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30">
                <MdErrorOutline className="text-red-400 text-xl" />
              </div>
            )}
          </div>

          {/* Message Body */}
          <div className="flex-1 pr-1 text-left">
            {isNoticeSettling && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {settlementNotice.title || "Returning Balance"}
                </p>
                <p className="text-xs text-white/80 leading-snug mt-0.5">
                  {settlementNotice.message ||
                    "Returning your balance securely..."}
                </p>
              </div>
            )}

            {isSuccess && (
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-emerald-400">
                    {settlementNotice.title || "Session closed successfully"}
                  </span>
                  <span className="text-white/40 text-xs">•</span>
                  <span className="text-xs text-white/80">
                    {settlementNotice.message ||
                      "Balance returned successfully"}
                  </span>
                </div>
                {formattedBalance && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold mt-1">
                    <MdAccountBalanceWallet className="text-emerald-400" />
                    <span>Current Balance: {formattedBalance}</span>
                  </div>
                )}
              </div>
            )}

            {isError && (
              <div>
                <p className="text-xs font-bold text-red-400">
                  {settlementNotice.title || "Unable to return balance"}
                </p>
                <p className="text-xs text-white/70 leading-snug mt-0.5">
                  {settlementNotice.message || "Please try again."}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isError && onReturnBalance && (
              <button
                type="button"
                onClick={onReturnBalance}
                disabled={isSettling}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow cursor-pointer whitespace-nowrap"
              >
                Retry
              </button>
            )}

            {!isNoticeSettling && onDismissNotice && (
              <button
                type="button"
                onClick={onDismissNotice}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white cursor-pointer"
                aria-label="Dismiss notification"
              >
                <MdClose size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

NineWicketSettlementToast.displayName = "NineWicketSettlementToast";

export default NineWicketSettlementToast;
