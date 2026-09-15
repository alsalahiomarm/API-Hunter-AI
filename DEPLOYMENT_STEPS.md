# 🚀 دليل النشر النهائي — API Hunter AI (Vercel فقط، 0$)

> **البنية المعتمدة:** موقع Next.js + بوت تليجرام بوضع Webhook يعملان على **Vercel** (مجاناً)،
> البيانات على **Supabase**، وجولات الاصطياد المجدولة على **GitHub Actions** (مجاناً للمستودعات العامة).
> لا حاجة إلى Render ولا إلى أي سيرفر دائم.

| العنصر | الحالة |
|---|---|
| مستودع GitHub | `alsalahiomarm/API-Hunter-AI` — https://github.com/alsalahiomarm/API-Hunter-AI |
| مشروع Vercel | `lolomama/api-hunter-ai` → **https://api-hunter-ai.vercel.app** |
| مسار تحديثات البوت | `POST /api/bot` (محمي بـ `BOT_WEBHOOK_SECRET`) ✅ منشور |
| مسار نشر القناة | `GET/POST /api/cron/broadcast` (محمي بـ `CRON_SECRET`) ✅ منشور |
| جولة الاصطياد | `.github/workflows/hunt.yml` — كل 6 ساعات ✅ نشط |
| ربط الويب هوك آلياً | `.github/workflows/webhook.yml` + `npm run webhook:set` ✅ |
| أسرار GitHub | `TELEGRAM_BOT_TOKEN`, `BOT_WEBHOOK_SECRET`, `CRON_SECRET`, `GEMINI_API_KEY` ✅ |
| **المتبقي** | إضافة **`DATABASE_URL`** من Supabase (3 مواضع: `.env` + Vercel + GitHub) |

---

## 1️⃣ ربط Supabase (الخطوة الوحيدة المتبقية)

