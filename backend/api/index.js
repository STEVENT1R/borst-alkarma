/**
 * Vercel Serverless Entry Point
 * Import the Express app and export it as a serverless function
 * Ensures database is initialized BEFORE processing any request
 */

require('dotenv').config();

const app = require('../src/app');
const initDatabase = require('./init');

let dbInitialized = false;
let initPromise = null;

// Middleware to ensure database is initialized before processing requests
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    if (!initPromise) {
      initPromise = initDatabase().then(() => {
        dbInitialized = true;
        console.log('✅ Database ready for requests');
      });
    }
    try {
      await initPromise;
    } catch (err) {
      console.error('❌ Database init failed:', err.message);
      return res.status(500).json({ error: 'Database initialization failed' });
    }
  }
  next();
});

// Vercel serverless export
module.exports = app;
