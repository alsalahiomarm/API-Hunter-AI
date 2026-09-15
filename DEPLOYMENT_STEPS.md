# 🚀 DEPLOYMENT_STEPS — آخر 3 خطوات يدوية لإكمال النشر

> كل ما يمكن أتمتته تم إنشاؤه جاهزاً في المستودع:
> `vercel.json` (Vercel) + `render.yaml` (Render) + سكربتات `env:check` و`bootstrap`.

---

## ✅ تم إنجازه فعلاً (لا يحتاج تدخلك)

| العنصر | الحالة |
|---|---|
| مستودع GitHub | `alsalahiomarm/API-Hunter-AI` — https://github.com/alsalahiomarm/API-Hunter-AI |
| مشروع Vercel | `lolomama/api-hunter-ai` |
| الموقع الحيّ | **https://api-hunter-ai.vercel.app** (نُشر عبر Vercel CLI — يعمل ✅) |
| متغيرات Vercel (Production) | `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_ADMIN_IDS` |
| فحص محلي | `env:check` ✅ / `db:generate` ✅ / `build` ✅ (EXIT=0) |
| جولة اصطياد حقيقية | ✅ فحص 1003 مدخل وتحليل بوضع **Gemini** (ثقة 0.85) |

---

## 1️⃣ لصق رابط قاعدة بيانات Supabase

1. افتح [supabase.com](https://supabase.com) → سجّل الدخول → أنشئ مشروعاً جديداً.
2. من الشريط الجانبي: **Project Settings → Database → Connection string**.
3. انسخ الـ **URI** مع وضع كلمة المرور مكان `[YOUR-PASSWORD]`.
4. تأكد أن الرابط ينتهي بـ `?schema=public` (أضفها إن لم تكن موجودة).
5. الصق الرابط في ملف `.env` في جذر المشروع مكان قيمة `DATABASE_URL`.
   ثم حدّث نسخة Vercel:
   `vercel env rm DATABASE_URL production -y` ثم `vercel env add DATABASE_URL production`.
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

المشروع **منشور بالفعل** والمتغيرات مضافة. المتبقي فقط ربط Git للنشر التلقائي عند كل `push`:

1. افتح [vercel.com](https://vercel.com) → مشروع **api-hunter-ai** → **Settings → Git**.
2. اضغط **Connect Git Repository** واختر **`alsalahiomarm/API-Hunter-AI`**.
   (قد يطلب تثبيت تطبيق Vercel على حساب GitHub مرة واحدة — هذا هو سبب فشل `vercel git connect` من الطرفية.)
3. بعد الربط، أي `git push` على `main` سيُنشر تلقائياً.
4. للتحديث الفوري من الطرفية في أي وقت: `vercel --prod --yes`

> ملاحظة: الموقع يعمل الآن حتى بدون Supabase لأنه يعرض البيانات التجريبية كاحتياط،
> لكن ربط Supabase إلزامي لعرض الخدمات التي يصطادها المحرك تلقائياً.

### ب) Render (البوت + محرك الاصطياد على مدار الساعة)

`render.yaml` ينشئ خدمتَي خلفية جاهزتين (البوت + المحرك المجدول):

1. افتح [render.com](https://render.com) → سجّل الدخول.
2. **New → Blueprint** → اربط حساب **GitHub** (تثبيت تطبيق Render مرة واحدة) ثم اختر مستودع **API-Hunter-AI**.
3. Render سيكتشف `render.yaml` ويعرض خدمتي `api-hunter-bot` و`api-hunter-agent`.
4. اضغط **Apply**، ثم من كل خدمة → **Environment** أضف القيم (القيم السرية لا تُلتزم في Git):
   - `DATABASE_URL` = رابط Supabase
   - `TELEGRAM_BOT_TOKEN` = توكن البوت
   - `TELEGRAM_CHANNEL_ID` = `-1003720665169`
   - `TELEGRAM_ADMIN_IDS` = `1665333044`
   - `GEMINI_API_KEY` = المفتاح
   - `GEMINI_MODEL` = `gemini-flash-latest`
   - `AGENT_CONCURRENCY` = `2` (لتقليل ضغط الطبقة المجانية)
   - `AI_MAX_ATTEMPTS` = `3`
5. أعد تشغيل الخدمتين. البوت يعمل بوضع Polling، والمحرك يجري جولة فورية ثم يكرر كل `6` ساعات.
6. للتحقق من عمل توكن اقتراع تليجرام: سجلات `api-hunter-bot` ستطبع `🤖 البوت يعمل الآن`.

---

## 🆓 المسار المجاني 100% (بدون Render)

إذا لم ترغب بدفع اشتراك Render (Background Worker من ~$7/شهر لكل خدمة):

1. **المحرك (مجاني بالكامل عبر GitHub Actions)** — موجود جاهزاً في `.github/workflows/hunt.yml`:
   - افتح المستودع → **Settings → Secrets and variables → Actions → New repository secret**.
   - أضف سِرّين: `DATABASE_URL` (رابط Supabase) و `GEMINI_API_KEY`.
   - (اختياري) من تبويب **Variables** أضف `GEMINI_MODEL` = `gemini-flash-latest`.
   - من تبويب **Actions** اختر «Hunt (جولة اصطياد مجدولة)» → **Run workflow** للتشغيل اليدوي.
   - بعد ذلك يعمل تلقائياً **كل 6 ساعات** ويخزّن النتائج في Supabase (المستودع عام = دقائق مجانية غير محدودة).
2. **البوت** — شغّله محلياً على جهازك (أمر واحد، يعمل طالما الجهاز مفتوح):
   ```bash
   npm run bootstrap   # مرة واحدة: ترقية المدير + رسالة ترحيب في القناة
   npm run bot
   ```
   > البوت يفحص القناة كل `BOT_CHANNEL_POLL_SECONDS` (300 ثانية افتراضياً) وينشر الجديد تلقائياً.

> بهذا تحصل على منظومة كاملة تعمل بـ 0$: الموقع على Vercel + البيانات على Supabase +
> الاصطياد على GitHub Actions + البوت محلياً.

---

| العنصر | الطريقة |
|---|---|
| الموقع | زيارة https://api-hunter-ai.vercel.app ومشاهدة لوحة الخدمات |
| نقطة البيانات | `GET https://api-hunter-ai.vercel.app/api/stats` تُرجع JSON بالأرقام |
| البوت | مراسلة `@API_HUNTER_AIbot` بأمر `/start` أو `/latest` |
| القناة | التأكد أن الرسائل تُنشر على `https://t.me/APIHUNTERAI` |
| المحرك | سجل Render الخاص بـ `api-hunter-agent` يُظهر «بدء دورة مجدولة» |

> 💡 **ملاحظة**: لا تُرفع مفاتيح القيم السرية في ملفات النشر أبداً —
> `sync: false` في `render.yaml` متعمدة لتلصق القيم من لوحة Render فقط،
> و`.env` مستثنى من Git.