const fs = require("fs");
const dns = require("dns");
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const path = require("path");

// Configure reliable DNS servers to prevent querySrv ECONNREFUSED on MongoDB Atlas SRV records
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignore if custom DNS cannot be set
}

require("dotenv").config();
const logger = require("./utils/logger");
const { validatePayment24x7Config } = require("./config/payment24x7");
const { getNineWicketConfigStatus } = require("./config/nineWicket");
const ensureUserPromotionIndexes = require("./utils/ensureUserPromotionIndexes");

try {
  validatePayment24x7Config();
} catch (error) {
  logger.error("Startup configuration error", {
    code: error.code,
    message: error.message,
    missing: error.missing,
  });
  process.exit(1);
}

try {
  logger.info("9Wicket configuration status", getNineWicketConfigStatus());
} catch (error) {
  logger.warn("9Wicket configuration warning", {
    code: error.code,
    message: error.message,
  });
}

// Temporary debug file logging
// console.log = (...args) => {
//   fs.appendFileSync(
//     "/home/kinoycge/gaming.kinobazar.com/debug.log",
//     args
//       .map((arg) =>
//         typeof arg === "string" ? arg : JSON.stringify(arg, null, 2),
//       )
//       .join(" ") + "\n",
//   );
// };

// Import security middleware
const {
  generalLimiter,
  authLimiter,
  // paymentLimiter,
  securityHeaders,
  inputSanitization,
  corsOptions,
  requestLogger,
  ipSecurity,
} = require("./middleware/security");

const app = express();
app.set("trust proxy", 1);

app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
// Security Middleware
app.use(securityHeaders);
app.use(require("cors")(corsOptions));
app.use(requestLogger);
app.use(ipSecurity);

// Rate Limiting
// app.use('/api/auth', authLimiter);
// Payment rate limiting removed per request (was causing 429 on deposit-methods)
// app.use('/api/payments', paymentLimiter);
app.use("/api/", generalLimiter);

// Input Sanitization

// Body Parsing Middleware
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));

// Static Files - Serve uploaded files

// Database Connection
// Optimized connection pooling reduces CPU/memory by reusing connections
const connectWithRetry = () => {
  mongoose
    .connect(process.env.MONGODB_URI, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 100),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 5),
      serverSelectionTimeoutMS: Number(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000,
      ),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
    })
    .then(async () => {
      logger.info("MongoDB Connected");
      await ensureUserPromotionIndexes();
    })
    .catch((err) => {
      logger.error("MongoDB connection error", { message: err.message });
      setTimeout(connectWithRetry, 5000);
    });
};
connectWithRetry();

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/payments", require("./routes/payments"));
app.post(
  "/api/payment24x7/callback",
  require("./controllers/paymentController").handlePaymentWebhookController,
);
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/wallet-transactions", require("./routes/walletTransactions"));
app.use("/api/games", require("./routes/games"));
app.use("/api/9wicket", require("./routes/nineWicket"));
app.use("/api/sports", require("./routes/sports"));
app.use("/api/agents", require("./routes/agents"));
app.use("/api/affiliates", require("./routes/affiliates"));
app.use("/api/referrals", require("./routes/referrals"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin/affiliates", require("./routes/adminAffiliates"));
app.use("/api/admin/referrals", require("./routes/adminReferrals"));
app.use("/api/admin/ggr-topup", require("./routes/ggrTopUp"));
app.use("/api/admin/uploads", require("./routes/cloudinaryUploads"));
app.use("/api/admin-management", require("./routes/adminManagement"));
app.use("/api/promos", require("./routes/publicPromos"));
app.use("/api/promotions", require("./routes/publicPromotions"));
// User-facing promotion endpoints (claim & my lists)
app.use("/api/promotions", require("./routes/promotionUserRoutes"));
app.use("/api/promo-codes", require("./routes/promoCode"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/realtime", require("./routes/realtime"));
app.use("/api/conversations", require("./routes/conversations"));
app.use("/api/agent-management", require("./routes/agentManagement")); // NEW
app.use("/api/agent-hierarchy", require("./routes/agentHierarchy")); // Agent hierarchy

app.use("/api/agent-financial", require("./routes/agentFinancial"));
app.use("/api/admin-financial", require("./routes/adminFinancial"));
app.use("/api/user-management", require("./routes/userManagement"));
app.use("/api/game-config", require("./routes/gameConfig"));
app.use("/api/agent-transactions", require("./routes/agentTransactions"));
app.use("/api/withdrawal-fees", require("./routes/withdrawalFees"));
app.use("/api/auto-deposit", require("./routes/autoDeposit"));
app.use("/api/fraud-detection", require("./routes/fraudDetection"));
app.use("/api/cms", require("./routes/cms"));
app.use("/api/agent-reports", require("./routes/agentReports"));
app.use("/api/agent-dashboard", require("./routes/agentDashboard"));
app.use("/api/agent-balance", require("./routes/agentBalance"));
app.use("/api/login-logs", require("./routes/loginLogs"));
app.use("/api/provider-health", require("./routes/providerHealth"));
app.use("/api/commission", require("./routes/commissionManagement"));
app.use("/api/auto-promo", require("./routes/autoPromo"));
app.use("/api/seo-settings", require("./routes/seoSettings"));
app.use("/api/agent-permissions", require("./routes/agentPermissions"));
app.use("/api/agent-withdrawals", require("./routes/agentWithdrawals"));
app.use("/api/turnover", require("./routes/turnoverRoutes"));
app.use("/api/turnover-tracking", require("./routes/turnoverTracking"));
app.use("/api/withdrawal-validation", require("./routes/withdrawalValidation"));
app.use("/api/free-spins", require("./routes/freeSpins"));
app.use("/api/betting-records", require("./routes/bettingRecords"));
app.use("/api/admin/promotions", require("./routes/promotions"));

// Add auto-promo to deposit approval
app.post("/api/deposits/:id/approve", async (req, res, next) => {
  try {
    // ... existing approval logic ...

    // Auto-apply promo codes after deposit approval
    const autoPromoService = require("./services/autoPromoService");
    await autoPromoService.autoApplyPromoForDeposit(
      deposit.user._id,
      deposit.amount,
      deposit._id,
    );

    // ... continue with response ...
  } catch (error) {
    next(error);
  }
});

const providerHealthService = require("./services/providerHealthService");
providerHealthService.startHealthChecks();
const { startAffiliateCrons } = require("./cron/affiliateCron");
startAffiliateCrons();
// Basic Route
app.get("/", (req, res) => {
  res.json({
    message: "Online Betting & Gaming API Server",
    version: "1.0.0",
    status: "Running",
    documentation: "/api/docs",
  });
});

// Health Check
app.get("/health", (req, res) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  };

  // Add socket connection count if available
  const socketServer = req.app.get("socketServer");
  if (socketServer) {
    healthCheck.connectedUsers = socketServer.getConnectedUsersCount();
  }

  res.status(200).json(healthCheck);
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: messages,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large",
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
});

// Initialize Socket.IO
const SocketServer = require("./socket/socketServer");
const socketServer = new SocketServer(server);
app.set("socketServer", socketServer);

// Initialize Notification Service
const NotificationService = require("./services/notificationService");
const notificationService = new NotificationService(socketServer);
app.set("notificationService", notificationService);

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");

  server.close(async () => {
    const redisService = require("./services/redisService");
    const { closeQueues } = require("./queues/callbackQueues");
    await closeQueues();
    await redisService.quit();
    await mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;
