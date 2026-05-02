const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// GET جميع المنتجات
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventory ORDER BY product_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST إضافة أو تحديث منتج
router.post('/', auth, role('supervisor'), async (req, res) => {
  try {
    const { product_name, quantity, unit_type, retail_price, wholesale_price, purchase_price, min_stock_level } = req.body;
    const addedQty = parseFloat(quantity || 0);
    const exist = await db.query('SELECT * FROM inventory WHERE product_name = $1', [product_name]);
    if (exist.rows.length > 0) {
      const newQty = parseFloat(exist.rows[0].quantity) + addedQty;
      const newRetail = retail_price !== undefined ? retail_price : exist.rows[0].retail_price;
      const newWholesale = wholesale_price !== undefined ? wholesale_price : exist.rows[0].wholesale_price;
      const newPurchase = purchase_price !== undefined ? purchase_price : exist.rows[0].purchase_price;
      const newUnitType = unit_type || exist.rows[0].unit_type;
      const newMinStock = min_stock_level !== undefined ? min_stock_level : exist.rows[0].min_stock_level;
      const result = await db.query(
        'UPDATE inventory SET quantity = $1, unit_type = $2, retail_price = $3, wholesale_price = $4, purchase_price = $5, min_stock_level = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
        [newQty, newUnitType, newRetail, newWholesale, newPurchase, newMinStock, exist.rows[0].id]
      );

      // تسجيل حركة إضافة في سجل المخزن
      await db.query(
        `INSERT INTO inventory_transactions (product_name, user_id, quantity_change, transaction_type)
         VALUES ($1, $2, $3, 'addition')`,
        [product_name, req.user.id, addedQty]
      );

      // تسجيل سعر الشراء في سجل الربح (خصم من السيولة) للإضافة الجديدة فقط
      if (addedQty > 0) {
        const purchaseAmount = parseFloat(newPurchase) * addedQty;
        if (purchaseAmount > 0) {
          await db.query(
            `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
             VALUES ('purchase', $1, $2, 'inventory', $3)`,
            [purchaseAmount, `شراء ${product_name} - إضافة ${addedQty} ${newUnitType === 'weight' ? 'كجم' : 'قطعة'}`, exist.rows[0].id]
          );
        }
      }

      res.json({ message: 'تم تحديث المنتج بنجاح', product: result.rows[0] });
    } else {
      const result = await db.query(
        'INSERT INTO inventory (product_name, quantity, unit_type, retail_price, wholesale_price, purchase_price, min_stock_level) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [product_name, quantity, unit_type || 'unit', retail_price, wholesale_price, purchase_price || 0, min_stock_level || 5]
      );


      // تسجيل حركة إضافة في سجل المخزن (للمنتج الجديد)
      await db.query(
        `INSERT INTO inventory_transactions (product_name, user_id, quantity_change, transaction_type)
         VALUES ($1, $2, $3, 'addition')`,
        [product_name, req.user.id, addedQty]
      );

      // تسجيل سعر الشراء في سجل الربح (خصم من السيولة)
      const purchaseAmount = parseFloat(purchase_price || 0) * parseFloat(quantity || 0);
      if (purchaseAmount > 0) {
        await db.query(
          `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
           VALUES ('purchase', $1, $2, 'inventory', $3)`,
          [purchaseAmount, `شراء ${product_name} - ${quantity} ${unit_type === 'weight' ? 'كجم' : 'قطعة'} بسعر ${purchase_price}`, result.rows[0].id]
        );
      }

      res.status(201).json({ message: 'تم إضافة المنتج', product: result.rows[0] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH / PUT تحديث منتج
router.patch('/:id', auth, role('supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(req.body)) {
      const dbKey = key === 'min_stock_level' ? 'min_stock_level' : key;
      fields.push(`${dbKey} = $${idx++}`);
      values.push(val);
    }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const result = await db.query(
      `UPDATE inventory SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT also works for updates (frontend uses .put)
router.put('/:id', auth, role('supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(req.body)) {
      const dbKey = key === 'min_stock_level' ? 'min_stock_level' : key;
      fields.push(`${dbKey} = $${idx++}`);
      values.push(val);
    }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const result = await db.query(
      `UPDATE inventory SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE حذف منتج
router.delete('/:id', auth, role('supervisor'), async (req, res) => {
  try {
    await db.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم الحذف' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/inventory/transactions - سجل حركات المخزون
router.get('/transactions', auth, role('supervisor'), async (req, res) => {
  try {
    const { product } = req.query;
    let query = `SELECT it.*, u.username 
                 FROM inventory_transactions it
                 LEFT JOIN users u ON it.user_id = u.id`;
    const params = [];
    if (product) {
      query += ' WHERE it.product_name = $1';
      params.push(product);
    }
    query += ' ORDER BY it.created_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/inventory/spoilage - تسجيل هالك في المخزن الرئيسي (المشرف)
router.post('/spoilage', auth, role('supervisor'), async (req, res) => {
  try {
    const { product_name, quantity, description } = req.body;

    if (!product_name || !quantity) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المنتج والكمية' });
    }

    const qty = parseFloat(quantity);
    if (qty <= 0) {
      return res.status(400).json({ error: 'الكمية يجب أن تكون أكبر من صفر' });
    }

    // Get product from main inventory (no shop_id)
    const productResult = await db.query(
      'SELECT * FROM inventory WHERE product_name = $1 AND shop_id IS NULL',
      [product_name]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'المنتج غير موجود في المخزن الرئيسي' });
    }

    const product = productResult.rows[0];
    if (parseFloat(product.quantity) < qty) {
      return res.status(400).json({
        error: `المخزون غير كافٍ. المتوفر: ${product.quantity} ${product.unit_type === 'weight' ? 'كجم' : 'قطعة'}`
      });
    }

    const cost = parseFloat(product.purchase_price || 0) * qty;
    const newQty = parseFloat(product.quantity) - qty;

    await db.query('BEGIN');

    try {
      // 1. تحديث المخزون (نقص)
      await db.query(
        'UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQty, product.id]
      );

      // 2. تسجيل هالك في جدول الهالك
      const spoilageResult = await db.query(
        `INSERT INTO spoilage (product_name, quantity, unit_type, cost, description)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [product_name, qty, product.unit_type, cost, description || `هالك مخزني: ${product_name}`]
      );

      // 3. تسجيل حركة مخزون
      await db.query(
        `INSERT INTO inventory_transactions (product_name, user_id, quantity_change, transaction_type)
         VALUES ($1, $2, $3, 'spoilage')`,
        [product_name, req.user.id, -qty]
      );

      // 4. تسجيل في سجل الربح كخسارة
      await db.query(
        `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
         VALUES ('spoilage', $1, $2, 'spoilage', $3)`,
        [cost, `هالك مخزني: ${product_name} - ${qty} ${product.unit_type === 'weight' ? 'كجم' : 'قطعة'} (${description || ''})`, spoilageResult.rows[0].id]
      );

      await db.query('COMMIT');

      res.status(201).json({
        message: 'تم تسجيل الهالك بنجاح',
        spoilage: spoilageResult.rows[0],
        remaining_stock: newQty
      });

    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'خطأ في الخادم' });
  }
});

module.exports = router;
