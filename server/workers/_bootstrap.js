const dns = require("dns");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignore
}

let connecting = null;

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  if (!connecting) {
    connecting = mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: Number(process.env.MONGO_WORKER_MAX_POOL_SIZE || 50),
      minPoolSize: Number(process.env.MONGO_WORKER_MIN_POOL_SIZE || 2),
      serverSelectionTimeoutMS: Number(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000,
      ),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
    });
  }

  await connecting;
  logger.info("[WORKER] MongoDB connected");
}

async function shutdown(worker, deadLetterQueue) {
  logger.info("[WORKER] shutting down", { worker: worker.name });
  await worker.close();
  if (deadLetterQueue) await deadLetterQueue.close();
  await mongoose.connection.close();
  process.exit(0);
}

module.exports = {
  connectMongo,
  shutdown,
};
