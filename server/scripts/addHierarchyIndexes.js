const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function addIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Add index on referredBy field for faster hierarchy queries
    console.log('Creating index on referredBy...');
    await usersCollection.createIndex({ referredBy: 1 });
    console.log('✅ Index created on referredBy');

    // Add compound index on role and referredBy for even faster filtering
    console.log('Creating compound index on role + referredBy...');
    await usersCollection.createIndex({ role: 1, referredBy: 1 });
    console.log('✅ Compound index created on role + referredBy');

    // Add index on role for faster role-based queries
    console.log('Creating index on role...');
    await usersCollection.createIndex({ role: 1 });
    console.log('✅ Index created on role');

    // List all indexes
    console.log('\nAll indexes on users collection:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${JSON.stringify(index.key)}: ${index.name}`);
    });

    console.log('\n✅ All indexes added successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addIndexes();
