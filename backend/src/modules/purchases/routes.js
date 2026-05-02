const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// GET /api/purchases - كل فواتير الشراء
router.get('/', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, 
        (SELECT json_agg(json_build_object(
          'id', pi.id, 'product_name', pi.product_name,
          'quantity', pi.quantity, 'unit_price', pi.unit_price,
          'total', pi.total
        )) FROM purchase_items pi WHERE pi.purchase_id = p.id) as items
      FROM purchases p
      ORDER BY p.purchase_date DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/purchases - إضافة فاتورة شراء جديدة
router.post('/', auth, role('supervisor'), async (req, res) => {
  try {
    const { supplier_name, items, notes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'يجب إضافة منتج واحد على الأقل' });
    }

    // حساب الإجمالي
    let total_amount = 0;
    for (const item of items) {
      total_amount += parseFloat(item.unit_price) * parseFloat(item.quantity);
    }

    // إنشاء الفاتورة
    const purchase = await db.query(
      `INSERT INTO purchases (supplier_name, total_amount, notes)
       VALUES ($1, $2, $3) RETURNING *`,
      [supplier_name || 'مورد', total_amount, notes || null]
    );
    const purchaseId = purchase.rows[0].id;

    // إضافة بنود الفاتورة وتحديث المخزون
    for (const item of items) {
      await db.query(
        `INSERT INTO purchase_items (purchase_id, product_name, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5)`,
        [purchaseId, item.product_name, item.quantity, item.unit_price, 
         parseFloat(item.unit_price) * parseFloat(item.quantity)]
      );

      // تحديث المخزون: إضافة الكمية + تحديث سعر الشراء
      const existing = await db.query('SELECT id, quantity, purchase_price FROM inventory WHERE product_name = $1', [item.product_name]);
      if (existing.rows.length > 0) {
        const oldQty = parseFloat(existing.rows[0].quantity) || 0;
        const oldPrice = parseFloat(existing.rows[0].purchase_price) || 0;
        const newQty = parseFloat(item.quantity);
        const newUnitPrice = parseFloat(item.unit_price);
        
        // متوسط سعر الشراء المرجح
        const avgPrice = (oldQty * oldPrice + newQty * newUnitPrice) / (oldQty + newQty);
        
        await db.query(
          `UPDATE inventory SET 
            quantity = quantity + $1,
            purchase_price = ROUND($2, 2),
            updated_at = NOW()
           WHERE id = $3`,
          [newQty, avgPrice, existing.rows[0].id]
        );
      } else {
        // منتج جديد - نضيفه للمخزون
        await db.query(
          `INSERT INTO inventory (product_name, quantity, unit_type, purchase_price, retail_price)
           VALUES ($1, $2, 'unit', $3, 0)`,
          [item.product_name, item.quantity, item.unit_price]
        );
      }

      // تسجيل حركة مخزون
      await db.query(
        `INSERT INTO inventory_transactions (product_name, quantity_change, transaction_type)
         VALUES ($1, $2, 'addition')`,
        [item.product_name, parseFloat(item.quantity)]
      );
    }

    // تسجيل في سجل الربح (خصم من السيولة)
    await db.query(
      `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
       VALUES ('purchase', $1, $2, 'purchase', $3)`,
      [total_amount, `فاتورة شراء من ${supplier_name || 'مورد'} - ${items.length} منتج`, purchaseId]
    );

    res.status(201).json(purchase.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/purchases/:id - حذف فاتورة شراء مع استرجاع المخزون
router.delete('/:id', auth, role('supervisor'), async (req, res) => {
  try {
    const { id } = req.params;

    // جلب البنود لاسترجاع الكميات للمخزون
    const items = await db.query('SELECT * FROM purchase_items WHERE purchase_id = $1', [id]);

    for (const item of items.rows) {
      // استرجاع الكمية للمخزون
      const inv = await db.query('SELECT id, quantity, purchase_price FROM inventory WHERE product_name = $1', [item.product_name]);
      if (inv.rows.length > 0) {
        const oldQty = parseFloat(inv.rows[0].quantity) || 0;
        const oldPrice = parseFloat(inv.rows[0].purchase_price) || 0;
        const removedQty = parseFloat(item.quantity);
        const removedUnitPrice = parseFloat(item.unit_price);
        const newQty = oldQty - removedQty;

        if (newQty <= 0) {
          // لو الكمية هتصبح صفر أو أقل، نمسح المنتج من المخزون
          await db.query('DELETE FROM inventory WHERE id = $1', [inv.rows[0].id]);
        } else {
          // إعادة حساب متوسط سعر الشراء بدون هذه الكمية
          let avgPrice = oldPrice;
          if (oldQty > 0 && oldQty !== removedQty) {
            avgPrice = (oldQty * oldPrice - removedQty * removedUnitPrice) / newQty;
            if (avgPrice < 0) avgPrice = 0;
          } else if (oldQty === removedQty) {
            avgPrice = 0;
          }
          await db.query(
            'UPDATE inventory SET quantity = $1, purchase_price = ROUND($2, 2), updated_at = NOW() WHERE id = $3',
            [newQty, avgPrice, inv.rows[0].id]
          );
        }
      }

      // حذف حركات المخزون المرتبطة (addition)
      await db.query(
        "DELETE FROM inventory_transactions WHERE product_name = $1 AND transaction_type = 'addition' AND created_at = (SELECT MAX(created_at) FROM inventory_transactions WHERE product_name = $2 AND transaction_type = 'addition')",
        [item.product_name, item.product_name]
      );
    }

    // حذف سجل الربح المرتبط بالفاتورة
    await db.query("DELETE FROM profit_log WHERE reference_type = 'purchase' AND reference_id = $1", [id]);

    // حذف البنود ثم الفاتورة
    await db.query('DELETE FROM purchase_items WHERE purchase_id = $1', [id]);
    await db.query('DELETE FROM purchases WHERE id = $1', [id]);

    res.json({ message: 'تم حذف الفاتورة واسترجاع المخزون' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
