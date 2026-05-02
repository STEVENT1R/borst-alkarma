const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// ========== تقرير الأداء العام (الموجود) ==========
router.get('/', auth, role('supervisor'), async (req, res) => {
  try {
    const profitSummary = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN entry_type IN ('salary_payment','spoilage','expense','purchase') THEN amount ELSE 0 END), 0) as total_outcome,
        -- صافي الربح = الإيرادات + الربح اليدوي - تكلفة البضاعة - المصروفات - المرتبات - الهالك
        COALESCE(SUM(
          CASE 
            WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount
            WHEN entry_type IN ('cogs', 'salary_payment', 'spoilage', 'expense') THEN -amount
            ELSE 0
          END
        ), 0) as net_profit
      FROM profit_log
    `);

    const tasksStats = await db.query(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status IN ('completed','delivered','loaded','delivered_and_loaded')) as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_tasks,
        COUNT(*) FILTER (WHERE status NOT IN ('completed','delivered','loaded','delivered_and_loaded','cancelled')) as pending_tasks,
        COALESCE(SUM(price) FILTER (WHERE status IN ('completed','delivered','loaded','delivered_and_loaded')), 0) as completed_value
      FROM tasks
    `);

    const workerPerformance = await db.query(`
      SELECT 
        u.id, u.username,
        COUNT(t.id) as total_tasks,
        COUNT(t.id) FILTER (WHERE t.status IN ('completed','delivered','loaded','delivered_and_loaded')) as completed_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'cancelled') as cancelled_tasks,
        COALESCE(SUM(t.price) FILTER (WHERE t.status IN ('completed','delivered','loaded','delivered_and_loaded')), 0) as total_value
      FROM users u
      LEFT JOIN tasks t ON u.id = t.worker_id
      WHERE u.role = 'worker'
      GROUP BY u.id, u.username
      ORDER BY completed_tasks DESC
    `);

    const inventoryStats = await db.query(`
      SELECT
        COUNT(*) as total_products,
        COALESCE(SUM(quantity * purchase_price), 0) as inventory_value,
        COUNT(*) FILTER (WHERE quantity < 5) as low_stock_count
      FROM inventory
    `);

    const receiversStats = await db.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE transaction_type IN ('goods_delivered','debt_added','manual_deduction')), 0) as total_debts_on_us,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type IN ('money_received','money_collected','manual_addition')), 0) as total_money_collected,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type IN ('goods_delivered','debt_added','manual_deduction')), 0) +
        COALESCE(SUM(amount) FILTER (WHERE transaction_type IN ('money_received','money_collected','manual_addition')), 0) as net_debt
      FROM receiver_transactions
    `);

    const recentProfitLogs = await db.query(`
      SELECT entry_type, amount, description, created_at
      FROM profit_log
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      financial: profitSummary.rows[0],
      tasks: tasksStats.rows[0],
      workers: workerPerformance.rows,
      inventory: inventoryStats.rows[0],
      receivers: receiversStats.rows[0],
      recent_logs: recentProfitLogs.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== سجل الأداء اليومي الجديد ==========

