const Counter = require("../models/Counter");

// utils/getNextUserId.js or wherever it is
async function getNextUserId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "userId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
}

module.exports = getNextUserId;