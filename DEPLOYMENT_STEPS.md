# 🚀 DEPLOYMENT_STEPS — آخر 3 خطوات يدوية لإكمال النشر

> كل ما يمكن أتمتته تم إنشاؤه جاهزاً في المستودع:
> `vercel.json` (Vercel) + `render.yaml` (Render) + سكربتات `env:check` و`bootstrap`.

---

## 1️⃣ لصق رابط قاعدة بيانات Supabase

1. افتح [supabase.com](https://supabase.com) → سجّل الدخول → أنشئ مشروعاً جديداً.
2. من الشريط الجانبي: **Project Settings → Database → Connection string**.
3. انسخ الـ **URI** مع وضع كلمة المرور مكان `[YOUR-PASSWORD]`.
4. تأكد أن الرابط ينتهي بـ `?schema=public` (أضفها إن لم تكن موجودة).
5. الصق الرابط في ملف `.env` في جذر المشروع مكان قيمة `DATABASE_URL`.
6. نفّذ (ينشئ الجداول ويضخ البيانات التجريبية):

```bash
npm run env:check    # يتحقق من اكتمال المفاتيح
npm run draw:seed    # prisma db push + بذر البيانات
```

---

## 2️⃣ تشغيل التهيئة (البوت + القناة + المدير)

بعد نجاح الخطوة 1، نفّذ مرة واحدة لترقية حسابك
(`1665333044`) إلى **مدير القناة** وإرسال رسالة الترحيب:

```bash
npm run bootstrap
```

> توقع الناتج: `✅ أصبح المستخدم 1665333044 مديراً في القناة`
> إن ظهرت رسالة خطأ: افتح القناة واجعل البوت `@API_HUNTER_AIbot` **مديراً**
> من: إعدادات القناة → مدراء → إضافة مدير → ابحث عن البوت.

---

## 3️⃣ ربط منصتي Vercel و Render بالمستودع على GitHub

### أ) Vercel (موقع اللوحة)

الموقع على **Vercel** يُنشر من خلال مستودع GitHub:

1. افتح [vercel.com/new](https://vercel.com/new) → **Import Git Repository**.
2. اختر مستودع **API-Hunter-AI** → Vercel يقرأ `vercel.json` تلقائياً.
3. أضف متغيرات البيئة (من لوحة المشروع → Settings → Environment Variables):
   - `DATABASE_URL` = رابط Supabase (نفس قيمة `.env`)
   - `GEMINI_API_KEY` = المفتاح
   - `TELEGRAM_BOT_TOKEN` = توكن البوت
   - `TELEGRAM_CHANNEL_ID` = `-1003720665169`
4. اضغط **Deploy**. سيظهر الموقع على رابط مشابه: `https://api-hunter-ai.vercel.app`.

### ب) Render (البوت + محرك الاصطياد على مدار الساعة)

`render.yaml` ينشئ خدمتَي خلفية جاهزتين (البوت + المحرك المجدول):

1. افتح [render.com](https://render.com) → سجّل الدخول.
2. **New → Blueprint** → اختر مستودع **API-Hunter-AI**.
3. Render سيكتشف `render.yaml` ويعرض خدمتي `api-hunter-bot` و`api-hunter-agent`.
4. اضغط **Apply**، ثم من كل خدمة → **Environment** أضف القيم:
   - `DATABASE_URL` = رابط Supabase
   - `TELEGRAM_BOT_TOKEN` = توكن البوت
   - `TELEGRAM_CHANNEL_ID` = `-1003720665169`
   - `GEMINI_API_KEY` = المفتاح
5. أعد تشغيل الخدمتين. البوت يعمل بوضع Polling، والمحرك يجري جولة فورية ثم يكرر كل `6` ساعات.

---

## ✅ فحص ما بعد النشر

| العنصر | الطريقة |
|---|---|
| الموقع | زيارة رابط Vercel ومشاهدة لوحة الخدمات |
| البوت | مراسلة `@API_HUNTER_AIbot` بأمر `/start` أو `/latest` |
| القناة | التأكد أن الرسائل تُنشر على `https://t.me/APIHUNTERAI` |
| المحرك | سجل Render الخاص بـ `api-hunter-agent` يُظهر «بدء دورة مجدولة» |

> 💡 **ملاحظة**: لا تُرفع مفاتيح القيم السرية في ملفات النشر أبداً —
> `sync: false` في `render.yaml` متعمدة لتلصق القيم من لوحة Render فقط،
> و`.env` مستثنى من Git.