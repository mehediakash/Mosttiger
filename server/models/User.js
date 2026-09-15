const mongoose = require("mongoose");
const {
  AFFILIATE_CARRY_RESET,
  AFFILIATE_REVENUE_SHARE_START_CONDITION,
  AFFILIATE_SETTLEMENT_FREQUENCY,
  AFFILIATE_STATUS,
  AFFILIATE_WITHDRAW_APPROVAL,
  DEFAULT_AFFILIATE_CONFIG,
} = require("../constants/affiliate");

const affiliateConfigSchema = new mongoose.Schema(
  {
    revenueSharePercentage: {
      type: Number,
      default: DEFAULT_AFFILIATE_CONFIG.revenueSharePercentage,
      min: 0,
      max: 100,
    },
    minimumDeposit: {
      type: Number,
      default: DEFAULT_AFFILIATE_CONFIG.minimumDeposit,
      min: 0,
    },
    requiredTurnover: {
      type: Number,
      default: DEFAULT_AFFILIATE_CONFIG.requiredTurnover,
      min: 0,
    },
    enableNegativeCarry: {
      type: Boolean,
      default: DEFAULT_AFFILIATE_CONFIG.enableNegativeCarry,
    },
    carryReset: {
      type: String,
      enum: Object.values(AFFILIATE_CARRY_RESET),
      default: DEFAULT_AFFILIATE_CONFIG.carryReset,
    },
    maximumNegativeCarry: {
      type: Number,
      default: DEFAULT_AFFILIATE_CONFIG.maximumNegativeCarry,
      min: 0,
    },
    settlementFrequency: {
      type: String,
      enum: Object.values(AFFILIATE_SETTLEMENT_FREQUENCY),
      default: DEFAULT_AFFILIATE_CONFIG.settlementFrequency,
    },
    minimumWithdraw: {
      type: Number,
      default: DEFAULT_AFFILIATE_CONFIG.minimumWithdraw,
      min: 0,
    },
    withdrawApproval: {
      type: String,
      enum: Object.values(AFFILIATE_WITHDRAW_APPROVAL),
      default: DEFAULT_AFFILIATE_CONFIG.withdrawApproval,
    },
    revenueShareStartCondition: {
      type: String,
      enum: Object.values(AFFILIATE_REVENUE_SHARE_START_CONDITION),
      default: DEFAULT_AFFILIATE_CONFIG.revenueShareStartCondition,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const affiliateStatisticsSchema = new mongoose.Schema(
  {
    totalClicks: { type: Number, default: 0, min: 0 },
    totalRegistrations: { type: Number, default: 0, min: 0 },
    totalPlayers: { type: Number, default: 0, min: 0 },
    activePlayers: { type: Number, default: 0, min: 0 },
    qualifiedPlayers: { type: Number, default: 0, min: 0 },
    totalDeposits: { type: Number, default: 0, min: 0 },
    totalTurnover: { type: Number, default: 0, min: 0 },
    totalGrossRevenue: { type: Number, default: 0 },
    totalNetRevenue: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0, min: 0 },
    pendingCommission: { type: Number, default: 0, min: 0 },
    settledCommission: { type: Number, default: 0, min: 0 },
    withdrawableBalance: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 },
    lifetimeWithdraw: { type: Number, default: 0, min: 0 },
    negativeCarryBalance: { type: Number, default: 0 },
    lastCalculatedAt: { type: Date, default: null },
    lastSettlementAt: { type: Date, default: null },
  },
  { _id: false },
);

const affiliateWalletSchema = new mongoose.Schema(
  {
    pendingCommission: { type: Number, default: 0, min: 0 },
    settledCommission: { type: Number, default: 0, min: 0 },
    withdrawableBalance: { type: Number, default: 0, min: 0 },
    lifetimeEarnings: { type: Number, default: 0, min: 0 },
    lifetimeWithdraw: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) => !/\s/.test(value),
        message: "Username cannot contain spaces",
      },
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [/^01[3-9]\d{8}$/, "Invalid Bangladesh phone number"],
    },
    phones: [
      {
        number: {
          type: String,
          trim: true,
          match: [/^01[3-9]\d{8}$/, "Invalid Bangladesh phone number"],
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },

    // Role & Hierarchy
    role: {
      type: String,
      enum: ["user", "sub_agent", "agent", "master_agent", "admin"],
      default: "user",
    },
    referenceCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referralCodeUsed: {
      type: String,
      default: null,
    },
    hierarchy: {
      masterAgent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      subAgent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    affiliate: {
      approved: {
        type: Boolean,
        default: false,
      },
      status: {
        type: String,
        enum: [...Object.values(AFFILIATE_STATUS), null],
        default: null,
      },
      approvedAt: {
        type: Date,
        default: null,
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      rejectedAt: {
        type: Date,
        default: null,
      },
      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      suspendedAt: {
        type: Date,
        default: null,
      },
      suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      affiliateCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: undefined,
      },
      application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AffiliateApplication",
        default: null,
      },
      config: {
        type: affiliateConfigSchema,
        default: () => ({}),
      },
      statistics: {
        type: affiliateStatisticsSchema,
        default: () => ({}),
      },
      wallet: {
        type: affiliateWalletSchema,
        default: () => ({}),
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    affiliateTracking: {
      affiliate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      affiliateCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
      },
      registeredAt: {
        type: Date,
        default: null,
      },
    },
    userId: {
      type: Number,
      unique: true,
      index: true,
    },
    // Wallet System
    wallet: {
      main: { type: Number, default: 0, min: 0 },
      bonus: { type: Number, default: 0, min: 0 },
      freeBets: { type: Number, default: 0, min: 0 },
    },

    // Status & Verification
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },

    // Security
    otp: {
      code: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      purpose: {
        type: String,
        enum: ["signup", "reset_password", "email_verification"],
        default: null,
      },
    },
    lastLogin: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    // Terms & Conditions
    agreedToTerms: { type: Boolean, default: false },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for referred users count
userSchema.virtual("referredUsersCount", {
  ref: "User",
  localField: "_id",
  foreignField: "referredBy",
  count: true,
});

// Indexes for performance
userSchema.index({ role: 1 });
userSchema.index({ referredBy: 1 });
userSchema.index({ "hierarchy.masterAgent": 1 });
userSchema.index({ "hierarchy.agent": 1 });
userSchema.index({ "hierarchy.subAgent": 1 });
userSchema.index({ "affiliate.status": 1 });
userSchema.index(
  { "affiliate.affiliateCode": 1 },
  {
    unique: true,
    name: "affiliate.affiliateCode_1",
    partialFilterExpression: {
      "affiliate.status": AFFILIATE_STATUS.APPROVED,
      "affiliate.affiliateCode": { $type: "string" },
    },
  },
);
userSchema.index({ "affiliateTracking.affiliate": 1 });
userSchema.index({ "affiliateTracking.affiliateCode": 1 });
userSchema.index({ "otp.expiresAt": 1 }, { expireAfterSeconds: 0 });

// Generate reference code & sanitize wallet & updatedAt
userSchema.pre("save", function () {
  if (this.isNew && !this.referenceCode) {
    const randomString = Math.random().toString(36).substr(2, 9).toUpperCase();
    this.referenceCode = `REF${randomString}`;
  }

  const normalizedPhones = Array.isArray(this.phones)
    ? this.phones
        .map((entry) => ({
          number: typeof entry?.number === "string" ? entry.number.trim() : "",
          isPrimary: Boolean(entry?.isPrimary),
        }))
        .filter((entry) => entry.number)
    : [];

  if (normalizedPhones.length > 0) {
    const primaryIndex = normalizedPhones.findIndex((entry) => entry.isPrimary);

    const resolvedPhones = normalizedPhones.map((entry, index) => ({
      number: entry.number,
      isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex,
    }));

    this.phones = resolvedPhones;
    this.phone =
      resolvedPhones.find((entry) => entry.isPrimary)?.number ||
      resolvedPhones[0].number;
  } else if (typeof this.phone === "string" && this.phone.trim()) {
    this.phone = this.phone.trim();
    this.phones = [{ number: this.phone, isPrimary: true }];
  }

  if (
    this.isModified("wallet.main") ||
    this.isModified("wallet.bonus") ||
    this.isModified("wallet.freeBets")
  ) {
    this.wallet.main = Math.max(0, this.wallet.main);
    this.wallet.bonus = Math.max(0, this.wallet.bonus);
    this.wallet.freeBets = Math.max(0, this.wallet.freeBets);
  }

  this.updatedAt = Date.now();
});

// Password comparison method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return this.password === candidatePassword;
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
    return this.save();
  }

  this.loginAttempts += 1;

  if (this.loginAttempts >= 5 && !this.isLocked()) {
    this.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  }

  return this.save();
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();
  return this.save();
};

// Generate OTP
userSchema.methods.generateOTP = function (purpose) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  this.otp = {
    code: otp,
    expiresAt: expiresAt,
    purpose: purpose,
  };

  return this.save().then(() => otp);
};

// Verify OTP
userSchema.methods.verifyOTP = function (enteredOTP, purpose) {
  if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
    return false;
  }

  const isExpired = this.otp.expiresAt < new Date();
  const isMatch = this.otp.code === enteredOTP;
  const isPurposeMatch = this.otp.purpose === purpose;

  if (isMatch && !isExpired && isPurposeMatch) {
    this.otp = { code: null, expiresAt: null, purpose: null };
    return this.save().then(() => true);
  }

  return false;
};

module.exports = mongoose.model("User", userSchema);
