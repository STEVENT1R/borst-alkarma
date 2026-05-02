const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});
const db = { query: (text, params) => pool.query(text, params) };

async function cleanData() {
  try {
    console.log('=== بدء تنظيف قاعدة البيانات ===\n');

    // 1. التأكد من وجود CHECK constraint متضمن 'cogs'
    console.log('1. التأكد من وجود cogs في CHECK constraint...');
    try {
      await db.query(`
        ALTER TABLE profit_log DROP CONSTRAINT IF EXISTS profit_log_entry_type_check;
        ALTER TABLE profit_log ADD CONSTRAINT profit_log_entry_type_check 
          CHECK (entry_type IN ('profit','salary_payment','spoilage','expense','revenue','purchase','cogs'));
      `);
      console.log('   ✅ تم تحديث CHECK constraint');
    } catch (err) {
      console.log('   ✅ CHECK constraint موجود بالفعل');
    }

    // 2. إضافة COGS للمهام القديمة اللي اتباعت ومليش cogs
    console.log('\n2. إضافة COGS (تكلفة البضاعة المباعة) للمهام القديمة...');
    const deliveredTasks = await db.query(`
      SELECT t.id, t.product_name, t.quantity, t.title, t.receiver_name
      FROM tasks t
      WHERE t.status IN ('delivered', 'delivered_and_loaded')
        AND t.product_name IS NOT NULL 
        AND t.quantity > 0
        AND NOT EXISTS (
          SELECT 1 FROM profit_log pl 
          WHERE pl.reference_type = 'task' 
            AND pl.reference_id = t.id 
            AND pl.entry_type = 'cogs'
        )
    `);

    console.log(`   تم العثور على ${deliveredTasks.rows.length} مهمة بدون COGS`);

    let cogsCount = 0;
    for (const task of deliveredTasks.rows) {
      const inv = await db.query('SELECT purchase_price FROM inventory WHERE product_name = $1', [task.product_name]);
      if (inv.rows.length > 0) {
        const purchasePrice = parseFloat(inv.rows[0].purchase_price) || 0;
        const cogsAmount = parseFloat(task.quantity) * purchasePrice;
        if (cogsAmount > 0) {
          await db.query(
            `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
             VALUES ('cogs', $1, $2, 'task', $3)`,
            [cogsAmount, `تكلفة بضاعة مباعة: ${task.product_name} - ${task.title}`, task.id]
          );
          console.log(`   📝 تم إضافة COGS للمهمة ${task.id}: ${cogsAmount} ج.م (${task.product_name} × ${task.quantity})`);
          cogsCount++;
        }
      } else {
        console.log(`   ⚠️ المنتج "${task.product_name}" مش موجود في المخزون (المهمة ${task.id})`);
      }
    }
    console.log(`   ✅ تم إضافة ${cogsCount} COGS بنجاح`);

    // 3. عرض ملخص الحالة الحالية
    console.log('\n3. ملخص profit_log الحالي:');
    const summary = await db.query(`
      SELECT entry_type, COUNT(*) as count, SUM(amount) as total
      FROM profit_log
      GROUP BY entry_type
      ORDER BY entry_type
    `);
    for (const row of summary.rows) {
      const labels = {
        revenue: 'إيراد', profit: 'ربح يدوي', cogs: 'تكلفة بضاعة',
        salary_payment: 'مرتبات', spoilage: 'هالك', expense: 'مصروفات', purchase: 'مشتريات'
      };
      console.log(`   ${labels[row.entry_type] || row.entry_type}: ${row.count} بند - إجمالي ${parseFloat(row.total).toFixed(2)} ج.م`);
    }

    // 4. عرض صافي الربح بعد التنظيف
    console.log('\n4. صافي الربح الحالي:');
    const profitResult = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN entry_type IN ('revenue', 'profit') THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN entry_type IN ('cogs', 'salary_payment', 'spoilage', 'expense') THEN amount ELSE 0 END), 0) as total_costs,
        COALESCE(SUM(
          CASE 
            WHEN entry_type IN ('revenue', 'profit') THEN amount
            WHEN entry_type IN ('cogs', 'salary_payment', 'spoilage', 'expense') THEN -amount
            ELSE 0
          END
        ), 0) as net_profit,
        COALESCE(SUM(
          CASE 
            WHEN entry_type IN ('revenue', 'profit') THEN amount
            WHEN entry_type IN ('salary_payment', 'spoilage', 'expense', 'purchase') THEN -amount
            ELSE 0
          END
        ), 0) as current_liquidity
      FROM profit_log
    `);
    
    const p = profitResult.rows[0];
    console.log(`   إجمالي الإيرادات: ${parseFloat(p.total_income).toFixed(2)} ج.م`);
    console.log(`   إجمالي التكاليف: ${parseFloat(p.total_costs).toFixed(2)} ج.م`);
    console.log(`   صافي الربح: ${parseFloat(p.net_profit).toFixed(2)} ج.م`);
    console.log(`   السيولة الحالية: ${parseFloat(p.current_liquidity).toFixed(2)} ج.م`);

    console.log('\n=== ✅ تم تنظيف قاعدة البيانات بنجاح ===');
    process.exit(0);
  } catch (err) {
    console.error('خطأ:', err);
    process.exit(1);
  }
}

cleanData();
