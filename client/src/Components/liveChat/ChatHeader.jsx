import React from "react";
import { FaCompress, FaExpand, FaMinus, FaTimes } from "react-icons/fa";

const ChatHeader = ({
  online,
  expanded,
  typing,
  lastSeen,
  onMinimize,
  onExpand,
  onClose,
}) => (
  <div className="flex items-center justify-between border-b border-white/10 bg-[#151515] px-4 py-3 text-white">
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary font-black text-black">
        S
        <span
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#151515] ${
            online ? "bg-emerald-400" : "bg-gray-500"
          }`}
        />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-black">mosttiger Support</div>
        <div className="text-xs text-white/65">
          {typing
            ? "Support is typing..."
            : online
              ? "Online"
              : lastSeen || "Offline"}
        </div>
      </div>
    </div>

    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onMinimize}
        className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label="Minimize chat"
      >
        <FaMinus />
      </button>
      <button
        type="button"
        onClick={onExpand}
        className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label={expanded ? "Exit fullscreen chat" : "Expand chat"}
      >
        {expanded ? <FaCompress /> : <FaExpand />}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label="Close chat"
      >
        <FaTimes />
      </button>
    </div>
  </div>
);

export default React.memo(ChatHeader);
