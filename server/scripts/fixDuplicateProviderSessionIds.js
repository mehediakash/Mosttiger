const mongoose = require('mongoose');
const GameSession = require('../models/GameSession');
require('dotenv').config();

async function fixDuplicateProviderSessionIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all documents with providerSessionId: "unknown"
    const sessionsWithUnknown = await GameSession.find({ providerSessionId: 'unknown' });
    console.log(`Found ${sessionsWithUnknown.length} sessions with providerSessionId: "unknown"`);

    if (sessionsWithUnknown.length === 0) {
      console.log('No sessions with "unknown" providerSessionId found. Migration complete.');
      return;
    }

    // Update each document with a unique providerSessionId
    for (let i = 0; i < sessionsWithUnknown.length; i++) {
      const session = sessionsWithUnknown[i];
      const uniqueId = `migrated_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;

      await GameSession.updateOne(
        { _id: session._id },
        { $set: { providerSessionId: uniqueId } }
      );

      console.log(`Updated session ${session._id} with new providerSessionId: ${uniqueId}`);
    }

    console.log('Migration completed successfully!');
    console.log(`Updated ${sessionsWithUnknown.length} documents`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
fixDuplicateProviderSessionIds();