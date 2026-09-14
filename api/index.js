const app = require('../src/app');
const { connectDB } = require('../src/db/database');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB connection error in Vercel handler:', err.message);
    const url = req.url || '';
    if (!url.startsWith('/api/health') && !url.startsWith('/api-docs') && url.startsWith('/api')) {
      return res.status(500).json({
        success: false,
        message: 'Database connection failed. Please ensure MONGODB_URI is set in Vercel Environment Variables and MongoDB Atlas Network Access allows 0.0.0.0/0.'
      });
    }
  }
  return app(req, res);
};
