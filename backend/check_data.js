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

async function check() {
  try {
    console.log('=== PROFIT LOG (last 30) ===');
    const profit = await db.query('SELECT * FROM profit_log ORDER BY created_at DESC LIMIT 30');
    console.log(JSON.stringify(profit.rows, null, 2));
    
    console.log('\n=== PROFIT LOG SUMMARY ===');
    const summary = await db.query(`
      SELECT entry_type, COUNT(*) as count, SUM(amount) as total
      FROM profit_log GROUP BY entry_type ORDER BY entry_type
    `);
    console.log(JSON.stringify(summary.rows, null, 2));
    
    console.log('\n=== RECEIVER TRANSACTIONS (last 20) ===');
    const rt = await db.query('SELECT * FROM receiver_transactions ORDER BY created_at DESC LIMIT 20');
    console.log(JSON.stringify(rt.rows, null, 2));
    
    console.log('\n=== RECEIVERS ===');
    const rec = await db.query('SELECT * FROM receivers ORDER BY name');
    console.log(JSON.stringify(rec.rows, null, 2));
    
    console.log('\n=== TASKS (last 10) ===');
    const tasks = await db.query('SELECT id, title, product_name, quantity, price, sale_type, status, receiver_name FROM tasks ORDER BY created_at DESC LIMIT 10');
    console.log(JSON.stringify(tasks.rows, null, 2));
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();
