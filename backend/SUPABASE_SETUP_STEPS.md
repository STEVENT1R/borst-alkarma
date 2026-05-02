# 🟢 شرح رفع قاعدة البيانات على Supabase خطوة بخطوة

> ملف التعليمات هذا موجود في مجلد `backend/SUPABASE_SETUP_STEPS.md`
> افتحه في VS Code عشان تتابع الخطوات وأنت على المتصفح

---

## 📌 الخطوة 1: ادخل على موقع Supabase

1. افتح المتصفح (Chrome أو Edge)
2. اكتب في شريط العنوان: **https://supabase.com**
3. اضغط على الزر **"Start your project"** (في نص الصفحة)
4. هتاخدك لصفحة تسجيل دخول
5. اختار **"Sign in with GitHub"** (الزر بتاع GitHub)
6. سجل دخول بحساب GitHub بتاعك (اللي عليه المشروع: `STEVENT1R`)
7. اضغط **"Authorize"** عشان تسمح لـ Supabase

---

## 📌 الخطوة 2: إنشاء مشروع جديد

بعد ما تسجل دخول، هتكون في لوحة التحكم (Dashboard):

1. من الشمال فوق، اضغط على **"New project"** (أو لو أول مرة هتلاقيه في النص)

2. هتظهرلك صفحة إملأ فيها البيانات التالية:

   ```
   ┌─────────────────────────────────────┐
   │  Name:          borst-alkarma       │
   │  Database       │░░░░░░░░░░░░░░░░░│ │
   │  Password:      [..StrongPass..]    │
   │  Region:        South India (Mumbai)│
   │  Pricing Plan:  ○ Pro  ● Free       │
   │                                     │
   │  [      Create new project     ]    │
   └─────────────────────────────────────┘
   ```

   | الخانة | اكتب إيه |
   |--------|----------|
   | **Name** | `borst-alkarma` |
   | **Database Password** | اختار باسورد قوي. مثلاً: `Borst@2024!Secure` |
   | **Region** | اختر **"South India (Mumbai)"** - ده أقرب منطقة مجانية |
   | **Pricing Plan** | اختار **Free** ✅ (الخطة المجانية) |

3. اضغط **"Create new project"**

⏳ **انتظر 2-3 دقائق** - هتظهر علامة تحميل والمشروع بيتحضر (Provisioning)

---

## 📌 الخطوة 3: استخرج رابط قاعدة البيانات

لما المشروع يخلص تحضير، هتفتح صفحة المشروع:

1. من الشريط الجانبي **على اليمين**، دور على أيقونة الترس ⚙️
   - اسمها **"Project Settings"**
   - لو مش لاقيها، لف شوية للتحت في الشريط الجانبي

2. من القائمة اللي تظهر، اضغط على **"Database"**

3. انزل تحت شوية في الصفحة، لحد ما توصل لـ **"Connection string"**

4. هتلاقي مجموعة تبويبات (Tabs):
   ```
   [General]  [URI]  [PSQL]  [golang]  [JAVA]  ...
   ```

5. **اضغط على "URI"** - هيظهرلك رابط شكله كده:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghij.supabase.co:5432/postgres
   ```

6. **عدل الرابط:** 
   - غيّر `/postgres` في الآخر إلى `/borst_alkarma`
   - قبل: `...5432/postgres`
   - بعد: `...5432/borst_alkarma`
   
   مثال للرابط النهائي:
   ```
   postgresql://postgres:Borst@2024!Secure@db.abcdefghij.supabase.co:5432/borst_alkarma
   ```

7. **انسخ الرابط كامل** في Note أو ملف txt على سطح المكتب

> ⚠️ **مهم:** لو في الباسورد بتاعك Symbols (زي @ # $ %)، لازم تعمله **URL encode**
> مثلاً لو الباسورد `Borst@2024`، حول الـ @ إلى `%40` يبقى `Borst%402024`
> بس عموماً لو استعملت باسورد من غير symbols يبقى أحسن.

---

## 📌 الخطوة 4: شغل السكريبت عشان ينشئ الجداول

دلوقتي هتنشئ الجداول في قاعدة البيانات الجديدة.

### الطريقة الأسهل (باستخدام الملف اللي عملته):

1. في **VS Code**، افتح **Explorer** من الشمال
2. روح لمجلد `backend`
3. هتلاقي ملف اسمه **`init_supabase.bat`**
4. **دبل كليك** عليه (اضغط عليه مرتين)
5. هتظهر شاشة سوداء (Command Prompt) وتطلب منك رابط قاعدة البيانات
6. الصق الرابط اللي نسخته من Supabase واضغط Enter
7. استنى شوية - هتلاقي الجداول بتتنشأ واحدة واحدة

### الطريقة اليدوية (في Terminal):

افتح Terminal في VS Code (Ctrl + `) أو افتح CMD:

```bash
cd e:/programming/my\ projects/borst_alkarma/backend

DATABASE_URL="postgresql://postgres:Borst@2024!Secure@db.abcdefghij.supabase.co:5432/borst_alkarma" node src/config/initDb.js
```

### لما يشتغل من غير مشاكل، هتشوف الرسايل دي:
```
Tables created successfully
Admin user created: admin / admin
✅ Database ready!
```

### لو ظهر خطأ زي:
- `ECONNREFUSED` - معناه إن Supabase لسه مخلصش تحضير
- `ETIMEDOUT` - جرب تغير المنطقة لـ Singapore أو Mumbai
- `22P02` - مشكلة في الـ CHECK constraint (عادي، كمل الجداول اتعملت)

---

## 📌 الخطوة 5: تأكد إن الجداول اتعملت

1. افتح Supabase تاني في المتصفح
2. من الشريط الجانبي، اضغط على **"Table Editor"**
3. هتلاقي كل الجداول اللي اتعملت:
   ```
   📋 users
   📋 tasks
   📋 inventory
   📋 sales
   📋 shops
   📋 notifications
   📋 salaries
   📋 salary_payments
   📋 inventory_transactions
   📋 receivers
   📋 receiver_transactions
   📋 profit_log
   📋 expenses
   📋 purchases
   📋 purchase_items
   📋 performance_log
   📋 push_subscriptions
   📋 app_settings
   📋 spoilage
   ```
4. افتح جدول `users` واضغط **"View all"** - هتلاقي المستخدم `admin` موجود

---

## ✅ الخلاصة - كده قاعدة البيانات جاهزة!

| إيه اللي اتعمل | الحالة |
|----------------|--------|
| حساب Supabase | ✅ |
| مشروع `borst-alkarma` | ✅ |
| رابط قاعدة البيانات | تم استخراجه |
| كل الجداول | ✅ اتأكد من إنشائها |
| مستخدم admin | ✅ admin / admin |
| **قاعدة البيانات شغالة!** | ✅ **جاهز للربط مع Render** |

---

## 🔜 الخطوة الجاية

بعد ما قاعدة البيانات تبقى جاهزة، هتروح لـ **Render.com** وترفع الباك إند هناك.

في الخطوة دي هتحتاج:
- رابط قاعدة البيانات (اللي عندك)
- JWT_SECRET
- VAPID keys

ودي هتحطها في **Environment Variables** على Render.

---

## 📞 لو احتجت مساعدة

لو وقفت عند أي خطوة أو ظهرلك خطأ، فقط قولي:
1. إيش الخطأ اللي ظهر؟
2. في أي خطوة بالظبط؟
