const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
require('dotenv').config();

const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const initDatabase = require('../api/init');

// Track DB initialization state
let dbInitialized = false;
let dbInitPromise = null;

const authRoutes = require('./modules/auth/routes');
const taskRoutes = require('./modules/tasks/routes');
const inventoryRoutes = require('./modules/inventory/routes');
const notificationRoutes = require('./modules/notifications/routes');
const salaryRoutes = require('./modules/salaries/routes');
const userRoutes = require('./modules/users/routes');
const receiverRoutes = require('./modules/receivers/routes');
const profitRoutes = require('./modules/profit/routes');
const spoilageRoutes = require('./modules/spoilage/routes');
const performanceRoutes = require('./modules/performance/routes');
const purchaseRoutes = require('./modules/purchases/routes');
const cashflowRoutes = require('./modules/cashflow/routes');
const settingsRoutes = require('./modules/settings/routes');
const pushRoutes = require('./modules/push/routes');
const shopsRoutes = require('./modules/shops/routes');
const salesRoutes = require('./modules/sales/routes');
const workersLoadRoutes = require('./modules/workers_load/routes');

const app = express();


// CORS must come before helmet to handle preflight properly
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'https://borstalkarma.vercel.app', 'https://borstalkarma-backend.vercel.app'];

// Allow all origins in production on Vercel since the domain is fixed
const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_URL;
const corsOptions = isVercel
  ? {
      origin: true, // Reflect the request origin
      credentials: true,
    }
  : {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    };

app.use(cors(corsOptions));

// Handle OPTIONS preflight explicitly for all routes
app.options('*', cors(corsOptions));

// Security headers (after CORS)
app.use(helmet());

app.use(express.json({ limit: '10mb' }));

// Database initialization middleware (runs once on first request)
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    if (!dbInitPromise) {
      dbInitPromise = initDatabase().then(() => {
        dbInitialized = true;
        console.log('✅ Database ready for requests');
      });
    }
    try {
      await dbInitPromise;
    } catch (err) {
      console.error('❌ Database init failed:', err.message);
      if (!res.headersSent) {
        return res.status(503).json({ error: 'Database initialization failed. Please try again.' });
      }
      return;
    }
  }
  next();
});

// Serve static files from the frontend build folder (only locally, not on Vercel)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  console.log('✅ Serving frontend static files from frontend/dist');
}

app.use('/api/users', userRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/receivers', receiverRoutes);
app.use('/api/profit', profitRoutes);
app.use('/api/spoilage', spoilageRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/cashflow', cashflowRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/workers-load', workersLoadRoutes);

app.get('/', (req, res) => {


  res.send('ERP API is running...');
});

// Centralized error handler (must be last middleware)
app.use(errorHandler);

// For any route not matching an API endpoint, return the React app (only locally)
if (fs.existsSync(frontendDist)) {
  app.use((req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

module.exports = app;
