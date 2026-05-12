/**
 * Vercel Serverless Entry Point
 * Import the Express app and wrap it to ensure database is initialized before handling requests
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const app = require('../src/app');
const initDatabase = require('./init');

let dbInitialized = false;
let initPromise = null;

/**
 * Wrapper handler that initializes DB before the Express app processes the request.
 * This ensures DB init middleware runs BEFORE route handlers, not after.
 */
module.exports = async (req, res) => {
  // Set CORS headers for preflight immediately (before any DB init)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle OPTIONS preflight immediately
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Initialize database if needed (before the Express app processes the request)
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
      if (!res.headersSent) {
        res.status(503).json({ error: 'Database initialization failed. Please try again.' });
      }
      return;
    }
  }

  // Now let Express handle the request
  app(req, res);
};
