import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Drawer,
  Dropdown,
  Empty,
  Input,
  List,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
  notification,
} from "antd";
import { useSelector } from "react-redux";
import {
  CloseCircleOutlined,
  FilePdfOutlined,
  InboxOutlined,
  MessageOutlined,
  MoreOutlined,
  PaperClipOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { liveChatAPI } from "../../services/api";
import { getLiveChatSocket } from "../../services/liveChatSocket";
import {
  CHAT_FILTERS,
  buildClientMessageId,
  formatChatTime,
  getConversationId,
  getDateLabel,
  getLastMessageText,
  getPriorityColor,
  getStatusColor,
  getUserDisplayName,
  getUserInitial,
  getUserAvatar,
  formatLastSeen,
  highlightText,
  isImageAttachment,
  normalizeMessagePreview,
} from "./liveChatUtils";

const { Text, Title } = Typography;
const { TextArea } = Input;

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TAG_OPTIONS = [
  "general",
  "deposit",
  "withdraw",
  "promotion",
  "affiliate",
  "referral",
  "technical",
  "vip",
  "complaint",
  "fraud_review",
];
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];
const STATUS_OPTIONS = ["open", "pending", "resolved", "closed", "archived"];

const getUnreadForAdmin = (conversation) => conversation?.unreadCount?.admin || 0;

const upsertById = (items, nextItem) => {
  const id = getConversationId(nextItem) || nextItem?._id;
  if (!id) return items;

  const existingIndex = items.findIndex((item) => getConversationId(item) === id);

  if (existingIndex === -1) {
    return [nextItem, ...items];
  }

  const copy = [...items];
  copy[existingIndex] = { ...copy[existingIndex], ...nextItem };
  return copy.sort((a, b) => {
    const left = new Date(a.lastMessageTime || a.updatedAt || a.createdAt).getTime();
    const right = new Date(b.lastMessageTime || b.updatedAt || b.createdAt).getTime();
    return right - left;
  });
};

