const mongoose = require('mongoose');

const paymentGatewaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['manual', 'automatic']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  credentials: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  settings: {
    minDeposit: { type: Number, default: 0 },
    maxDeposit: { type: Number, default: 50000 },
    processingFee: { type: Number, default: 0 },
    processingFeeType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    autoApprove: { type: Boolean, default: false },
    autoApproveLimit: { type: Number, default: 0 }
  },
  webhookUrl: {
    type: String,
    default: null
  },
  supportedCurrencies: [{
    type: String,
    default: ['BDT']
  }],
  updatedBy: {
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

paymentGatewaySchema.pre('save', async function() {
  this.updatedAt = Date.now();

});

module.exports = mongoose.model('PaymentGateway', paymentGatewaySchema);