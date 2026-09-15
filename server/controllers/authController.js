const Counter = require("../models/Counter");
const User = require("../models/User");
const affiliateService = require("../services/affiliateService");
const affiliateTrackingService = require("../services/affiliateTrackingService");
const referralService = require("../services/referralService");
const emailService = require("../utils/emailService");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const phoneRegex = /^01[3-9]\d{8}$/;
const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

const normalizePhones = (phones, fallbackPhone) => {
  const rawPhones = Array.isArray(phones)
    ? phones
    : fallbackPhone
      ? [{ number: fallbackPhone, isPrimary: true }]
      : [];

  const normalizedPhones = rawPhones
    .map((entry) => {
      if (typeof entry === "string") {
        return { number: entry.trim(), isPrimary: false };
      }

      return {
        number: typeof entry?.number === "string" ? entry.number.trim() : "",
        isPrimary: Boolean(entry?.isPrimary),
      };
    })
    .filter((entry) => entry.number);

  if (!normalizedPhones.length) {
    return [];
  }

  const seen = new Set();
  const dedupedPhones = [];

  for (const entry of normalizedPhones) {
    if (seen.has(entry.number)) {
      return null;
    }

    seen.add(entry.number);
    dedupedPhones.push(entry);
  }

  const primaryIndex = dedupedPhones.findIndex((entry) => entry.isPrimary);

  return dedupedPhones.map((entry, index) => ({
    number: entry.number,
    isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex,
  }));
};

const getPrimaryPhone = (user) => {
  const phones = Array.isArray(user?.phones) ? user.phones : [];
  const primaryPhone = phones.find((entry) => entry?.isPrimary) || phones[0];

  return primaryPhone?.number || user?.phone || "";
};

const serializeProfile = (user) => {
  const phones =
    Array.isArray(user?.phones) && user.phones.length
      ? user.phones
          .map((entry) => ({
            number:
              typeof entry?.number === "string" ? entry.number.trim() : "",
            isPrimary: Boolean(entry?.isPrimary),
          }))
          .filter((entry) => entry.number)
      : user?.phone
        ? [{ number: user.phone, isPrimary: true }]
        : [];

  const primaryPhone = phones.find((entry) => entry.isPrimary) || phones[0];

  return {
    _id: user._id,
    username: user.username,
    fullName: user.fullName || "",
    email: user.email || "",
    phone: primaryPhone?.number || user.phone || "",
    phones,
    dateOfBirth: user.dateOfBirth || null,
    birthday: user.dateOfBirth || null,
    role: user.role,
    referenceCode: user.referenceCode,
    referralCodeUsed: user.referralCodeUsed || null,
    referredBy: user.referredBy || null,
    profilePhoto: user.profilePhoto,
    wallet: user.wallet,
    createdAt: user.createdAt,
  };
};

