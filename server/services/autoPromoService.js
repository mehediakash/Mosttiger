const PromoCode = require('../models/PromoCode');
const PromoCodeUsage = require('../models/PromoCodeUsage');
const WalletService = require('../services/walletService');

class AutoPromoService {
  
  // Auto-apply eligible promo codes for deposit
  async autoApplyPromoForDeposit(userId, depositAmount, depositId) {
    try {
      // Find active promo codes that auto-apply based on deposit amount
      const autoApplyPromos = await PromoCode.find({
        isActive: true,
        type: 'deposit_bonus',
        'metadata.autoApply': true,
        minDeposit: { $lte: depositAmount },
        validFrom: { $lte: new Date() },
        $or: [
          { validUntil: { $gte: new Date() } },
          { validUntil: null }
        ]
      });

      const appliedBonuses = [];

      for (const promo of autoApplyPromos) {
        // Check if user is eligible
        const isEligible = await this.checkUserEligibility(userId, promo);
        
        if (isEligible) {
          const bonusAmount = this.calculateBonusAmount(promo, depositAmount);
          
          // Apply bonus
          const result = await this.applyPromoBonus(userId, promo, bonusAmount, depositId);
          appliedBonuses.push(result);
        }
      }

      return {
        success: true,
        appliedBonuses: appliedBonuses,
        totalBonus: appliedBonuses.reduce((sum, bonus) => sum + bonus.bonusAmount, 0)
      };
    } catch (error) {
      console.error('Auto-apply promo error:', error);
      throw error;
    }
  }

  // Check if user is eligible for promo
  async checkUserEligibility(userId, promoCode) {
    const User = require('../models/User');
    const user = await User.findById(userId);

    // Check if promo is for new users only
    if (promoCode.newUsersOnly) {
      const userAge = Date.now() - user.createdAt.getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      if (userAge > oneDay) return false;
    }

    // Check allowed users
    if (promoCode.allowedUsers.length > 0 && !promoCode.allowedUsers.includes(userId)) {
      return false;
    }

    // Check excluded users
    if (promoCode.excludedUsers.includes(userId)) {
      return false;
    }

    // Check if user has already used this promo
    if (promoCode.isSingleUse) {
      const existingUsage = await PromoCodeUsage.findOne({
        user: userId,
        promoCode: promoCode._id
      });
      if (existingUsage) return false;
    }

    // Check max uses
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      return false;
    }

    return true;
  }

  // Calculate bonus amount
  calculateBonusAmount(promoCode, depositAmount) {
    let bonusAmount = promoCode.bonusAmount || 0;

    if (promoCode.percentage > 0) {
      const percentageBonus = (depositAmount * promoCode.percentage) / 100;
      bonusAmount += percentageBonus;
    }

    // Apply maximum bonus limit
    if (promoCode.maxBonus > 0 && bonusAmount > promoCode.maxBonus) {
      bonusAmount = promoCode.maxBonus;
    }

    return bonusAmount;
  }

  // Apply promo bonus to user wallet
  async applyPromoBonus(userId, promoCode, bonusAmount, depositId) {
    const session = await PromoCode.startSession();
    session.startTransaction();

    try {
      // Create promo code usage record
      const usage = new PromoCodeUsage({
        user: userId,
        promoCode: promoCode._id,
        bonusAmount: bonusAmount,
        walletType: promoCode.walletType,
        depositAmount: depositId ? await this.getDepositAmount(depositId) : 0,
        status: 'active',
        metadata: {
          autoApplied: true,
          depositId: depositId
        }
      });

      await usage.save({ session });

      // Update promo code usage count
      promoCode.usedCount += 1;
      await promoCode.save({ session });

      // Add bonus to user wallet
      await WalletService.updateWallet(
        userId,
        bonusAmount,
        promoCode.walletType,
        'bonus',
        {
          description: `Auto-applied promo: ${promoCode.name}`,
          promoCode: promoCode._id,
          usageId: usage._id,
          autoApplied: true
        }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        promoCode: promoCode.code,
        bonusAmount: bonusAmount,
        walletType: promoCode.walletType,
        usageId: usage._id
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // Get deposit amount for reference
  async getDepositAmount(depositId) {
    const Deposit = require('../models/Deposit');
    const deposit = await Deposit.findById(depositId);
    return deposit ? deposit.amount : 0;
  }

  // Get auto-apply promo rules
  async getAutoApplyRules() {
    return await PromoCode.find({
      'metadata.autoApply': true,
      isActive: true
    })
    .select('code name type minDeposit percentage maxBonus metadata.autoApply')
    .sort({ minDeposit: 1 });
  }

  // Update auto-apply rule
  async updateAutoApplyRule(promoCodeId, autoApplySettings) {
    const promoCode = await PromoCode.findByIdAndUpdate(
      promoCodeId,
      {
        metadata: {
          ...autoApplySettings,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    return promoCode;
  }
}

module.exports = new AutoPromoService();