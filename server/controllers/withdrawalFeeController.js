const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

class WithdrawalFeeController {
  
  // Update global withdrawal fee settings
  async updateGlobalFees(req, res) {
    try {
      const { processingFee, processingFeeType, minWithdrawal, maxWithdrawal } = req.body;

      // Update all payment methods with new fees
      const PaymentMethod = require('../models/PaymentMethod');
      await PaymentMethod.updateMany(
        {},
        {
          processingFee: processingFee || 0,
          processingFeeType: processingFeeType || 'fixed',
          minWithdraw: minWithdrawal || 0,
          maxWithdraw: maxWithdrawal || 50000
        }
      );

      res.status(200).json({
        success: true,
        message: 'Global withdrawal fees updated successfully',
        data: {
          processingFee,
          processingFeeType,
          minWithdrawal,
          maxWithdrawal
        }
      });
    } catch (error) {
      console.error('Update global fees error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating withdrawal fees'
      });
    }
  }

  // Set custom fees for specific user
  async setUserCustomFees(req, res) {
    try {
      const { userId } = req.params;
      const { processingFee, processingFeeType, minWithdrawal, maxWithdrawal } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Store custom fees in user metadata
      user.metadata = user.metadata || {};
      user.metadata.withdrawalFees = {
        processingFee: processingFee || null,
        processingFeeType: processingFeeType || 'fixed',
        minWithdrawal: minWithdrawal || null,
        maxWithdrawal: maxWithdrawal || null,
        updatedBy: req.user.id,
        updatedAt: new Date()
      };

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Custom withdrawal fees set for user',
        data: {
          user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email
          },
          fees: user.metadata.withdrawalFees
        }
      });
    } catch (error) {
      console.error('Set user custom fees error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while setting custom fees'
      });
    }
  }

  // Get fee settings overview
  async getFeeSettings(req, res) {
    try {
      const PaymentMethod = require('../models/PaymentMethod');
      
      const paymentMethods = await PaymentMethod.find({ isActive: true })
        .select('name type processingFee processingFeeType minWithdraw maxWithdraw');

      // Get users with custom fees
      const usersWithCustomFees = await User.find({
        'metadata.withdrawalFees': { $exists: true }
      })
      .select('fullName email metadata.withdrawalFees')
      .limit(50);

      res.status(200).json({
        success: true,
        data: {
          globalSettings: paymentMethods,
          customUserFees: usersWithCustomFees,
          totalCustomFees: usersWithCustomFees.length
        }
      });
    } catch (error) {
      console.error('Get fee settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching fee settings'
      });
    }
  }
}

module.exports = new WithdrawalFeeController();