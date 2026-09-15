const User = require("../models/User");
const AgentSettings = require("../models/AgentSettings");
const Counter = require("../models/Counter");

// Helper function to generate sequential userId
async function getNextUserId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "userId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
}

class UserManagementController {
  // Create user under agent hierarchy
  async createUser(req, res) {
    try {
      const { fullName, email, phone, password, initialBalance = 0 } = req.body;

      // lean() not used here - need to modify and save agentSettings
      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      if (!agentSettings.permissions.addUser) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to create users",
        });
      }

      // Check if agent has permission to give balance and sufficient balance
      if (initialBalance > 0) {
        if (!agentSettings.permissions.addBalance) {
          return res.status(403).json({
            success: false,
            message: "You do not have permission to add balance to users",
          });
        }

        if (
          !agentSettings.wallet ||
          agentSettings.wallet.balance < initialBalance
        ) {
          return res.status(400).json({
            success: false,
            message: `Insufficient balance. You have ${agentSettings.wallet?.balance || 0} but trying to transfer ${initialBalance}`,
          });
        }
      }

      // Check if user already exists
      // lean() reduces memory usage for existence check
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { phone }],
      }).lean();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this email or phone",
        });
      }

      // Generate unique userId
      const userId = await getNextUserId();

      // Build hierarchy based on agent role
      const hierarchy = {};
      if (req.user.role === "master_agent") {
        hierarchy.masterAgent = req.user.id;
      } else if (req.user.role === "agent") {
        hierarchy.masterAgent = req.user.hierarchy?.masterAgent;
        hierarchy.agent = req.user.id;
      } else if (req.user.role === "sub_agent") {
        hierarchy.masterAgent = req.user.hierarchy?.masterAgent;
        hierarchy.agent = req.user.hierarchy?.agent;
        hierarchy.subAgent = req.user.id;
      }

      // Create user
      const user = new User({
        fullName,
        email: email.toLowerCase(),
        phone,
        password,
        userId,
        role: "user",
        hierarchy: hierarchy,
        isEmailVerified: true, // Auto-verify for agent-created users
        referredBy: req.user.id,
        wallet: {
          main: initialBalance || 0,
          bonus: 0,
          freeBets: 0,
        },
      });

      await user.save();

      // Transfer balance if initialBalance is provided
      if (initialBalance > 0) {
        // Deduct from agent's wallet
        agentSettings.wallet.balance -= initialBalance;
        await agentSettings.save();

        // Create transaction records
        const Transaction = require("../models/Transaction");

        // Get agent user for transaction
        const agent = await User.findById(req.user.id);
        const agentPreviousBalance = agent.wallet.main;

        // Debit transaction for agent
        await Transaction.create({
          user: req.user.id,
          type: "transfer",
          amount: initialBalance,
          walletType: "main",
          previousBalance: agentPreviousBalance,
          newBalance: agentPreviousBalance, // Agent wallet is in AgentSettings
          status: "completed",
          description: `Balance transferred to user ${user.fullName}`,
          relatedUser: user._id,
          processedBy: req.user.id,
        });

        // Credit transaction for user
        await Transaction.create({
          user: user._id,
          type: "transfer",
          amount: initialBalance,
          walletType: "main",
          previousBalance: 0,
          newBalance: initialBalance,
          status: "completed",
          description: `Initial balance from ${req.user.fullName}`,
          relatedUser: req.user.id,
          processedBy: req.user.id,
        });
      }

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {
          user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            referenceCode: user.referenceCode,
            wallet: user.wallet,
          },
          balanceTransferred: initialBalance,
          remainingAgentBalance: agentSettings.wallet.balance,
        },
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating user",
      });
    }
  }

  // Reset user password (for agents with permission)
  async resetUserPassword(req, res) {
    try {
      const { userId, newPassword } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      if (!agentSettings.permissions.resetUserPassword) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to reset user passwords",
        });
      }

      // Verify user was referred by this agent
      const user = await User.findOne({
        _id: userId,
        referredBy: req.user.id,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. You can only manage users you created.",
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: "User password reset successfully",
      });
    } catch (error) {
      console.error("Reset user password error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while resetting user password",
      });
    }
  }

  // Get list of users created by this agent
  async getMyUsers(req, res) {
    try {
      const { page = 1, limit = 20, search, role = "user" } = req.query;

      let agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      // If agent role and no settings exist, create default settings
      if (!agentSettings && req.user.role === 'agent') {
        agentSettings = new AgentSettings({
          agent: req.user.id,
          commissionRates: {},
          permissions: {
            addUser: true,
            editUser: true,
            viewUsers: true,
            resetUserPassword: true,
            viewCommission: true,
            withdrawCommission: true,
            viewTransactions: true,
            viewUserBets: true,
            viewReports: true,
          },
          parentAgent: req.user.referredBy,
          level: 3,
          createdBy: req.user.referredBy,
        });
        await agentSettings.save();
      }

      // Check permissions - allow agents by default, others need explicit permission
      if (!agentSettings || (!agentSettings.permissions.viewUsers && req.user.role !== 'agent')) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to view users",
        });
      }

      // Build query to find users referred by this agent
      const query = {
        referredBy: req.user.id,
        role: role,
      };

      // Add search filter
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(query)
        .select(
          "fullName email phone role wallet referenceCode isActive isBlocked createdAt",
        )
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await User.countDocuments(query);

      res.status(200).json({
        success: true,
        data: {
          users,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
        },
      });
    } catch (error) {
      console.error("Get my users error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching users",
      });
    }
  }

  // Update user details
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const { fullName, email, phone, isActive, password, walletMainBalance } =
        req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      if (!agentSettings || !agentSettings.permissions.editUser) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to edit users",
        });
      }

      // Verify user was referred by this agent
      const user = await User.findOne({
        _id: userId,
        referredBy: req.user.id,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. You can only edit users you created.",
        });
      }

      // Update allowed fields
      if (fullName) user.fullName = fullName;
      if (email) user.email = email.toLowerCase();
      if (phone) user.phone = phone;
      if (isActive !== undefined) user.isActive = isActive;

      // Update password if provided
      if (password && password.trim() !== "") {
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters",
          });
        }
        user.password = password;
      }

      // Update wallet main balance if provided and agent has permission
      if (walletMainBalance !== undefined && walletMainBalance !== null) {
        if (!agentSettings.permissions.adjustBalance) {
          return res.status(403).json({
            success: false,
            message:
              "You do not have permission to modify user wallet balance",
          });
        }

        const parsedBalance = Number(walletMainBalance);
        if (!isFinite(parsedBalance) || parsedBalance < 0) {
          return res.status(400).json({
            success: false,
            message: "Wallet balance must be a valid non-negative number",
          });
        }

        const balanceDifference = parsedBalance - user.wallet.main;

        // Check if agent has sufficient balance for increase
        if (
          balanceDifference > 0 &&
          agentSettings.wallet.balance < balanceDifference
        ) {
          return res.status(400).json({
            success: false,
            message: `Insufficient balance. You have ${agentSettings.wallet.balance} but trying to add ${balanceDifference}`,
          });
        }

        // Update user's wallet
        const previousBalance = user.wallet.main;
        user.wallet.main = parsedBalance;

        // Adjust agent's wallet balance
        if (balanceDifference !== 0) {
          agentSettings.wallet.balance -= balanceDifference;
          await agentSettings.save();

          // Create transaction record
          const Transaction = require("../models/Transaction");

          await Transaction.create({
            user: user._id,
            type: "adjustment",
            amount: Math.abs(balanceDifference),
            walletType: "main",
            previousBalance: previousBalance,
            newBalance: parsedBalance,
            status: "completed",
            description: `Wallet balance adjusted by ${req.user.fullName} (${balanceDifference > 0 ? "+" : ""}${balanceDifference})`,
            relatedUser: req.user.id,
            processedBy: req.user.id,
          });
        }
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: {
          user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            isActive: user.isActive,
            wallet: {
              main: user.wallet.main,
              bonus: user.wallet.bonus,
              freeBets: user.wallet.freeBets,
            },
          },
        },
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating user",
      });
    }
  }

  // Adjust user balance (add/deduct)
  async adjustUserBalance(req, res) {
    try {
      const { userId, amount, type, reason } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      // Check permissions based on type
      let hasPermission = false;
      if (type === "add" && agentSettings?.permissions.addBalance) {
        hasPermission = true;
      } else if (
        type === "deduct" &&
        agentSettings?.permissions.deductBalance
      ) {
        hasPermission = true;
      } else if (agentSettings?.permissions.adjustBalance) {
        hasPermission = true;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to adjust user balance",
        });
      }

      // Check if agent has sufficient balance when adding balance
      if (type === "add") {
        if (!agentSettings.wallet || agentSettings.wallet.balance < amount) {
          return res.status(400).json({
            success: false,
            message: `Insufficient balance. You have ${agentSettings.wallet?.balance || 0} but trying to transfer ${amount}`,
          });
        }
      }

      // Verify user was referred by this agent
      const user = await User.findOne({
        _id: userId,
        referredBy: req.user.id,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. You can only manage users you created.",
        });
      }

      // Store previous balance before adjustment
      const previousBalance = user.wallet.main;

      // Adjust balance
      const adjustAmount =
        type === "deduct" ? -Math.abs(amount) : Math.abs(amount);
      user.wallet.main = Math.max(0, user.wallet.main + adjustAmount);
      const newBalance = user.wallet.main;

      await user.save();

      // Transfer balance from agent's wallet if adding
      if (type === "add") {
        agentSettings.wallet.balance -= amount;
        await agentSettings.save();
      } else if (type === "deduct") {
        // Return balance to agent's wallet if deducting
        agentSettings.wallet.balance += Math.abs(amount);
        await agentSettings.save();
      }

      // Create transaction record for user
      const Transaction = require("../models/Transaction");
      await Transaction.create({
        user: userId,
        type: "transfer", // Using valid enum value
        amount: Math.abs(amount),
        walletType: "main",
        previousBalance: previousBalance,
        newBalance: newBalance,
        status: "completed",
        description: reason || `Balance ${type} by agent`,
        processedBy: req.user.id,
        relatedUser: req.user.id,
      });

      // Create corresponding transaction for agent
      const agent = await User.findById(req.user.id);
      const agentPreviousBalance = agent.wallet.main;

      await Transaction.create({
        user: req.user.id,
        type: "transfer",
        amount: Math.abs(amount),
        walletType: "main",
        previousBalance: agentPreviousBalance,
        newBalance: agentPreviousBalance, // Agent wallet is in AgentSettings, not User wallet
        status: "completed",
        description: `Balance ${type === "add" ? "transferred to" : "recovered from"} user ${user.fullName}`,
        processedBy: req.user.id,
        relatedUser: userId,
      });

      res.status(200).json({
        success: true,
        message: `Balance ${type === "add" ? "added" : "deducted"} successfully`,
        data: {
          user: {
            _id: user._id,
            fullName: user.fullName,
            wallet: user.wallet,
          },
          agentBalance: agentSettings.wallet.balance,
        },
      });
    } catch (error) {
      console.error("Adjust user balance error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while adjusting balance",
      });
    }
  }

  // Get user activity logs
  async getUserActivityLogs(req, res) {
    try {
      const { userId, page = 1, limit = 20, startDate, endDate } = req.query;

      // Verify user was referred by this agent
      const user = await User.findOne({
        _id: userId,
        referredBy: req.user.id,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. You can only view users you created.",
        });
      }

      // Get user activity (simplified - would integrate with proper logging system)
      const [gameSessions, sportsBets, transactionsRaw] = await Promise.all([
        require("../models/GameSession")
          .find({ user: userId })
          .populate("game", "game_name brand")
          .sort({ createdAt: -1 })
          .limit(10)
          .lean() // Reduce memory usage by ~40%
          .exec(),
        require("../models/SportsBet")
          .find({ user: userId })
          .sort({ placedAt: -1 })
          .limit(10)
          .lean() // Reduce memory usage by ~40%
          .exec(),
        require("../models/Transaction")
          .find({ user: userId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean() // Reduce memory usage by ~40%
          .exec(),
      ]);

      // Transform transactions to add clarity for bet types
      // OPTIMIZATION: Direct object manipulation since we use lean()
      const transactions = transactionsRaw.map(txObj => {
        
        // Handle "bet" type transactions - these represent player losses
        if (txObj.type === 'bet') {
          txObj.displayType = 'Player Loss (Bet)';
          txObj.displayDescription = txObj.description || `Player lost ${txObj.amount} BDT${txObj.gameRound ? ' on game round ' + txObj.gameRound : ' on betting'}`;
          txObj.isLoss = true;
        } else if (txObj.type === 'win') {
          txObj.displayType = 'Player Win';
          txObj.displayDescription = txObj.description || `Player won ${txObj.amount} BDT${txObj.gameRound ? ' on game round ' + txObj.gameRound : ' on betting'}`;
          txObj.isLoss = false;
        } else {
          txObj.displayType = txObj.type.charAt(0).toUpperCase() + txObj.type.slice(1);
          txObj.displayDescription = txObj.description;
          txObj.isLoss = ['withdrawal', 'bet', 'transfer'].includes(txObj.type);
        }
        
        return txObj;
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            wallet: user.wallet,
          },
          activity: {
            gameSessions,
            sportsBets,
            transactions,
          },
        },
      });
    } catch (error) {
      console.error("Get user activity logs error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching user activity",
      });
    }
  }
}

module.exports = new UserManagementController();
