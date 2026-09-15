const mongoose = require('mongoose');

const permissionTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['master_agent', 'agent', 'sub_agent']
  },
  permissions: {
    // User Management
    canCreateUser: { type: Boolean, default: false },
    canEditUser: { type: Boolean, default: false },
    canViewUsers: { type: Boolean, default: true },
    canResetUserPassword: { type: Boolean, default: false },

    // Financial Management
    canAddBalance: { type: Boolean, default: false },
    canDeductBalance: { type: Boolean, default: false },
    canAdjustBalance: { type: Boolean, default: false },
    canApproveDeposit: { type: Boolean, default: false },
    canApproveWithdrawal: { type: Boolean, default: false },

    // Game Management
    canViewGames: { type: Boolean, default: true },
    canLaunchGames: { type: Boolean, default: true },

    // Sports Betting
    canViewSports: { type: Boolean, default: true },
    canPlaceBets: { type: Boolean, default: true },

    // Reports & Analytics
    canViewReports: { type: Boolean, default: false },
    canExportData: { type: Boolean, default: false },

    // System Management
    canManageSettings: { type: Boolean, default: false },
    canViewLogs: { type: Boolean, default: false }
  },
  limits: {
    maxUsers: { type: Number, default: 100 },
    maxDailyDeposit: { type: Number, default: 100000 },
    maxDailyWithdraw: { type: Number, default: 50000 },
    maxMonthlyTurnover: { type: Number, default: 1000000 }
  },
  commissionRates: {
    loss_commission: { type: Number, default: 0, min: 0, max: 100 },
    turnover_commission: { type: Number, default: 0, min: 0, max: 100 },
    profit_share: { type: Number, default: 0, min: 0, max: 100 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
permissionTemplateSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('PermissionTemplate', permissionTemplateSchema);