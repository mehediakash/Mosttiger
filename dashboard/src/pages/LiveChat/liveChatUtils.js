export const CHAT_FILTERS = [
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Closed", value: "closed" },
  { label: "High Priority", value: "high" },
  { label: "Unread", value: "unread" },
];

export const getConversationId = (conversation) =>
  conversation?._id || conversation?.id || "";

export const getUserDisplayName = (conversation) => {
  const user = conversation?.user;

  if (user && typeof user === "object") {
    return user.username || user.name || user.fullName || "User";
  }

  return "User";
};

export const getUserInitial = (conversation) =>
  getUserDisplayName(conversation).charAt(0).toUpperCase();

export const getUserAvatar = (conversation) => {
  const user = conversation?.user;
  if (!user || typeof user !== "object") return null;
  return user.avatar || user.profilePhoto || null;
};

export const getLastMessageText = (conversation, previewMap = {}) => {
  const id = getConversationId(conversation);
  const preview = previewMap[id];

  if (preview) return preview;

  if (conversation?.lastMessage && typeof conversation.lastMessage === "object") {
    return (
      conversation.lastMessage.message ||
      conversation.lastMessage.messageType ||
      "Attachment"
    );
  }

  if (conversation?.lastMessage) return "Recent activity";

  return "No messages yet";
};

export const formatChatTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export const getPriorityColor = (priority) => {
  if (priority === "urgent") return "red";
  if (priority === "high") return "orange";
  return "blue";
};

export const getStatusColor = (status) => {
  if (status === "closed") return "default";
  if (status === "pending") return "gold";
  return "green";
};

export const isImageAttachment = (attachment) =>
  attachment?.mimeType?.startsWith("image/");

export const buildClientMessageId = () =>
  `dash_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const normalizeMessagePreview = (message) => {
  if (!message) return "";
  if (message.message) return message.message;
  if (message.messageType === "image") return "Image attachment";
  if (message.messageType === "file") return "File attachment";
  if (message.messageType === "system") return "System update";
  return "New message";
};

export const getDateLabel = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatLastSeen = (value) => {
  if (!value) return "";
  return `Last seen ${formatChatTime(value)}`;
};

export const highlightText = (text, query) => {
  if (!text) return [];
  if (!query) return [String(text)];

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(text).split(new RegExp(`(${escaped})`, "ig"));
};
