const User = require("../models/User");
const Transaction = require("../models/Transaction");
const TurnoverService = require("./turnoverService");
const WalletCache = require("./cache/walletCacheManager");
const logger = require("../utils/logger");

class WalletService {
  static _walletPerfEnabled() {
    return process.env.WALLET_PERF_LOG !== "false";
  }

  static _elapsedMs(start) {
    return Number(process.hrtime.bigint() - start) / 1e6;
  }

  static _logWalletPerf(label, start, context = {}) {
    if (!this._walletPerfEnabled()) return;
    logger.info(`[WALLET_PERF] ${label}: ${this._elapsedMs(start)}ms`, context);
  }

  static _generateReferenceId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `TXN${timestamp}${random}`.toUpperCase();
  }

  static async _createTransaction(txData, session = null) {
    const transaction = new Transaction({
      ...txData,
      referenceId: txData.referenceId || this._generateReferenceId(),
      updatedAt: new Date(),
    });

    await transaction.validate();

    const document = transaction.toObject({ depopulate: true });
    if (document.__v === undefined) {
      document.__v = 0;
    }

    await Transaction.collection.insertOne(
      document,
      session ? { session } : {},
    );

    return transaction;
  }

  // Update user wallet balance
  static async updateWallet(
    userId,
    amount,
    walletType = "main",
    transactionType,
    metadata = {},
    session = null,
  ) {
    const totalStart = process.hrtime.bigint();
    let normalizedAmount = amount;

    try {
      normalizedAmount = Math.round(Number(amount) * 100) / 100;
      if (!isFinite(normalizedAmount)) {
        throw new Error("Invalid amount");
      }

      const validWallets = ["main", "bonus", "freeBets"];
      if (!validWallets.includes(walletType)) {
        throw new Error(
          `Invalid wallet type. Valid values: ${validWallets.join(", ")}`,
        );
      }

      const absAmount = Math.abs(normalizedAmount);
      const walletPath = `wallet.${walletType}`;
      const updateOptions = {
        new: true,
        runValidators: true,
      };
      if (session) updateOptions.session = session;

      const userUpdateStart = process.hrtime.bigint();
      const filter =
        normalizedAmount < 0
          ? { _id: userId, [walletPath]: { $gte: absAmount } }
          : { _id: userId };

      const updatedUser = await User.findOneAndUpdate(
        filter,
        { $inc: { [walletPath]: normalizedAmount } },
        updateOptions,
      )
        .select(walletPath)
        .lean();

      this._logWalletPerf("User update", userUpdateStart, {
        userId: String(userId),
        walletType,
        transactionType,
      });

      if (!updatedUser) {
        if (normalizedAmount < 0) {
          throw new Error("Insufficient balance");
        }
        throw new Error("User not found during wallet update");
      }

      const newBalance =
        Math.round(Number(updatedUser.wallet?.[walletType] ?? 0) * 100) / 100;
      const previousBalance =
        Math.round((newBalance - normalizedAmount) * 100) / 100;

      const txData = {
        user: userId,
        type: transactionType,
        amount: Math.round(Math.abs(normalizedAmount) * 100) / 100,
        walletType: walletType,
        previousBalance: previousBalance,
        newBalance: newBalance,
        status: "completed",
        paymentMethod: metadata.paymentMethod || "system",
        description: metadata.description || "",
        gameRound: metadata.gameRound || null,
        gameUid: metadata.gameUid || null,
        metadata: metadata,
      };

      const transactionStart = process.hrtime.bigint();
      const transaction = await this._createTransaction(txData, session);
      this._logWalletPerf("Transaction create", transactionStart, {
        userId: String(userId),
        transactionId: String(transaction._id),
        transactionType,
      });

      if (transactionType === "bet" && Math.abs(normalizedAmount) > 0) {
        setImmediate(() => {
          TurnoverService.recordTurnoverFromTransaction(userId, transaction, {
            betSource: metadata.betSource || "unknown",
            gameType: metadata.gameType,
            provider: metadata.provider,
            ...metadata,
          }).catch((err) => {
            logger.error(
              `[WALLET] Turnover recording failed (non-blocking): ${err.message}`,
            );
          });
        });
      }

      if (!session) {
        const redisStart = process.hrtime.bigint();
        WalletCache.setBalance(userId, { [walletType]: newBalance })
          .then(() => {
            this._logWalletPerf("Redis update", redisStart, {
              userId: String(userId),
              walletType,
            });
          })
          .catch((err) => {
            logger.warn("[WALLET_CACHE] post-update cache write failed", {
              userId: String(userId),
              message: err.message,
            });
          });
      }

      this._logWalletPerf("Total wallet update", totalStart, {
        userId: String(userId),
        walletType,
        transactionType,
      });

      return {
        success: true,
        previousBalance,
        newBalance,
        transactionId: transaction._id,
      };
    } catch (error) {
      logger.error("[WALLET][updateWallet] ERROR", {
        message: error.message,
        stack: error.stack,
        userId: String(userId),
        amount: normalizedAmount,
        walletType,
        transactionType,
        metadata,
        hasSession: !!session,
      });
      throw error;
    }
  }

  // Get wallet balance
  static async getWalletBalance(userId, options = {}) {
    const totalStart = process.hrtime.bigint();
    const cacheFirst =
      options.cacheFirst || process.env.WALLET_GET_CACHE_FIRST === "true";

    if (cacheFirst) {
      const cached = await WalletCache.getCachedBalance(userId);
      if (
        cached?.main !== undefined &&
        cached?.bonus !== undefined &&
        cached?.freeBets !== undefined
      ) {
        this._logWalletPerf("Get wallet balance", totalStart, {
          userId: String(userId),
          source: "redis",
        });
        return cached;
      }
    }

    const mongoStart = process.hrtime.bigint();
    const user = await User.findById(userId)
      .select("wallet.main wallet.bonus wallet.freeBets")
      .lean();

    this._logWalletPerf("Get wallet balance Mongo", mongoStart, {
      userId: String(userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    const wallet = {
      main: Math.round(Number(user.wallet?.main || 0) * 100) / 100,
      bonus: Math.round(Number(user.wallet?.bonus || 0) * 100) / 100,
      freeBets: Math.round(Number(user.wallet?.freeBets || 0) * 100) / 100,
    };

    WalletCache.setBalance(userId, wallet).catch((err) => {
      logger.warn("[WALLET_CACHE] getWalletBalance cache refresh failed", {
        userId: String(userId),
        message: err.message,
      });
    });

    this._logWalletPerf("Get wallet balance", totalStart, {
      userId: String(userId),
      source: "mongo",
    });
    return wallet;
  }

  // Transfer between wallets (main to bonus or vice versa)
  static async transferBetweenWallets(userId, fromWallet, toWallet, amount) {
    // Insert BEFORE validation:
    logger.debug("[WALLET][transferBetweenWallets] start", {
      userId: String(userId),
      fromWallet,
      toWallet,
      amount,
    });

    if (fromWallet === toWallet) {
      throw new Error("Cannot transfer to same wallet");
    }

    const validWallets = ["main", "bonus"];
    if (
      !validWallets.includes(fromWallet) ||
      !validWallets.includes(toWallet)
    ) {
      throw new Error("Invalid wallet type");
    }

    const session = await User.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        logger.debug("[WALLET][transferBetweenWallets] user not found", {
          userId: String(userId),
        });
        throw new Error("User not found");
      }

      // Insert AFTER user fetch:
      logger.debug("[WALLET][transferBetweenWallets] user fetched", {
        userId: String(userId),
        fromBalance: user.wallet[fromWallet],
        toBalance: user.wallet[toWallet],
      });

      // Check if source wallet has sufficient balance
      if (user.wallet[fromWallet] < amount) {
        throw new Error(`Insufficient balance in ${fromWallet} wallet`);
      }

      const fromPrevious = user.wallet[fromWallet];
      const toPrevious = user.wallet[toWallet];

      // Update balances
      user.wallet[fromWallet] = fromPrevious - amount;
      user.wallet[toWallet] = toPrevious + amount;

      await user.save({ session });

      // Create transaction records
      const debitTransaction = new Transaction({
        user: userId,
        type: "transfer",
        amount: amount,
        walletType: fromWallet,
        previousBalance: fromPrevious,
        newBalance: user.wallet[fromWallet],
        status: "completed",
        description: `Transfer to ${toWallet} wallet`,
      });

      const creditTransaction = new Transaction({
        user: userId,
        type: "transfer",
        amount: amount,
        walletType: toWallet,
        previousBalance: toPrevious,
        newBalance: user.wallet[toWallet],
        status: "completed",
        description: `Transfer from ${fromWallet} wallet`,
      });

      await Promise.all([
        debitTransaction.save({ session }),
        creditTransaction.save({ session }),
      ]);

      await session.commitTransaction();
      session.endSession();
      await WalletCache.setBalance(userId, {
        main: user.wallet.main,
        bonus: user.wallet.bonus,
        freeBets: user.wallet.freeBets,
      });

      // Insert BEFORE return:
      logger.debug("[WALLET][transferBetweenWallets] success", {
        userId: String(userId),
        fromWallet,
        toWallet,
        amount,
        newFromBalance: user.wallet[fromWallet],
        newToBalance: user.wallet[toWallet],
      });

      return {
        success: true,
        fromWallet: {
          previous: fromPrevious,
          new: user.wallet[fromWallet],
        },
        toWallet: {
          previous: toPrevious,
          new: user.wallet[toWallet],
        },
      };
    } catch (error) {
      // Replace/extend catch:
      logger.error("[WALLET][transferBetweenWallets] ERROR", {
        message: error.message,
        stack: error.stack,
        userId: String(userId),
        fromWallet,
        toWallet,
        amount,
      });
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // Get transaction history
  static async getTransactionHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type,
      walletType,
      status,
      startDate,
      endDate,
    } = options;

    const query = { user: userId };

    if (type) query.type = type;
    if (walletType) query.walletType = walletType;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Transform transactions to add clarity for bet types
    const transformedTransactions = transactions.map((tx) => {
      const txObj = tx.toObject();

      // Handle "bet" type transactions - these represent player losses
      if (txObj.type === "bet") {
        txObj.displayType = "Player Loss (Bet)";
        txObj.displayDescription =
          txObj.description ||
          `Player lost ${txObj.amount} BDT on ${txObj.gameRound ? "game round " + txObj.gameRound : "betting"}`;
        txObj.isLoss = true;
      } else if (txObj.type === "win") {
        txObj.displayType = "Player Win";
        txObj.displayDescription =
          txObj.description ||
          `Player won ${txObj.amount} BDT on ${txObj.gameRound ? "game round " + txObj.gameRound : "betting"}`;
        txObj.isLoss = false;
      } else {
        txObj.displayType =
          txObj.type.charAt(0).toUpperCase() + txObj.type.slice(1);
        txObj.displayDescription = txObj.description;
        txObj.isLoss = ["withdrawal", "bet", "transfer"].includes(txObj.type);
      }

      return txObj;
    });

    const total = await Transaction.countDocuments(query);

    return {
      transactions: transformedTransactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    };
  }
}

module.exports = WalletService;
