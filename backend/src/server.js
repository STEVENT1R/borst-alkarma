require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('./config/db');
const app = require('./app');
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Users table (Modified: added account_type, shop_name, cashier role)
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('worker','supervisor','cashier')),
        account_type VARCHAR(10) DEFAULT 'personal' CHECK (account_type IN ('personal','shop')),
        shop_name VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add missing columns to existing users table (migration-safe)
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(10) DEFAULT 'personal' CHECK (account_type IN ('personal','shop'))`).catch(() => {});
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_name VARCHAR(100)`).catch(() => {});
    // Drop old CHECK constraint and add new one with 'cashier'
    try {
      await db.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    } catch (e) { /* may not exist */ }
    try {
      await db.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('worker','supervisor','cashier'))`);
    } catch (e) { /* may already have it */ }

    // 2. Shops table - سجل المحلات (supervisor only)
    await db.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shop_name VARCHAR(100) NOT NULL,
        total_revenue DECIMAL(12,2) DEFAULT 0,
        total_sales_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 3. Inventory table (Modified: added shop_id for per-shop inventory)
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(10,3) DEFAULT 0,
        unit_type VARCHAR(10) DEFAULT 'unit' CHECK (unit_type IN ('unit','weight')),
        retail_price DECIMAL(10,2) DEFAULT 0,
        wholesale_price DECIMAL(10,2) DEFAULT 0,
        purchase_price DECIMAL(10,2) DEFAULT 0,
        min_stock_level DECIMAL(10,3) DEFAULT 5,
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add shop_id to existing inventory if missing
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE`).catch(() => {});

    // 4. Sales table - سجل المبيعات
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        product_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        unit_type VARCHAR(10) DEFAULT 'unit',
        sale_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        profit_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 5. Inventory transactions - سجل حركات المخزون (add shop_id)
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(100) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        quantity_change DECIMAL(10,3) NOT NULL,
        transaction_type VARCHAR(20) CHECK (transaction_type IN ('addition','sale','adjustment','deduction','spoilage')),
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE`).catch(() => {});
    // Update constraint to include deduction and spoilage types
    try {
      await db.query(`ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check`);
    } catch (e) { }
    try {
      await db.query(`ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_transaction_type_check CHECK (transaction_type IN ('addition','sale','adjustment','deduction','spoilage'))`);
    } catch (e) { }
    // 6. Profit log - سجل الربح (add shop_id)
    await db.query(`
      CREATE TABLE IF NOT EXISTS profit_log (
        id SERIAL PRIMARY KEY,
        entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN ('revenue','sale_revenue','cogs','purchase','salary_payment','spoilage','expense','profit')),
        amount DECIMAL(12,2) NOT NULL,
        description TEXT,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`ALTER TABLE profit_log ADD COLUMN IF NOT EXISTS shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE`).catch(() => {});
    // Add sale_revenue to CHECK constraint
    try {
      await db.query(`ALTER TABLE profit_log DROP CONSTRAINT IF EXISTS profit_log_entry_type_check`);
    } catch (e) { }
    try {
      await db.query(`ALTER TABLE profit_log ADD CONSTRAINT profit_log_entry_type_check CHECK (entry_type IN ('revenue','sale_revenue','cogs','purchase','salary_payment','spoilage','expense','profit'))`);
    } catch (e) { }

    // 7. Expenses table
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 8. Tasks table (if not exists)
    await db.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
        assigned_to INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        product_name VARCHAR(100),
        quantity DECIMAL(10,3),
        unit_type VARCHAR(10) DEFAULT 'unit',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});

    // 9. Notifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});

    // 10. Performance log
    await db.query(`
      CREATE TABLE IF NOT EXISTS performance_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        task_id INTEGER REFERENCES tasks(id),
        productivity_score INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});

    console.log('✅ Database tables verified');

    // Ensure admin user exists
    const bcrypt = require('bcrypt');
    const adminExists = await db.query("SELECT id FROM users WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
      const hash = await bcrypt.hash('admin', 10);
      await db.query(
        "INSERT INTO users (username, password_hash, role, account_type) VALUES ($1, $2, $3, 'personal')",
        ['admin', hash, 'supervisor']
      );
      console.log('✅ Admin user created: admin / admin');
    } else {
      // Ensure admin has supervisor role
      await db.query("UPDATE users SET role = 'supervisor' WHERE username = 'admin' AND role != 'supervisor'").catch(() => {});
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();