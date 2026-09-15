const mongoose = require("mongoose");

// models/Counter.js
const CounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 1 }   // ← Change from "value" to "seq"
});

module.exports = mongoose.model("Counter", CounterSchema);
