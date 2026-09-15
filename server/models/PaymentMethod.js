const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Payment method name is required'],
    enum: ['bkash', 'nogod', 'rocket', 'bank_card']
  },
  type: {
    type: String,
    required: true,
    enum: ['mobile', 'bank']
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required']
  },
  accountName: {
    type: String,
    required: [true, 'Account name is required']
  },
  bankName: {
    type: String,
    required: function() {
      return this.type === 'bank';
    }
  },
  branchName: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  minDeposit: {
    type: Number,
    default: 0
  },
  maxDeposit: {
    type: Number,
    default: 50000
  },
  minWithdraw: {
    type: Number,
    default: 0
  },
  maxWithdraw: {
    type: Number,
    default: 50000
  },
  processingFee: {
    type: Number,
    default: 0
  },
  processingFeeType: {
    type: String,
    enum: ['fixed', 'percentage'],
    default: 'fixed'
  },
  instructions: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

paymentMethodSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

paymentMethodSchema.index({ name: 1, isActive: 1 });
paymentMethodSchema.index({ type: 1 });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);