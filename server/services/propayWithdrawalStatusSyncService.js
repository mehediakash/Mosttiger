const mongoose = require("mongoose");

const Transaction = require("../models/Transaction");
const Withdrawal = require("../models/Withdrawal");
const WalletService = require("./walletService");
const propayWithdrawalService = require("./propayWithdrawalService");

const CHECK_INTERVAL_MS = Number(
  process.env.PROPAY_WITHDRAWAL_SYNC_INTERVAL_MS || 60 * 1000,
);
const BATCH_SIZE = Number(process.env.PROPAY_WITHDRAWAL_SYNC_BATCH_SIZE || 20);
const CHECK_STALE_AFTER_MS = Math.max(CHECK_INTERVAL_MS - 5000, 1000);

let intervalId = null;
let isRunning = false;

const getGatewayStatus = (payload = {}) =>
  String(
    payload.transaction_status ||
      payload.transactionStatus ||
      payload.data?.transaction_status ||
      payload.data?.transactionStatus ||
      "",
  )
    .trim()
    .toLowerCase();

const updatePayoutingWithdrawal = async (withdrawalId) => {
  await Withdrawal.updateOne(
    {
      _id: withdrawalId,
      status: "processing",
    },
    {
      $set: {
        "propayDetails.transactionStatus": "payouting",
        "propayDetails.lastStatusCheckedAt": new Date(),
      },
    },
  );
};

const completeWithdrawal = async (withdrawalId) => {
  const updated = await Withdrawal.findOneAndUpdate(
    {
      _id: withdrawalId,
      status: "processing",
    },
    {
      $set: {
        status: "completed",
        "propayDetails.transactionStatus": "success",
        "propayDetails.lastStatusCheckedAt": new Date(),
        processedAt: new Date(),
      },
    },
    { new: true },
  );

  if (updated) {
    console.log("Withdrawal Updated:", "completed");
  }
};

const failWithdrawalAndRefund = async (withdrawalId) => {
  const session = await mongoose.startSession();

  try {
    let refunded = false;

    await session.withTransaction(async () => {
      const withdrawal = await Withdrawal.findOneAndUpdate(
        {
          _id: withdrawalId,
          status: "processing",
        },
        {
          $set: {
            status: "failed",
            "propayDetails.transactionStatus": "failed",
            "propayDetails.lastStatusCheckedAt": new Date(),
            processedAt: new Date(),
          },
        },
        { new: true, session },
      );

      if (!withdrawal) {
        return;
      }

      console.log("Withdrawal Updated:", "failed");

      const existingRefund = await Transaction.findOne({
        type: "refund",
        "metadata.withdrawalId": withdrawal._id,
      })
        .session(session)
        .lean();

      if (!existingRefund) {
        await WalletService.updateWallet(
          withdrawal.user,
          withdrawal.amount,
          "main",
          "refund",
          {
            description: "ProPay withdrawal failed refund",
            withdrawalId: withdrawal._id,
            paymentMethod: withdrawal.paymentMethod,
            provider: withdrawal.paymentMethod,
            propayOrderNo: withdrawal.propayDetails?.orderNo || null,
          },
          session,
        );
        refunded = true;
      }
    });

    console.log("Wallet Refunded:", refunded);
  } finally {
    session.endSession();
  }
};

const syncWithdrawal = async (withdrawal) => {
  const orderNo = withdrawal.propayDetails?.orderNo;
  if (!orderNo || withdrawal.status !== "processing") return;

  const claimedWithdrawal = await Withdrawal.findOneAndUpdate(
    {
      _id: withdrawal._id,
      status: "processing",
      "propayDetails.orderNo": orderNo,
      $or: [
        { "propayDetails.lastStatusCheckedAt": null },
        { "propayDetails.lastStatusCheckedAt": { $exists: false } },
        {
          "propayDetails.lastStatusCheckedAt": {
            $lte: new Date(Date.now() - CHECK_STALE_AFTER_MS),
          },
        },
      ],
    },
    {
      $set: {
        "propayDetails.lastStatusCheckedAt": new Date(),
      },
    },
    { new: true },
  ).lean();

  if (!claimedWithdrawal) return;

  console.log("Checking Withdrawal:", orderNo);

  const gatewayResponse =
    await propayWithdrawalService.checkWithdrawalStatus(orderNo);
  const transactionStatus = getGatewayStatus(gatewayResponse);

  console.log("Gateway Status:", transactionStatus);

  if (transactionStatus === "success") {
    await completeWithdrawal(withdrawal._id);
    return;
  }

  if (transactionStatus === "failed") {
    await failWithdrawalAndRefund(withdrawal._id);
    return;
  }

  if (transactionStatus === "payouting") {
    await updatePayoutingWithdrawal(withdrawal._id);
  }
};

const syncProcessingWithdrawals = async () => {
  if (isRunning) return;

  isRunning = true;
  try {
    const withdrawals = await Withdrawal.find({
      status: "processing",
      "propayDetails.orderNo": { $nin: [null, ""] },
    })
      .select("_id user amount paymentMethod status propayDetails.orderNo")
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE)
      .lean();

    for (const withdrawal of withdrawals) {
      try {
        await syncWithdrawal(withdrawal);
      } catch (error) {
        console.error("ProPay withdrawal status sync error:", {
          withdrawalId: withdrawal._id,
          orderNo: withdrawal.propayDetails?.orderNo,
          message: error.message,
        });
      }
    }
  } finally {
    isRunning = false;
  }
};

const startProPayWithdrawalStatusSync = () => {
  if (intervalId) return intervalId;

  intervalId = setInterval(syncProcessingWithdrawals, CHECK_INTERVAL_MS);
  syncProcessingWithdrawals().catch((error) => {
    console.error("Initial ProPay withdrawal status sync error:", error);
  });

  return intervalId;
};

module.exports = {
  startProPayWithdrawalStatusSync,
  syncProcessingWithdrawals,
};
