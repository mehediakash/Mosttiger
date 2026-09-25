import React from "react";
import { FaCommentDots } from "react-icons/fa";

const LiveChatButton = ({ unreadCount, online, onClick, open }) => {
  if (open) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom)+var(--mosttiger-app-download-offset,0px))] right-5 z-[9998] flex h-16 w-16 items-center justify-center rounded-full bg-primary text-black shadow-[0_12px_36px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_16px_42px_rgba(255,184,0,0.28)] md:bottom-[max(1.5rem,env(safe-area-inset-bottom))] md:right-6"
      aria-label="Open live chat"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
      <FaCommentDots className="relative text-2xl" />
      <span
        className={`absolute right-1 top-1 h-4 w-4 rounded-full border-2 border-[#111] ${
          online ? "bg-emerald-400" : "bg-gray-400"
        }`}
      />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default React.memo(LiveChatButton);
