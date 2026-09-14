require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./db/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`========================================`);
      console.log(`🚀 Notes API Server running on port ${PORT}`);
      console.log(`📑 Swagger Docs: http://localhost:${PORT}/api-docs`);
      console.log(`💻 Interactive UI: http://localhost:${PORT}`);
      console.log(`========================================`);
    });
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

const serverPromise = startServer();

module.exports = serverPromise;
