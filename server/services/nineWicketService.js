const mongoose = require("mongoose");
const crypto = require("crypto");
const WalletService = require("./walletService");
const apiClient = require("./nineWicketApiClient");
const NineWicketSession = require("../models/NineWicketSession");
const NineWicketTransfer = require("../models/NineWicketTransfer");
const NineWicketCallbackEvent = require("../models/NineWicketCallbackEvent");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const BettingHistory = require("../models/BettingHistory");
const logger = require("../utils/logger");

const r2 = (value) => Math.round(Number(value || 0) * 100) / 100;

class NineWicketProviderError extends Error {
  constructor(message, providerResponse = null, statusCode = 502) {
    super(message);
    this.name = "NineWicketProviderError";
    this.providerResponse = providerResponse;
    this.statusCode = statusCode;
  }
}

class NineWicketInsufficientBalanceError extends Error {
  constructor(message, availableBalance = 0, requiredAmount = null) {
    super(message);
    this.name = "NineWicketInsufficientBalanceError";
    this.code = "INSUFFICIENT_BALANCE";
    this.requiresDeposit = true;
    this.availableBalance = r2(availableBalance);
    this.requiredAmount =
      requiredAmount === null || requiredAmount === undefined
        ? null
        : r2(requiredAmount);
    this.statusCode = 400;
  }
}

function safeProviderMessage(response) {
  return (
    response?.msg ||
    response?.message ||
    response?.error ||
    "9Wicket provider request failed"
  );
}

