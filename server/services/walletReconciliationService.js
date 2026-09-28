const Transaction = require("../models/Transaction");
const logger = require("../utils/logger");

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

class WalletReconciliationService {
  /**
   * Safely extracts provider credit_amount from root or nested callback data.
   * Returns rounded number or null if missing/invalid.
   */
  static extractProviderCreditAmount(callbackData) {
    if (!callbackData || typeof callbackData !== "object") {
      return null;
    }

    const candidate =
      callbackData.credit_amount ??
      callbackData.creditAmount ??
      callbackData.data?.credit_amount ??
      callbackData.data?.creditAmount;

    if (candidate === null || candidate === undefined || candidate === "") {
      return null;
    }

    const numeric = Number(candidate);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return r2(numeric);
  }

  /**
   * Read-only lookup for recent non-game or concurrent transactions
   * that could explain a balance difference.
   */
  static async findExplanatoryTransactions(
    userId,
    since = null,
    excludeTxId = null,
  ) {
    try {
      const sinceDate = since
        ? new Date(since)
        : new Date(Date.now() - 30 * 60 * 1000); // 30 mins window

      const query = {
        user: userId,
        createdAt: { $gte: sinceDate },
      };

      if (excludeTxId) {
        query._id = { $ne: excludeTxId };
      }

      const txs = await Transaction.find(query)
        .select("type amount newBalance previousBalance status createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      return txs.map((tx) => ({
        id: String(tx._id),
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        createdAt: tx.createdAt,
      }));
    } catch (error) {
      logger.warn("[WALLET_RECONCILIATION] Explanatory lookup failed", {
        userId: String(userId),
        message: error.message,
      });
      return [];
    }
  }

  /**
   * Performs strictly observational reconciliation between provider credit_amount
   * and the platform's atomic wallet balance after round settlement.
   * NEVER mutates user wallet or modifies balances.
   */
  static async reconcile({
    userId,
    gameRound = null,
    serialNumber = null,
    providerCreditAmount = null,
    walletBefore,
    walletAfter,
    transactionId = null,
    sessionStartTime = null,
  }) {
    const wb = r2(walletBefore);
    const wa = r2(walletAfter);

    let reconciliationStatus = "INSUFFICIENT_DATA";
    let discrepancy = null;
    let explainedBy = [];

    if (providerCreditAmount === null || providerCreditAmount === undefined) {
      reconciliationStatus = "INSUFFICIENT_DATA";
    } else {
      const pca = r2(providerCreditAmount);
      discrepancy = r2(pca - wa);

      if (Math.abs(discrepancy) < 0.01) {
        reconciliationStatus = "MATCH";
      } else {
        reconciliationStatus = "MISMATCH";
        explainedBy = await this.findExplanatoryTransactions(
          userId,
          sessionStartTime,
          transactionId,
        );
      }
    }

    const logContext = {
      userId: String(userId),
      gameRound: gameRound ? String(gameRound) : null,
      serialNumber: serialNumber ? String(serialNumber) : null,
      providerCreditAmount:
        providerCreditAmount !== null ? r2(providerCreditAmount) : null,
      walletBefore: wb,
      walletAfter: wa,
      reconciliationStatus,
    };

    if (discrepancy !== null) {
      logContext.discrepancy = discrepancy;
    }

    if (explainedBy.length > 0) {
      logContext.explainedBy = explainedBy;
    }

    if (reconciliationStatus === "MISMATCH") {
      logger.warn("[WALLET_RECONCILIATION]", logContext);
    } else {
      logger.info("[WALLET_RECONCILIATION]", logContext);
    }

    return {
      providerCreditAmount:
        providerCreditAmount !== null ? r2(providerCreditAmount) : null,
      walletBefore: wb,
      walletAfter: wa,
      status: reconciliationStatus,
      discrepancy,
      explainedBy,
    };
  }
}

module.exports = WalletReconciliationService;
