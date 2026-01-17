// scripts/cleanIndexes.js
const mongoose = require('mongoose');
require('dotenv').config();

const cleanIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const collName = collection.name;
      console.log(`\nProcessing collection: ${collName}`);
      
      // Get current indexes
      const indexes = await db.collection(collName).indexes();
      console.log(`Current indexes:`, indexes.map(i => i.name));
      
      // Drop all indexes except _id
      try {
        await db.collection(collName).dropIndexes();
        console.log(`Dropped all indexes for ${collName}`);
      } catch (err) {
        console.log(`Error dropping indexes for ${collName}:`, err.message);
      }
    }

    console.log('\nIndexes cleaned. Mongoose will recreate them on next startup.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

cleanIndexes();