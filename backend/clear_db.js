const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/config/db');

const clearDatabase = async () => {
  try {
    console.log('🗑️  جاري مسح جميع بيانات قاعدة البيانات...');
    
    // مسح البيانات بالترتيب الصحيح (تبعاً للـ foreign keys)
    await db.query('DELETE FROM performance_log');
    console.log('✅ تم مسح performance_log');
    
    await db.query('DELETE FROM profit_log');
    console.log('✅ تم مسح profit_log');
    
    await db.query('DELETE FROM inventory_transactions');
    console.log('✅ تم مسح inventory_transactions');
    
    await db.query('DELETE FROM receiver_transactions');
    console.log('✅ تم مسح receiver_transactions');
    
    await db.query('DELETE FROM purchase_items');
    console.log('✅ تم مسح purchase_items');
    
    await db.query('DELETE FROM purchases');
    console.log('✅ تم مسح purchases');
    
    await db.query('DELETE FROM spoilage');
    console.log('✅ تم مسح spoilage');
    
    await db.query('DELETE FROM salary_payments');
    console.log('✅ تم مسح salary_payments');
    
    await db.query('DELETE FROM salaries');
    console.log('✅ تم مسح salaries');
    
    await db.query('DELETE FROM notifications');
    console.log('✅ تم مسح notifications');
    
    await db.query('DELETE FROM tasks');
    console.log('✅ تم مسح tasks');
    
    await db.query('DELETE FROM inventory');
    console.log('✅ تم مسح inventory');
    
    await db.query('DELETE FROM expenses');
    console.log('✅ تم مسح expenses');
    
    await db.query('DELETE FROM receivers');
    console.log('✅ تم مسح receivers');
    
    // مسح المستخدمين ما عدا admin
    const result = await db.query("DELETE FROM users WHERE username != 'admin'");
    console.log(`✅ تم مسح ${result.rowCount} مستخدم (غير admin)`);
    
    console.log('✅✅✅ تم مسح جميع البيانات بنجاح!');
    process.exit(0);
  } catch (err) {
    console.error('❌ خطأ أثناء مسح البيانات:', err.message);
    process.exit(1);
  }
};

clearDatabase();
