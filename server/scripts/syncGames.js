const mongoose = require("mongoose");
const axios = require("axios");
const Game = require("../models/Game");
require("dotenv").config();

const PROVIDER_BASE_URL = "https://igamingapis.com/provider/";
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://igamingapis.com/",
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const syncGames = async () => {
  try {
    console.log("🚀 Starting game sync from provider...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Step 1: Fetch all brands/providers
    console.log("📡 Fetching providers list...");
    let brands = [];
    try {
      const brandsRes = await axios.get(PROVIDER_BASE_URL, {
        timeout: 10000,
        headers: REQUEST_HEADERS,
      });
      brands = brandsRes.data?.games || [];
      console.log(`✅ Found ${brands.length} providers\n`);
    } catch (err) {
      console.error("❌ Failed to fetch providers:", err.message);
      process.exit(1);
    }

    let totalGamesProcessed = 0;
    let totalGamesAdded = 0;
    let totalGamesUpdated = 0;
    let totalErrors = 0;

    // Step 2: Fetch games for each brand
    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];

      if (!brand?.brand_id || !brand?.brand_title) {
        console.log(`⚠️  Skipping invalid brand: ${JSON.stringify(brand)}`);
        continue;
      }

      console.log(
        `[${i + 1}/${brands.length}] Processing: ${brand.brand_title} (ID: ${brand.brand_id})`,
      );

      try {
        // Fetch games for this brand
        const brandGamesRes = await axios.get(
          `${PROVIDER_BASE_URL}brands.php?brand_id=${brand.brand_id}`,
          {
            timeout: 10000,
            headers: REQUEST_HEADERS,
          },
        );

        const brandGames = brandGamesRes.data?.games || [];
        console.log(`   📦 Found ${brandGames.length} games`);

        // Process each game
        for (const gameData of brandGames) {
          try {
            // Extract game code (try multiple fields)
            const gameCode = String(
              gameData.gameID || gameData.game_code || gameData.id || "",
            ).trim();

            if (!gameCode) {
              console.log(
                `   ⚠️  Skipping game without code: ${gameData.game_name || "Unknown"}`,
              );
              totalErrors++;
              continue;
            }

            // Prepare image URL with new format
            const imageUrl = `https://igamingapis.com/img/${gameCode}.png`;

            // Check if game already exists
            const existingGame = await Game.findOne({ game_code: gameCode });

            // Prepare game document with fresh data from API
            const gameDocument = {
              game_code: gameCode,
              brand: brand.brand_title,
              brand_id: String(brand.brand_id),
              game_name:
                gameData.game_name || gameData.gameNameEn || "Unknown Game",
              category: gameData.category || "Casino",
              image_url: imageUrl,
              is_active: true,
              min_bet: gameData.min_bet || 0,
              max_bet: gameData.max_bet || 10000,
              rtp: gameData.rtp || 95,
              // Preserve existing featured and popularity if updating, otherwise use defaults
              featured: existingGame ? existingGame.featured : false,
              popularity: existingGame ? existingGame.popularity : 0,
            };

            if (existingGame) {
              // Update existing game with fresh data from API
              await Game.updateOne(
                { game_code: gameCode },
                { $set: gameDocument },
              );
              totalGamesUpdated++;
            } else {
              // Insert new game
              await Game.create(gameDocument);
              totalGamesAdded++;
            }

            totalGamesProcessed++;
          } catch (gameError) {
            console.log(
              `   ❌ Error processing game ${gameData.game_name}: ${gameError.message}`,
            );
            totalErrors++;
          }
        }

        console.log(
          `   ✅ Processed ${brandGames.length} games from ${brand.brand_title}`,
        );
        console.log(
          `   📊 Progress: ${totalGamesProcessed} total, ${totalGamesAdded} added, ${totalGamesUpdated} updated\n`,
        );

        // Add delay to avoid rate limiting
        await delay(500);
      } catch (brandError) {
        console.log(
          `   ❌ Error fetching games for ${brand.brand_title}: ${brandError.message}\n`,
        );
        totalErrors++;
        continue;
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 SYNC COMPLETED!");
    console.log("=".repeat(60));
    console.log(`📊 Total games processed: ${totalGamesProcessed}`);
    console.log(`➕ New games added: ${totalGamesAdded}`);
    console.log(`🔄 Games updated: ${totalGamesUpdated}`);
    console.log(`❌ Errors encountered: ${totalErrors}`);
    console.log("=".repeat(60) + "\n");

    // Get final count from database
    const finalCount = await Game.countDocuments();
    console.log(`💾 Total games in database: ${finalCount}\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ SYNC FAILED:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the sync
syncGames();
