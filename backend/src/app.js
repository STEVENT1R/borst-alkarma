const express = require('express');
const cors = require('cors');
require('dotenv').config();

const path = require('path');
const errorHandler = require('./middleware/errorHandler');

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

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the public folder (React build)
app.use(express.static(path.join(__dirname, '../../public')));

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

app.get('/', (req, res) => {

  res.send('ERP API is running...');
});

// Centralized error handler (must be last middleware)
app.use(errorHandler);

// For any route not matching an API endpoint, return the React app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

module.exports = app;
