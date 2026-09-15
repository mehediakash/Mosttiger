import React, { useEffect, useRef } from "react";
import { FaPaperclip, FaPaperPlane } from "react-icons/fa";
import {
  ACCEPTED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_SIZE,
} from "./liveChatUtils";

const MessageInput = ({
  value,
  disabled,
  sending,
  onChange,
  onSend,
  onAttach,
  onError,
  onTyping,
}) => {
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [value]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
      onError("Only JPG, JPEG, PNG, WEBP, and PDF files are supported.");
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      onError("Attachment size must not exceed 2 MB.");
      return;
    }

    onAttach(file);
  };

  return (
    <div className="border-t border-white/10 bg-[#151515] p-3">
      <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/25 p-2">
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          disabled={disabled || sending}
          onClick={() => fileRef.current?.click()}
          className="rounded-xl p-3 text-white/60 transition hover:bg-white/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Attach file"
        >
          <FaPaperclip />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            onTyping?.();
            handleKeyDown(event);
          }}
          rows={1}
          placeholder={
            disabled
              ? "Login to chat with support"
              : "Type a message. Enter sends, Shift + Enter adds a line."
          }
          className="max-h-36 min-h-[52px] flex-1 resize-none overflow-y-auto bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-white/35 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled={disabled || sending}
          onClick={onSend}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          {sending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
          ) : (
            <FaPaperPlane />
          )}
        </button>
      </div>
    </div>
  );
};

export default React.memo(MessageInput);
