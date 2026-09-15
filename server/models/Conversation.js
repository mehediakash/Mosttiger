const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
  assignedAt: {
    type: Date,
    default: null,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  assignmentHistory: [
    {
      assignedAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      assignedAt: {
        type: Date,
        default: Date.now,
      },
      previousAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  ],
  status: {
    type: String,
    enum: ["open", "pending", "resolved", "closed", "archived"],
    default: "open",
    index: true,
  },
  priority: {
    type: String,
    enum: ["low", "normal", "high", "urgent"],
    default: "normal",
    index: true,
  },
  tags: [
    {
      type: String,
      enum: [
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
      ],
      index: true,
    },
  ],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },
  lastMessageTime: {
    type: Date,
    default: null,
    index: true,
  },
  lastSender: {
    senderType: {
      type: String,
      enum: ["user", "admin", "system", null],
      default: null,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  unreadCount: {
    user: {
      type: Number,
      default: 0,
      min: 0,
    },
    admin: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  closedAt: {
    type: Date,
    default: null,
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  archivedAt: {
    type: Date,
    default: null,
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  chatRestriction: {
    blocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    muted: {
      type: Boolean,
      default: false,
    },
    disabledUntil: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    createdAt: {
      type: Date,
      default: null,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

conversationSchema.pre("save", function () {
  this.updatedAt = Date.now();

  if (this.status !== "closed") {
    this.closedAt = null;
    this.closedBy = null;
  }

  if (this.status !== "resolved") {
    this.resolvedAt = this.status === "closed" ? this.resolvedAt : null;
    this.resolvedBy = this.status === "closed" ? this.resolvedBy : null;
  }

  if (this.status !== "archived") {
    this.archivedAt = null;
    this.archivedBy = null;
  }
});

conversationSchema.index(
  { user: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open" },
    name: "unique_open_conversation_per_user",
  },
);
conversationSchema.index({ user: 1, updatedAt: -1 });
conversationSchema.index({ status: 1, priority: 1, updatedAt: -1 });
conversationSchema.index({ assignedAdmin: 1, status: 1, updatedAt: -1 });
conversationSchema.index({ tags: 1, status: 1, updatedAt: -1 });
conversationSchema.index({ "rating.score": 1 });
conversationSchema.index({ archivedAt: -1 });
conversationSchema.index({ lastMessageTime: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
