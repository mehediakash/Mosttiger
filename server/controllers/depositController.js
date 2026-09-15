const Deposit = require("../models/Deposit");
const PaymentMethod = require("../models/PaymentMethod");
const Promotion = require("../models/Promotion");
const User = require("../models/User");
const promotionService = require("../services/promotionService");

// @desc    Get active payment methods for deposit
// @route   GET /api/payments/deposit-methods
// @access  Private
exports.getDepositMethods = async (req, res) => {
  try {
    // lean() reduces memory usage - no need for Mongoose methods on read-only data
    const paymentMethods = await PaymentMethod.find({
      isActive: true,
    })
      .select("-createdBy -updatedAt")
      .lean();

    res.status(200).json({
      success: true,
      data: paymentMethods,
    });
  } catch (error) {
    console.error("Get deposit methods error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching deposit methods",
    });
  }
};

// @desc    Create deposit request
// @route   POST /api/payments/deposit
// @access  Private
exports.createDeposit = async (req, res) => {
  try {
    // Accept fields from top-level body or inside `paymentDetails` when
    // clients submit slightly different shapes. Also accept JSON-stringified
    // `paymentDetails` if sent as a string.
    let {
      amount,
      paymentMethod,
      fromNumber,
      toNumber,
      transactionId,
      selectedPromotionId,
      promotionId,
      promotion,
    } = req.body;
    let paymentDetails = req.body.paymentDetails;
    if (typeof paymentDetails === "string") {
      try {
        paymentDetails = JSON.parse(paymentDetails);
      } catch (e) {
        /* ignore */
      }
    }

    const selectedPromotion =
      selectedPromotionId ||
      promotionId ||
      promotion ||
      paymentDetails?.selectedPromotionId ||
      paymentDetails?.promotionId ||
      paymentDetails?.promotion ||
      null;

    if (
      (!amount ||
        !paymentMethod ||
        !fromNumber ||
        !toNumber ||
        !transactionId) &&
      paymentDetails
    ) {
      amount = amount ?? paymentDetails.amount;
      paymentMethod =
        paymentMethod ??
        paymentDetails.paymentMethod ??
        paymentDetails.method ??
        paymentDetails.name;
      fromNumber =
        fromNumber ?? paymentDetails.fromNumber ?? paymentDetails.from;
      toNumber = toNumber ?? paymentDetails.toNumber ?? paymentDetails.to;
      transactionId =
        transactionId ??
        paymentDetails.transactionId ??
        paymentDetails.txnId ??
        paymentDetails.transaction_id;
    }

    // Validation — coerce amount to number when possible
    if (typeof amount === "string" && amount.trim() !== "")
      amount = Number(amount);

    const missing = [];
    if (amount === undefined || amount === null || amount === "")
      missing.push("amount");
    if (!paymentMethod) missing.push("paymentMethod");
    if (!fromNumber) missing.push("fromNumber");
    if (!toNumber) missing.push("toNumber");
    if (!transactionId) missing.push("transactionId");

    if (missing.length) {
      console.warn("Create deposit missing fields:", {
        missing,
        body: req.body,
        file: !!req.file,
      });
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    if (amount < 1) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    if (selectedPromotion) {
      const promotionDoc = await Promotion.findById(selectedPromotion);
      if (promotionDoc) {
        const eligibility = await promotionService.validatePromotionEligibility(
          req.user.id,
          promotionDoc,
        );

        if (!eligibility.isEligible) {
          return res.status(400).json({
            success: false,
            message: eligibility.reason,
          });
        }
      }
    }

    // Check payment method validity
    // lean() reduces memory usage for validation query
    const paymentMethodDoc = await PaymentMethod.findOne({
      name: paymentMethod,
      isActive: true,
    }).lean();

    // Check payment method validity (optional, commented out to allow deposits without DB entry)
    // if (!paymentMethodDoc) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid payment method'
    //   });
    // }

    // Check amount limits (only if payment method document exists)
    if (paymentMethodDoc) {
      if (amount < paymentMethodDoc.minDeposit) {
        return res.status(400).json({
          success: false,
          message: `Minimum deposit amount is ${paymentMethodDoc.minDeposit}`,
        });
      }

      if (amount > paymentMethodDoc.maxDeposit) {
        return res.status(400).json({
          success: false,
          message: `Maximum deposit amount is ${paymentMethodDoc.maxDeposit}`,
        });
      }
    }

    // Check for duplicate transaction ID
    const existingDeposit = await Deposit.findOne({
      "paymentDetails.transactionId": transactionId,
      status: { $in: ["pending", "approved"] },
    });

    if (existingDeposit) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID already used",
      });
    }

    // Handle proof image upload
    let proofImage = null;
    if (req.file) {
      proofImage = `/uploads/deposits/${req.file.filename}`;
    }

    // Create deposit request
    const deposit = await Deposit.create({
      user: req.user.id,
      amount,
      paymentMethod,
      promotion: selectedPromotion || null,
      paymentDetails: {
        fromNumber,
        toNumber,
        transactionId,
        proofImage,
      },
    });

    res.status(201).json({
      success: true,
      message: "Deposit request submitted successfully",
      data: {
        depositId: deposit._id,
        referenceId: deposit.referenceId,
        amount: deposit.amount,
        status: deposit.status,
      },
    });
  } catch (error) {
    console.error("Create deposit error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate transaction detected",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while creating deposit request",
    });
  }
};

