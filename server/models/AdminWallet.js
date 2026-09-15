const mongoose = require('mongoose');

const adminWalletSchema = new mongoose.Schema({
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDeposits: {
    type: Number,
    default: 0
  },
  totalWithdrawals: {
    type: Number,
    default: 0
  },
  totalCommissionPaid: {
    type: Number,
    default: 0
  },
  totalAgentTransfers: {
    type: Number,
    default: 0
  },
  ledger: [{
    type: {
      type: String,
      required: true,
      enum: ['deposit', 'withdrawal', 'commission', 'agent_transfer', 'adjustment']
    },
    amount: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    referenceId: {
      type: String,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

adminWalletSchema.pre('save', async function() {
  this.updatedAt = Date.now();

});

module.exports = mongoose.model('AdminWallet', adminWalletSchema);