import React, { useEffect, useRef } from "react";
import ConversationEmpty from "./ConversationEmpty";
import LoadingSkeleton from "./LoadingSkeleton";
import MessageBubble from "./MessageBubble";
import { getDateLabel } from "./liveChatUtils";

const MessageList = ({
  messages,
  loading,
  onLoadOlder,
  hasOlder,
  searchQuery,
  onNearBottomChange,
}) => {
  const endRef = useRef(null);
  const listRef = useRef(null);
  const loadingOlderRef = useRef(false);

  useEffect(() => {
    if (!listRef.current) return;

    const { scrollHeight, clientHeight, scrollTop } = listRef.current;
    const nearBottom = scrollHeight - clientHeight - scrollTop < 120;

    if (nearBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (!listRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const nearBottom = scrollHeight - clientHeight - scrollTop < 120;
    onNearBottomChange?.(nearBottom);

    if (scrollTop < 80 && hasOlder && !loadingOlderRef.current) {
      loadingOlderRef.current = true;
      Promise.resolve(onLoadOlder?.()).finally(() => {
        window.setTimeout(() => {
          loadingOlderRef.current = false;
        }, 400);
      });
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (!messages.length) return <ConversationEmpty />;

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-3"
    >
      {hasOlder && (
        <div className="mb-3 flex justify-center">
          <button
            type="button"
            onClick={onLoadOlder}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-primary/40 hover:text-primary"
          >
            Load older messages
          </button>
        </div>
      )}

      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const grouped =
          previous &&
          previous.senderType === message.senderType &&
          new Date(message.createdAt) - new Date(previous.createdAt) < 5 * 60 * 1000;
        const showDate =
          !previous ||
          getDateLabel(previous.createdAt) !== getDateLabel(message.createdAt);

        return (
          <React.Fragment key={message._id || message.clientMessageId}>
            {showDate && (
              <div className="my-4 flex justify-center">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
                  {getDateLabel(message.createdAt)}
                </span>
              </div>
            )}
            <MessageBubble
              message={message}
              grouped={grouped}
              searchQuery={searchQuery}
            />
          </React.Fragment>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

export default React.memo(MessageList);