// @desc    Get user deposit history
// @route   GET /api/payments/deposits
// @access  Private
exports.getDepositHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = String(req.query.status || "").trim();
    const provider = String(req.query.provider || "").trim().toLowerCase();
    const search = String(
      req.query.search || req.query.q || req.query.keyword || "",
    ).trim();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Allow admins to fetch all deposits across users when scope=all
    const isAdminAll = req.user?.role === "admin" && req.query.scope === "all";
    const query = isAdminAll ? {} : { user: req.user.id };
    if (status) query.status = status;
    if (provider) {
      if (provider === "payment24x7") {
        query.paymentMethod = "payment24x7";
      } else if (provider === "uddoktapay") {
        query.paymentMethod = { $ne: "payment24x7" };
      } else {
        query.$or = [
          { paymentMethod: provider },
          { provider },
          { "propayDetails.gatewayResponse.method": provider },
          { "propayDetails.gatewayResponse.provider": provider },
        ];
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchedUsers = isAdminAll
        ? await User.find({
            $or: [{ fullName: regex }, { username: regex }, { email: regex }, { phone: regex }],
          })
            .select("_id")
            .limit(100)
            .lean()
        : [];
      const matchedUserIds = matchedUsers.map((user) => user._id);
      const searchQuery = {
        $or: [
          ...(matchedUserIds.length ? [{ user: { $in: matchedUserIds } }] : []),
          { referenceId: regex },
          { "propayDetails.orderNo": regex },
          { "paymentDetails.transactionId": regex },
          { "propayDetails.gatewayResponse.reference": regex },
          { "propayDetails.gatewayResponse.merchant_reference": regex },
        ],
      };

      if (query.$or) {
        query.$and = [{ $or: query.$or }, searchQuery];
        delete query.$or;
      } else {
        Object.assign(query, searchQuery);
      }
    }

    let query_builder = Deposit.find(query)
      .populate("user", "fullName email phone")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Reduce memory usage by ~40% per document

    // Only exclude proofImage if user is not an admin
    if (req.user.role !== "admin") {
      query_builder = query_builder.select("-paymentDetails.proofImage -__v");
    } else {
      query_builder = query_builder.select("-__v");
    }

    const deposits = await query_builder;

    const total = await Deposit.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        deposits,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
    });
  } catch (error) {
    console.error("Get deposit history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching deposit history",
    });
  }
};

// @desc    Get deposit details
// @route   GET /api/payments/deposits/:id
// @access  Private
exports.getDepositDetails = async (req, res) => {
  try {
    const deposit = await Deposit.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: "Deposit not found",
      });
    }

    res.status(200).json({
      success: true,
      data: deposit,
    });
  } catch (error) {
    console.error("Get deposit details error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching deposit details",
    });
  }
};

// @desc    Cancel pending deposit
// @route   PUT /api/payments/deposits/:id/cancel
// @access  Private
exports.cancelDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: "Deposit not found",
      });
    }

    if (deposit.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending deposits can be cancelled",
      });
    }

    deposit.status = "rejected";
    deposit.rejectionReason = "Cancelled by user";
    await deposit.save();

    res.status(200).json({
      success: true,
      message: "Deposit cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel deposit error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while cancelling deposit",
    });
  }
};

// Legacy ProPay gateway handlers were removed.
