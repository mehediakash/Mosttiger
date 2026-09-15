import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import LoginModal from "../Modal/LoginModal";
import { liveChatService } from "../services/liveChatService";
import AttachmentPreview from "./AttachmentPreview";
import ChatHeader from "./ChatHeader";
import LiveChatButton from "./LiveChatButton";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import { getLiveChatSocket } from "./liveChatSocket";
import {
  buildClientMessageId,
  getConversationId,
  getUserUnreadCount,
  formatLastSeen,
  normalizePreview,
} from "./liveChatUtils";

const upsertMessage = (messages, message) => {
  if (!message?._id) return messages;

  const exists = messages.some((item) => item._id === message._id);
  const next = exists
    ? messages.map((item) =>
        item._id === message._id ? { ...item, ...message } : item,
      )
    : [...messages, message];

  return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

const LiveChatWidget = () => {
  const { user, token } = useSelector((state) => state.auth || {});
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagePage, setMessagePage] = useState(1);
  const [messageTotalPages, setMessageTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [, setNearBottom] = useState(true);
  const socketRef = useRef(null);
  const joinedConversationRef = useRef("");
  const typingTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const notifiedMessagesRef = useRef(new Set());

  const conversationId = getConversationId(conversation);
  const unreadCount = getUserUnreadCount(conversation);
  const authenticated = Boolean(user && token);

  const windowClass = useMemo(() => {
    if (expanded) {
      return "fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[9998] flex overflow-hidden rounded-3xl border border-white/10 bg-[#101010] shadow-2xl md:bottom-8 md:left-8 md:right-8 md:top-8";
    }

    return "fixed bottom-[calc(max(5.5rem,calc(4.75rem+env(safe-area-inset-bottom)))+var(--mosttiger-app-download-offset,0px))] left-3 right-3 top-auto z-[9998] flex h-[min(72dvh,680px)] max-h-[calc(100dvh-7rem-env(safe-area-inset-bottom)-env(safe-area-inset-top)-var(--mosttiger-app-download-offset,0px))] min-h-[min(420px,68dvh)] w-auto overflow-hidden rounded-3xl border border-white/10 bg-[#101010] shadow-2xl sm:left-auto sm:right-4 sm:w-[min(390px,calc(100vw-2rem))] md:bottom-6 md:right-6 md:h-[min(680px,calc(100dvh-3rem))]";
  }, [expanded]);

  const showLogin = useCallback(() => {
    setLoginOpen(true);
  }, []);

  const setFriendlyError = useCallback((message) => {
    window.clearTimeout(errorTimeoutRef.current);
    setError(message);
    errorTimeoutRef.current = window.setTimeout(() => setError(""), 5000);
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 740;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.18,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
      window.setTimeout(() => context.close().catch(() => {}), 300);
    } catch {
      // Sound is best-effort and may be blocked until user interaction.
    }
  }, []);

  const showBrowserNotification = useCallback(
    (message) => {
      if (!("Notification" in window)) return;
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
        return;
      }
      if (Notification.permission !== "granted") return;

      const hidden = document.visibilityState !== "visible";
      if (!hidden && open) return;

      const notification = new Notification("mosttiger Support", {
        body: normalizePreview(message),
        tag: `live-chat-${message._id || Date.now()}`,
        silent: true,
      });
      window.setTimeout(() => notification.close(), 5000);
    },
    [open],
  );

  const updateRealtimeStatus = useCallback(async () => {
    if (!authenticated) {
      setOnline(false);
      return;
    }

    try {
      const response = await liveChatService.getRealtimeStatus();
      setOnline(
        Boolean(response.data?.data?.connected ?? response.data?.connected),
      );
    } catch {
      setOnline(Boolean(socketRef.current?.connected));
    }
  }, [authenticated]);

  const joinConversation = useCallback((id) => {
    if (!id || !socketRef.current) return;

    if (joinedConversationRef.current && joinedConversationRef.current !== id) {
      socketRef.current.emit("leave_conversation", {
        conversationId: joinedConversationRef.current,
      });
    }

    socketRef.current.emit("join_conversation", { conversationId: id });
    socketRef.current.emit(
      "presence_request",
      { conversationId: id },
      (response) => {
        const admins =
          response?.presence?.filter((item) => item.role === "admin") || [];
        const onlineAdmin = admins.find((item) => item.online);
        const latestLastSeen = admins
          .filter((item) => item.lastSeen)
          .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))[0];
        setOnline(Boolean(onlineAdmin));
        setLastSeen(
          latestLastSeen ? formatLastSeen(latestLastSeen.lastSeen) : "",
        );
      },
    );
    joinedConversationRef.current = id;
  }, []);

  const loadMessages = useCallback(
    async (id, page = 1, appendOlder = false) => {
      if (!id) return;

      setLoading(true);
      try {
        const response = await liveChatService.getMessages(id, {
          page,
          limit: 30,
        });
        const data = response.data?.data || {};
        const nextMessages = data.messages || [];

        setMessages((prev) =>
          appendOlder
            ? [...nextMessages, ...prev].sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
              )
            : nextMessages,
        );
        setMessagePage(data.currentPage || page);
        setMessageTotalPages(data.totalPages || 0);
      } catch (err) {
        setFriendlyError(
          err.response?.data?.message || "Unable to load chat messages.",
        );
      } finally {
        setLoading(false);
      }
    },
    [setFriendlyError],
  );

  const ensureConversation = useCallback(async () => {
    if (!authenticated) {
      showLogin();
      return null;
    }

    if (conversationId) {
      return conversation;
    }

    setLoading(true);
    try {
      const response = await liveChatService.createConversation();
      const nextConversation = response.data?.data?.conversation;

      if (!nextConversation) {
        throw new Error("Conversation could not be started.");
      }

      setConversation(nextConversation);
      joinConversation(getConversationId(nextConversation));
      await loadMessages(getConversationId(nextConversation));
      return nextConversation;
    } catch (err) {
      setFriendlyError(
        err.response?.data?.message || err.message || "Unable to start chat.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    authenticated,
    conversation,
    conversationId,
    joinConversation,
    loadMessages,
    setFriendlyError,
    showLogin,
  ]);

  const loadExistingConversation = useCallback(async () => {
    if (!authenticated || conversationId) return;

    try {
      const response = await liveChatService.getConversations({
        status: "open",
        page: 1,
        limit: 1,
      });
      const existingConversation = response.data?.data?.conversations?.[0];

      if (existingConversation) {
        const existingId = getConversationId(existingConversation);
        setConversation(existingConversation);
        joinConversation(existingId);
      }
    } catch {
      // Keep the floating button available; opening chat will retry.
    }
  }, [authenticated, conversationId, joinConversation]);

  const openWidget = useCallback(async () => {
    if (!authenticated) {
      showLogin();
      return;
    }

    setOpen(true);
    const activeConversation = await ensureConversation();
    const activeId = getConversationId(activeConversation);

    if (activeId) {
      joinConversation(activeId);
      liveChatService.markConversationRead(activeId).catch(() => {});
    }
  }, [authenticated, ensureConversation, joinConversation, showLogin]);

  useEffect(() => {
    const handleOpenLiveChat = () => {
      if (typeof window !== "undefined") {
        window.__openLiveChatPending = false;
      }
      openWidget();
    };

    if (typeof window !== "undefined" && window.__openLiveChatPending) {
      window.__openLiveChatPending = false;
      openWidget();
    }

    window.addEventListener("open-live-chat", handleOpenLiveChat);
    return () => {
      window.removeEventListener("open-live-chat", handleOpenLiveChat);
    };
  }, [openWidget]);

  const minimizeWidget = () => {
    setOpen(false);
    setExpanded(false);
  };

  const closeWidget = () => {
    setOpen(false);
    setExpanded(false);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();

    if (!authenticated) {
      showLogin();
      return;
    }

    if (!trimmed && !attachment) {
      setFriendlyError("Write a message or attach a file first.");
      return;
    }

    const activeConversation = await ensureConversation();
    const activeId = getConversationId(activeConversation);

    if (!activeId) return;

    setSending(true);
    setUploadProgress(0);

    try {
      const clientMessageId = buildClientMessageId();
      const optimisticMessage = {
        _id: clientMessageId,
        clientMessageId,
        conversation: activeId,
        senderType: "user",
        messageType: attachment
          ? attachment.type === "application/pdf"
            ? "file"
            : "image"
          : "text",
        message: trimmed,
        deliveryStatus: "sending",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => upsertMessage(prev, optimisticMessage));

      const data = new FormData();
      data.append("clientMessageId", clientMessageId);
      data.append("message", trimmed);

      if (attachment) {
        data.append("attachment", attachment);
        data.append(
          "messageType",
          attachment.type === "application/pdf" ? "file" : "image",
        );
      } else {
        data.append("messageType", "text");
      }

      const response = await liveChatService.sendMessage(activeId, data, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        },
      });

      const result = response.data?.data || {};

      if (result.message) {
        setMessages((prev) =>
          upsertMessage(
            prev.filter((item) => item._id !== clientMessageId),
            result.message,
          ),
        );
      }

      if (result.conversation) {
        setConversation(result.conversation);
      }

      setText("");
      setAttachment(null);
      setUploadProgress(0);
    } catch (err) {
      setFriendlyError(
        err.response?.data?.message || "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  };

  const emitTyping = useCallback(() => {
    if (!conversationId || !socketRef.current) return;

    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2500) {
      socketRef.current.emit("typing_start", { conversationId });
      lastTypingEmitRef.current = now;
    }

    window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      socketRef.current?.emit("typing_stop", { conversationId });
    }, 1800);
  }, [conversationId]);

  const loadOlderMessages = () => {
    if (!conversationId || messagePage >= messageTotalPages) return;
    loadMessages(conversationId, messagePage + 1, true);
  };

  useEffect(() => {
    if (!authenticated) {
      setConversation(null);
      setMessages([]);
      setOpen(false);
      setExpanded(false);
      return;
    }

    const socket = getLiveChatSocket(token);
    socketRef.current = socket;

    if (!socket) return;

    const handleConnect = () => {
      setOnline(true);
      window.dispatchEvent(
        new CustomEvent("live-chat-notification", {
          detail: { type: "connection_restored" },
        }),
      );
      if (conversationId) joinConversation(conversationId);
    };
    const handleDisconnect = () => {
      setOnline(false);
      setFriendlyError("Live chat connection lost. Reconnecting...");
    };
    const handleReceiveMessage = (payload = {}) => {
      const incoming = payload.message;
      const nextConversation = payload.conversation;
      const incomingConversationId =
        getConversationId(nextConversation) || incoming?.conversation;

      if (!incoming || !incomingConversationId) return;

      if (conversationId && incomingConversationId === conversationId) {
        setMessages((prev) => upsertMessage(prev, incoming));
        if (open) {
          liveChatService.markConversationRead(conversationId).catch(() => {});
          socket.emit("message_seen", { conversationId });
        } else {
          socket.emit("message_delivered", { conversationId });
        }
      }

      if (nextConversation) {
        setConversation(nextConversation);
      }

      if (
        incoming.senderType !== "user" &&
        !notifiedMessagesRef.current.has(incoming._id)
      ) {
        notifiedMessagesRef.current.add(incoming._id);
        playNotificationSound();
        showBrowserNotification(incoming);
      }
    };
    const handleMessageUpdated = (payload = {}) => {
      if (!payload.message) return;
      setMessages((prev) => upsertMessage(prev, payload.message));
    };
    const handleConversationUpdated = (payload = {}) => {
      if (payload.conversation) {
        setConversation(payload.conversation);
      }
    };
    const handleTypingStart = (payload = {}) => {
      if (
        payload.conversationId === conversationId &&
        payload.role === "admin"
      ) {
        setTyping(true);
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(
          () => setTyping(false),
          3500,
        );
      }
    };
    const handleTypingStop = (payload = {}) => {
      if (
        payload.conversationId === conversationId &&
        payload.role === "admin"
      ) {
        setTyping(false);
      }
    };
    const handlePresence = (payload = {}) => {
      if (payload.role !== "admin") return;
      setOnline(Boolean(payload.online));
      setLastSeen(payload.lastSeen ? formatLastSeen(payload.lastSeen) : "");
    };
    const handleStatusMessages = (payload = {}) => {
      if (!Array.isArray(payload.messages)) return;
      setMessages((prev) =>
        payload.messages.reduce(
          (next, message) => upsertMessage(next, message),
          prev,
        ),
      );
      if (payload.conversation) setConversation(payload.conversation);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("conversation_updated", handleConversationUpdated);
    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);
    socket.on("presence_update", handlePresence);
    socket.on("last_seen", handlePresence);
    socket.on("message_delivered", handleStatusMessages);
    socket.on("message_seen", handleStatusMessages);
    setOnline(socket.connected);
    updateRealtimeStatus();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("conversation_updated", handleConversationUpdated);
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
      socket.off("presence_update", handlePresence);
      socket.off("last_seen", handlePresence);
      socket.off("message_delivered", handleStatusMessages);
      socket.off("message_seen", handleStatusMessages);
    };
  }, [
    authenticated,
    conversationId,
    joinConversation,
    open,
    token,
    updateRealtimeStatus,
    playNotificationSound,
    setFriendlyError,
    showBrowserNotification,
  ]);

  useEffect(
    () => () => {
      window.clearTimeout(errorTimeoutRef.current);
      window.clearTimeout(typingTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [open]);

  useEffect(() => {
    loadExistingConversation();
  }, [loadExistingConversation]);

  useEffect(() => {
    if (!authenticated || !conversationId || !open) return;

    joinConversation(conversationId);
    liveChatService.markConversationRead(conversationId).catch(() => {});
    socketRef.current?.emit("message_seen", { conversationId });
  }, [authenticated, conversationId, joinConversation, open]);

  const filteredMessages = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return messages;

    return messages.filter((message) => {
      const dateText = new Date(message.createdAt || "")
        .toLocaleDateString()
        .toLowerCase();
      const attachmentName =
        message.attachment?.originalName?.toLowerCase() || "";
      return (
        message.message?.toLowerCase().includes(term) ||
        attachmentName.includes(term) ||
        dateText.includes(term)
      );
    });
  }, [messages, searchQuery]);

  useEffect(() => {
    if (
      open &&
      conversationId &&
      ["resolved", "closed"].includes(conversation?.status) &&
      !conversation?.rating?.score
    ) {
      setRatingOpen(true);
    }
  }, [conversation?.rating?.score, conversation?.status, conversationId, open]);

  const submitRating = async () => {
    if (!conversationId) return;

    try {
      const response = await liveChatService.rateConversation(conversationId, {
        score: ratingScore,
        feedback: ratingFeedback,
      });
      setConversation(response.data?.data?.conversation);
      setRatingOpen(false);
      setRatingFeedback("");
    } catch (err) {
      setFriendlyError(
        err.response?.data?.message || "Unable to submit support rating.",
      );
    }
  };

  const latestPreview = messages.length
    ? normalizePreview(messages[messages.length - 1])
    : "";

  return (
    <>
      <LiveChatButton
        unreadCount={open ? 0 : unreadCount}
        online={online}
        open={open}
        onClick={openWidget}
      />

      {open && (
        <div className={windowClass}>
          <div className="flex min-h-0 w-full flex-col overflow-hidden">
            <ChatHeader
              online={online}
              typing={typing}
              lastSeen={lastSeen}
              expanded={expanded}
              onMinimize={minimizeWidget}
              onExpand={() => setExpanded((value) => !value)}
              onClose={closeWidget}
            />

            {error && (
              <div className="border-b border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-100">
                {error}
              </div>
            )}

            {latestPreview && (
              <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-white/45">
                Latest: {latestPreview}
              </div>
            )}

            <div className="border-b border-white/10 bg-[#151515] px-3 py-2">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search messages, files, dates"
                className="h-9 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-primary/50"
              />
            </div>

            <MessageList
              messages={filteredMessages}
              loading={loading}
              hasOlder={messagePage < messageTotalPages}
              onLoadOlder={loadOlderMessages}
              searchQuery={searchQuery}
              onNearBottomChange={setNearBottom}
            />

            {typing && (
              <div className="px-4 pb-2 text-xs text-white/45">
                Support is typing...
              </div>
            )}

            <AttachmentPreview
              file={attachment}
              progress={uploadProgress}
              onRemove={() => {
                setAttachment(null);
                setUploadProgress(0);
              }}
            />

            <MessageInput
              value={text}
              disabled={!authenticated}
              sending={sending}
              onChange={setText}
              onAttach={setAttachment}
              onError={setFriendlyError}
              onTyping={emitTyping}
              onSend={sendMessage}
            />
          </div>
        </div>
      )}

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />

      {ratingOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151515] p-5 text-white shadow-2xl">
            <h3 className="text-lg font-black">Rate Support</h3>
            <p className="mt-2 text-sm text-white/60">
              How was your support experience?
            </p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setRatingScore(score)}
                  className={`h-10 w-10 rounded-full text-lg font-black transition ${
                    ratingScore >= score
                      ? "bg-primary text-black"
                      : "bg-white/10 text-white/50 hover:bg-white/15"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <textarea
              value={ratingFeedback}
              onChange={(event) => setRatingFeedback(event.target.value)}
              className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-3 text-sm outline-none placeholder:text-white/35"
              placeholder="Optional comment"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRatingOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white/60 hover:bg-white/10"
              >
                Later
              </button>
              <button
                type="button"
                onClick={submitRating}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-black"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChatWidget;
