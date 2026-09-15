const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: null
  },
  location: {
    country: { type: String, default: null },
    city: { type: String, default: null },
    region: { type: String, default: null }
  },
  device: {
    type: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
    browser: { type: String, default: null },
    os: { type: String, default: null }
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'failed', 'blocked']
  },
  failureReason: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
loginLogSchema.index({ user: 1, createdAt: -1 });
loginLogSchema.index({ ipAddress: 1 });
loginLogSchema.index({ status: 1 });
loginLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LoginLog', loginLogSchema);