// GET /api/performance/log - جميع أيام الأداء
router.get('/log', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM performance_log
      ORDER BY record_date DESC
      LIMIT 60
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/performance/log/calculate - حساب أداء اليوم وحفظه
router.post('/log/calculate', auth, role('supervisor'), async (req, res) => {
  try {
    const { record_date } = req.body;
    const date = record_date || new Date().toISOString().split('T')[0];

    // حساب المؤشرات المالية لليوم ده
    const financial = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN entry_type IN ('salary_payment','spoilage','expense','purchase') THEN amount ELSE 0 END), 0) as total_expenses,
        -- صافي الربح = الإيرادات + الربح اليدوي - تكلفة البضاعة - المصروفات - المرتبات - الهالك
        COALESCE(SUM(
          CASE 
            WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount
            WHEN entry_type IN ('cogs', 'salary_payment', 'spoilage', 'expense') THEN -amount
            ELSE 0
          END
        ), 0) as net_profit,
        -- السيولة = كل الداخل - كل الخارج (بما في ذلك المشتريات)
        COALESCE(SUM(
          CASE 
            WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount
            WHEN entry_type IN ('salary_payment', 'spoilage', 'expense', 'purchase') THEN -amount
            ELSE 0
          END
        ), 0) as current_liquidity
      FROM profit_log
      WHERE created_at::date = $1
    `, [date]);

    // حساب مؤشرات المهام
    const tasks = await db.query(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status IN ('completed','delivered','loaded','delivered_and_loaded')) as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_tasks,
        COALESCE(SUM(price) FILTER (WHERE status IN ('completed','delivered','loaded','delivered_and_loaded')), 0) as tasks_value
      FROM tasks
      WHERE created_at::date = $1
    `, [date]);

    // عدد العمال النشطاء (اللي اشتغلوا في اليوم ده)
    const workers = await db.query(`
      SELECT
        COUNT(DISTINCT worker_id) as active_workers,
        CASE WHEN COUNT(DISTINCT worker_id) > 0 
          THEN ROUND(COUNT(*)::decimal / COUNT(DISTINCT worker_id), 2)
          ELSE 0 
        END as avg_tasks_per_worker
      FROM tasks
      WHERE created_at::date = $1
        AND worker_id IS NOT NULL
    `, [date]);

    // المخزون
    const inventory = await db.query(`
      SELECT
        COALESCE(SUM(quantity * purchase_price), 0) as inventory_value,
        COUNT(*) FILTER (WHERE quantity < 5) as low_stock_count
      FROM inventory
    `);

    // الهالك في اليوم ده
    const spoilage = await db.query(`
      SELECT COALESCE(SUM(cost), 0) as spoilage_cost
      FROM spoilage
      WHERE created_at::date = $1
    `, [date]);

    // التعاملات والديون
    const receivers = await db.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE transaction_type IN ('goods_delivered','debt_added','manual_deduction')), 0) as total_debts,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type IN ('money_received','money_collected','manual_addition')), 0) as collected_amount
      FROM receiver_transactions
    `);

    // حساب score الكفاءة
    const f = financial.rows[0];
    const t = tasks.rows[0];
    const w = workers.rows[0];
    const inv = inventory.rows[0];
    const s = spoilage.rows[0];
    const r = receivers.rows[0];

    const total_tasks_val = parseInt(t.total_tasks) || 0;
    const completed_tasks_val = parseInt(t.completed_tasks) || 0;
    const completion_rate = total_tasks_val > 0 ? Math.round((completed_tasks_val / total_tasks_val) * 100) : 0;
    const net_profit_val = parseFloat(f.net_profit) || 0;
    const spoilage_cost_val = parseFloat(s.spoilage_cost) || 0;

    // score الكفاءة: وزن للربح + وزن لإنجاز المهام + وزن للهالك
    let efficiency_score = 0;
    if (net_profit_val > 0) efficiency_score += Math.min(net_profit_val / 100, 40); // max 40 points
    if (completion_rate > 0) efficiency_score += (completion_rate / 100) * 40; // max 40 points
    if (spoilage_cost_val <= 0) efficiency_score += 20; // 20 points لو مفيش هالك
    else efficiency_score += Math.max(0, 20 - (spoilage_cost_val / 10)); // بينقص لو في هالك
    efficiency_score = Math.min(Math.round(efficiency_score), 100);

    // Upsert: لو اليوم مسجل قبل كده يتحدث، لو لأ يتضاف
    const upsertResult = await db.query(`
      INSERT INTO performance_log (
        record_date, total_income, total_expenses, net_profit,
        total_tasks, completed_tasks, cancelled_tasks, tasks_completion_rate, tasks_value,
        active_workers, avg_tasks_per_worker,
        inventory_value, low_stock_count,
        spoilage_cost, total_debts, collected_amount, current_liquidity,
        efficiency_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (record_date) 
      DO UPDATE SET
        total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses,
        net_profit = EXCLUDED.net_profit,
        total_tasks = EXCLUDED.total_tasks,
        completed_tasks = EXCLUDED.completed_tasks,
        cancelled_tasks = EXCLUDED.cancelled_tasks,
        tasks_completion_rate = EXCLUDED.tasks_completion_rate,
        tasks_value = EXCLUDED.tasks_value,
        active_workers = EXCLUDED.active_workers,
        avg_tasks_per_worker = EXCLUDED.avg_tasks_per_worker,
        inventory_value = EXCLUDED.inventory_value,
        low_stock_count = EXCLUDED.low_stock_count,
        spoilage_cost = EXCLUDED.spoilage_cost,
        total_debts = EXCLUDED.total_debts,
        collected_amount = EXCLUDED.collected_amount,
        current_liquidity = EXCLUDED.current_liquidity,
        efficiency_score = EXCLUDED.efficiency_score
      RETURNING *
    `, [
      date,
      f.total_income, f.total_expenses, f.net_profit,
      t.total_tasks, t.completed_tasks, t.cancelled_tasks, completion_rate, t.tasks_value,
      w.active_workers, w.avg_tasks_per_worker,
      inv.inventory_value, inv.low_stock_count,
      s.spoilage_cost, r.total_debts, r.collected_amount, f.current_liquidity,
      efficiency_score
    ]);

    res.json(upsertResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/performance/log/manual - إضافة يدوية أو تعديل سجل يوم
router.post('/log/manual', auth, role('supervisor'), async (req, res) => {
  try {
    const {
      record_date, total_income, total_expenses, net_profit,
      total_tasks, completed_tasks, cancelled_tasks, tasks_completion_rate, tasks_value,
      active_workers, avg_tasks_per_worker,
      inventory_value, low_stock_count,
      spoilage_cost, total_debts, collected_amount, current_liquidity,
      efficiency_score, notes
    } = req.body;

    const result = await db.query(`
      INSERT INTO performance_log (
        record_date, total_income, total_expenses, net_profit,
        total_tasks, completed_tasks, cancelled_tasks, tasks_completion_rate, tasks_value,
        active_workers, avg_tasks_per_worker,
        inventory_value, low_stock_count,
        spoilage_cost, total_debts, collected_amount, current_liquidity,
        efficiency_score, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (record_date)
      DO UPDATE SET
        total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses,
        net_profit = EXCLUDED.net_profit,
        total_tasks = EXCLUDED.total_tasks,
        completed_tasks = EXCLUDED.completed_tasks,
        cancelled_tasks = EXCLUDED.cancelled_tasks,
        tasks_completion_rate = EXCLUDED.tasks_completion_rate,
        tasks_value = EXCLUDED.tasks_value,
        active_workers = EXCLUDED.active_workers,
        avg_tasks_per_worker = EXCLUDED.avg_tasks_per_worker,
        inventory_value = EXCLUDED.inventory_value,
        low_stock_count = EXCLUDED.low_stock_count,
        spoilage_cost = EXCLUDED.spoilage_cost,
        total_debts = EXCLUDED.total_debts,
        collected_amount = EXCLUDED.collected_amount,
        current_liquidity = EXCLUDED.current_liquidity,
        efficiency_score = EXCLUDED.efficiency_score,
        notes = EXCLUDED.notes
      RETURNING *
    `, [
      record_date, total_income, total_expenses, net_profit,
      total_tasks, completed_tasks, cancelled_tasks, tasks_completion_rate, tasks_value,
      active_workers, avg_tasks_per_worker,
      inventory_value, low_stock_count,
      spoilage_cost, total_debts, collected_amount, current_liquidity,
      efficiency_score, notes || null
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/performance/log/:id - حذف سجل يوم
router.delete('/log/:id', auth, role('supervisor'), async (req, res) => {
  try {
    await db.query('DELETE FROM performance_log WHERE id = $1', [req.params.id]);
    res.json({ message: 'deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
