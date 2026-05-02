require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('./db');

async function fix() {
  try {
    // 1. goods_delivered كان سالب (غلط) -> يصبح موجب (المستلم مديون لنا)
    const fix1 = await db.query(
      `UPDATE receiver_transactions 
       SET amount = ABS(amount) 
       WHERE transaction_type = 'goods_delivered' AND amount < 0`
    );
    console.log(`✅ Fixed ${fix1.rowCount} goods_delivered records (negative -> positive)`);

    // 2. money_received كان موجب (غلط) -> يصبح سالب (خصم من مديونية المستلم)
    const fix2 = await db.query(
      `UPDATE receiver_transactions 
       SET amount = -ABS(amount) 
       WHERE transaction_type IN ('money_received') AND amount > 0`
    );
    console.log(`✅ Fixed ${fix2.rowCount} money_received records (positive -> negative)`);

    console.log('✅ All receiver transaction signs fixed!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}
fix();
