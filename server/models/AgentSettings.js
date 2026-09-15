const mongoose = require('mongoose');

const agentSettingsSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Commission Rates
  commissionRates: {
    loss_commission: { type: Number, default: 0, min: 0, max: 100 },
    turnover_commission: { type: Number, default: 0, min: 0, max: 100 },
    profit_share: { type: Number, default: 0, min: 0, max: 100 }
  },
  // Downline Commission Distribution
  downlineCommissionRates: {
    level1: {
      loss_commission: { type: Number, default: 0 },
      turnover_commission: { type: Number, default: 0 },
      profit_share: { type: Number, default: 0 }
    },
    level2: {
      loss_commission: { type: Number, default: 0 },
      turnover_commission: { type: Number, default: 0 },
      profit_share: { type: Number, default: 0 }
    },
    level3: {
      loss_commission: { type: Number, default: 0 },
      turnover_commission: { type: Number, default: 0 },
      profit_share: { type: Number, default: 0 }
    }
  },
  // Wallet System
  wallet: {
    balance: { type: Number, default: 0, min: 0 },
    pendingCommission: { type: Number, default: 0, min: 0 },
    totalEarned: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 }
  },
  // Limits
  limits: {
    maxUsers: { type: Number, default: 100 },
    maxDeposit: { type: Number, default: 100000 },
    maxWithdrawal: { type: Number, default: 50000 },
    creditLimit: { type: Number, default: 0 }
  },
  // Permissions
  permissions: {
    // User Management
    addUser: { type: Boolean, default: false },
    editUser: { type: Boolean, default: false },
    viewUsers: { type: Boolean, default: true },
    resetUserPassword: { type: Boolean, default: false },
    
    // Balance Management
    addBalance: { type: Boolean, default: false },
    deductBalance: { type: Boolean, default: false },
    adjustBalance: { type: Boolean, default: false },
    
    // Transaction Management
    approveDeposit: { type: Boolean, default: false },
    approveWithdrawal: { type: Boolean, default: false },
    viewTransactions: { type: Boolean, default: true },
    
    // Bet Management
    viewUserBets: { type: Boolean, default: true },
    cancelBets: { type: Boolean, default: false },
    
    // Agent Management
    createSubAgents: { type: Boolean, default: false },
    viewSubAgents: { type: Boolean, default: true },
    setSubAgentCommission: { type: Boolean, default: false },
    
    // Financial
    viewCommission: { type: Boolean, default: true },
    withdrawCommission: { type: Boolean, default: true },
    viewReports: { type: Boolean, default: true }
  },
  // Status
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  
  // Hierarchy
  parentAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  level: { type: Number, default: 1 }, // 1: Master, 2: Agent, 3: Sub-Agent
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

agentSettingsSchema.pre('save',async function() {
  this.updatedAt = Date.now();

});

module.exports = mongoose.model('AgentSettings', agentSettingsSchema);