function generateTransferId(prefix = "9W") {
  const time = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}${time}${random}`;
}

function parseProviderAmount(raw, { allowNegative = false } = {}) {
  if (raw === undefined) {
    return {
      status: "missing",
      isValid: false,
      isZero: false,
      isPositive: false,
      value: null,
    };
  }

  if (raw === null) {
    return {
      status: "invalid",
      isValid: false,
      isZero: false,
      isPositive: false,
      value: null,
    };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") {
      return {
        status: "invalid",
        isValid: false,
        isZero: false,
        isPositive: false,
        value: null,
      };
    }
  }

  const num = Number(raw);
  if (typeof num !== "number" || Number.isNaN(num) || !Number.isFinite(num)) {
    return {
      status: "invalid",
      isValid: false,
      isZero: false,
      isPositive: false,
      value: null,
    };
  }

  const rounded = Math.round(num * 100) / 100;
  if (!allowNegative && rounded < 0) {
    return {
      status: "invalid",
      isValid: false,
      isZero: false,
      isPositive: false,
      value: null,
    };
  }

  const isZero = Object.is(rounded, 0) || rounded === 0;
  const isPositive = rounded > 0;

  return {
    status: isZero
      ? "valid_zero"
      : rounded > 0
        ? "valid_positive"
        : "valid_negative",
    isValid: true,
    isZero,
    isPositive,
    value: rounded,
  };
}

function extractField(data, response, snakeKey, camelKey) {
  if (data && typeof data === "object") {
    if (snakeKey in data) return data[snakeKey];
    if (camelKey in data) return data[camelKey];
  }
  if (response && typeof response === "object") {
    if (snakeKey in response) return response[snakeKey];
    if (camelKey in response) return response[camelKey];
  }
  return undefined;
}

function extractProviderAmounts(response = {}) {
  const data = response?.data || {};
  const rawBefore = extractField(
    data,
    response,
    "before_amount",
    "beforeAmount",
  );
  const rawAfter = extractField(data, response, "after_amount", "afterAmount");
  const rawTransfer = extractField(
    data,
    response,
    "transfer_amount",
    "transferAmount",
  );

  const parsedBefore = parseProviderAmount(rawBefore);
  const parsedAfter = parseProviderAmount(rawAfter);
  const parsedTransfer = parseProviderAmount(rawTransfer, {
    allowNegative: true,
  });

  return {
    sessionId:
      data.session_id ||
      data.sessionId ||
      response?.session_id ||
      response?.sessionId ||
      null,
    beforeAmount: parsedBefore.value,
    afterAmount: parsedAfter.value,
    transferAmount: parsedTransfer.value,
    parsedBefore,
    parsedAfter,
    parsedTransfer,
    hasBeforeAmount: parsedBefore.isValid,
    hasAfterAmount: parsedAfter.isValid,
    hasTransferAmount: parsedTransfer.isValid,
    url: data.url || response?.url || null,
  };
}

function sanitizeProviderResponse(response = {}) {
  return {
    code: response.code,
    msg: safeProviderMessage(response),
    data: response.data,
    timestamp: response.timestamp,
  };
}

class NineWicketService {
  constructor(client = apiClient, sideEffectsService = null) {
    this.client = client;
    this.sideEffectsService = sideEffectsService;
  }

  getSideEffects() {
    return this.sideEffectsService || require("./callbackSideEffectsService");
  }

  async buildPayload({ user, balance, transferId, language = "en", gameUid }) {
    const config = this.client.getConfig();
    const resolvedGameUid = gameUid || (await this.client.resolveGameUid());

    return {
      user_id: String(user.userId || user._id),
      balance: String(r2(balance)),
      game_uid: String(resolvedGameUid),
      symbol: "9W",
      token: config.token,
      timestamp: Date.now(),
      return: config.returnUrl,
      callback: config.callbackUrl,
      currency_code: config.currency,
      language,
      transfer_id: transferId,
    };
  }

  async launch(user, options = {}) {
    const language = options.language || "en";

    const config = this.client.getConfig();
    const wallet = await WalletService.getWalletBalance(user._id);
    const amount =
      options.amount === undefined ||
      options.amount === null ||
      options.amount === ""
        ? r2(wallet.main)
        : r2(options.amount);
    if (amount < 0) {
      throw new NineWicketInsufficientBalanceError(
        "Please deposit funds to start playing.",
        wallet.main,
        null,
      );
    }

    if (r2(wallet.main) < amount) {
      throw new NineWicketInsufficientBalanceError(
        "Your balance is insufficient. Please deposit funds to continue.",
        wallet.main,
        amount,
      );
    }

    const transferId = generateTransferId("9WCR");
    const gameUid = await this.client.resolveGameUid();
    const launchPayload = await this.buildPayload({
      user,
      balance: amount,
      transferId,
      language,
      gameUid,
    });
    let walletDebit = null;
    let session = null;
    let transfer = null;

    const mongoSession = await mongoose.startSession();
    try {
      await mongoSession.withTransaction(async () => {
        walletDebit = await WalletService.updateWallet(
          user._id,
          -amount,
          "main",
          "transfer",
          {
            description: "9Wicket sportsbook transfer wallet credit",
            provider: "9Wicket",
            transferId,
            gameUid,
            currency: config.currency,
            paymentMethod: "9wicket",
          },
          mongoSession,
        );

        session = await NineWicketSession.create(
          [
            {
              user: user._id,
              memberAccount: String(user.userId || user._id),
              gameUid,
              symbol: "9W",
              launchTransferId: transferId,
              currency: config.currency,
              language,
              initialAmount: amount,
              status: "launching",
              walletDebitTransaction: walletDebit.transactionId,
            },
          ],
          { session: mongoSession },
        ).then((docs) => docs[0]);

        transfer = await NineWicketTransfer.create(
          [
            {
              transferId,
              session: session._id,
              user: user._id,
              memberAccount: String(user.userId || user._id),
              action: "launch_credit",
              amount,
              currency: config.currency,
              status: "pending",
              walletTransaction: walletDebit.transactionId,
              requestPayload: {
                user_id: launchPayload.user_id,
                balance: launchPayload.balance,
                game_uid: launchPayload.game_uid,
                symbol: launchPayload.symbol,
                timestamp: launchPayload.timestamp,
                currency_code: launchPayload.currency_code,
                language: launchPayload.language,
                transfer_id: launchPayload.transfer_id,
              },
            },
          ],
          { session: mongoSession },
        ).then((docs) => docs[0]);
      });
    } finally {
      mongoSession.endSession();
    }

    let response;
    try {
      response = await this.client.postEncrypted(launchPayload);
    } catch (error) {
      await this.refundLaunchDebit({
        userId: user._id,
        amount,
        transferId,
        sessionId: session?._id,
        reason: "9Wicket launch request failed",
      });
      throw new NineWicketProviderError("9Wicket launch request failed", null);
    }

    const providerCode = Number(response?.code);
    if (providerCode !== 0) {
      await this.refundLaunchDebit({
        userId: user._id,
        amount,
        transferId,
        sessionId: session?._id,
        reason: safeProviderMessage(response),
      });
      throw new NineWicketProviderError(
        safeProviderMessage(response),
        response,
      );
    }

    const provider = extractProviderAmounts(response);
    if (!provider.url) {
      await this.refundLaunchDebit({
        userId: user._id,
        amount,
        transferId,
        sessionId: session?._id,
        reason: "9Wicket launch response missing url",
      });
      throw new NineWicketProviderError(
        "9Wicket launch response missing url",
        response,
      );
    }

    await Promise.all([
      NineWicketSession.updateOne(
        { _id: session._id },
        {
          $set: {
            sessionId: provider.sessionId,
            beforeAmount: provider.beforeAmount,
            afterAmount: provider.afterAmount,
            transferAmount: provider.transferAmount || amount,
            status: "active",
            launchResponse: sanitizeProviderResponse(response),
            providerMetadata: { launchTransferId: transferId },
          },
        },
      ),
      NineWicketTransfer.updateOne(
        { _id: transfer._id },
        {
          $set: {
            sessionId: provider.sessionId,
            beforeAmount: provider.beforeAmount,
            afterAmount: provider.afterAmount,
            transferAmount: provider.transferAmount || amount,
            status: "completed",
            providerCode,
            providerMsg: safeProviderMessage(response),
            providerResponse: sanitizeProviderResponse(response),
          },
        },
      ),
    ]);

    this.logProviderEvent("launch", {
      userId: user._id,
      gameUid,
      sessionId: provider.sessionId,
      transferId,
      beforeAmount: provider.beforeAmount,
      afterAmount: provider.afterAmount,
      transferAmount: provider.transferAmount || amount,
      currency: config.currency,
      providerCode,
      providerMsg: safeProviderMessage(response),
    });

    await this.createInitialUnsettledHistory(
      {
        ...((session && typeof session.toObject === "function"
          ? session.toObject()
          : session) || {}),
        sessionId: provider.sessionId,
      },
      amount,
    );

    return {
      url: provider.url,
      sessionId: provider.sessionId,
    };
  }

  async refundLaunchDebit({ userId, amount, transferId, sessionId, reason }) {
    const existingRefund = await Transaction.findOne({
      type: "refund",
      "metadata.provider": "9Wicket",
      "metadata.transferId": transferId,
    }).lean();

    if (!existingRefund && amount > 0) {
      await WalletService.updateWallet(userId, amount, "main", "refund", {
        description: "9Wicket launch rollback refund",
        provider: "9Wicket",
        transferId,
        reason,
        paymentMethod: "9wicket",
      });
    }

    await Promise.all([
      sessionId
        ? NineWicketSession.updateOne(
            { _id: sessionId },
            {
              $set: {
                status: "launch_failed",
                "providerMetadata.launchFailure": reason,
              },
            },
          )
        : Promise.resolve(),
      NineWicketTransfer.updateOne(
        { transferId },
        { $set: { status: "failed", providerMsg: reason } },
      ),
    ]);
  }

  async createInitialUnsettledHistory(session, amount) {
    const userId = session?.user?._id || session?.user;
    if (!session?._id || !userId) return;
    try {
      const roundId =
        session.sessionId || session.launchTransferId || String(session._id);
      const idempotencyKey = `ninewicket:launch:${session._id}`;

      const sideEffectPayload = {
        idempotencyKey,
        userId,
        gameSessionId: session._id,
        gameId: null,
        providerGameCode: session.gameUid || "11539",
        providerSessionId: session.sessionId,
        gameRound: roundId,
        gameName: "9Wicket",
        provider: "9wickets",
        category: "Sports",
        symbol: session.symbol || "9W",
        bet: 0,
        win: 0,
        netResult: 0,
        turnoverAmount: 0,
        status: "unsettled",
        currency: session.currency || "BDT",
        startBalance: r2(amount),
        endBalance: r2(amount),
        playedAt: session.createdAt || new Date(),
        settledAt: null,
        metadata: {
          symbol: session.symbol || "9W",
          launchTransferId: session.launchTransferId,
          sessionId: session.sessionId,
        },
      };

      const sideEffects = this.getSideEffects();
      await sideEffects.createBettingHistory(sideEffectPayload);
    } catch (err) {
      logger.warn("[9WICKET] Failed to create initial unsettled history", {
        sessionId: String(session._id),
        error: err.message,
      });
    }
  }

  async processSessionSettlementSideEffects(session, finalAfterAmount) {
    const userId = session?.user?._id || session?.user;
    if (!session?._id || !userId) return;

    try {
      const initialAmount = r2(session.initialAmount || 0);
      const afterAmount = r2(finalAfterAmount ?? 0);
      const netChange = r2(afterAmount - initialAmount);

      // STEP 7B: ZERO-BET SESSION (Break-even where initialAmount === afterAmount)
      if (netChange === 0) {
        // User launched, did not bet (or balance did not change), and closed.
        // Do NOT create a misleading BettingHistory showing Bet 0, Win 0, Turnover 0.
        // Clean up any initial unsettled history created at launch.
        await BettingHistory.deleteMany({
          gameSession: session._id,
          status: "unsettled",
        });
        logger.info(
          "[9WICKET] Zero-bet session settlement: cleaned up unsettled history, no betting record created",
          {
            sessionId: String(session._id),
            userId: String(userId),
          },
        );
        return;
      }

      let betAmount = 0;
      let winAmount = 0;
      let turnoverAmount = 0;

      if (netChange < 0) {
        // STEP 7C: NET LOSS
        // Net loss is used as settlement-delta proxy for turnover
        betAmount = Math.abs(netChange);
        winAmount = 0;
        turnoverAmount = Math.abs(netChange);
      } else if (netChange > 0) {
        // STEP 7D: NET WIN
        // Net win is known, but true sports turnover is unavailable from 9Wicket.
        // Do NOT fabricate bet/turnover amounts.
        betAmount = 0;
        winAmount = netChange;
        turnoverAmount = 0;
      }

      const roundId =
        session.sessionId || session.launchTransferId || String(session._id);
      const idempotencyKey = `ninewicket:settle:${session._id}`;

      // STEP 7F: IDEMPOTENCY CHECK
      const existingHistory = await BettingHistory.findOne({
        gameSession: session._id,
      });

      if (existingHistory) {
        if (existingHistory.status === "settled") {
          return;
        }
        existingHistory.status = "settled";
        existingHistory.settledAt = new Date();
        existingHistory.betAmount = betAmount;
        existingHistory.winAmount = winAmount;
        existingHistory.netResult = netChange;
        existingHistory.turnoverAmount = turnoverAmount;
        existingHistory.endBalance = afterAmount;
        existingHistory.metadata = {
          ...(existingHistory.metadata || {}),
          symbol: session.symbol || "9W",
          launchTransferId: session.launchTransferId,
          sessionId: session.sessionId,
          initialAmount,
          afterAmount,
          netChange,
          isProxyTurnover: netChange < 0,
          turnoverUnavailable: netChange > 0,
        };
        await existingHistory.save();
      } else {
        const sideEffectPayload = {
          idempotencyKey,
          userId,
          gameSessionId: session._id,
          gameId: null,
          providerGameCode: session.gameUid || "11539",
          providerSessionId: session.sessionId,
          gameRound: roundId,
          gameName: "9Wicket",
          provider: "9wickets",
          category: "Sports",
          symbol: session.symbol || "9W",
          bet: betAmount,
          win: winAmount,
          netResult: netChange,
          turnoverAmount,
          status: "settled",
          currency: session.currency || "BDT",
          startBalance: initialAmount,
          endBalance: afterAmount,
          playedAt: session.createdAt || new Date(),
          settledAt: new Date(),
          metadata: {
            symbol: session.symbol || "9W",
            launchTransferId: session.launchTransferId,
            sessionId: session.sessionId,
            initialAmount,
            afterAmount,
            netChange,
            isProxyTurnover: netChange < 0,
            turnoverUnavailable: netChange > 0,
          },
        };

        const sideEffects = this.getSideEffects();
        await sideEffects.createBettingHistory(sideEffectPayload);
      }

      if (turnoverAmount > 0) {
        const sideEffects = this.getSideEffects();
        await sideEffects.recordTurnover({
          idempotencyKey: `ninewicket:turnover:${session._id}`,
          userId,
          gameSessionId: session._id,
          providerGameCode: session.gameUid || "11539",
          gameRound: roundId,
          bet: turnoverAmount,
          source: "sports",
        });
      }
    } catch (error) {
      logger.error("[9WICKET] Failed to process settlement side effects", {
        sessionId: String(session._id),
        error: error.message,
      });
    }
  }

  decodeCallback(body = {}) {
    if (body.payload) {
      return this.client.decryptPayload(body.payload);
    }
    return body;
  }

  buildCallbackEventKey(payload = {}) {
    const eventType =
      payload.event || payload.type || payload.action || "unknown";
    const transferId = payload.transfer_id || payload.transferId || "";
    const sessionId = payload.session_id || payload.sessionId || "";
    if (transferId) return [eventType, transferId].join(":");
    if (sessionId) return [eventType, sessionId].join(":");

    const timestamp = payload.timestamp || payload.created_at || "";
    return [eventType, transferId, sessionId, timestamp].join(":");
  }

  async handleCallback(body = {}) {
    const payload = this.decodeCallback(body);
    if (payload.timestamp) {
      const timestamp = Number(payload.timestamp);
      const maxDriftMs = Number(
        process.env.NINEWICKET_CALLBACK_MAX_DRIFT_MS || 10 * 60 * 1000,
      );
      if (
        !Number.isFinite(timestamp) ||
        Math.abs(Date.now() - timestamp) > maxDriftMs
      ) {
        throw new Error("Invalid 9Wicket callback timestamp");
      }
    }

    const eventType =
      payload.event || payload.type || payload.action || "unknown";
    const normalizedEvent = [
      "session_start",
      "transfer",
      "session_end",
    ].includes(eventType)
      ? eventType
      : "unknown";
    const transferId = payload.transfer_id || payload.transferId || null;
    const sessionId = payload.session_id || payload.sessionId || null;
    const memberAccount = payload.user_id || payload.member_account || null;
    const eventKey = this.buildCallbackEventKey(payload);
    const config = this.client.getConfig();

    let session = null;
    if (sessionId) {
      session = await NineWicketSession.findOne({ sessionId })
        .select("_id user")
        .lean();
    }
    if (!session && memberAccount) {
      session = await NineWicketSession.findOne({
        memberAccount: String(memberAccount),
        status: { $in: ["launching", "active", "ending", "cashout_pending"] },
      })
        .sort({ createdAt: -1 })
        .select("_id user")
        .lean();
    }

    try {
      await NineWicketCallbackEvent.create({
        eventKey,
        eventType: normalizedEvent,
        transferId,
        sessionId,
        user: session?.user || null,
        memberAccount: memberAccount ? String(memberAccount) : null,
        payload,
      });
    } catch (error) {
      if (error?.code === 11000) {
        return { duplicate: true };
      }
      throw error;
    }

    const eventPatch = {
      eventType: normalizedEvent,
      transferId,
      sessionId,
      beforeAmount: r2(payload.before_amount),
      afterAmount: r2(payload.after_amount),
      transferAmount: r2(payload.transfer_amount),
      receivedAt: new Date(),
    };

    const update = {
      $push: { callbackEvents: eventPatch },
      $set: {
        beforeAmount: eventPatch.beforeAmount,
        afterAmount: eventPatch.afterAmount,
        transferAmount: eventPatch.transferAmount,
      },
    };

    if (normalizedEvent === "session_start") update.$set.status = "active";
    if (normalizedEvent === "session_end") {
      update.$set.status = "ending";
      update.$set.endedAt = new Date();
    }

    if (session?._id) {
      let currentSession = null;
      try {
        if (typeof NineWicketSession.findById === "function") {
          const query = NineWicketSession.findById(session._id);
          const selected =
            typeof query?.select === "function"
              ? query.select("status")
              : query;
          currentSession =
            typeof selected?.lean === "function"
              ? await selected.lean()
              : await selected;
        }
      } catch (e) {
        currentSession = null;
      }

      if (
        currentSession &&
        ["completed", "reconciliation_required", "cashout_pending"].includes(
          currentSession.status,
        )
      ) {
        delete update.$set.status;
      }

      await NineWicketSession.updateOne({ _id: session._id }, update);

      if (normalizedEvent === "session_end") {
        const bgPromise = (async () => {
          try {
            return await this.settleSession({
              sessionObjectId: session._id,
              userId: session.user,
            });
          } catch (err) {
            logger.error(
              `[9Wicket] Background session_end settlement failed for session ${session._id}: ${err.message}`,
            );
            return null;
          }
        })();
        this._lastBackgroundSettlement = bgPromise;
        setImmediate(() => bgPromise);
      }
    }

    if (transferId && session?.user) {
      await NineWicketTransfer.updateOne(
        { transferId },
        {
          $setOnInsert: {
            transferId,
            session: session._id,
            sessionId,
            user: session.user,
            memberAccount: memberAccount ? String(memberAccount) : "unknown",
            action: "callback_transfer",
            amount: r2(payload.transfer_amount),
            currency:
              payload.currency || payload.currency_code || config.currency,
          },
          $set: {
            beforeAmount: eventPatch.beforeAmount,
            afterAmount: eventPatch.afterAmount,
            transferAmount: eventPatch.transferAmount,
            status: "completed",
            providerResponse: payload,
          },
        },
        { upsert: true },
      );
    }

    this.logProviderEvent(normalizedEvent, {
      userId: session?.user,
      sessionId,
      transferId,
      beforeAmount: eventPatch.beforeAmount,
      afterAmount: eventPatch.afterAmount,
      transferAmount: eventPatch.transferAmount,
      currency: payload.currency || payload.currency_code,
    });

    return { success: true };
  }

  async settleSession({ sessionId, userId, sessionObjectId = null }) {
    if (!sessionId && !sessionObjectId) {
      throw new Error("sessionId or sessionObjectId is required");
    }

    const sessionQuery = sessionObjectId
      ? NineWicketSession.findOne({
          _id: sessionObjectId,
          ...(userId ? { user: userId } : {}),
        })
      : NineWicketSession.findOne({
          sessionId,
          ...(userId ? { user: userId } : {}),
        });
    const session =
      !sessionObjectId && typeof sessionQuery.sort === "function"
        ? await sessionQuery.sort({ createdAt: -1 })
        : await sessionQuery;

    if (!session) throw new Error("9Wicket session not found");

    if (session.status === "completed" || session.cashoutStatus === "debited") {
      return {
        success: true,
        returnedAmount: session.afterAmount || 0,
        status: "already_completed",
      };
    }

    if (session.status === "reconciliation_required") {
      return {
        success: false,
        returnedAmount: 0,
        status: "reconciliation_required",
        message:
          session.settlementError ||
          "Session requires reconciliation due to previous provider ambiguity",
      };
    }

    const LOCK_TIMEOUT_MS = 60 * 1000;
    const now = new Date();
    const lockTime =
      session.settlementStartedAt || session.updatedAt || session.createdAt;
    const isLockStale =
      lockTime &&
      now.getTime() - new Date(lockTime).getTime() > LOCK_TIMEOUT_MS;

    if (session.cashoutStatus === "processing") {
      if (!isLockStale) {
        return {
          success: false,
          returnedAmount: 0,
          status: "settlement_in_progress",
          message: "Settlement is currently in progress",
        };
      }

      let existingDebitTransfer = null;
      try {
        if (typeof NineWicketTransfer.findOne === "function") {
          const q = NineWicketTransfer.findOne({
            $or: [
              { session: session._id, action: "cashout_debit" },
              ...(session.cashoutTransferId
                ? [{ transferId: session.cashoutTransferId }]
                : []),
            ],
          });
          existingDebitTransfer =
            typeof q?.lean === "function" ? await q.lean() : await q;
        }
      } catch (err) {
        existingDebitTransfer = null;
      }

      if (existingDebitTransfer) {
        if (existingDebitTransfer.status === "completed") {
          const userDoc = await User.findById(session.user).lean();
          const confirmedAmount = r2(
            Math.abs(
              existingDebitTransfer.transferAmount ||
                existingDebitTransfer.amount ||
                session.afterAmount ||
                0,
            ),
          );
          return this.cashout({
            session,
            user: userDoc,
            amount: confirmedAmount,
            cashoutTransferId: existingDebitTransfer.transferId,
          });
        }

        await NineWicketSession.updateOne(
          { _id: session._id },
          {
            $set: {
              status: "reconciliation_required",
              cashoutStatus: "failed",
              settlementError:
                "Stale settlement lock with existing unresolved debit transfer",
              "providerMetadata.unresolvedDebitTransferId":
                existingDebitTransfer.transferId,
            },
          },
        );
        return {
          success: false,
          returnedAmount: 0,
          status: "reconciliation_required",
          message:
            "Settlement requires reconciliation due to existing debit transfer",
        };
      }
    }

    const cashoutTransferId =
      session.cashoutTransferId || generateTransferId("9WDB");
    session.cashoutTransferId = cashoutTransferId;

    const claimConditions = {
      _id: session._id,
      status: { $nin: ["completed", "reconciliation_required"] },
      $or: [
        { cashoutStatus: { $nin: ["processing", "debited"] } },
        ...(isLockStale
          ? [
              {
                cashoutStatus: "processing",
                settlementStartedAt: session.settlementStartedAt || null,
              },
            ]
          : []),
      ],
    };

    const claim = await NineWicketSession.updateOne(claimConditions, {
      $set: {
        status: "cashout_pending",
        cashoutStatus: "processing",
        settlementStartedAt: now,
        cashoutTransferId,
      },
    });

    if (claim.modifiedCount === 0) {
      let current = null;
      try {
        if (typeof NineWicketSession.findOne === "function") {
          const q = NineWicketSession.findOne({ _id: session._id });
          current = typeof q?.lean === "function" ? await q.lean() : await q;
        }
      } catch (e) {
        current = session;
      }
      if (!current) current = session;

      if (
        current.status === "completed" ||
        current.cashoutStatus === "debited"
      ) {
        return {
          success: true,
          returnedAmount: current.afterAmount || 0,
          status: "already_completed",
        };
      }
      if (current.status === "reconciliation_required") {
        return {
          success: false,
          returnedAmount: 0,
          status: "reconciliation_required",
          message: current.settlementError || "Session requires reconciliation",
        };
      }
      return {
        success: false,
        returnedAmount: 0,
        status: "settlement_in_progress",
        message: "Settlement is currently in progress",
      };
    }

    const user = await User.findById(session.user).lean();
    if (!user) throw new Error("User not found");

    const inquiryTransferId = generateTransferId("9WINQ");
    const inquiryPayload = await this.buildPayload({
      user,
      balance: 0,
      transferId: inquiryTransferId,
      language: session.language || "en",
      gameUid: session.gameUid,
    });

    let inquiryResponse;
    try {
      inquiryResponse = await this.client.postEncrypted(inquiryPayload);
    } catch (inquiryError) {
      await NineWicketSession.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "active",
            cashoutStatus: "failed",
            settlementError: inquiryError.message,
            "providerMetadata.inquiryError": inquiryError.message,
          },
        },
      );
      throw inquiryError;
    }

    if (
      inquiryResponse?.code === undefined ||
      Number(inquiryResponse?.code) !== 0
    ) {
      const errorMsg =
        safeProviderMessage(inquiryResponse) ||
        "9Wicket inquiry returned non-zero code";
      await NineWicketSession.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "reconciliation_required",
            cashoutStatus: "failed",
            settlementError: errorMsg,
            "providerMetadata.inquiryFailure": errorMsg,
          },
        },
      );
      throw new NineWicketProviderError(errorMsg, inquiryResponse);
    }

    const inquiry = extractProviderAmounts(inquiryResponse);
    this.logProviderEvent("inquiry", {
      userId: session.user,
      gameUid: session.gameUid,
      sessionId: session.sessionId,
      transferId: inquiryTransferId,
      beforeAmount: inquiry.beforeAmount,
      afterAmount: inquiry.afterAmount,
      transferAmount: inquiry.transferAmount,
      currency: session.currency,
      providerCode: Number(inquiryResponse.code),
      providerMsg: safeProviderMessage(inquiryResponse),
    });

    if (!inquiry.hasAfterAmount || inquiry.afterAmount === null) {
      const isMissing = inquiry.parsedAfter?.status === "missing";
      const failureReason = isMissing
        ? "9Wicket inquiry response missing after_amount"
        : "9Wicket inquiry response invalid after_amount";

      await NineWicketSession.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "reconciliation_required",
            cashoutStatus: "failed",
            settlementError: failureReason,
            "providerMetadata.inquiryFailure": failureReason,
          },
        },
      );
      throw new NineWicketProviderError(failureReason, inquiryResponse);
    }

    const remainingAmount = r2(inquiry.afterAmount);

    await NineWicketTransfer.create({
      transferId: inquiryTransferId,
      session: session._id,
      sessionId: session.sessionId,
      user: session.user,
      memberAccount: session.memberAccount,
      action: "inquiry",
      amount: 0,
      beforeAmount: inquiry.beforeAmount,
      afterAmount: inquiry.afterAmount,
      transferAmount: inquiry.transferAmount,
      currency: session.currency,
      status: "completed",
      providerCode: Number(inquiryResponse.code),
      providerMsg: safeProviderMessage(inquiryResponse),
      providerResponse: sanitizeProviderResponse(inquiryResponse),
    });

    if (remainingAmount === 0) {
      await NineWicketSession.updateOne(
        { _id: session._id },
        {
          $set: {
            afterAmount: 0,
            cashoutStatus: "none",
            status: "completed",
            endedAt: new Date(),
          },
        },
      );
      await this.processSessionSettlementSideEffects(session, 0);
      return { success: true, returnedAmount: 0, status: "completed" };
    }

    await NineWicketSession.updateOne(
      { _id: session._id },
      {
        $set: {
          afterAmount: remainingAmount,
          cashoutStatus: "processing",
          status: "cashout_pending",
        },
      },
    );

    return this.cashout({
      session,
      user,
      amount: remainingAmount,
      cashoutTransferId,
    });
  }

  async getActiveSession({ userId }) {
    let session = null;
    try {
      const activeQuery = NineWicketSession.findOne({
        user: userId,
        status: { $in: ["active", "ending", "cashout_pending"] },
      });
      session =
        typeof activeQuery?.sort === "function"
          ? await activeQuery.sort({ createdAt: -1 })
          : await activeQuery;
    } catch (e) {
      session = null;
    }

    if (!session) {
      return {
        success: true,
        hasActiveSession: false,
      };
    }

    return {
      success: true,
      hasActiveSession: true,
      session: {
        id: session._id ? String(session._id) : undefined,
        sessionId: session.sessionId,
        gameUid: session.gameUid,
        symbol: session.symbol,
        status: session.status,
        cashoutStatus: session.cashoutStatus,
      },
    };
  }

  async settleActiveSession({ userId }) {
    let session = null;
    try {
      const activeQuery = NineWicketSession.findOne({
        user: userId,
        status: { $in: ["active", "ending", "cashout_pending"] },
      });
      session =
        typeof activeQuery?.sort === "function"
          ? await activeQuery.sort({ createdAt: -1 })
          : await activeQuery;
    } catch (e) {
      session = null;
    }

    if (!session) {
      let recentCompleted = null;
      try {
        const rcQuery = NineWicketSession.findOne({
          user: userId,
          status: "completed",
          updatedAt: { $gte: new Date(Date.now() - 60000) },
        });
        recentCompleted =
          typeof rcQuery?.sort === "function"
            ? await rcQuery.sort({ updatedAt: -1 })
            : await rcQuery;
      } catch (e) {
        recentCompleted = null;
      }

      if (recentCompleted) {
        return {
          success: true,
          returnedAmount: recentCompleted.afterAmount || 0,
          status: "already_completed",
        };
      }

      let brokenSession = null;
      try {
        const brQuery = NineWicketSession.findOne({
          user: userId,
          status: "reconciliation_required",
        });
        brokenSession =
          typeof brQuery?.sort === "function"
            ? await brQuery.sort({ updatedAt: -1 })
            : await brQuery;
      } catch (e) {
        brokenSession = null;
      }

      if (brokenSession) {
        return {
          success: false,
          returnedAmount: 0,
          status: "reconciliation_required",
          message:
            brokenSession.settlementError ||
            "Session requires reconciliation due to previous provider ambiguity",
        };
      }

      return { success: true, returnedAmount: 0, status: "no_active_session" };
    }

    if (!session.sessionId) {
      await NineWicketSession.updateOne(
        { _id: session._id },
        {
          $set: { status: "reconciliation_required", cashoutStatus: "failed" },
        },
      );
      throw new Error("9Wicket session is missing provider session_id");
    }

    return this.settleSession({
      sessionId: session.sessionId,
      sessionObjectId: session._id,
      userId,
    });
  }

  async creditUserWalletSafely({ session, user, amount, cashoutTransferId }) {
    const creditAmount = r2(amount);
    if (creditAmount <= 0) {
      return { alreadyCredited: false, transactionId: null };
    }

    // 1. Direct check on passed session instance
    if (session.walletCreditTransaction) {
      return {
        alreadyCredited: true,
        transactionId: session.walletCreditTransaction,
      };
    }

    // 2. Fresh check against database session
    let latestSession = null;
    try {
      if (typeof NineWicketSession.findById === "function") {
        const sq = NineWicketSession.findById(session._id);
        latestSession =
          typeof sq?.lean === "function" ? await sq.lean() : await sq;
      }
    } catch (e) {
      latestSession = null;
    }

    if (latestSession?.walletCreditTransaction) {
      session.walletCreditTransaction = latestSession.walletCreditTransaction;
      return {
        alreadyCredited: true,
        transactionId: latestSession.walletCreditTransaction,
      };
    }

    if (
      latestSession?.status === "completed" &&
      latestSession?.cashoutStatus === "debited"
    ) {
      return {
        alreadyCredited: true,
        transactionId: latestSession.walletCreditTransaction || null,
      };
    }

    // 3. Existing Transaction check (by provider transferId)
    let existingCredit = null;
    try {
      if (typeof Transaction.findOne === "function") {
        const tq = Transaction.findOne({
          "metadata.provider": "9Wicket",
          "metadata.transferId": cashoutTransferId,
          type: "transfer",
        });
        existingCredit =
          typeof tq?.lean === "function" ? await tq.lean() : await tq;
      }
    } catch (e) {
      existingCredit = null;
    }

    if (existingCredit) {
      const existingId = existingCredit._id;
      session.walletCreditTransaction = existingId;
      await NineWicketSession.updateOne(
        { _id: session._id, walletCreditTransaction: null },
        { $set: { walletCreditTransaction: existingId } },
      );
      return {
        alreadyCredited: true,
        transactionId: existingId,
      };
    }

    // 4. Existing NineWicketTransfer check
    let existingTransfer = null;
    try {
      if (typeof NineWicketTransfer.findOne === "function") {
        const tq = NineWicketTransfer.findOne({
          transferId: cashoutTransferId,
        });
        existingTransfer =
          typeof tq?.lean === "function" ? await tq.lean() : await tq;
      }
    } catch (e) {
      existingTransfer = null;
    }

    if (existingTransfer?.walletTransaction) {
      const txId = existingTransfer.walletTransaction;
      session.walletCreditTransaction = txId;
      await NineWicketSession.updateOne(
        { _id: session._id, walletCreditTransaction: null },
        { $set: { walletCreditTransaction: txId } },
      );
      return {
        alreadyCredited: true,
        transactionId: txId,
      };
    }

    // 5. Atomic claim on NineWicketSession
    const claim = await NineWicketSession.updateOne(
      {
        _id: session._id,
        walletCreditTransaction: null,
        status: { $ne: "completed" },
      },
      {
        $set: {
          "providerMetadata.walletCreditClaimedAt": new Date(),
        },
      },
    );

    if (claim && claim.modifiedCount === 0) {
      let cur = null;
      try {
        if (typeof NineWicketSession.findById === "function") {
          const cq = NineWicketSession.findById(session._id);
          cur = typeof cq?.lean === "function" ? await cq.lean() : await cq;
        }
      } catch (e) {
        cur = null;
      }
      if (cur?.walletCreditTransaction) {
        session.walletCreditTransaction = cur.walletCreditTransaction;
        return {
          alreadyCredited: true,
          transactionId: cur.walletCreditTransaction,
        };
      }
    }

    // 6. Execute local wallet credit via existing WalletService
    let walletCredit = null;
    try {
      walletCredit = await WalletService.updateWallet(
        session.user,
        creditAmount,
        "main",
        "transfer",
        {
          description: "9Wicket sportsbook cashout",
          provider: "9Wicket",
          transferId: cashoutTransferId,
          sessionId: session.sessionId,
          paymentMethod: "9wicket",
        },
      );

      this.logProviderEvent("main_wallet_credit", {
        userId: session.user,
        gameUid: session.gameUid,
        sessionId: session.sessionId,
        transferId: cashoutTransferId,
        transferAmount: creditAmount,
        currency: session.currency,
        providerCode: 0,
        providerMsg: `wallet_transaction:${walletCredit?.transactionId}`,
      });
    } catch (creditError) {
      await NineWicketSession.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "reconciliation_required",
            cashoutStatus: "failed",
            settlementError: `Debit succeeded but wallet credit failed: ${creditError.message}`,
            "providerMetadata.walletCreditPending": true,
            "providerMetadata.confirmedDebitAmount": creditAmount,
            "providerMetadata.cashoutTransferId": cashoutTransferId,
          },
        },
      );
      throw creditError;
    }

    const creditTxId = walletCredit?.transactionId || walletCredit?._id;
    session.walletCreditTransaction = creditTxId;

    return {
      alreadyCredited: false,
      transactionId: creditTxId,
    };
  }

  async cashout({
    session,
    user,
    amount,
    cashoutTransferId: passedTransferId = null,
  }) {
    const cashoutTransferId =
      passedTransferId ||
      session.cashoutTransferId ||
      generateTransferId("9WDB");

    if (!session.cashoutTransferId) {
      session.cashoutTransferId = cashoutTransferId;
      await NineWicketSession.updateOne(
        { _id: session._id },
        { $set: { cashoutTransferId } },
      );
    }

    // Check if provider debit has already been successfully processed (idempotent retry)
    let existingTransfer = null;
    try {
      if (typeof NineWicketTransfer.findOne === "function") {
        const q = NineWicketTransfer.findOne({
          transferId: cashoutTransferId,
        });
        existingTransfer =
          typeof q?.lean === "function" ? await q.lean() : await q;
      }
    } catch (err) {
      existingTransfer = null;
    }

    if (existingTransfer && existingTransfer.status === "completed") {
      this.logCashoutAttempt({
        userId: session.user,
        sessionId: session._id,
        providerSessionId: session.sessionId,
        cashoutTransferId,
        requestedDebitAmount: r2(amount),
        providerCode: existingTransfer.providerCode ?? 0,
        providerMsg: "idempotent_skip: debit already completed at provider",
        beforeAmount: existingTransfer.beforeAmount,
        afterAmount: existingTransfer.afterAmount,
      });

      const confirmedAmount = r2(
        Math.abs(
          existingTransfer.transferAmount || existingTransfer.amount || amount,
        ),
      );

      const creditResult = await this.creditUserWalletSafely({
        session,
        user,
        amount: confirmedAmount,
        cashoutTransferId,
      });

      await NineWicketSession.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "completed",
            cashoutStatus: "debited",
            walletCreditTransaction: creditResult.transactionId,
            afterAmount: existingTransfer.afterAmount,
            endedAt: new Date(),
          },
        },
      );

      await this.processSessionSettlementSideEffects(session, confirmedAmount);
      return {
        success: true,
        returnedAmount: confirmedAmount,
        status: "completed",
      };
    }

    const payload = await this.buildPayload({
      user,
      balance: -r2(amount),
      transferId: cashoutTransferId,
      language: session.language || "en",
      gameUid: session.gameUid,
    });

    await NineWicketTransfer.updateOne(
      { transferId: cashoutTransferId },
      {
        $setOnInsert: {
          transferId: cashoutTransferId,
          session: session._id,
          sessionId: session.sessionId,
          user: session.user,
          memberAccount: session.memberAccount,
          action: "cashout_debit",
          amount: -r2(amount),
          currency: session.currency,
          status: "pending",
          requestPayload: {
            user_id: payload.user_id,
            balance: payload.balance,
            game_uid: payload.game_uid,
            symbol: payload.symbol,
            timestamp: payload.timestamp,
            currency_code: payload.currency_code,
            language: payload.language,
            transfer_id: payload.transfer_id,
          },
        },
      },
      { upsert: true },
    );

    this.logCashoutAttempt({
      userId: session.user,
      sessionId: session._id,
      providerSessionId: session.sessionId,
      cashoutTransferId,
      requestedDebitAmount: r2(amount),
      providerCode: null,
      providerMsg: "cashout_request_initiated",
      beforeAmount: null,
      afterAmount: null,
    });

    let response;
    try {
      response = await this.client.postEncrypted(payload);
    } catch (debitNetworkError) {
      this.logCashoutAttempt({
        userId: session.user,
        sessionId: session._id,
        providerSessionId: session.sessionId,
        cashoutTransferId,
        requestedDebitAmount: r2(amount),
        providerCode: null,
        providerMsg: debitNetworkError.message,
        beforeAmount: null,
        afterAmount: null,
      });

      await Promise.all([
        NineWicketTransfer.updateOne(
          { transferId: cashoutTransferId },
          {
            $set: {
              status: "failed",
              providerMsg: debitNetworkError.message,
            },
          },
        ),
        NineWicketSession.updateOne(
          { _id: session._id },
          {
            $set: {
              status: "reconciliation_required",
              cashoutStatus: "failed",
              settlementError: debitNetworkError.message,
              "providerMetadata.unresolvedDebitTransferId": cashoutTransferId,
              "providerMetadata.debitNetworkError": debitNetworkError.message,
            },
          },
        ),
      ]);
      throw debitNetworkError;
    }

    const provider = extractProviderAmounts(response);
    this.logCashoutAttempt({
      userId: session.user,
      sessionId: session._id,
      providerSessionId: session.sessionId,
      cashoutTransferId,
      requestedDebitAmount: r2(amount),
      providerCode: Number(response?.code),
      providerMsg: safeProviderMessage(response),
      beforeAmount: provider.beforeAmount,
      afterAmount: provider.afterAmount,
    });

    if (response?.code === undefined || Number(response?.code) !== 0) {
      await Promise.all([
        NineWicketTransfer.updateOne(
          { transferId: cashoutTransferId },
          {
            $set: {
              status: "failed",
              providerCode: Number(response?.code),
              providerMsg: safeProviderMessage(response),
              providerResponse: sanitizeProviderResponse(response),
            },
          },
        ),
        NineWicketSession.updateOne(
          { _id: session._id },
          {
            $set: {
              status: "reconciliation_required",
              cashoutStatus: "failed",
              settlementError: safeProviderMessage(response),
            },
          },
        ),
      ]);
      throw new NineWicketProviderError(
        safeProviderMessage(response),
        response,
      );
    }

    // Exact confirmed amount from provider
    let confirmedAmount = r2(amount);
    if (provider.hasTransferAmount && Math.abs(provider.transferAmount) > 0) {
      confirmedAmount = r2(Math.abs(provider.transferAmount));
    } else if (
      provider.hasBeforeAmount &&
      provider.hasAfterAmount &&
      provider.beforeAmount >= provider.afterAmount
    ) {
      confirmedAmount = r2(provider.beforeAmount - provider.afterAmount);
    }

    const creditResult = await this.creditUserWalletSafely({
      session,
      user,
      amount: confirmedAmount,
      cashoutTransferId,
    });

    await Promise.all([
      NineWicketTransfer.updateOne(
        { transferId: cashoutTransferId },
        {
          $set: {
            beforeAmount: provider.beforeAmount,
            afterAmount: provider.afterAmount,
            transferAmount: provider.transferAmount || -confirmedAmount,
            status: "completed",
            walletTransaction: creditResult.transactionId,
            providerCode: Number(response.code),
            providerMsg: safeProviderMessage(response),
            providerResponse: sanitizeProviderResponse(response),
          },
        },
      ),
      NineWicketSession.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "completed",
            cashoutStatus: "debited",
            walletCreditTransaction: creditResult.transactionId,
            afterAmount: provider.afterAmount,
            endedAt: new Date(),
          },
        },
      ),
    ]);

    await this.processSessionSettlementSideEffects(session, confirmedAmount);

    this.logProviderEvent("cashout_debit", {
      userId: session.user,
      gameUid: session.gameUid,
      sessionId: session.sessionId,
      transferId: cashoutTransferId,
      beforeAmount: provider.beforeAmount,
      afterAmount: provider.afterAmount,
      transferAmount: provider.transferAmount || -confirmedAmount,
      currency: session.currency,
      providerCode: Number(response.code),
      providerMsg: safeProviderMessage(response),
    });

    return {
      success: true,
      returnedAmount: confirmedAmount,
      status: "completed",
    };
  }

  async recoverUnresolvedSettlements({ maxAgeMs = 60000, limit = 10 } = {}) {
    const cutoffDate = new Date(Date.now() - maxAgeMs);
    let sessions = [];
    try {
      const query = NineWicketSession.find({
        $or: [
          {
            status: "cashout_pending",
            cashoutStatus: "processing",
            settlementStartedAt: { $lt: cutoffDate },
          },
          {
            status: "ending",
            cashoutStatus: { $in: ["not_started", "failed"] },
            endedAt: { $lt: cutoffDate },
          },
        ],
      });
      const sortedQuery =
        typeof query?.sort === "function"
          ? query.sort({ createdAt: 1 })
          : query;
      const limitedQuery =
        typeof sortedQuery?.limit === "function"
          ? sortedQuery.limit(limit)
          : sortedQuery;
      sessions =
        typeof limitedQuery?.lean === "function"
          ? await limitedQuery.lean()
          : await limitedQuery;
    } catch (err) {
      logger.error(
        `[9Wicket] Error querying unresolved settlements: ${err.message}`,
      );
      return { examined: 0, settled: 0, failed: 0, results: [] };
    }

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return { examined: 0, settled: 0, failed: 0, results: [] };
    }

    const results = [];
    let settled = 0;
    let failed = 0;

    for (const session of sessions) {
      try {
        const result = await this.settleSession({
          sessionObjectId: session._id,
          sessionId: session.sessionId,
          userId: session.user,
        });
        results.push({
          sessionId: session.sessionId,
          sessionObjectId: session._id,
          success: result.success,
          status: result.status,
          returnedAmount: result.returnedAmount,
        });
        if (result.success) {
          settled++;
        } else {
          failed++;
        }
      } catch (sessionErr) {
        failed++;
        results.push({
          sessionId: session.sessionId,
          sessionObjectId: session._id,
          success: false,
          error: sessionErr.message,
        });
      }
    }

    return {
      examined: sessions.length,
      settled,
      failed,
      results,
    };
  }

  logCashoutAttempt(data = {}) {
    logger.info("[9WICKET_CASHOUT_ATTEMPT]", {
      user_id: data.userId ? String(data.userId) : undefined,
      session_id: data.sessionId ? String(data.sessionId) : undefined,
      nine_wicket_session_id: data.providerSessionId
        ? String(data.providerSessionId)
        : undefined,
      cashout_transfer_id: data.cashoutTransferId,
      requested_debit_amount:
        data.requestedDebitAmount !== null &&
        data.requestedDebitAmount !== undefined
          ? r2(data.requestedDebitAmount)
          : null,
      provider_code:
        data.providerCode !== null && data.providerCode !== undefined
          ? Number(data.providerCode)
          : null,
      provider_message: data.providerMsg || null,
      before_amount:
        data.beforeAmount !== null && data.beforeAmount !== undefined
          ? r2(data.beforeAmount)
          : null,
      after_amount:
        data.afterAmount !== null && data.afterAmount !== undefined
          ? r2(data.afterAmount)
          : null,
      timestamp: new Date().toISOString(),
    });
  }

  logProviderEvent(action, data = {}) {
    logger.info("[9WICKET]", {
      action,
      user_id: data.userId ? String(data.userId) : undefined,
      game_uid: data.gameUid,
      session_id: data.sessionId,
      transfer_id: data.transferId,
      before_amount: data.beforeAmount,
      after_amount: data.afterAmount,
      transfer_amount: data.transferAmount,
      currency: data.currency,
      provider_code: data.providerCode,
      provider_msg: data.providerMsg,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new NineWicketService();
module.exports.NineWicketService = NineWicketService;
module.exports.NineWicketProviderError = NineWicketProviderError;
module.exports.NineWicketInsufficientBalanceError =
  NineWicketInsufficientBalanceError;
module.exports.generateTransferId = generateTransferId;
module.exports.extractProviderAmounts = extractProviderAmounts;
module.exports.parseProviderAmount = parseProviderAmount;