1. افتح مشروعك في [supabase.com](https://supabase.com) (ref: `azhpxctczaledmttmvzm`).
2. **Project Settings → Database → Connection string → URI** وانسخ الرابط مع كلمة المرور.
3. تأكد من إضافة `?schema=public` في نهاية الرابط إن لم تكن موجودة.
4. ضعه في `.env` محلياً ثم شغّل:

```bash
npm run env:check     # يجب أن يظهر: ✅ الاتصال بقاعدة البيانات ناجح
npm run draw:seed     # ينشئ الجداول (prisma db push) + يزرع البيانات التجريبية
npm run hunt:once -- --sources=github-public-apis --limit=5   # جولة تجريبية حقيقية
```

5. حدّث النسخ السحابية:

```bash
# Vercel
vercel env rm DATABASE_URL production -y
vercel env add DATABASE_URL production     # الصق الرابط ثم Enter
vercel --prod --yes

# GitHub Actions (سِرّ للمحرك والعمل المجدول)
gh secret set DATABASE_URL
```

> 💡 بديل: أي PostgreSQL مجاني آخر (Neon / Supabase) يعمل بنفس الطريقة.

---

## 2️⃣ متغيرات البيئة (مرجع كامل)

| المتغير | محلي `.env` | Vercel | GitHub Actions |
|---|---|---|---|
| `DATABASE_URL` | ✅ | سِرّ | سِرّ |
| `GEMINI_API_KEY` | ✅ | سِرّ | سِرّ ✅ مضبوط |
| `GEMINI_MODEL` | ✅ | سِرّ | متغير ✅ مضبوط |
| `TELEGRAM_BOT_TOKEN` | ✅ | سِرّ | سِرّ ✅ مضبوط |
| `TELEGRAM_CHANNEL_ID` | ✅ | سِرّ | — |
| `TELEGRAM_ADMIN_IDS` | ✅ | سِرّ | — |
| `BOT_POLLING` | `false` | `false` | — |
| `BOT_WEBHOOK_URL` | ✅ | ✅ | متغير ✅ مضبوط |
| `BOT_WEBHOOK_SECRET` | ✅ | سِرّ | سِرّ ✅ مضبوط |
| `CRON_SECRET` | ✅ | سِرّ | سِرّ ✅ مضبوط |
| `AGENT_CONCURRENCY` | `2` | — | داخل سير العمل |
| `AI_MAX_ATTEMPTS` | `3` | — | داخل سير العمل |

> ⚠️ لا ترفع `.env` إلى Git أبداً (مستثنى في `.gitignore`).

---

## 3️⃣ ربط الويب هوك تلقائياً (بعد كل نشر)

السكربت جاهز ويُستدعى آلياً من سير عمل GitHub عند أي تعديل على مسار البوت:

```bash
npm run webhook:set                 # ربط الويب هوك برابط Vercel
npm run webhook:set -- --wait       # انتظار اكتمال النشر ثم الربط (يستخدمه الـ CI)
npm run webhook:info                # عرض الحالة وعدد التحديثات المعلّقة
npm run webhook:delete              # إلغاء الربط (للعودة إلى Polling محلي)
```

التحقق من نجاح الربط: يفتح `npm run webhook:info` ويجب أن يظهر
`URL: https://api-hunter-ai.vercel.app/api/bot` و `لا أخطاء مسجّلة`. ثم أرسل `/start` للبوت
في تليجرام وسيجيب مباشرة (بدون تشغيل أي جهاز).

---

## 4️⃣ تجهيز القناة + المدير (مرة واحدة)

```bash
npm run bootstrap
```

يقوم بـ: التحقق من البوت والقناة، رفع حسابك (`1665333044`) إلى **مدير القناة** إن أمكن،
وإرسال رسالة ترحيب إلى القناة. إن ظهر خطأ صلاحيات:
افتح القناة → **إدارة → المدراء → إضافة مدير → `@API_HUNTER_AIbot`**.

للتجربة الآمنة قبل النشر الفعلي للقناة (بدون إرسال أي رسالة):

```bash
# قائمة ما سيُنشر فقط
curl "https://api-hunter-ai.vercel.app/api/cron/broadcast?dry=1&secret=$CRON_SECRET"

# نشر دفعة محدودة (خدمة واحدة مثلاً) لتجنب الإغراق
curl -X POST "https://api-hunter-ai.vercel.app/api/cron/broadcast?limit=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```
---

## 5️⃣ التشغيل المحلي (تطوير فقط)

> ⚠️ لا يمكن تشغيل Webhook و Polling في الوقت نفسه لنفس البوت (يظهر خطأ
> `409 Conflict: can't use getUpdates method while webhook is active`).

```bash
npm run webhook:delete     # ألغِ الربط مؤقتاً
npm run bot                # شغّل البوت محلياً بوضع Polling
# ... انتهيت من التطوير:
npm run webhook:set        # أعد الربط برابط Vercel
```

بيئة التطوير للموقع:

```bash
npm run dev:web            # http://localhost:3000
npm run dev:agent          # المحرك بوضع الجدولة محلياً
```

---

## 6️⃣ (اختياري) Render — للراغبين بالدفع فقط

Render لا توفّر خطة Free للـ Background Workers (تبدأ ~$7/شهر لكل خدمة).
إن أردت تشغيل البوت بـ **Polling** على Render بدل الويب هوك:
`render.yaml` جاهز → **New → Blueprint → اختر المستودع → Apply** ثم أضف الأسرار.
في هذه الحالة يجب تشغيل `BOT_POLLING=true` وحذف الويب هوك: `npm run webhook:delete`.

---

## ✅ فحص ما بعد النشر

| العنصر | الأمر / الطريقة | النتيجة المتوقعة |
|---|---|---|
| الموقع | افتح https://api-hunter-ai.vercel.app | لوحة الخدمات تعمل (200) |
| صحة مسار البوت | `curl https://api-hunter-ai.vercel.app/api/bot` | `{"ok":true,"mode":"webhook",...}` |
| ربط الويب هوك | `npm run webhook:info` | `URL: .../api/bot` و«لا أخطاء مسجّلة» |
| حماية المسار | `curl -X POST .../api/bot` (بدون سرّ) | `401 unauthorized` |
| البوت | أرسل `/start` لـ `@API_HUNTER_AIbot` | يرد بالقائمة ولوحة التصنيفات |
| القناة | `curl ".../api/cron/broadcast?dry=1&secret=$CRON_SECRET"` | قائمة الخدمات المعلّقة |
| النشر للقناة | `curl -X POST ".../api/cron/broadcast?limit=1" -H "Authorization: Bearer $CRON_SECRET"` | `{"ok":true,"published":1}` |
| المحرك | GitHub → Actions → «Hunt» | جولة ناجحة كل 6 ساعات |
| البيانات | `npm run env:check` | `✅ الاتصال بقاعدة البيانات ناجح` |

---

## 🛠️ حل المشاكل الشائعة

| المشكلة | السبب | الحل |
|---|---|---|
| `409 Conflict: can't use getUpdates and webhook together` | تشغيل Polling مع ويب هوك مفعّل | `npm run webhook:delete` قبل `npm run bot` |
| `/api/bot` يرد `401` | سرّ الويب هوك غير مطابق | تأكد أن `BOT_WEBHOOK_SECRET` نفسه في `.env` و Vercel و GitHub ثم `npm run webhook:set` |
| القناة لا تستقبل منشورات | البوت ليس مديراً في القناة | إدارة القناة → المدراء → إضافة `@API_HUNTER_AIbot` (مع صلاحية النشر) |
| `chat not found` عند الرد على المستخدم | المستخدم لم يبدأ البوت بعد | افتح `@API_HUNTER_AIbot` واضغط **Start** |
| الموقع يعرض بيانات تجريبية فقط | `DATABASE_URL` غير مضبوط/غير صحيح | نفّذ الخطوة 1️⃣ ثم `vercel env add DATABASE_URL production` وأعد النشر |
| فشل تحليل AI (`429`/`503`) | حصة Gemini المجانية (طلبات/دقيقة) | يعمل تلقائياً بالوضع القواعدي؛ خفّض `AGENT_CONCURRENCY` وارفع `AI_MAX_ATTEMPTS` |
| `prisma client not generated` | لم يُنشأ العميل بعد التثبيت | `npm run db:generate` |

> 💡 كل الأسرار تُدار من `.env` محلياً، ومن **Vercel → Settings → Environment Variables**،
> ومن **GitHub → Settings → Secrets and variables → Actions**. لا تُكتب أي مفاتيح في الملفات المرفوعة.