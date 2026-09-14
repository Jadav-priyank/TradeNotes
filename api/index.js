const app = require('../src/app');
const { connectDB } = require('../src/db/database');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB connection error in Vercel handler:', err.message);
  }
  return app(req, res);
};
