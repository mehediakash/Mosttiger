const express = require("express");
const {
  createConversation,
  getMyConversations,
  getConversationDetails,
  closeConversation,
  assignConversation,
  updateConversationStatus,
  updateConversationPriority,
  updateConversationTags,
  archiveConversation,
  restoreConversation,
  updateChatRestriction,
  rateConversation,
  createNote,
  getNotes,
  updateNote,
  deleteNote,
  getSavedReplies,
  createSavedReply,
  updateSavedReply,
  deleteSavedReply,
  useSavedReply,
  getAnalytics,
  exportConversation,
  sendMessage,
  adminReply,
  getMessages,
  uploadAttachment,
  deleteAttachment,
  markConversationRead,
} = require("../controllers/conversationController");
const { protect } = require("../middleware/auth");
const { singleChatAttachment } = require("../middleware/chatUpload");

const router = express.Router();

router.use(protect);

router.post("/", createConversation);
router.get("/", getMyConversations);
router.get("/analytics/summary", getAnalytics);
router.get("/saved-replies", getSavedReplies);
router.post("/saved-replies", createSavedReply);
router.put("/saved-replies/:replyId", updateSavedReply);
router.delete("/saved-replies/:replyId", deleteSavedReply);
router.post("/saved-replies/:replyId/use", useSavedReply);
router.get("/:id", getConversationDetails);
router.patch("/:id/close", closeConversation);
router.patch("/:id/assign", assignConversation);
router.patch("/:id/status", updateConversationStatus);
router.patch("/:id/priority", updateConversationPriority);
router.patch("/:id/tags", updateConversationTags);
router.patch("/:id/archive", archiveConversation);
router.patch("/:id/restore", restoreConversation);
router.patch("/:id/restriction", updateChatRestriction);
router.post("/:id/rating", rateConversation);
router.get("/:id/notes", getNotes);
router.post("/:id/notes", createNote);
router.put("/:id/notes/:noteId", updateNote);
router.delete("/:id/notes/:noteId", deleteNote);
router.get("/:id/export", exportConversation);
router.get("/:id/messages", getMessages);
router.post("/:id/messages", singleChatAttachment("attachment"), sendMessage);
router.post("/:id/admin-reply", singleChatAttachment("attachment"), adminReply);
router.post("/:id/attachments", singleChatAttachment("attachment"), uploadAttachment);
router.delete("/:id/attachments/:attachmentId", deleteAttachment);
router.patch("/:id/read", markConversationRead);

module.exports = router;
