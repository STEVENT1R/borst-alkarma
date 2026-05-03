/**
 * Database initialization script for Vercel cold starts
 */
const db = require('../src/config/db');

module.exports = async function initDatabase() {
  try {
    // Check if tables already exist - for migration purposes, we still run migration commands
    const tablesExist = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')");

    // Create all tables (IF NOT EXISTS ensures idempotency)
    await db.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('worker','supervisor','cashier')),
      account_type VARCHAR(10) DEFAULT 'personal' CHECK (account_type IN ('personal','shop')),
      shop_name VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    
    await db.query(`CREATE TABLE IF NOT EXISTS shops (
      id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      shop_name VARCHAR(100) NOT NULL, total_revenue DECIMAL(12,2) DEFAULT 0,
      total_sales_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    
    await db.query(`CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY, product_name VARCHAR(100) NOT NULL, quantity DECIMAL(10,3) DEFAULT 0,
      unit_type VARCHAR(10) DEFAULT 'unit' CHECK (unit_type IN ('unit','weight')),
      retail_price DECIMAL(10,2) DEFAULT 0, wholesale_price DECIMAL(10,2) DEFAULT 0,
      purchase_price DECIMAL(10,2) DEFAULT 0, min_stock_level DECIMAL(10,3) DEFAULT 5,
      shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY, shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id), product_name VARCHAR(100) NOT NULL,
      quantity DECIMAL(10,3) NOT NULL, unit_type VARCHAR(10) DEFAULT 'unit',
      sale_price DECIMAL(10,2) NOT NULL, total_amount DECIMAL(10,2) NOT NULL,
      profit_amount DECIMAL(10,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS inventory_transactions (
      id SERIAL PRIMARY KEY, product_name VARCHAR(100) NOT NULL, user_id INTEGER REFERENCES users(id),
      quantity_change DECIMAL(10,3) NOT NULL, transaction_type VARCHAR(20),
      shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE, created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS profit_log (
      id SERIAL PRIMARY KEY, entry_type VARCHAR(30) NOT NULL, amount DECIMAL(12,2) NOT NULL,
      description TEXT, reference_type VARCHAR(50), reference_id INTEGER,
      shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE, created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS expenses (id SERIAL PRIMARY KEY, title VARCHAR(200) NOT NULL, amount DECIMAL(10,2) NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    // All tables are created with IF NOT EXISTS for idempotency
    await db.query(`CREATE TABLE IF NOT EXISTS tasks (id SERIAL PRIMARY KEY, title VARCHAR(100) NOT NULL DEFAULT '', description TEXT, status VARCHAR(30) DEFAULT 'pending', supervisor_id INTEGER REFERENCES users(id), worker_id INTEGER REFERENCES users(id), assigned_to INTEGER REFERENCES users(id), created_by INTEGER REFERENCES users(id), receiver_name VARCHAR(100), product_name VARCHAR(100), quantity DECIMAL(10,3) DEFAULT 0, unit_type VARCHAR(10) DEFAULT 'unit', price DECIMAL(10,2) DEFAULT 0, reminder_time TIMESTAMPTZ, sale_type VARCHAR(20) DEFAULT 'retail', notes TEXT, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, message TEXT NOT NULL, is_read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.query(`CREATE TABLE IF NOT EXISTS performance_log (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), task_id INTEGER REFERENCES tasks(id), productivity_score INTEGER DEFAULT 0, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.query(`CREATE TABLE IF NOT EXISTS receivers (id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, phone VARCHAR(50), notes TEXT, address TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.query(`CREATE TABLE IF NOT EXISTS receiver_transactions (id SERIAL PRIMARY KEY, receiver_id INTEGER REFERENCES receivers(id), task_id INTEGER REFERENCES tasks(id), transaction_type VARCHAR(30) NOT NULL, amount DECIMAL(10,2) NOT NULL DEFAULT 0, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.query(`CREATE TABLE IF NOT EXISTS salaries (id SERIAL PRIMARY KEY, worker_id INTEGER REFERENCES users(id), base_salary DECIMAL(10,2) NOT NULL, deduction DECIMAL(10,2) DEFAULT 0, bonus DECIMAL(10,2) DEFAULT 0, net_salary DECIMAL(10,2) GENERATED ALWAYS AS (base_salary - deduction + bonus) STORED, date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.query(`CREATE TABLE IF NOT EXISTS salary_payments (id SERIAL PRIMARY KEY, worker_id INTEGER REFERENCES users(id), amount DECIMAL(10,2) NOT NULL, payment_date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.query(`CREATE TABLE IF NOT EXISTS purchases (id SERIAL PRIMARY KEY, supplier_name VARCHAR(200) NOT NULL, total_amount DECIMAL(10,2) NOT NULL, notes TEXT, purchase_date TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.query(`CREATE TABLE IF NOT EXISTS purchase_items (id SERIAL PRIMARY KEY, purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE, product_name VARCHAR(100) NOT NULL, quantity DECIMAL(10,2) NOT NULL, unit_price DECIMAL(10,2) NOT NULL, total DECIMAL(10,2) NOT NULL)`);
    await db.query(`CREATE TABLE IF NOT EXISTS spoilage (id SERIAL PRIMARY KEY, product_name VARCHAR(100) NOT NULL, quantity DECIMAL(10,2) NOT NULL, unit_type VARCHAR(20) DEFAULT 'unit', cost DECIMAL(10,2) NOT NULL DEFAULT 0, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, endpoint TEXT NOT NULL, auth TEXT NOT NULL, p256dh TEXT NOT NULL, subscription JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, endpoint))`);
    await db.query(`CREATE TABLE IF NOT EXISTS app_settings (id SERIAL PRIMARY KEY, key VARCHAR(100) UNIQUE NOT NULL, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.query(`INSERT INTO app_settings (key, value) VALUES ('cleanup_months', '6') ON CONFLICT (key) DO NOTHING`);

    // Migration: ensure all needed columns exist on existing tables
    try { await db.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS task_id INTEGER REFERENCES tasks(id)`); } catch(e) {}
    try { await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_stock_level DECIMAL(10,3) DEFAULT 5`); } catch(e) {}
    try { await db.query(`ALTER TABLE receivers ADD COLUMN IF NOT EXISTS address TEXT`); } catch(e) {}
    try { await db.query(`ALTER TABLE receivers ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS title VARCHAR(100) NOT NULL DEFAULT ''`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES users(id)`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS worker_id INTEGER REFERENCES users(id)`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(100)`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_time TIMESTAMPTZ`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sale_type VARCHAR(20) DEFAULT 'retail'`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ALTER COLUMN description DROP NOT NULL`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ALTER COLUMN status TYPE VARCHAR(30)`); } catch(e) {}
    try { await db.query(`ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'pending'`); } catch(e) {}

    // Create admin user if not exists
    const adminExists = await db.query("SELECT id FROM users WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('admin', 10);
      await db.query("INSERT INTO users (username, password_hash, role, account_type) VALUES ($1, $2, 'supervisor', 'personal')", ['admin', hash]);
    }

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database init error:', err.message);
  }
};
