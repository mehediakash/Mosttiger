const mongoose = require('mongoose');

const sportsBetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  betSlipId: {
    type: String,
    required: true,
    unique: true
  },
  matches: [{
    sport: {
      type: String,
      required: true
    },
    matchId: {
      type: String,
      required: true
    },
    matchName: {
      type: String,
      required: true
    },
    matchTime: {
      type: Date,
      required: true
    },
    market: {
      type: String,
      required: true
    },
    selection: {
      type: String,
      required: true
    },
    odds: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'won', 'lost', 'cancelled', 'void'],
      default: 'pending'
    }
  }],
  totalStake: {
    type: Number,
    required: true,
    min: 0
  },
  potentialWin: {
    type: Number,
    required: true,
    min: 0
  },
  actualWin: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'BDT'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'won', 'lost', 'cancelled', 'partially_won'],
    default: 'pending'
  },
  walletType: {
    type: String,
    enum: ['main', 'bonus', 'freeBets'],
    default: 'main'
  },
  placedAt: {
    type: Date,
    default: Date.now
  },
  settledAt: {
    type: Date,
    default: null
  },
  referenceId: {
    type: String,
    unique: true,
    sparse: true
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

sportsBetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.isNew && !this.referenceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.referenceId = `BET${timestamp}${random}`.toUpperCase();
  }
  
  // Calculate potential win
  if (this.matches.length > 0 && this.totalStake) {
    const totalOdds = this.matches.reduce((acc, match) => acc * match.odds, 1);
    this.potentialWin = parseFloat((this.totalStake * totalOdds).toFixed(2));
  }
  
  next();
});

// Indexes for performance
sportsBetSchema.index({ user: 1, createdAt: -1 });
sportsBetSchema.index({ status: 1 });
sportsBetSchema.index({ 'matches.matchId': 1 });
sportsBetSchema.index({ placedAt: -1 });

module.exports = mongoose.model('SportsBet', sportsBetSchema);