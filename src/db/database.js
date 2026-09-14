const mongoose = require('mongoose');
require('dotenv').config();

// Workaround for Jest/VM realm issue with MongoDB BSON Map serialization in client metadata
try {
  const clientMetadata = require('mongodb/lib/cmap/handshake/client_metadata');
  if (clientMetadata && typeof clientMetadata.makeClientMetadata === 'function') {
    clientMetadata.makeClientMetadata = async function () {
      return {
        driver: {
          name: 'nodejs|mongoose',
          version: '6.0.0'
        },
        os: {
          type: 'Windows_NT',
          name: 'win32',
          architecture: 'x64'
        },
        platform: `Node.js ${process.version}`
      };
    };
  }
} catch (e) {
  // Ignore if path changes
}

async function connectDB(customUri) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (mongoose.connection.readyState === 2) {
    await new Promise(resolve => mongoose.connection.once('connected', resolve));
    return mongoose.connection;
  }

  const defaultUri = process.env.NODE_ENV === 'test'
    ? (process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/notes_test_db')
    : (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/notes_db');

  const uri = customUri || defaultUri;

  try {
    const conn = await mongoose.connect(uri);
    console.log(`🍃 Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
