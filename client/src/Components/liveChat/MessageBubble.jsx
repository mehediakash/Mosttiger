import React from "react";
import { FaCheck, FaCheckDouble, FaFilePdf } from "react-icons/fa";
import {
  formatChatTime,
  highlightText,
  isImageAttachment,
} from "./liveChatUtils";

const MessageBubble = ({ message, grouped, searchQuery }) => {
  const isUser = message.senderType === "user";
  const isSystem = message.senderType === "system" || message.messageType === "system";
  const attachment = message.attachment;

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
          {message.message || "System update"}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} ${grouped ? "mt-1" : "mt-4"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${
          isUser
            ? "rounded-br-md bg-primary text-black"
            : "rounded-bl-md bg-[#232323] text-white"
        }`}
      >
        {message.message && (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {highlightText(message.message, searchQuery).map((part, index) =>
              searchQuery && part.toLowerCase() === searchQuery.toLowerCase() ? (
                <mark key={`${part}-${index}`} className="rounded bg-yellow-300 px-0.5 text-black">
                  {part}
                </mark>
              ) : (
                <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
              ),
            )}
          </div>
        )}

        {attachment && (
          <div className={message.message ? "mt-2" : ""}>
            {isImageAttachment(attachment) ? (
              <a href={attachment.cloudinaryUrl} target="_blank" rel="noreferrer">
                <img
                  src={attachment.cloudinaryUrl}
                  alt={attachment.originalName}
                  className="max-h-56 rounded-xl object-contain"
                />
              </a>
            ) : (
              <a
                href={attachment.cloudinaryUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
                  isUser ? "bg-black/10 text-black" : "bg-white/10 text-white"
                }`}
              >
                <FaFilePdf className="text-lg" />
                <span className="truncate">
                  {attachment.originalName || "PDF attachment"}
                </span>
              </a>
            )}
          </div>
        )}

        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            isUser ? "text-black/55" : "text-white/40"
          }`}
        >
          <span>{formatChatTime(message.createdAt)}</span>
          {isUser && message.deliveryStatus === "sending" && <span>Sending</span>}
          {isUser && message.deliveryStatus === "seen" && <span>Seen</span>}
          {isUser && message.deliveryStatus === "delivered" && <span>Delivered</span>}
          {isUser && (!message.deliveryStatus || message.deliveryStatus === "sent") && <span>Sent</span>}
          {isUser && (message.deliveryStatus === "seen" ? <FaCheckDouble /> : <FaCheck />)}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MessageBubble);
