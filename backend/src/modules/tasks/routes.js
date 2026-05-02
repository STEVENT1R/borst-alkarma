const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// POST /api/tasks – إنشاء مهمة (مشرف)
router.post('/', auth, role('supervisor'), async (req, res) => {
  try {
    const { worker_id, title, receiver_name, product_name, quantity, unit_type, price, reminder_time, sale_type, notes } = req.body;
    const result = await db.query(
      `INSERT INTO tasks (supervisor_id, worker_id, title, receiver_name, product_name, quantity, unit_type, price, reminder_time, sale_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [req.user.id, worker_id, title, receiver_name, product_name, quantity, unit_type || 'unit', price, reminder_time || null, sale_type || 'retail', notes || null]
    );
    const task = result.rows[0];

    // إشعار العامل
    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [worker_id, `تم تعيين مهمة جديدة لك: ${title}`]
    );

    // إشعار للمشرف نفسه لو المهمة شخصية
    if (req.user.id === worker_id) {
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [req.user.id, `تم إنشاء مهمة شخصية: ${title}`]
      );
    }

    // إذا في مستلم، نتأكد من وجوده في جدول المستلمين أو نضيفه
    if (receiver_name && receiver_name.trim()) {
      const existingReceiver = await db.query('SELECT id FROM receivers WHERE name = $1', [receiver_name.trim()]);
      if (existingReceiver.rows.length === 0) {
        await db.query(
          'INSERT INTO receivers (name) VALUES ($1)',
          [receiver_name.trim()]
        );
      }
    }

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/logs – سجل المهام المفصل
router.get('/logs', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, 
             u1.username as supervisor_name, 
             u2.username as worker_name
      FROM tasks t
      LEFT JOIN users u1 ON t.supervisor_id = u1.id
      LEFT JOIN users u2 ON t.worker_id = u2.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks – عرض المهام (حسب الدور)
router.get('/', auth, async (req, res) => {
  try {
    let tasks;
    if (req.user.role === 'supervisor') {
      tasks = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
    } else {
      tasks = await db.query('SELECT * FROM tasks WHERE worker_id = $1 ORDER BY created_at DESC', [req.user.id]);
    }
    res.json(tasks.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const taskResult = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'مهمة غير موجودة' });

    const task = taskResult.rows[0];
    const allowed = [];

    const isWorker = req.user.id === task.worker_id;
    const isSupervisor = req.user.role === 'supervisor';

    // صلاحيات العامل (صاحب المهمة)
    if (isWorker) {
      if (task.status === 'pending' && status === 'in_progress') allowed.push(true);
      if (task.status === 'in_progress' && status === 'awaiting_approval') allowed.push(true);
      if (status === 'cancelled') allowed.push(true);
    }

    // صلاحيات المشرف
    if (isSupervisor) {
      if (task.status === 'awaiting_approval' && (status === 'delivered' || status === 'loaded' || status === 'delivered_and_loaded' || status === 'money_delivery')) allowed.push(true);
      if (isWorker && task.status === 'in_progress' && (status === 'delivered' || status === 'loaded' || status === 'delivered_and_loaded' || status === 'money_delivery')) allowed.push(true);
      if (status === 'cancelled') allowed.push(true);
    }

    if (!allowed.length) {
      return res.status(403).json({ error: `لا يمكن تغيير الحالة من "${task.status}" إلى "${status}"` });
    }

      // متغير لحساب تكلفة البضاعة المباعة (COGS)
      let cogsAmount = 0;

      // عند التحميل أو الاستلام أو الاثنين معاً أو استلاف
      if (['delivered', 'loaded', 'delivered_and_loaded', 'money_delivery'].includes(status)) {
        // حساب تكلفة البضاعة المباعة (COGS) قبل خصم المخزون
        if ((status === 'delivered' || status === 'delivered_and_loaded') && task.product_name && task.quantity) {
          try {
            const inv = await db.query('SELECT id, quantity, purchase_price FROM inventory WHERE product_name = $1', [task.product_name]);
            if (inv.rows.length > 0) {
              const purchasePrice = parseFloat(inv.rows[0].purchase_price) || 0;
              cogsAmount = parseFloat(task.quantity) * purchasePrice;
            }
          } catch (err) {
            console.error('COGS calculation error:', err);
          }
        }

        // خصم من المخزون (لغير الاستلاف وللاستلام النقدي فقط)
        // delivered: فيه بضاعة → نخصم
        // loaded: فلوس بس من غير بضاعة → منخصمش
        // delivered_and_loaded: بضاعة + فلوس → نخصم
        if ((status === 'delivered' || status === 'delivered_and_loaded') && task.product_name && task.quantity) {
          try {
            const inv = await db.query('SELECT id, quantity, purchase_price FROM inventory WHERE product_name = $1', [task.product_name]);
            if (inv.rows.length > 0) {
              // التحقق من وجود كمية كافية في المخزون
              const currentQty = parseFloat(inv.rows[0].quantity) || 0;
              const deductQty = parseFloat(task.quantity) || 0;
              if (deductQty > currentQty) {
                console.warn(`محاولة خصم ${deductQty} من ${task.product_name} والكمية المتاحة ${currentQty}`);
              }
              const newQty = Math.max(0, currentQty - deductQty);
              await db.query(
                'UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE product_name = $2',
                [newQty, task.product_name]
              );
              // سجل الحركة
              await db.query(
                `INSERT INTO inventory_transactions (product_name, user_id, task_id, quantity_change, transaction_type)
                 VALUES ($1, $2, $3, $4, 'deduction')`,
                [task.product_name, task.worker_id, task.id, -task.quantity]
              );

              // تنبيه مخزون منخفض
              const updated = await db.query('SELECT quantity FROM inventory WHERE product_name = $1', [task.product_name]);
              if (updated.rows[0].quantity < 5) {
                const supers = await db.query("SELECT id FROM users WHERE role = 'supervisor'");
                for (const s of supers.rows) {
                  await db.query(
                    'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
                    [s.id, `المخزون من ${task.product_name} منخفض (الكمية: ${updated.rows[0].quantity})`]
                  );
                }
              }
            }
          } catch (err) {
            console.error('Inventory deduction error:', err);
          }
        }

        // تسجيل COGS في profit_log لو في بضاعة اتباعت
        if (cogsAmount > 0) {
          await db.query(
            `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
             VALUES ('cogs', $1, $2, 'task', $3)`,
            [cogsAmount, `تكلفة بضاعة مباعة: ${task.product_name} - ${task.title}`, task.id]
          );
        }

        // تسجيل في سجل التعاملات للمستلم
      if (task.receiver_name) {
        const receiver = await db.query('SELECT id FROM receivers WHERE name = $1', [task.receiver_name]);
        if (receiver.rows.length > 0) {
          const receiverId = receiver.rows[0].id;
            if (status === 'delivered') {
            // تحميل بضاعة (دينا بضاعة للمستلم) - المستلم مديون لنا (موجب)
            // price هو السعر الإجمالي للمهمة كلها (مجموع الكمية × سعر الوحدة)
            await db.query(
              `INSERT INTO receiver_transactions (receiver_id, task_id, transaction_type, amount, description)
               VALUES ($1, $2, 'goods_delivered', $3, $4)`,
              [receiverId, task.id, Math.abs(task.price), `تحميل بضاعة: ${task.product_name} - ${task.title}`]
            );
          } else if (status === 'loaded') {
            // استلام أموال (استلمنا فلوس من المستلم) - يخصم من مديونيته (سالب)
            await db.query(
              `INSERT INTO receiver_transactions (receiver_id, task_id, transaction_type, amount, description)
               VALUES ($1, $2, 'money_received', $3, $4)`,
              [receiverId, task.id, -Math.abs(task.price), `استلام أموال: ${task.product_name} - ${task.title}`]
            );
            // تسجيل الإيراد - price هو السعر الإجمالي (ليس price × quantity)
            await db.query(
              `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
               VALUES ('revenue', $1, $2, 'task', $3)`,
              [task.price, `إيراد من ${task.receiver_name} - ${task.title}`, task.id]
            );
          } else if (status === 'delivered_and_loaded') {
            // تحميل بضاعة + استلام أموال معاً
            // تحميل بضاعة: المستلم مديون لنا (موجب)
            await db.query(
              `INSERT INTO receiver_transactions (receiver_id, task_id, transaction_type, amount, description)
               VALUES ($1, $2, 'goods_delivered', $3, $4)`,
              [receiverId, task.id, Math.abs(task.price), `تحميل بضاعة: ${task.product_name} - ${task.title}`]
            );
            // استلام أموال: استلمنا فلوس - يخصم من مديونيته (سالب)
            await db.query(
              `INSERT INTO receiver_transactions (receiver_id, task_id, transaction_type, amount, description)
               VALUES ($1, $2, 'money_received', $3, $4)`,
              [receiverId, task.id, -Math.abs(task.price), `استلام أموال: ${task.product_name} - ${task.title}`]
            );
            await db.query(
              `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
               VALUES ('revenue', $1, $2, 'task', $3)`,
              [task.price, `إيراد من ${task.receiver_name} - ${task.title}`, task.id]
            );
          } else if (status === 'money_delivery') {
            // استلاف (بنقرض المستلم فلوس) - المستلم مديون لنا (موجب)
            // price هو المبلغ الإجمالي المسجل في المهمة
            await db.query(
              `INSERT INTO receiver_transactions (receiver_id, task_id, transaction_type, amount, description)
               VALUES ($1, $2, 'debt_added', $3, $4)`,
              [receiverId, task.id, Math.abs(task.price), `استلاف لـ ${task.receiver_name} - ${task.title}`]
            );
            // تسجيل في سجل الأرباح كمصروف (دفعنا فلوس)
            await db.query(
              `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
               VALUES ('expense', $1, $2, 'task', $3)`,
              [Math.abs(task.price), `استلاف لـ ${task.receiver_name} - ${task.title}`, task.id]
            );
          }
        }
      }

      await db.query('UPDATE tasks SET status = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2', [status, id]);
    } else {
      await db.query('UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    }

    // إشعار الطرف الآخر
    let notifyUserId = task.worker_id;
    if (req.user.id === task.worker_id) notifyUserId = task.supervisor_id;
    else notifyUserId = task.worker_id;
    
    const statusLabels = {
      'delivered': 'تم التحميل',
      'loaded': 'تم استلام الأموال',
      'delivered_and_loaded': 'تم التحميل والاستلام',
      'completed': 'مكتملة',
      'cancelled': 'ملغية',
      'in_progress': 'قيد التنفيذ',
      'awaiting_approval': 'بانتظار الموافقة',
      'money_delivery': 'تم الاستلاف'
    };
    
    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [notifyUserId, `تم تحديث حالة المهمة "${task.title}" إلى ${statusLabels[status] || status}`]
    );

    res.json({ message: 'تم التحديث' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/collect - تحصيل (تحصيل جزئي من المستلم بعد تحميل البضاعة)
router.post('/:id/collect', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'المبلغ مطلوب' });
    }

    const taskResult = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'مهمة غير موجودة' });
    
    const task = taskResult.rows[0];
    
    // التحصيل ممكن للمهام: قيد التنفيذ أو بانتظار الموافقة أو بعد تحميل البضاعة
    if (!['delivered', 'in_progress', 'awaiting_approval'].includes(task.status)) {
      return res.status(400).json({ error: 'يمكن التحصيل فقط للمهام قيد التنفيذ أو بانتظار الموافقة أو بعد تحميل البضاعة' });
    }

    if (!task.receiver_name) {
      return res.status(400).json({ error: 'المهمة ليس لها مستلم' });
    }

    const receiver = await db.query('SELECT id FROM receivers WHERE name = $1', [task.receiver_name]);
    if (receiver.rows.length === 0) {
      return res.status(400).json({ error: 'المستلم غير موجود' });
    }

    const receiverId = receiver.rows[0].id;

    // إضافة معاملة تحصيل جزئي (سالب: يخصم من مديونيته)
    await db.query(
      `INSERT INTO receiver_transactions (receiver_id, task_id, transaction_type, amount, description)
       VALUES ($1, $2, 'money_received', $3, $4)`,
      [receiverId, task.id, -Math.abs(parseFloat(amount)), description || `تحصيل من ${task.receiver_name} - ${task.title}`]
    );

    // تسجيل الإيراد في سجل الأرباح
    await db.query(
      `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
       VALUES ('revenue', $1, $2, 'task', $3)`,
      [Math.abs(parseFloat(amount)), `تحصيل من ${task.receiver_name} - ${task.title}`, task.id]
    );

    // تغيير حالة المهمة إلى مكتملة بعد التحصيل
    await db.query(
      "UPDATE tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1",
      [task.id]
    );

    res.json({ message: 'تم التحصيل بنجاح وتم إكمال المهمة', amount: parseFloat(amount) });
  } catch (err) {
    console.error('❌ خطأ في تحصيل:', err.message || err);
    res.status(500).json({ error: 'حدث خطأ أثناء التحصيل' });
  }
});

// GET /api/tasks/:id - تفاصيل مهمة
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'worker' && task.rows[0].worker_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(task.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


