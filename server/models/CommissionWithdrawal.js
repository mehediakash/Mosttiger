const mongoose = require('mongoose');

const commissionWithdrawalSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  previousBalance: {
    type: Number,
    required: true
  },
  newBalance: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  referenceId: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

commissionWithdrawalSchema.pre('save', function(next) {
  if (this.isNew && !this.referenceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.referenceId = `CW${timestamp}${random}`.toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

commissionWithdrawalSchema.index({ agent: 1, createdAt: -1 });
commissionWithdrawalSchema.index({ status: 1 });

module.exports = mongoose.model('CommissionWithdrawal', commissionWithdrawalSchema);