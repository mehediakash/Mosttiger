export const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;

export const ACCEPTED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const getConversationId = (conversation) =>
  conversation?._id || conversation?.id || "";

export const formatChatTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export const buildClientMessageId = () =>
  `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const isImageAttachment = (attachment) =>
  attachment?.mimeType?.startsWith("image/");

export const getUserUnreadCount = (conversation) =>
  conversation?.unreadCount?.user || 0;

export const normalizePreview = (message) => {
  if (!message) return "";
  if (message.message) return message.message;
  if (message.messageType === "image") return "Image";
  if (message.messageType === "file") return "File";
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
  const regex = new RegExp(`(${escaped})`, "ig");

  return String(text).split(regex);
};
