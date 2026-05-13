const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('./db');

const createTables = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('worker','supervisor')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        supervisor_id INTEGER REFERENCES users(id),
        worker_id INTEGER REFERENCES users(id),
        title VARCHAR(100) NOT NULL,
        receiver_name VARCHAR(100),
        product_name VARCHAR(100),
        quantity DECIMAL(10,2) DEFAULT 0,
        price DECIMAL(10,2),
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','awaiting_approval','completed','cancelled','delivered','loaded','delivered_and_loaded')),
        reminder_time TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(100) UNIQUE NOT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit_type VARCHAR(20) DEFAULT 'unit' CHECK (unit_type IN ('unit','weight')),
        retail_price DECIMAL(10,2),
        wholesale_price DECIMAL(10,2),
        purchase_price DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS salaries (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES users(id),
        base_salary DECIMAL(10,2) NOT NULL,
        deduction DECIMAL(10,2) DEFAULT 0,
        bonus DECIMAL(10,2) DEFAULT 0,
        net_salary DECIMAL(10,2) GENERATED ALWAYS AS (base_salary - deduction + bonus) STORED,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS salary_payments (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        deduction_amount DECIMAL(10,2) DEFAULT 0,
        deduction_reason TEXT,
        bonus_amount DECIMAL(10,2) DEFAULT 0,
        bonus_reason TEXT,
        payment_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(100) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        task_id INTEGER REFERENCES tasks(id),
        quantity_change DECIMAL(10,2) NOT NULL,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deduction','addition')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS receivers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS receiver_transactions (
        id SERIAL PRIMARY KEY,
        receiver_id INTEGER REFERENCES receivers(id),
        task_id INTEGER REFERENCES tasks(id),
        transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('goods_delivered','money_received','debt_added','money_collected','manual_addition','manual_deduction')),
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS profit_log (
        id SERIAL PRIMARY KEY,
        entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN ('profit','salary_payment','spoilage','expense','revenue','purchase','cogs','opening_balance')),
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- تعديل CHECK constraint في profit_log ليشمل sale_revenue
      DO $$ BEGIN
        ALTER TABLE profit_log DROP CONSTRAINT IF EXISTS profit_log_entry_type_check;
        ALTER TABLE profit_log ADD CONSTRAINT profit_log_entry_type_check 
          CHECK (entry_type IN ('profit','salary_payment','spoilage','expense','revenue','purchase','cogs','opening_balance','sale_revenue'));
      END $$;

      -- إضافة عمود notes لجدول tasks لو مش موجود
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tasks' AND column_name = 'notes'
        ) THEN
          ALTER TABLE tasks ADD COLUMN notes TEXT;
        END IF;
      END $$;

      -- إضافة عمود min_stock_level لجدول inventory لو مش موجود
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'inventory' AND column_name = 'min_stock_level'
        ) THEN
          ALTER TABLE inventory ADD COLUMN min_stock_level DECIMAL(10,2) DEFAULT 5;
        END IF;
      END $$;

      -- إضافة عمود unit_type لجدول tasks لو مش موجود
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tasks' AND column_name = 'unit_type'

        ) THEN
          ALTER TABLE tasks ADD COLUMN unit_type VARCHAR(20) DEFAULT 'unit' CHECK (unit_type IN ('unit','weight'));
        END IF;
      END $$;

      -- إضافة عمود sale_type لجدول tasks لو مش موجود
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tasks' AND column_name = 'sale_type'
        ) THEN
          ALTER TABLE tasks ADD COLUMN sale_type VARCHAR(20) DEFAULT 'retail' CHECK (sale_type IN ('retail','wholesale'));
        END IF;
      END $$;

      -- إضافة عمود cancellation_reason لجدول tasks لو مش موجود
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tasks' AND column_name = 'cancellation_reason'
        ) THEN
          ALTER TABLE tasks ADD COLUMN cancellation_reason TEXT;
        END IF;
      END $$;

      -- إضافة عمود address لجدول receivers لو مش موجود
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'receivers' AND column_name = 'address'
        ) THEN
          ALTER TABLE receivers ADD COLUMN address TEXT;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS spoilage (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_type VARCHAR(20) DEFAULT 'unit',
        cost DECIMAL(10,2) NOT NULL DEFAULT 0,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        supplier_name VARCHAR(200) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid')),
        notes TEXT,
        purchase_date TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchase_items (
        id SERIAL PRIMARY KEY,
        purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
        product_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS performance_log (
        id SERIAL PRIMARY KEY,
        record_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
        total_income DECIMAL(10,2) DEFAULT 0,
        total_expenses DECIMAL(10,2) DEFAULT 0,
        net_profit DECIMAL(10,2) DEFAULT 0,
        total_tasks INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        cancelled_tasks INTEGER DEFAULT 0,
        tasks_completion_rate DECIMAL(5,2) DEFAULT 0,
        tasks_value DECIMAL(10,2) DEFAULT 0,
        active_workers INTEGER DEFAULT 0,
        avg_tasks_per_worker DECIMAL(10,2) DEFAULT 0,
        inventory_value DECIMAL(10,2) DEFAULT 0,
        low_stock_count INTEGER DEFAULT 0,
        spoilage_cost DECIMAL(10,2) DEFAULT 0,
        total_debts DECIMAL(10,2) DEFAULT 0,
        collected_amount DECIMAL(10,2) DEFAULT 0,
        current_liquidity DECIMAL(10,2) DEFAULT 0,
        efficiency_score DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        auth TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        subscription JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, endpoint)
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- إدراج الإعدادات الافتراضية
      INSERT INTO app_settings (key, value) VALUES ('cleanup_months', '6')
        ON CONFLICT (key) DO NOTHING;
      -- إضافة عمود cash_balance لجدول users لو مش موجود
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'cash_balance'
        ) THEN
          ALTER TABLE users ADD COLUMN cash_balance DECIMAL(10,2) DEFAULT 0;
        END IF;
      END $$;

      -- جدول حمولة العمال (المنتجات اللي شايلينها)
      CREATE TABLE IF NOT EXISTS worker_load (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit_type VARCHAR(20) DEFAULT 'unit' CHECK (unit_type IN ('unit','weight')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- سجل العهدة المالية للعامل
      CREATE TABLE IF NOT EXISTS worker_cash_custody (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        type VARCHAR(30) NOT NULL CHECK (type IN ('received_from_supervisor','collected_from_tasks','returned_to_supervisor','sent_to_supervisor')),
        description TEXT,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- سجل تحركات العهد اليومية (بداية اليوم / نهاية اليوم)
      CREATE TABLE IF NOT EXISTS worker_daily_log (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        log_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        start_snapshot JSONB, -- لقطة لبداية اليوم (المنتجات + الرصيد)
        end_snapshot JSONB,   -- لقطة لنهاية اليوم (المنتجات + الرصيد + الإيرادات)
        summary TEXT,         -- ملخص نصي لليوم
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(worker_id, log_date)
      );
    `);

    console.log('Tables created successfully');


    // إنشاء حساب المشرف الافتراضي
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin', 10);
    await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
      ['admin', hash, 'supervisor']
    );
    console.log('Admin user created: admin / admin');

    console.log('✅ Database ready!');
    process.exit();
  } catch (err) {
    console.error('Error creating tables', err);
    process.exit(1);
  }
};

createTables();
