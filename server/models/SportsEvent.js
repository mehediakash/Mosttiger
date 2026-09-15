const mongoose = require('mongoose');

const sportsEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  sport: {
    type: String,
    required: true
  },
  sportKey: {
    type: String,
    required: true
  },
  homeTeam: {
    type: String,
    required: true
  },
  awayTeam: {
    type: String,
    required: true
  },
  commenceTime: {
    type: Date,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  scores: {
    home: { type: Number, default: null },
    away: { type: Number, default: null }
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed', 'cancelled', 'postponed'],
    default: 'upcoming'
  },
  odds: [{
    bookmaker: {
      type: String,
      required: true
    },
    markets: [{
      market: {
        type: String,
        required: true
      },
      lastUpdate: {
        type: Date,
        default: Date.now
      },
      outcomes: [{
        name: {
          type: String,
          required: true
        },
        price: {
          type: Number,
          required: true
        },
        point: {
          type: Number,
          default: null
        }
      }]
    }]
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
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

sportsEventSchema.pre('save', async function() {
  this.updatedAt = Date.now();

});

// Indexes for performance
sportsEventSchema.index({ sportKey: 1 });
sportsEventSchema.index({ commenceTime: 1 });
sportsEventSchema.index({ status: 1 });
sportsEventSchema.index({ completed: 1 });
sportsEventSchema.index({ 'odds.markets.lastUpdate': 1 });

module.exports = mongoose.model('SportsEvent', sportsEventSchema);