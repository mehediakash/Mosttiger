const mongoose = require('mongoose');
const Game = require('../models/Game');
const gamesList = require('../utils/gamesList.json');
require('dotenv').config();

const seedGames = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing games
    await Game.deleteMany({});
    console.log('Cleared existing games');

    // Insert new games
    const games = await Game.insertMany(gamesList.games);
    console.log(`✅ Successfully seeded ${games.length} games`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedGames();