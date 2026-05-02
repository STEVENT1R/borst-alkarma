const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// GET /api/sales - مبيعات الكاشير نفسه (cashier and supervisor)
router.get('/', auth, async (req, res) => {
  try {
    let query, params;
    
    if (req.user.role === 'supervisor') {
      // Supervisor sees all sales
      query = `
        SELECT s.*, u.username, sh.shop_name
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN shops sh ON s.shop_id = sh.id
        ORDER BY s.created_at DESC
        LIMIT 200
      `;
      params = [];
    } else {
      // Cashier sees only their shop sales
      query = `
        SELECT s.*, u.username
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.shop_id = (SELECT s2.id FROM shops s2 WHERE s2.user_id = $1)
        ORDER BY s.created_at DESC
        LIMIT 200
      `;
      params = [req.user.id];
    }
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sales/today - مبيعات اليوم للمحل بتاع الكاشير
router.get('/today', auth, async (req, res) => {
  try {
    let shopId;
    if (req.user.role === 'supervisor') {
      // Supervisor: sum all shops
      const result = await db.query(`
        SELECT 
          COUNT(*)::int as total_count,
          COALESCE(SUM(total_amount), 0) as total_sales,
          COALESCE(SUM(profit_amount), 0) as total_profit
        FROM sales
        WHERE created_at::date = CURRENT_DATE
      `);
      const row = result.rows[0];
      return res.json({
        total_count: row.total_count,
        total_sales: parseFloat(row.total_sales) || 0,
        total_profit: parseFloat(row.total_profit) || 0,
      });
    }
    
    // Cashier: get their shop
    const shop = await db.query('SELECT id FROM shops WHERE user_id = $1', [req.user.id]);
    if (shop.rows.length === 0) return res.json({ total_count: 0, total_sales: 0, total_profit: 0 });
    shopId = shop.rows[0].id;
    
    const result = await db.query(`
      SELECT 
        COUNT(*)::int as total_count,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(profit_amount), 0) as total_profit
      FROM sales
      WHERE shop_id = $1 AND created_at::date = CURRENT_DATE
    `, [shopId]);
    const row = result.rows[0];
    res.json({
      total_count: row.total_count,
      total_sales: parseFloat(row.total_sales) || 0,
      total_profit: parseFloat(row.total_profit) || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sales - تسجيل عملية بيع جديدة (الكاشير)
router.post('/', auth, role('cashier'), async (req, res) => {
  try {
    const { product_name, quantity, sale_price } = req.body;
    
    if (!product_name || !quantity || !sale_price) {
      return res.status(400).json({ error: 'يرجى ملء جميع الحقول: المنتج، الكمية، سعر البيع' });
    }
    
    const qty = parseFloat(quantity);
    const price = parseFloat(sale_price);
    
    if (qty <= 0 || price <= 0) {
      return res.status(400).json({ error: 'الكمية والسعر يجب أن يكونا أكبر من صفر' });
    }
    
    // Get cashier's shop
    const shopResult = await db.query('SELECT * FROM shops WHERE user_id = $1', [req.user.id]);
    if (shopResult.rows.length === 0) {
      return res.status(400).json({ error: 'هذا الحساب غير مربوط بمحل' });
    }
    const shop = shopResult.rows[0];
    
    // Find product in shop inventory
    const productResult = await db.query(
      'SELECT * FROM inventory WHERE product_name = $1 AND shop_id = $2',
      [product_name, shop.id]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'المنتج غير موجود في مخزن المحل' });
    }
    
    const product = productResult.rows[0];
    if (parseFloat(product.quantity) < qty) {
      return res.status(400).json({ 
        error: `المخزون غير كافٍ. المتوفر: ${product.quantity} ${product.unit_type === 'weight' ? 'كجم' : 'قطعة'}` 
      });
    }
    
    const purchasePrice = parseFloat(product.purchase_price);
    const totalAmount = price * qty;
    const profitAmount = (price - purchasePrice) * qty;
    
    // Start transaction
    await db.query('BEGIN');
    
    try {
      // 1. Update inventory (deduct)
      const newQty = parseFloat(product.quantity) - qty;
      await db.query(
        'UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQty, product.id]
      );
      
      // 2. Record sale
      const saleResult = await db.query(`
        INSERT INTO sales (shop_id, user_id, product_name, quantity, unit_type, sale_price, total_amount, profit_amount)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [shop.id, req.user.id, product_name, qty, product.unit_type, price, totalAmount, profitAmount]);
      
      // 3. Record inventory transaction
      await db.query(`
        INSERT INTO inventory_transactions (product_name, user_id, quantity_change, transaction_type, shop_id)
        VALUES ($1, $2, $3, 'deduction', $4)
      `, [product_name, req.user.id, -qty, shop.id]);
      
      // 4. Record profit log - sale_revenue
      await db.query(`
        INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id, shop_id)
        VALUES ('sale_revenue', $1, $2, 'sale', $3, $4)
      `, [totalAmount, `بيع ${product_name} - ${qty} ${product.unit_type === 'weight' ? 'كجم' : 'قطعة'} بسعر ${price}`, saleResult.rows[0].id, shop.id]);
      
      // 5. Record profit log - cogs (cost of goods sold)
      if (purchasePrice > 0) {
        await db.query(`
          INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id, shop_id)
          VALUES ('cogs', $1, $2, 'sale', $3, $4)
        `, [purchasePrice * qty, `تكلفة بضاعة مباعة: ${product_name}`, saleResult.rows[0].id, shop.id]);
      }
      
      await db.query('COMMIT');
      
      res.status(201).json({
        message: 'تمت عملية البيع بنجاح',
        sale: saleResult.rows[0],
        profit: profitAmount,
        remaining_stock: newQty
      });
      
    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/sales/shop-inventory - مخزن الكاشير (للقراءة)
router.get('/shop-inventory', auth, role('cashier'), async (req, res) => {
  try {
    const shop = await db.query('SELECT id FROM shops WHERE user_id = $1', [req.user.id]);
    if (shop.rows.length === 0) return res.status(400).json({ error: 'غير مربوط بمحل' });
    
    const result = await db.query(
      'SELECT * FROM inventory WHERE shop_id = $1 ORDER BY product_name',
      [shop.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sales/shop-inventory - إضافة منتج لمخزن الكاشير
router.post('/shop-inventory', auth, role('cashier'), async (req, res) => {
  try {
    const { product_name, quantity, unit_type, purchase_price, retail_price } = req.body;
    
    if (!product_name || quantity === undefined) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المنتج والكمية' });
    }
    
    const shop = await db.query('SELECT id FROM shops WHERE user_id = $1', [req.user.id]);
    if (shop.rows.length === 0) return res.status(400).json({ error: 'غير مربوط بمحل' });
    
    const shopId = shop.rows[0].id;
    const addedQty = parseFloat(quantity || 0);
    const unit = unit_type || 'unit';
    const purchase = parseFloat(purchase_price || 0);
    const retail = parseFloat(retail_price || 0);
    
    // Check if product exists in this shop
    const exist = await db.query(
      'SELECT * FROM inventory WHERE product_name = $1 AND shop_id = $2',
      [product_name, shopId]
    );
    
    if (exist.rows.length > 0) {
      const newQty = parseFloat(exist.rows[0].quantity) + addedQty;
      const result = await db.query(
        `UPDATE inventory SET quantity = $1, unit_type = $2, purchase_price = $3, retail_price = $4, updated_at = NOW() 
         WHERE id = $5 RETURNING *`,
        [newQty, unit, purchase, retail, exist.rows[0].id]
      );
      
      await db.query(
        `INSERT INTO inventory_transactions (product_name, user_id, quantity_change, transaction_type, shop_id)
         VALUES ($1, $2, $3, 'addition', $4)`,
        [product_name, req.user.id, addedQty, shopId]
      );
      
      res.json({ message: 'تم تحديث المنتج بنجاح', product: result.rows[0] });
    } else {
      const result = await db.query(
        `INSERT INTO inventory (product_name, quantity, unit_type, purchase_price, retail_price, shop_id, wholesale_price, min_stock_level)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 1) RETURNING *`,
        [product_name, addedQty, unit, purchase, retail, shopId]
      );
      
      await db.query(
        `INSERT INTO inventory_transactions (product_name, user_id, quantity_change, transaction_type, shop_id)
         VALUES ($1, $2, $3, 'addition', $4)`,
        [product_name, req.user.id, addedQty, shopId]
      );
      
      res.status(201).json({ message: 'تم إضافة المنتج بنجاح', product: result.rows[0] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sales/shop-transactions - حركات مخزن الكاشير
router.get('/shop-transactions', auth, role('cashier'), async (req, res) => {
  try {
    const shop = await db.query('SELECT id FROM shops WHERE user_id = $1', [req.user.id]);
    if (shop.rows.length === 0) return res.status(400).json({ error: 'غير مربوط بمحل' });
    
    const result = await db.query(
      `SELECT it.*, u.username 
       FROM inventory_transactions it
       LEFT JOIN users u ON it.user_id = u.id
       WHERE it.shop_id = $1
       ORDER BY it.created_at DESC LIMIT 100`,
      [shop.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sales/bulk - بيع مجموعة منتجات (فاتورة)
router.post('/bulk', auth, role('cashier'), async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'يرجى إضافة منتجات إلى الفاتورة' });
    }

    // Get cashier's shop
    const shopResult = await db.query('SELECT * FROM shops WHERE user_id = $1', [req.user.id]);
    if (shopResult.rows.length === 0) {
      return res.status(400).json({ error: 'هذا الحساب غير مربوط بمحل' });
    }
    const shop = shopResult.rows[0];
    const shopId = shop.id;
    const userId = req.user.id;

    // Start transaction
    await db.query('BEGIN');

    try {
      let grandTotal = 0;
      let grandProfit = 0;
      const saleResults = [];

      for (const item of items) {
        const { product_name, quantity, sale_price } = item;

        if (!product_name || !quantity || !sale_price) {
          throw new Error(`بيانات غير مكتملة للمنتج ${product_name || 'غير معروف'}`);
        }

        const qty = parseFloat(quantity);
        const price = parseFloat(sale_price);

        if (qty <= 0 || price <= 0) {
          throw new Error(`الكمية والسعر يجب أن يكونا أكبر من صفر للمنتج ${product_name}`);
        }

        // Find product in shop inventory
        const productResult = await db.query(
          'SELECT * FROM inventory WHERE product_name = $1 AND shop_id = $2',
          [product_name, shopId]
        );

        if (productResult.rows.length === 0) {
          throw new Error(`المنتج "${product_name}" غير موجود في مخزن المحل`);
        }

        const product = productResult.rows[0];

        if (parseFloat(product.quantity) < qty) {
          throw new Error(`المخزون غير كافٍ للمنتج "${product_name}". المتوفر: ${product.quantity} ${product.unit_type === 'weight' ? 'كجم' : 'قطعة'}`);
        }

        const purchasePrice = parseFloat(product.purchase_price);
        const totalAmount = price * qty;
        const profitAmount = (price - purchasePrice) * qty;
        grandTotal += totalAmount;
        grandProfit += profitAmount;

        // 1. Update inventory (deduct)
        const newQty = parseFloat(product.quantity) - qty;
        await db.query(
          'UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2',
          [newQty, product.id]
        );

        // 2. Record sale
        const saleResult = await db.query(`
          INSERT INTO sales (shop_id, user_id, product_name, quantity, unit_type, sale_price, total_amount, profit_amount)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [shopId, userId, product_name, qty, product.unit_type, price, totalAmount, profitAmount]);

        // 3. Record inventory transaction
        await db.query(`
          INSERT INTO inventory_transactions (product_name, user_id, quantity_change, transaction_type, shop_id)
          VALUES ($1, $2, $3, 'deduction', $4)
        `, [product_name, userId, -qty, shopId]);

        // 4. Record profit log - sale_revenue
        await db.query(`
          INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id, shop_id)
          VALUES ('sale_revenue', $1, $2, 'sale', $3, $4)
        `, [totalAmount, `بيع ${product_name} - ${qty} ${product.unit_type === 'weight' ? 'كجم' : 'قطعة'} بسعر ${price}`, saleResult.rows[0].id, shopId]);

        // 5. Record profit log - cogs
        if (purchasePrice > 0) {
          await db.query(`
            INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id, shop_id)
            VALUES ('cogs', $1, $2, 'sale', $3, $4)
          `, [purchasePrice * qty, `تكلفة بضاعة مباعة: ${product_name}`, saleResult.rows[0].id, shopId]);
        }

        saleResults.push(saleResult.rows[0]);
      }

      await db.query('COMMIT');

      res.status(201).json({
        message: 'تمت عملية البيع بنجاح',
        sales: saleResults,
        total_amount: grandTotal,
        total_profit: grandProfit,
        items_count: items.length
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

// POST /api/sales/shop-spoilage - تسجيل هالك في مخزن المحل (الكاشير)
router.post('/shop-spoilage', auth, role('cashier'), async (req, res) => {
  try {
    const { product_name, quantity, description } = req.body;

    if (!product_name || !quantity) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المنتج والكمية' });
    }

    const qty = parseFloat(quantity);
    if (qty <= 0) {
      return res.status(400).json({ error: 'الكمية يجب أن تكون أكبر من صفر' });
    }

    // Get cashier's shop
    const shopResult = await db.query('SELECT * FROM shops WHERE user_id = $1', [req.user.id]);
    if (shopResult.rows.length === 0) {
      return res.status(400).json({ error: 'هذا الحساب غير مربوط بمحل' });
    }
    const shop = shopResult.rows[0];

    // Get product from shop inventory
    const productResult = await db.query(
      'SELECT * FROM inventory WHERE product_name = $1 AND shop_id = $2',
      [product_name, shop.id]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'المنتج غير موجود في مخزن المحل' });
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
        [product_name, qty, product.unit_type, cost, description || `هالك محل: ${shop.shop_name}`]
      );

      // 3. تسجيل حركة مخزون
      await db.query(
        `INSERT INTO inventory_transactions (product_name, user_id, quantity_change, transaction_type, shop_id)
         VALUES ($1, $2, $3, 'spoilage', $4)`,
        [product_name, req.user.id, -qty, shop.id]
      );

      // 4. تسجيل في سجل الربح كخسارة (مربوط بالمحل)
      await db.query(
        `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id, shop_id)
         VALUES ('spoilage', $1, $2, 'spoilage', $3, $4)`,
        [cost, `هالك محل ${shop.shop_name}: ${product_name} - ${qty} ${product.unit_type === 'weight' ? 'كجم' : 'قطعة'} (${description || ''})`, spoilageResult.rows[0].id, shop.id]
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
