const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['loss_commission', 'turnover_commission', 'profit_share', 'referral']
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  baseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'BDT'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },
  referenceId: {
    type: String,
    unique: true,
    sparse: true
  },
  gameSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameSession',
    default: null
  },
  sportsBet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SportsBet',
    default: null
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

commissionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.isNew && !this.referenceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.referenceId = `COM${timestamp}${random}`.toUpperCase();
  }
  
  next();
});

// Indexes for performance
commissionSchema.index({ agent: 1, createdAt: -1 });
commissionSchema.index({ fromUser: 1 });
commissionSchema.index({ type: 1, status: 1 });
commissionSchema.index({ calculatedAt: -1 });

module.exports = mongoose.model('Commission', commissionSchema);