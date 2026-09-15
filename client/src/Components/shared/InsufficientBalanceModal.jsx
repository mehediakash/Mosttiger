import React from "react";
import { FaWallet } from "react-icons/fa";

const InsufficientBalanceModal = ({
  message = "Your account balance is currently 0. Please deposit funds to start playing.",
  onDismiss,
  onDeposit,
}) => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      style={{ zIndex: 10000000 }}
    >
      <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#111111] p-6 text-white shadow-2xl">
        <p className="mb-2 text-lg font-semibold">Insufficient Balance</p>
        <p className="text-sm text-white/70">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onDeposit}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
          >
            <FaWallet size={14} />
            Deposit Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsufficientBalanceModal;