async function getNextUserId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "userId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
}
// Send response with token
const sendTokenResponse = async (user, statusCode, res, extraData = {}) => {
  const token = generateToken(user._id);

  const userObj = {
    _id: user._id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: getPrimaryPhone(user),
    phones: Array.isArray(user.phones)
      ? user.phones
      : user.phone
        ? [{ number: user.phone, isPrimary: true }]
        : [],
    dateOfBirth: user.dateOfBirth,
    birthday: user.dateOfBirth,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    wallet: user.wallet,
    profilePhoto: user.profilePhoto,
    referenceCode: user.referenceCode,
    affiliate: user.affiliate || {},
    permissions: [],
  };

  const affiliateDashboard = affiliateService.getAffiliateAccess(
    user.affiliate,
  );

  // Fetch agent permissions if user is an agent
  if (user.role && ["master_agent", "agent", "sub_agent"].includes(user.role)) {
    try {
      const AgentSettings = require("../models/AgentSettings");
      // lean() reduces memory usage for read-only permission check
      const agentSettings = await AgentSettings.findOne({
        agent: user._id,
      }).lean();

      if (agentSettings) {
        // Add settings to user object (commission rates, wallet, limits)
        userObj.settings = {
          commissionRates: agentSettings.commissionRates,
          wallet: agentSettings.wallet,
          limits: agentSettings.limits,
          isActive: agentSettings.isActive,
          isSuspended: agentSettings.isSuspended,
        };

        if (agentSettings.permissions) {
          // Convert permission object to array of granted permissions
          const permissionsList = [];
          const perms = agentSettings.permissions;

          // User Management
          if (perms.addUser) permissionsList.push("create_users");
          if (perms.editUser) permissionsList.push("edit_users");
          if (perms.viewUsers) permissionsList.push("view_users");
          if (perms.resetUserPassword)
            permissionsList.push("reset_user_password");

          // Balance Management
          if (perms.addBalance) permissionsList.push("add_balance");
          if (perms.deductBalance) permissionsList.push("deduct_balance");
          if (perms.adjustBalance) permissionsList.push("adjust_balance");

          // Transaction Management
          if (perms.approveDeposit) permissionsList.push("approve_deposits");
          if (perms.approveWithdrawal)
            permissionsList.push("approve_withdrawals");
          if (perms.viewTransactions) permissionsList.push("view_transactions");

          // Bet Management
          if (perms.viewUserBets) permissionsList.push("view_user_bets");
          if (perms.cancelBets) permissionsList.push("cancel_bets");

          // Agent Management
          if (perms.createSubAgents) permissionsList.push("create_sub_agents");
          if (perms.viewSubAgents) permissionsList.push("view_sub_agents");
          if (perms.setSubAgentCommission)
            permissionsList.push("set_sub_agent_commission");

          // Financial
          if (perms.viewCommission) permissionsList.push("view_commission");
          if (perms.withdrawCommission)
            permissionsList.push("withdraw_commission");
          if (perms.viewReports) permissionsList.push("view_reports");

          // Additional permissions (if exist in AgentSettings)
          if (perms.manageGames) permissionsList.push("manage_games");
          if (perms.managePromotions) permissionsList.push("manage_promotions");
          if (perms.manageContent) permissionsList.push("manage_content");
          if (perms.manageSettings) permissionsList.push("manage_settings");
          if (perms.viewSystemHealth)
            permissionsList.push("view_system_health");
          if (perms.manageFraudDetection)
            permissionsList.push("manage_fraud_detection");

          userObj.permissions = permissionsList;
        }
      }
    } catch (error) {
      console.error("Error fetching agent permissions:", error);
      // Continue without permissions rather than failing the request
    }
  }

  res.status(statusCode).json({
    success: true,
    token,
    user: userObj,
    affiliateDashboard,
    ...extraData,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, phone, password, referenceCode, agreedToTerms } =
      req.body;
    const affiliateCode =
      typeof req.body.aff === "string"
        ? req.body.aff.trim()
        : typeof req.body.affiliateCode === "string"
          ? req.body.affiliateCode.trim()
          : "";
    const referralTrackingCode =
      typeof req.body.ref === "string"
        ? req.body.ref.trim()
        : typeof req.body.referralCode === "string"
          ? req.body.referralCode.trim()
          : "";

    const normalizedUsername =
      typeof username === "string" ? username.trim().toLowerCase() : "";
    const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
    const phoneRegex = /^01[3-9]\d{8}$/;

    // Validation
    if (!normalizedUsername || !normalizedPhone || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields",
      });
    }

    if (/\s/.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: "Username cannot contain spaces",
      });
    }

    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bangladesh phone number",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({
        success: false,
        message: "You must agree to the terms and conditions",
      });
    }

    // Check if user exists
    const existingUsername = await User.findOne({
      username: normalizedUsername,
    })
      .select("_id")
      .lean();
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    const existingPhone = await User.findOne({ phone: normalizedPhone })
      .select("_id")
      .lean();
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number already exists",
      });
    }

    // Only Fix: Generate userId ONCE at the top, right before use
    const userId = await getNextUserId(); // This was missing!

    let user;
    const trackAffiliateRegistration = async () => {
      if (!user || !affiliateCode) return;

      try {
        await affiliateTrackingService.trackRegistration(
          user._id,
          affiliateCode,
        );
      } catch (error) {
        console.error("Affiliate registration tracking error:", error);
      }
    };
    const trackReferralRegistration = async () => {
      if (!user || !referralTrackingCode) return;

      try {
        await referralService.trackRegistration(user._id, referralTrackingCode);
      } catch (error) {
        console.error("Referral registration tracking error:", error);
      }
    };

    // Handle referral code
    let referredBy = null;

    if (referenceCode) {
      // lean() reduces memory usage for referrer lookup
      const referrer = await User.findOne({
        referenceCode: referenceCode.toUpperCase(),
      })
        .select("_id role")
        .lean();

      if (referrer) {
        referredBy = referrer._id;
        // Set hierarchy based on referrer's role
        const hierarchy = {};
        if (referrer.role === "master_agent")
          hierarchy.masterAgent = referrer._id;
        if (referrer.role === "agent") hierarchy.agent = referrer._id;
        if (referrer.role === "sub_agent") hierarchy.subAgent = referrer._id;

        // Create user with hierarchy
        user = await User.create({
          // 'user' not 'const user' → keeps outer scope
          fullName: normalizedUsername,
          username: normalizedUsername,
          phone: normalizedPhone,
          password,
          userId,
          referredBy: referredBy,
          referralCodeUsed: referenceCode,
          hierarchy,
          agreedToTerms,
        });

        // Your original safety fallback (kept 100% unchanged)
        if (!user.userId) {
          const userId = await getNextUserId();
          user.userId = userId;
          await user.save();
        }

        // Set email as verified
        user.isEmailVerified = true;
        await user.save();
        await trackAffiliateRegistration();
        await trackReferralRegistration();

        return await sendTokenResponse(user, 201, res, {
          message: "Registration successful.",
        });
      } else {
        // Invalid referral code - give 10 Taka bonus
        user = await User.create({
          // 'user' not 'const user'
          fullName: normalizedUsername,
          username: normalizedUsername,
          phone: normalizedPhone,
          password,
          userId,
          referralCodeUsed: referenceCode,
          wallet: { main: 0, bonus: 10, freeBets: 0 },
          agreedToTerms,
        });

        // Set email as verified
        user.isEmailVerified = true;
        await user.save();
        await trackAffiliateRegistration();
        await trackReferralRegistration();

        return await sendTokenResponse(user, 201, res, {
          message:
            "Registration successful. Invalid referral code - 10 Taka bonus added!",
          bonus: 10,
        });
      }
    } else {
      // No referral code
      user = await User.create({
        // 'user' not 'const user'
        fullName: normalizedUsername,
        username: normalizedUsername,
        phone: normalizedPhone,
        userId,
        password,
        agreedToTerms,
      });

      // Set email as verified
      user.isEmailVerified = true;
      await user.save();
      await trackAffiliateRegistration();
      await trackReferralRegistration();

      return await sendTokenResponse(user, 201, res, {
        message: "Registration successful.",
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? error.message : {},
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp, purpose } = req.body;

    if (!userId || !otp || !purpose) {
      return res.status(400).json({
        success: false,
        message: "User ID, OTP and purpose are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isVerified = await user.verifyOTP(otp, purpose);

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Update user based on OTP purpose
    if (purpose === "signup" || purpose === "email_verification") {
      user.isEmailVerified = true;
      await user.save();

      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.fullName);
    }

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during OTP verification",
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { userId, purpose } = req.body;

    if (!userId || !purpose) {
      return res.status(400).json({
        success: false,
        message: "User ID and purpose are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = await user.generateOTP(purpose);
    await emailService.sendOTPEmail(user.email, otp, purpose);

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while resending OTP",
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;
    const normalizedUsername =
      typeof username === "string" ? username.trim().toLowerCase() : "";

    if (!normalizedUsername || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username and password",
      });
    }

    // Find user and include password for comparison
    let user = await User.findOne({ username: normalizedUsername }).select(
      "+password",
    );

    if (!user) {
      user = await User.findOne({
        email: normalizedUsername,
      }).select("+password");

      if (!user && normalizedUsername.includes("@")) {
        const derivedUsername = normalizedUsername.split("@")[0];
        user = await User.findOne({ username: derivedUsername }).select(
          "+password",
        );
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Check if account is locked
    // if (user.isLocked()) {
    //   return res.status(423).json({
    //     success: false,
    //     message:
    //       "Account temporarily locked due to too many failed attempts. Try again later.",
    //   });
    // }

    // Check password
    const isPasswordMatch = user.password === password;

    if (!isPasswordMatch) {
      await user.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Send token response
    await sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide your email",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email",
      });
    }

    // Generate OTP for password reset
    const otp = await user.generateOTP("reset_password");
    await emailService.sendOTPEmail(user.email, otp, "reset_password");

    res.status(200).json({
      success: true,
      message: "OTP sent to your email for password reset",
      userId: user._id,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password reset request",
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword, confirmPassword } = req.body;

    if (!userId || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify OTP
    const isOTPVerified = await user.verifyOTP(otp, "reset_password");
    if (!isOTPVerified) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password reset",
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -otp")
      .populate("referredBy", "username fullName email phone referenceCode")
      .populate(
        "hierarchy.masterAgent",
        "username fullName email phone referenceCode",
      )
      .populate(
        "hierarchy.agent",
        "username fullName email phone referenceCode",
      )
      .populate(
        "hierarchy.subAgent",
        "username fullName email phone referenceCode",
      );

    // If user is an agent, include their settings with commission rates
    if (
      user.role &&
      ["master_agent", "agent", "sub_agent"].includes(user.role)
    ) {
      const AgentSettings = require("../models/AgentSettings");
      const agentSettings = await AgentSettings.findOne({ agent: user._id });

      if (agentSettings) {
        // Attach settings to user object
        const userObj = user.toObject();
        userObj.settings = {
          commissionRates: agentSettings.commissionRates,
          wallet: agentSettings.wallet,
          limits: agentSettings.limits,
          permissions: agentSettings.permissions,
          isActive: agentSettings.isActive,
          isSuspended: agentSettings.isSuspended,
        };

        // Convert permissions to array format for frontend
        const permissionsList = [];
        const perms = agentSettings.permissions;

        // User Management
        if (perms.addUser) permissionsList.push("create_users");
        if (perms.editUser) permissionsList.push("edit_users");
        if (perms.viewUsers) permissionsList.push("view_users");
        if (perms.resetUserPassword)
          permissionsList.push("reset_user_password");

        // Balance Management
        if (perms.addBalance) permissionsList.push("add_balance");
        if (perms.deductBalance) permissionsList.push("deduct_balance");
        if (perms.adjustBalance) permissionsList.push("adjust_balance");

        // Transaction Management
        if (perms.approveDeposit) permissionsList.push("approve_deposits");
        if (perms.approveWithdrawal)
          permissionsList.push("approve_withdrawals");
        if (perms.viewTransactions) permissionsList.push("view_transactions");

        // Bet Management
        if (perms.viewUserBets) permissionsList.push("view_user_bets");
        if (perms.cancelBets) permissionsList.push("cancel_bets");

        // Agent Management
        if (perms.createSubAgents) permissionsList.push("create_sub_agents");
        if (perms.viewSubAgents) permissionsList.push("view_sub_agents");
        if (perms.setSubAgentCommission)
          permissionsList.push("set_sub_agent_commission");

        // Financial
        if (perms.viewCommission) permissionsList.push("view_commission");
        if (perms.withdrawCommission)
          permissionsList.push("withdraw_commission");
        if (perms.viewReports) permissionsList.push("view_reports");

        // Additional permissions
        if (perms.manageGames) permissionsList.push("manage_games");
        if (perms.managePromotions) permissionsList.push("manage_promotions");
        if (perms.manageContent) permissionsList.push("manage_content");
        if (perms.manageSettings) permissionsList.push("manage_settings");
        if (perms.viewSystemHealth) permissionsList.push("view_system_health");
        if (perms.manageFraudDetection)
          permissionsList.push("manage_fraud_detection");

        userObj.permissions = permissionsList;

        return res.status(200).json({
          success: true,
          user: userObj,
          affiliateDashboard: affiliateService.getAffiliateAccess(
            user.affiliate,
          ),
        });
      }
    }

    res.status(200).json({
      success: true,
      user,
      affiliateDashboard: affiliateService.getAffiliateAccess(user.affiliate),
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user data",
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -otp");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: serializeProfile(user),
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
};

// @desc    Update user profile
// @route   PATCH /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, dateOfBirth, email, phones, phone } = req.body;

    const user = await User.findById(req.user.id).select("-password -otp");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (fullName !== undefined) {
      user.fullName = typeof fullName === "string" ? fullName.trim() : "";
    }

    if (dateOfBirth !== undefined) {
      user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

      if (user.dateOfBirth && Number.isNaN(user.dateOfBirth.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid birthday",
        });
      }

      if (user.dateOfBirth && user.dateOfBirth > new Date()) {
        return res.status(400).json({
          success: false,
          message: "Birthday cannot be in the future",
        });
      }
    }

    if (email !== undefined) {
      const normalizedEmail =
        typeof email === "string" ? email.trim().toLowerCase() : "";

      if (normalizedEmail && !emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      if (normalizedEmail) {
        const existingEmail = await User.findOne({
          _id: { $ne: req.user.id },
          email: normalizedEmail,
        })
          .select("_id")
          .lean();

        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      user.email = normalizedEmail || undefined;
    }

    const resolvedPhones = normalizePhones(phones, phone);

    if (phones !== undefined || phone !== undefined) {
      if (!resolvedPhones || !resolvedPhones.length) {
        return res.status(400).json({
          success: false,
          message: "At least one phone number is required",
        });
      }

      for (const entry of resolvedPhones) {
        if (!phoneRegex.test(entry.number)) {
          return res.status(400).json({
            success: false,
            message: "Invalid Bangladesh phone number",
          });
        }

        const existingPhone = await User.findOne({
          _id: { $ne: req.user.id },
          $or: [{ phone: entry.number }, { "phones.number": entry.number }],
        })
          .select("_id")
          .lean();

        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: "Phone number already exists",
          });
        }
      }

      user.phones = resolvedPhones;
      user.phone =
        resolvedPhones.find((entry) => entry.isPrimary)?.number ||
        resolvedPhones[0].number;
    }

    // Handle profile photo upload
    if (req.file) {
      user.profilePhoto = `/uploads/profiles/${req.file.filename}`;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: serializeProfile(user),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0];
      return res.status(400).json({
        success: false,
        message:
          field === "email"
            ? "Email already exists"
            : "Phone number already exists",
      });
    }

    if (error.name === "ValidationError") {
      const message = Object.values(error.errors).map((val) => val.message)[0];
      return res.status(400).json({
        success: false,
        message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};

// @desc    Change password
// @route   PATCH /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check current password
    const isCurrentPasswordMatch = user.password === currentPassword;
    if (!isCurrentPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be same as current password",
      });
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      return res.status(400).json({
        success: false,
        message: "New password must be between 6–20 characters",
      });
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,20}$/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must contain letters and numbers",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while changing password",
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled on client side
    // We can implement token blacklisting if needed

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};
