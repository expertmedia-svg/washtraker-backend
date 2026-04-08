const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/wash_tracker';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connecté:', MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  } catch (err) {
    console.error('❌ Erreur connexion MongoDB:', err.message);
    process.exit(1);
  }
};

mongoose.connection.on('error', (err) => {
  console.error('Erreur MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB déconnecté');
});

module.exports = { connectDB, mongoose };
