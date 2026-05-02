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

async function fixData() {
  try {
    console.log('=== بدء تصحيح البيانات ===\n');

    // 1. تصحيح سجل الأرباح - إيرادات المهام
    console.log('1. تصحيح سجل الأرباح (profit_log) - إيرادات المهام...');
    const revenues = await db.query(`
      SELECT pl.id, pl.amount, pl.reference_id, t.price, t.quantity 
      FROM profit_log pl 
      JOIN tasks t ON t.id = pl.reference_id 
      WHERE pl.entry_type = 'revenue' AND pl.reference_type = 'task'
    `);
    
    for (const rev of revenues.rows) {
      const correctAmount = parseFloat(rev.price);
      const oldAmount = parseFloat(rev.amount);
      if (Math.abs(oldAmount - correctAmount) > 0.01) {
        await db.query('UPDATE profit_log SET amount = $1 WHERE id = $2', [correctAmount, rev.id]);
        console.log(`   📝 بند رقم ${rev.id}: ${oldAmount} → ${correctAmount} (المهمة ${rev.reference_id})`);
      } else {
        console.log(`   ✅ بند رقم ${rev.id}: صحيح (${oldAmount})`);
      }
    }

    // 2. تصحيح أرباح المهام (profit entry)
    console.log('\n2. تصحيح أرباح المهام (profit_log - profit)...');
    const profits = await db.query(`
      SELECT pl.id, pl.amount, pl.reference_id, t.price, t.quantity, t.sale_type, 
             i.purchase_price, i.wholesale_price, i.retail_price
      FROM profit_log pl 
      JOIN tasks t ON t.id = pl.reference_id 
      LEFT JOIN inventory i ON i.product_name = t.product_name
      WHERE pl.entry_type = 'profit' AND pl.reference_type = 'task'
    `);
    
    for (const p of profits.rows) {
      let sellPrice;
      if (p.sale_type === 'wholesale' && p.wholesale_price) {
        sellPrice = parseFloat(p.wholesale_price);
      } else if (p.sale_type === 'retail' && p.retail_price) {
        sellPrice = parseFloat(p.retail_price);
      } else {
        // Use total price / quantity as per-unit price
        sellPrice = parseFloat(p.price) / parseFloat(p.quantity || 1);
      }
      const purchasePrice = parseFloat(p.purchase_price) || 0;
      const profitPerUnit = sellPrice - purchasePrice;
      const correctProfit = profitPerUnit * parseFloat(p.quantity || 1);
      
      if (Math.abs(parseFloat(p.amount) - Math.abs(correctProfit)) > 0.01) {
        await db.query('UPDATE profit_log SET amount = $1 WHERE id = $2', [Math.abs(correctProfit), p.id]);
        console.log(`   📝 ربح رقم ${p.id}: ${p.amount} → ${Math.abs(correctProfit)} (المهمة ${p.reference_id})`);
      } else {
        console.log(`   ✅ ربح رقم ${p.id}: صحيح (${p.amount})`);
      }
    }

    // 3. تصحيح معاملات المستلمين
    console.log('\n3. تصحيح معاملات المستلمين (receiver_transactions)...');
    const trans = await db.query(`
      SELECT rt.id, rt.amount, rt.transaction_type, rt.task_id, t.price, t.quantity
      FROM receiver_transactions rt
      JOIN tasks t ON t.id = rt.task_id
    `);
    
    for (const tr of trans.rows) {
      const correctAmount = parseFloat(tr.price);
      let expectedAmount;
      if (tr.transaction_type === 'goods_delivered' || tr.transaction_type === 'debt_added') {
        expectedAmount = Math.abs(correctAmount);
      } else if (tr.transaction_type === 'money_received' || tr.transaction_type === 'money_collected') {
        expectedAmount = -Math.abs(correctAmount);
      } else {
        continue; // skip other types
      }
      
      const oldAmount = parseFloat(tr.amount);
      if (Math.abs(oldAmount - expectedAmount) > 0.01) {
        await db.query('UPDATE receiver_transactions SET amount = $1 WHERE id = $2', [expectedAmount, tr.id]);
        console.log(`   📝 معاملة رقم ${tr.id} (${tr.transaction_type}): ${oldAmount} → ${expectedAmount}`);
      } else {
        console.log(`   ✅ معاملة رقم ${tr.id}: صحيح (${oldAmount})`);
      }
    }

    console.log('\n=== ✅ تم تصحيح البيانات بنجاح ===');
    process.exit(0);
  } catch (err) {
    console.error('خطأ:', err);
    process.exit(1);
  }
}

fixData();