const upsertMessage = (items, message) => {
  if (!message?._id) return items;

  const exists = items.some((item) => item._id === message._id);
  const next = exists
    ? items.map((item) => (item._id === message._id ? { ...item, ...message } : item))
    : [...items, message];

  return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

const ConversationCard = ({
  conversation,
  selected,
  onSelect,
  previewMap,
}) => {
  const unread = getUnreadForAdmin(conversation);
  const status = conversation.status || "open";

  return (
    <List.Item
      onClick={() => onSelect(conversation)}
      className={`cursor-pointer rounded-md px-3 py-3 ${
        selected ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      <List.Item.Meta
        avatar={
          <Badge dot color={status === "open" ? "green" : "default"} offset={[-2, 34]}>
            <Avatar size={40} src={getUserAvatar(conversation)}>
              {getUserInitial(conversation)}
            </Avatar>
          </Badge>
        }
        title={
          <div className="flex items-center justify-between gap-2">
            <Text strong ellipsis className="max-w-[150px]">
              {getUserDisplayName(conversation)}
            </Text>
            <Text type="secondary" className="text-xs whitespace-nowrap">
              {formatChatTime(conversation.lastMessageTime || conversation.updatedAt)}
            </Text>
          </div>
        }
        description={
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Text type="secondary" ellipsis className="max-w-[180px]">
                {getLastMessageText(conversation, previewMap)}
              </Text>
              {unread > 0 && <Badge count={unread} size="small" />}
            </div>
            <Space size={4} wrap>
              <Tag color={getStatusColor(status)} className="m-0">
                {status.toUpperCase()}
              </Tag>
              <Tag color={getPriorityColor(conversation.priority)} className="m-0">
                {(conversation.priority || "normal").toUpperCase()}
              </Tag>
            </Space>
          </div>
        }
      />
    </List.Item>
  );
};

const MessageBubble = ({ message, searchQuery }) => {
  const isAdmin = message.senderType === "admin";
  const isSystem = message.senderType === "system" || message.messageType === "system";
  const attachment = message.attachment;

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <Tag color="default">{message.message || "System update"}</Tag>
      </div>
    );
  }

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-md px-3 py-2 ${
          isAdmin ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        {message.message && (
          <div className="whitespace-pre-wrap break-words">
            {highlightText(message.message, searchQuery).map((part, index) =>
              searchQuery && part.toLowerCase() === searchQuery.toLowerCase() ? (
                <mark key={`${part}-${index}`} className="rounded bg-yellow-200 px-0.5">
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
                  className="max-h-52 rounded object-contain"
                />
              </a>
            ) : (
              <a
                href={attachment.cloudinaryUrl}
                target="_blank"
                rel="noreferrer"
                className={isAdmin ? "text-white" : "text-blue-600"}
              >
                <Space>
                  <FilePdfOutlined />
                  <span>{attachment.originalName || "PDF attachment"}</span>
                </Space>
              </a>
            )}
          </div>
        )}
        <div
          className={`mt-1 text-[11px] ${
            isAdmin ? "text-blue-100" : "text-gray-500"
          }`}
        >
          {formatChatTime(message.createdAt)}
          {isAdmin && message.deliveryStatus && ` • ${message.deliveryStatus}`}
        </div>
      </div>
    </div>
  );
};

const ConversationActions = ({
  conversation,
  onClose,
  onClearUnread,
  onAssign,
  onArchive,
  onRestore,
  onExport,
  onNotes,
  onBlock,
}) => {
  const closed = conversation?.status === "closed";
  const items = [
    {
      key: "clear-unread",
      icon: <MessageOutlined />,
      label: "Clear unread",
      onClick: onClearUnread,
    },
    {
      key: "assign",
      icon: <TeamOutlined />,
      label: "Assign to me",
      onClick: onAssign,
    },
    {
      key: "notes",
      icon: <MessageOutlined />,
      label: "Internal notes",
      onClick: onNotes,
    },
    {
      key: "export",
      icon: <FilePdfOutlined />,
      label: "Export TXT",
      onClick: () => onExport("txt"),
    },
    {
      key: "close",
      icon: <CloseCircleOutlined />,
      label: "Close conversation",
      disabled: closed,
      onClick: onClose,
    },
    {
      key: "archive",
      icon: <ReloadOutlined />,
      label: "Archive conversation",
      onClick: onArchive,
    },
    {
      key: "restore",
      icon: <ReloadOutlined />,
      label: "Restore conversation",
      disabled: conversation?.status !== "archived",
      onClick: onRestore,
    },
    {
      key: "block",
      icon: <StopOutlined />,
      label: "Block chat",
      onClick: onBlock,
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <Button icon={<MoreOutlined />} />
    </Dropdown>
  );
};

const LiveChatWorkspace = ({ mode = "inbox" }) => {
  const { user } = useSelector((state) => state.auth);
  const [api, contextHolder] = notification.useNotification();
  const [conversations, setConversations] = useState([]);
  const [conversationMeta, setConversationMeta] = useState({
    currentPage: 1,
    total: 0,
    totalPages: 0,
  });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageMeta, setMessageMeta] = useState({
    currentPage: 1,
    total: 0,
    totalPages: 0,
  });
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(mode === "closed" ? "closed" : "open");
  const [messageText, setMessageText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [presenceMap, setPresenceMap] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [messageSearch, setMessageSearch] = useState("");
  const [supportDrawerOpen, setSupportDrawerOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [savedReplies, setSavedReplies] = useState([]);
  const [replySearch, setReplySearch] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [previewMap, setPreviewMap] = useState({});
  const socketRef = useRef(null);
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const notifiedMessagesRef = useRef(new Set());

  const selectedId = getConversationId(selectedConversation);
  const selectedUserId =
    typeof selectedConversation?.user === "object"
      ? selectedConversation?.user?._id
      : selectedConversation?.user;
  const selectedPresence = selectedUserId ? presenceMap[String(selectedUserId)] : null;
  const selectedOnline = Boolean(selectedPresence?.online);
  const selectedLastSeen = selectedPresence?.lastSeen
    ? formatLastSeen(selectedPresence.lastSeen)
    : "";

  const conversationParams = useMemo(() => {
    const params = {
      page: conversationMeta.currentPage,
      limit: 20,
    };

    if (filter === "open" || filter === "pending" || filter === "closed") {
      params.status = filter;
    }

    if (filter === "high") {
      params.priority = "high";
      params.status = mode === "closed" ? "closed" : "open";
    }

    if (filter === "low" || filter === "urgent") {
      params.priority = filter;
      params.status = mode === "closed" ? "closed" : "open";
    }

    if (mode === "closed") {
      params.status = "closed";
    }

    return params;
  }, [conversationMeta.currentPage, filter, mode]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = conversations;

    if (filter === "unread") {
      list = list.filter((conversation) => getUnreadForAdmin(conversation) > 0);
    }

    if (!term) return list;

    return list.filter((conversation) => {
      const id = getConversationId(conversation).toLowerCase();
      const user = getUserDisplayName(conversation).toLowerCase();
      const lastMessage = getLastMessageText(conversation, previewMap).toLowerCase();
      return id.includes(term) || user.includes(term) || lastMessage.includes(term);
    });
  }, [conversations, filter, previewMap, search]);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const response = await liveChatAPI.getConversations(conversationParams);
      const data = response.data?.data || {};
      setConversations(data.conversations || []);
      setConversationMeta((prev) => ({
        ...prev,
        currentPage: data.currentPage || prev.currentPage,
        total: data.total || 0,
        totalPages: data.totalPages || 0,
      }));
    } catch (error) {
      api.error({
        message: "Unable to load conversations",
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setLoadingConversations(false);
    }
  }, [api, conversationParams]);

  const loadMessages = useCallback(
    async (conversationId, page = 1, append = false) => {
      if (!conversationId) return;
      setLoadingMessages(true);
      try {
        const [messagesResponse, readResponse] = await Promise.all([
          liveChatAPI.getMessages(conversationId, { page, limit: 50 }),
          liveChatAPI.markConversationRead(conversationId),
        ]);

        const data = messagesResponse.data?.data || {};
        setMessages((prev) =>
          append
            ? [...(data.messages || []), ...prev].sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
              )
            : data.messages || [],
        );
        setMessageMeta({
          currentPage: data.currentPage || page,
          total: data.total || 0,
          totalPages: data.totalPages || 0,
        });

        const updatedConversation = readResponse.data?.data?.conversation;
        if (updatedConversation) {
          setSelectedConversation(updatedConversation);
          setConversations((prev) => upsertById(prev, updatedConversation));
        }
      } catch (error) {
        api.error({
          message: "Unable to load messages",
          description: error.response?.data?.message || error.message,
        });
      } finally {
        setLoadingMessages(false);
      }
    },
    [api],
  );

  const handleSelectConversation = useCallback(
    (conversation) => {
      const nextId = getConversationId(conversation);
      const previousId = selectedId;

      if (previousId && socketRef.current) {
        socketRef.current.emit("leave_conversation", { conversationId: previousId });
      }

      setSelectedConversation(conversation);
      setMessages([]);
      setMobileListOpen(false);

      if (nextId && socketRef.current) {
        socketRef.current.emit("join_conversation", { conversationId: nextId });
      }

      loadMessages(nextId);
    },
    [loadMessages, selectedId],
  );

  const handleIncomingMessage = useCallback(
    (payload) => {
      const incomingMessage = payload?.message;
      const conversation = payload?.conversation;
      const conversationId =
        getConversationId(conversation) || incomingMessage?.conversation;

      if (!incomingMessage || !conversationId) return;

      setPreviewMap((prev) => ({
        ...prev,
        [conversationId]: normalizeMessagePreview(incomingMessage),
      }));
      setConversations((prev) =>
        conversation ? upsertById(prev, conversation) : prev,
      );

      if (conversationId === selectedId) {
        setMessages((prev) => upsertMessage(prev, incomingMessage));
        liveChatAPI.markConversationRead(conversationId).catch(() => {});
        socketRef.current?.emit("message_seen", { conversationId });
      } else if (incomingMessage.senderType === "user") {
        socketRef.current?.emit("message_delivered", { conversationId });
        if (!notifiedMessagesRef.current.has(incomingMessage._id)) {
          notifiedMessagesRef.current.add(incomingMessage._id);
          try {
            const audio = new Audio(
              "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
            );
            audio.play().catch(() => {});
          } catch {
            // Browser audio can be blocked until the admin interacts with the page.
          }
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("New live chat message", {
              body: normalizeMessagePreview(incomingMessage),
              tag: `admin-chat-${incomingMessage._id}`,
            });
          } else if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().catch(() => {});
          }
        }
        api.info({
          message: "New chat message",
          description: normalizeMessagePreview(incomingMessage),
        });
      }
    },
    [api, selectedId],
  );

  const handleConversationUpdated = useCallback(
    (payload) => {
      const conversation = payload?.conversation;
      if (!conversation) return;

      setConversations((prev) => upsertById(prev, conversation));
      if (getConversationId(conversation) === selectedId) {
        setSelectedConversation(conversation);
      }
    },
    [selectedId],
  );

  const handleMessageUpdated = useCallback((payload) => {
    if (!payload?.message) return;
    setMessages((prev) => upsertMessage(prev, payload.message));
  }, []);

  const handleTypingStart = useCallback((payload = {}) => {
    if (!payload.conversationId) return;
    setTypingUsers((prev) => ({ ...prev, [payload.conversationId]: true }));
    window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      setTypingUsers((prev) => ({ ...prev, [payload.conversationId]: false }));
    }, 3500);
  }, []);

  const handleTypingStop = useCallback((payload = {}) => {
    if (!payload.conversationId) return;
    setTypingUsers((prev) => ({ ...prev, [payload.conversationId]: false }));
  }, []);

  const handlePresenceUpdate = useCallback((payload = {}) => {
    if (!payload.userId) return;
    setPresenceMap((prev) => ({
      ...prev,
      [String(payload.userId)]: payload,
    }));
  }, []);

  const handleStatusMessages = useCallback((payload = {}) => {
    if (Array.isArray(payload.messages)) {
      setMessages((prev) =>
        payload.messages.reduce((next, message) => upsertMessage(next, message), prev),
      );
    }

    if (payload.conversation) {
      setConversations((prev) => upsertById(prev, payload.conversation));
      if (getConversationId(payload.conversation) === selectedId) {
        setSelectedConversation(payload.conversation);
      }
    }
  }, [selectedId]);

  const handleSupportUpdate = useCallback((payload = {}) => {
    if (payload.conversation) {
      setConversations((prev) => upsertById(prev, payload.conversation));
      if (getConversationId(payload.conversation) === selectedId) {
        setSelectedConversation(payload.conversation);
      }
    }

    if (payload.note && payload.type?.startsWith("internal_note")) {
      setNotes((prev) => {
        if (payload.type === "internal_note_delete") {
          return prev.filter((note) => note._id !== payload.note._id);
        }

        const exists = prev.some((note) => note._id === payload.note._id);
        return exists
          ? prev.map((note) => (note._id === payload.note._id ? payload.note : note))
          : [payload.note, ...prev];
      });
    }
  }, [selectedId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const socket = getLiveChatSocket();
    socketRef.current = socket;

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => {
      setSocketConnected(false);
      api.warning({ message: "Live chat connection lost. Reconnecting..." });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("receive_message", handleIncomingMessage);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("conversation_updated", handleConversationUpdated);
    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);
    socket.on("presence_update", handlePresenceUpdate);
    socket.on("last_seen", handlePresenceUpdate);
    socket.on("message_delivered", handleStatusMessages);
    socket.on("message_seen", handleStatusMessages);
    socket.on("support_update", handleSupportUpdate);

    setSocketConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receive_message", handleIncomingMessage);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("conversation_updated", handleConversationUpdated);
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
      socket.off("presence_update", handlePresenceUpdate);
      socket.off("last_seen", handlePresenceUpdate);
      socket.off("message_delivered", handleStatusMessages);
      socket.off("message_seen", handleStatusMessages);
      socket.off("support_update", handleSupportUpdate);
      if (selectedId) {
        socket.emit("leave_conversation", { conversationId: selectedId });
      }
      window.clearTimeout(typingTimeoutRef.current);
    };
  }, [
    handleConversationUpdated,
    handleIncomingMessage,
    handleMessageUpdated,
    api,
    handlePresenceUpdate,
    handleStatusMessages,
    handleTypingStart,
    handleTypingStop,
    handleSupportUpdate,
    selectedId,
  ]);

  useEffect(() => {
    const container = messageEndRef.current?.parentElement?.parentElement;
    if (!container) return;
    const nearBottom =
      container.scrollHeight - container.clientHeight - container.scrollTop < 160;
    if (nearBottom) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, selectedId]);

  const emitTyping = () => {
    if (!selectedId || !socketRef.current) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2500) {
      socketRef.current.emit("typing_start", { conversationId: selectedId });
      lastTypingEmitRef.current = now;
    }
    window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      socketRef.current?.emit("typing_stop", { conversationId: selectedId });
    }, 1800);
  };

  const filteredMessages = useMemo(() => {
    const term = messageSearch.trim().toLowerCase();
    if (!term) return messages;

    return messages.filter((message) => {
      const dateText = new Date(message.createdAt || "").toLocaleDateString().toLowerCase();
      const attachmentName = message.attachment?.originalName?.toLowerCase() || "";
      return (
        message.message?.toLowerCase().includes(term) ||
        attachmentName.includes(term) ||
        dateText.includes(term)
      );
    });
  }, [messageSearch, messages]);

  const validateAttachment = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      api.error({ message: "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed" });
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      api.error({ message: "Attachment size must not exceed 2 MB" });
      return Upload.LIST_IGNORE;
    }

    setAttachment(file);
    return false;
  };

  const loadNotes = useCallback(async (conversationId = selectedId) => {
    if (!conversationId) return;
    try {
      const response = await liveChatAPI.getNotes(conversationId);
      setNotes(response.data?.data?.notes || []);
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to load notes" });
    }
  }, [api, selectedId]);

  const loadSavedReplies = useCallback(async () => {
    try {
      const response = await liveChatAPI.getSavedReplies({ q: replySearch });
      setSavedReplies(response.data?.data?.replies || []);
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to load saved replies" });
    }
  }, [api, replySearch]);

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await liveChatAPI.getAnalytics();
      setAnalytics(response.data?.data?.analytics || null);
    } catch {
      setAnalytics(null);
    }
  }, []);

  useEffect(() => {
    if (supportDrawerOpen) {
      loadNotes();
      loadSavedReplies();
      loadAnalytics();
    }
  }, [loadAnalytics, loadNotes, loadSavedReplies, supportDrawerOpen]);

  const updateConversationState = (conversation) => {
    setSelectedConversation(conversation);
    setConversations((prev) => upsertById(prev, conversation));
  };

  const updateStatus = async (status) => {
    if (!selectedId) return;
    try {
      const response = await liveChatAPI.updateStatus(selectedId, { status });
      updateConversationState(response.data?.data?.conversation);
      api.success({ message: "Status updated" });
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to update status" });
    }
  };

  const updatePriority = async (priority) => {
    if (!selectedId) return;
    try {
      const response = await liveChatAPI.updatePriority(selectedId, { priority });
      updateConversationState(response.data?.data?.conversation);
      api.success({ message: "Priority updated" });
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to update priority" });
    }
  };

  const updateTags = async (tags) => {
    if (!selectedId) return;
    try {
      const response = await liveChatAPI.updateTags(selectedId, { tags });
      updateConversationState(response.data?.data?.conversation);
      api.success({ message: "Tags updated" });
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to update tags" });
    }
  };

  const saveNote = async () => {
    if (!selectedId || !noteText.trim()) return;
    try {
      await liveChatAPI.createNote(selectedId, { note: noteText });
      setNoteText("");
      await loadNotes();
      api.success({ message: "Internal note saved" });
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to save note" });
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await liveChatAPI.deleteNote(selectedId, noteId);
      await loadNotes();
      api.success({ message: "Internal note deleted" });
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to delete note" });
    }
  };

  const createSavedReply = async () => {
    if (!replySearch.trim() || !messageText.trim()) {
      api.info({ message: "Type a title in search and a reply in the message box first" });
      return;
    }

    try {
      await liveChatAPI.createSavedReply({
        title: replySearch.trim(),
        message: messageText.trim(),
      });
      await loadSavedReplies();
      api.success({ message: "Saved reply created" });
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to create saved reply" });
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    setPreviewOpen(false);
  };

  const sendMessage = async () => {
    if (!selectedId || sending) return;
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage && !attachment) {
      api.warning({ message: "Write a message or attach a file first" });
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("clientMessageId", buildClientMessageId());
      formData.append("message", trimmedMessage);

      if (attachment) {
        formData.append("attachment", attachment);
        formData.append(
          "messageType",
          attachment.type === "application/pdf" ? "file" : "image",
        );
      } else {
        formData.append("messageType", "text");
      }

      const response = await liveChatAPI.adminReply(selectedId, formData);
      const result = response.data?.data;

      if (result?.message) {
        setMessages((prev) => upsertMessage(prev, result.message));
        setPreviewMap((prev) => ({
          ...prev,
          [selectedId]: normalizeMessagePreview(result.message),
        }));
      }

      if (result?.conversation) {
        setSelectedConversation(result.conversation);
        setConversations((prev) => upsertById(prev, result.conversation));
      }

      setMessageText("");
      clearAttachment();
      api.success({
        message: attachment ? "Attachment uploaded" : "Message sent",
      });
    } catch (error) {
      api.error({
        message: "Unable to send message",
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setSending(false);
    }
  };

  const closeConversation = async () => {
    if (!selectedId) return;

    try {
      const response = await liveChatAPI.closeConversation(selectedId);
      const conversation = response.data?.data?.conversation;
      if (conversation) {
        setSelectedConversation(conversation);
        setConversations((prev) => upsertById(prev, conversation));
      }
      api.success({ message: "Conversation closed" });
    } catch (error) {
      api.error({
        message: "Unable to close conversation",
        description: error.response?.data?.message || error.message,
      });
    }
  };

  const clearUnread = async () => {
    if (!selectedId) return;

    try {
      const response = await liveChatAPI.markConversationRead(selectedId);
      const conversation = response.data?.data?.conversation;
      if (conversation) {
        setSelectedConversation(conversation);
        setConversations((prev) => upsertById(prev, conversation));
      }
      api.success({ message: "Unread count cleared" });
    } catch (error) {
      api.error({
        message: "Unable to clear unread count",
        description: error.response?.data?.message || error.message,
      });
    }
  };

  const showAssignPlaceholder = () => {
    if (!selectedId) return;
    liveChatAPI
      .assignConversation(selectedId, { assignedAdmin: user?._id })
      .then((response) => {
        updateConversationState(response.data?.data?.conversation);
        api.success({ message: "Conversation assigned to you" });
      })
      .catch((error) => {
        api.error({ message: error.response?.data?.message || "Unable to assign conversation" });
      });
  };

  const archiveConversation = async () => {
    if (!selectedId) return;
    try {
      const response = await liveChatAPI.archiveConversation(selectedId);
      updateConversationState(response.data?.data?.conversation);
      api.success({ message: "Conversation archived" });
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to archive conversation" });
    }
  };

  const restoreConversation = async () => {
    if (!selectedId) return;
    try {
      const response = await liveChatAPI.restoreConversation(selectedId);
      updateConversationState(response.data?.data?.conversation);
      api.success({ message: "Conversation restored" });
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to restore conversation" });
    }
  };

  const exportConversation = async (format = "txt") => {
    if (!selectedId) return;
    try {
      const response = await liveChatAPI.exportConversation(selectedId, format);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `conversation-${selectedId}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      api.success({ message: "Conversation exported" });
    } catch (error) {
      api.error({ message: error.response?.data?.message || "Unable to export conversation" });
    }
  };

  const blockChat = () => {
    if (!selectedId) return;
    Modal.confirm({
      title: "Block live chat for this conversation?",
      content: "This only blocks live chat. It does not block account login.",
      onOk: async () => {
        const response = await liveChatAPI.updateRestriction(selectedId, {
          blocked: true,
          reason: "Blocked by admin",
        });
        updateConversationState(response.data?.data?.conversation);
        api.success({ message: "Chat blocked" });
      },
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const ConversationList = (
    <Card
      size="small"
      title={
        <Space>
          <InboxOutlined />
          <span>{mode === "closed" ? "Closed Chats" : "Inbox"}</span>
        </Space>
      }
      extra={
        <Tooltip title="Refresh">
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={loadConversations}
          />
        </Tooltip>
      }
      className="h-full"
      bodyStyle={{ padding: 12 }}
    >
      <Space direction="vertical" className="w-full" size={12}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search username, ID, last message"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Space wrap size={6}>
          {CHAT_FILTERS.filter((item) =>
            mode === "closed" ? item.value !== "open" && item.value !== "pending" : true,
          ).map((item) => (
            <Button
              key={item.value}
              size="small"
              type={filter === item.value ? "primary" : "default"}
              onClick={() => {
                setFilter(item.value);
                setConversationMeta((prev) => ({ ...prev, currentPage: 1 }));
              }}
            >
              {item.label}
            </Button>
          ))}
        </Space>
        {loadingConversations ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <List
            dataSource={filteredConversations}
            locale={{ emptyText: <Empty description="No conversations found" /> }}
            renderItem={(conversation) => (
              <ConversationCard
                conversation={conversation}
                selected={getConversationId(conversation) === selectedId}
                onSelect={handleSelectConversation}
                previewMap={previewMap}
              />
            )}
          />
        )}
        <Pagination
          size="small"
          current={conversationMeta.currentPage}
          total={conversationMeta.total}
          pageSize={20}
          showSizeChanger={false}
          onChange={(page) =>
            setConversationMeta((prev) => ({ ...prev, currentPage: page }))
          }
        />
      </Space>
    </Card>
  );

  const selectedClosed = selectedConversation?.status === "closed";

  return (
    <>
      {contextHolder}
      <div className="flex h-[calc(100vh-150px)] min-h-[620px] gap-4">
        <div className="hidden w-[360px] shrink-0 lg:block">{ConversationList}</div>

        <div className="flex min-w-0 flex-1 flex-col rounded-md border border-gray-100 bg-white">
          <div className="flex min-h-[64px] items-center justify-between border-b px-4">
            <Space>
              <Button
                className="lg:hidden"
                icon={<InboxOutlined />}
                onClick={() => setMobileListOpen(true)}
              />
              {selectedConversation ? (
                <>
                  <Avatar size={40} src={getUserAvatar(selectedConversation)}>
                    {getUserInitial(selectedConversation)}
                  </Avatar>
                  <div>
                    <Space size={8} wrap>
                      <Text strong>{getUserDisplayName(selectedConversation)}</Text>
                      <Tag color={getStatusColor(selectedConversation.status)}>
                        {(selectedConversation.status || "open").toUpperCase()}
                      </Tag>
                      <Tag color={getPriorityColor(selectedConversation.priority)}>
                        {(selectedConversation.priority || "normal").toUpperCase()}
                      </Tag>
                    </Space>
                    <Space size={8} wrap className="mt-2">
                      <Select
                        size="small"
                        value={selectedConversation.status || "open"}
                        options={STATUS_OPTIONS.map((value) => ({ value, label: value }))}
                        onChange={updateStatus}
                        style={{ width: 110 }}
                      />
                      <Select
                        size="small"
                        value={selectedConversation.priority || "normal"}
                        options={PRIORITY_OPTIONS.map((value) => ({ value, label: value }))}
                        onChange={updatePriority}
                        style={{ width: 110 }}
                      />
                      <Select
                        size="small"
                        mode="multiple"
                        placeholder="Tags"
                        value={selectedConversation.tags || []}
                        options={TAG_OPTIONS.map((value) => ({
                          value,
                          label: value.replace("_", " "),
                        }))}
                        onChange={updateTags}
                        style={{ minWidth: 220 }}
                        maxTagCount="responsive"
                      />
                    </Space>
                    <div>
                      <Badge
                        status={selectedOnline ? "success" : "default"}
                        text={
                          typingUsers[selectedId]
                            ? "User is typing..."
                            : selectedOnline
                              ? "User online"
                              : selectedLastSeen || (socketConnected ? "Realtime connected" : "Realtime offline")
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <Space>
                  <MessageOutlined />
                  <Text strong>Live Chat</Text>
                </Space>
              )}
            </Space>

            {selectedConversation && (
              <ConversationActions
                conversation={selectedConversation}
                onClose={closeConversation}
                onClearUnread={clearUnread}
                onAssign={showAssignPlaceholder}
                onArchive={archiveConversation}
                onRestore={restoreConversation}
                onExport={exportConversation}
                onNotes={() => setSupportDrawerOpen(true)}
                onBlock={blockChat}
              />
            )}
          </div>

          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <Title level={5}>Select a conversation</Title>
                    <Text type="secondary">
                      Choose a chat from the list to view messages and reply.
                    </Text>
                  </div>
                }
              />
            </div>
          ) : (
            <>
              <div
                className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4"
                onScroll={(event) => {
                  if (
                    event.currentTarget.scrollTop < 80 &&
                    messageMeta.currentPage < messageMeta.totalPages &&
                    !loadingMessages
                  ) {
                    loadMessages(selectedId, messageMeta.currentPage + 1, true);
                  }
                }}
              >
                {loadingMessages ? (
                  <Skeleton active paragraph={{ rows: 8 }} />
                ) : (
                  <Space direction="vertical" size={12} className="w-full">
                    {filteredMessages.length === 0 ? (
                      <Empty description="No messages in this conversation" />
                    ) : (
                      filteredMessages.map((message, index) => {
                        const previous = filteredMessages[index - 1];
                        const showDate =
                          !previous ||
                          getDateLabel(previous.createdAt) !== getDateLabel(message.createdAt);

                        return (
                          <React.Fragment key={message._id}>
                            {showDate && (
                              <div className="flex justify-center">
                                <Tag color="default">{getDateLabel(message.createdAt)}</Tag>
                              </div>
                            )}
                            <MessageBubble message={message} searchQuery={messageSearch} />
                          </React.Fragment>
                        );
                      })
                    )}
                    <div ref={messageEndRef} />
                  </Space>
                )}
              </div>

              <div className="border-t bg-white p-3">
                <Input
                  allowClear
                  className="mb-3"
                  prefix={<SearchOutlined />}
                  placeholder="Search messages, files, dates"
                  value={messageSearch}
                  onChange={(event) => setMessageSearch(event.target.value)}
                />
                {messageMeta.totalPages > 1 && (
                  <div className="mb-3 flex justify-center">
                    <Pagination
                      size="small"
                      current={messageMeta.currentPage}
                      total={messageMeta.total}
                      pageSize={50}
                      showSizeChanger={false}
                      onChange={(page) => loadMessages(selectedId, page)}
                    />
                  </div>
                )}

                <div className="mb-3 flex gap-2">
                  <Select
                    showSearch
                    allowClear
                    placeholder="Quick replies"
                    value={undefined}
                    onSearch={setReplySearch}
                    onFocus={loadSavedReplies}
                    onChange={async (replyId) => {
                      if (!replyId) return;
                      const response = await liveChatAPI.useSavedReply(replyId);
                      const reply = response.data?.data?.reply;
                      if (reply?.message) setMessageText(reply.message);
                    }}
                    options={savedReplies.map((reply) => ({
                      value: reply._id,
                      label: reply.title,
                    }))}
                    style={{ flex: 1 }}
                  />
                  <Button onClick={createSavedReply}>Save Reply</Button>
                </div>

                {attachment && (
                  <div className="mb-3 flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2">
                    <Space>
                      {attachment.type === "application/pdf" ? (
                        <FilePdfOutlined />
                      ) : (
                        <PaperClipOutlined />
                      )}
                      <Text ellipsis className="max-w-[260px]">
                        {attachment.name}
                      </Text>
                      <Text type="secondary" className="text-xs">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </Text>
                    </Space>
                    <Space>
                      {attachment.type !== "application/pdf" && (
                        <Button size="small" onClick={() => setPreviewOpen(true)}>
                          Preview
                        </Button>
                      )}
                      <Button size="small" icon={<StopOutlined />} onClick={clearAttachment} />
                    </Space>
                  </div>
                )}

                <Space.Compact className="w-full" block>
                  <Upload
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    beforeUpload={validateAttachment}
                    showUploadList={false}
                    disabled={selectedClosed}
                  >
                    <Tooltip title="Attach image or PDF">
                      <Button icon={<PaperClipOutlined />} disabled={selectedClosed} />
                    </Tooltip>
                  </Upload>
                  <TextArea
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={(event) => {
                      emitTyping();
                      handleKeyDown(event);
                    }}
                    disabled={selectedClosed}
                    placeholder={
                      selectedClosed
                        ? "Conversation is closed"
                        : "Type a reply. Enter sends, Shift + Enter adds a line."
                    }
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={sending}
                    disabled={selectedClosed}
                    onClick={sendMessage}
                  >
                    Send
                  </Button>
                </Space.Compact>
              </div>
            </>
          )}
        </div>
      </div>

      <Drawer
        title={mode === "closed" ? "Closed Chats" : "Inbox"}
        open={mobileListOpen}
        onClose={() => setMobileListOpen(false)}
        width={360}
        placement="left"
      >
        {ConversationList}
      </Drawer>

      <Modal
        open={previewOpen}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        title={attachment?.name}
      >
        {attachment && attachment.type !== "application/pdf" && (
          <img
            src={URL.createObjectURL(attachment)}
            alt={attachment.name}
            className="w-full rounded"
          />
        )}
      </Modal>

      <Drawer
        title="Support Tools"
        open={supportDrawerOpen}
        onClose={() => setSupportDrawerOpen(false)}
        width={420}
      >
        <Space direction="vertical" className="w-full" size={16}>
          {analytics && (
            <Card size="small" title="Live Chat Analytics">
              <Space wrap>
                <Tag>Total {analytics.totalConversations}</Tag>
                <Tag color="green">Open {analytics.open}</Tag>
                <Tag color="gold">Pending {analytics.pending}</Tag>
                <Tag color="blue">Resolved {analytics.resolved}</Tag>
                <Tag>Closed {analytics.closed}</Tag>
                <Tag>Rating {Number(analytics.averageRating || 0).toFixed(1)}</Tag>
              </Space>
            </Card>
          )}

          <Card size="small" title="Internal Notes">
            <Space direction="vertical" className="w-full">
              <TextArea
                rows={3}
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Write an internal note. Users cannot see this."
              />
              <Button type="primary" onClick={saveNote} disabled={!noteText.trim()}>
                Save Note
              </Button>
              <List
                size="small"
                dataSource={notes}
                locale={{ emptyText: "No notes yet" }}
                renderItem={(note) => (
                  <List.Item
                    actions={[
                      <Button key="delete" danger type="link" onClick={() => deleteNote(note._id)}>
                        Delete
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={formatChatTime(note.createdAt)}
                      description={note.note}
                    />
                  </List.Item>
                )}
              />
            </Space>
          </Card>

          <Card size="small" title="Export">
            <Space>
              <Button onClick={() => exportConversation("txt")}>TXT</Button>
              <Button onClick={() => exportConversation("csv")}>CSV</Button>
              <Button onClick={() => exportConversation("pdf")}>PDF</Button>
            </Space>
          </Card>
        </Space>
      </Drawer>
    </>
  );
};

export default LiveChatWorkspace;
