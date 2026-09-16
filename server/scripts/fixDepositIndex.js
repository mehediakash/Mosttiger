const mongoose = require("mongoose");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const fixDepositIndex = async () => {
  try {
    const db = mongoose.connection.db;

    // Drop old index if exists
    try {
      await db.collection("deposits").dropIndex("propayDetails.orderNo_1");
      console.log("✓ Dropped old index");
    } catch (err) {
      console.log("Index doesn't exist or already dropped");
    }

    // Create new partial unique index
    await db.collection("deposits").createIndex(
      { "propayDetails.orderNo": 1 },
      {
        name: "propayDetails.orderNo_1",
        unique: true,
        partialFilterExpression: {
          "propayDetails.orderNo": { $type: "string" },
        },
      },
    );
    console.log("✓ Created new partial unique index");
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
