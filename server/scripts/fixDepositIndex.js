const mongoose = require("mongoose");

const fixDepositIndex = async () => {
  try {
    const db = mongoose.connection.db;

    // Drop old non-sparse index
    try {
      await db.collection("deposits").dropIndex("propayDetails.orderNo_1");
      console.log("✓ Dropped old non-sparse index");
    } catch (err) {
      console.log("Index doesn't exist or already dropped");
    }

    // Create new sparse unique index
    await db
      .collection("deposits")
      .createIndex(
        { "propayDetails.orderNo": 1 },
        { unique: true, sparse: true },
      );
    console.log("✓ Created new sparse unique index");
  } catch (error) {
    console.error("Error fixing deposit index:", error);
  } finally {
    process.exit(0);
  }
};

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/Gaming")
    .then(fixDepositIndex)
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = fixDepositIndex;
