const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  game_code: { type: String, required: true },
  brand: { type: String, required: true },
  brand_id: { type: String, required: true },
  game_name: { type: String, required: true },
  category: { type: String, required: true },
  image_url: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  min_bet: { type: Number, default: 0 },
  max_bet: { type: Number, default: 10000 },
  rtp: { type: Number, default: 95 },
  featured: { type: Boolean, default: false },
  is_hot: { type: Boolean, default: false },
  popularity: { type: Number, default: 0 },
});

gameSchema.index({ category: 1 });
gameSchema.index({ brand: 1 });
gameSchema.index({
  game_code: 1,
  is_active: 1,
});
gameSchema.index({ featured: 1 });
gameSchema.index({ is_hot: 1 });

module.exports = mongoose.model("Game", gameSchema);
