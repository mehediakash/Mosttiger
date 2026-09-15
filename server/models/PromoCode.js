const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    required: true,
    enum: ['deposit_bonus', 'free_bet', 'cashback', 'loss_recovery', 'turnover_bonus']
  },
  bonusAmount: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  minDeposit: {
    type: Number,
    default: 0
  },
  maxBonus: {
    type: Number,
    default: 0
  },
  walletType: {
    type: String,
    enum: ['main', 'bonus', 'freeBets'],
    default: 'bonus'
  },
  turnoverRequirement: {
    type: Number,
    default: 0
  },
  maxUses: {
    type: Number,
    default: 1
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSingleUse: {
    type: Boolean,
    default: true
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: null
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  excludedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  newUsersOnly: {
    type: Boolean,
    default: false
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

promoCodeSchema.pre('save', async function() {
  this.updatedAt = Date.now();
  
  // Convert code to uppercase
  if (this.isModified('code')) {
    this.code = this.code.toUpperCase();
  }
  
 
});

// Indexes for performance
promoCodeSchema.index({ type: 1, isActive: 1 });
promoCodeSchema.index({ validFrom: 1, validUntil: 1 });
promoCodeSchema.index({ isActive: 1 });

// Virtual for isExpired
promoCodeSchema.virtual('isExpired').get(function() {
  if (this.validUntil && new Date() > this.validUntil) {
    return true;
  }
  if (this.maxUses && this.usedCount >= this.maxUses) {
    return true;
  }
  return false;
});

// Virtual for isValid
promoCodeSchema.virtual('isValid').get(function() {
  return this.isActive && !this.isExpired;
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);