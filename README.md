# 🪤 API Hunter AI

منصة متكاملة **وكيل ذكاء اصطناعي لاصطياد مفاتيح الـ API المجانية** + موقع ويب تفاعلي + بوت وقناة تليجرام.

| المكوّن | التقنية |
|---|---|
| 🖥️ الموقع (لوحة التحكم) | Next.js 15 (App Router) + Tailwind CSS + Lucide Icons |
| 🦾 محرك الاصطياد | Node.js/TypeScript + Playwright + OpenAI/Gemini للتحليل |
| 🗄️ قاعدة البيانات | Supabase (PostgreSQL) + Prisma ORM |
| ✈️ البوت والقناة | Telegraf — وضع **Webhook على Vercel** أو Polling محلي |
| ☁️ الاستضافة | **Vercel** (الموقع + بوت الويب هوك) — مجاني 100% |
| ⏰ الاصطياد المجدول | **GitHub Actions** كل 6 ساعات — مجاني للمستودعات العامة |

---

## 🧱 بنية المشروع (Monorepo)

```
API-HunterAI/
├── apps/
│   ├── web/        # موقع Next.js + مسار Webhook البوت (app/api/bot) + مسار نشر القناة
│   ├── agent/      # الوكيل: كشط + تحليل ذكي + تحقق + حفظ
│   └── bot/        # مغلّف تشغيل البوت محلياً (Polling / Webhook)
├── packages/
│   ├── db/         # Prisma Schema + عميل البيانات + بيانات بذر
│   └── bot-core/   # المنطق المشترك للبوت (أوامر + NLU + تنسيق + نشر القناة)
├── scripts/        # check-env + bootstrap-channel + set-webhook
└── .github/workflows/  # hunt (كل 6 ساعات) + webhook (ربط تلقائي بعد النشر)
```

---

## 🚀 التثبيت والتشغيل (خطوة بخطوة)

### 0) المتطلبات
- Node.js **>= 18.18** (اختُبر على v24)
- npm أو pnpm
- Docker (اختياري لقاعدة محلية) أو حساب **Supabase** المجاني

### 1) تثبيت الاعتماديات

```bash
npm install
```

### 2) إعداد قاعدة البيانات

**الخيار A - قاعدة محلية عبر Docker:**
```bash
docker compose up -d postgres
```
سيُشغّل PostgreSQL على `localhost:5432` بالمستخدم `apihunter`.

**الخيار B - Supabase السحابي:**
1. أنشئ مشروعاً مجانياً من [supabase.com](https://supabase.com).
2. من `Project Settings → Database → Connection string` انسخ رابط **Pooler** (Session 5432 للـ `db push`/الزرع، وTransaction 6543 للتشغيل على Vercel/GitHub).
3. أسهل طريقة للربط: `npm run db:link -- "postgresql://..."` → يتولّى `.env` + Vercel + GitHub + `draw:seed` بأمر واحد.

ثم انسخ ملف البيئة واملأه:
```bash
copy .env.example .env   # Windows
cp .env.example .env     # Linux/Mac
```
وحّد قيمة `DATABASE_URL` في `.env` (الجذر يقرؤه المحرك والبوت؛ والموقع يقرأ `apps/web/.env`).

توليد عميل Prisma وإنشاء الجداول وبذر البيانات التجريبية:
```bash
npm run db:generate
npm run db:push          # أو npm run db:migrate
npm run db:seed
```

### 3) تشغيل الموقع (لوحة التحكم)

```bash
copy apps\web\.env.example apps\web\.env   # إن لم تعمل بالجذر
npm run dev:web
```
افتح [http://localhost:3000](http://localhost:3000).

> بدون قاعدة بيانات؟ لا مشكلة: الموقع يعرض **البيانات التجريبية** تلقائياً.

### 4) تشغيل محرك الاصطياد (Hunter Agent)

جولة واحدة:
```bash
npm run hunt:once
```

أو وضع الجدولة اليومية (كل `AGENT_SCHEDULE_HOURS` ساعة):
```bash
npm run hunt
```

خيارات إضافية:
```bash
npm run hunt:once -- --sources=github-public-apis,hn-free-api --limit=10 --skip-link-check
```

> **وضعا التحليل:**
> - بدون مفاتيح AI: يعمل المحرك بوضع **Heuristic** (استخراج قواعدي).
> - مع `OPENAI_API_KEY` أو `GEMINI_API_KEY` في `.env`: تحليل ذكي كامل بالـ JSON.

> ⚠️ أول استخدام مع Playwright قد يحتاج تثبيت المتصفح: `npx playwright install chromium`

### 5) تشغيل بوت تليجرام والقناة

1. أنشئ البوت من [@BotFather](https://t.me/BotFather) واحصل على **التوكن**.
2. أنشئ قناة، أضف البوت كمدير فيها، واحصل على معرفها:
   - أرسل رسالة لأي بوت مثل [@userinfobot](https://t.me/userinfobot) لتحصل على `id` الرقمي الموجب.
   - أو استخدم `@RawDataBot` لقراءة `chat.id` الخاص بالقناة.
3. املأ في `.env`:

```env
TELEGRAM_BOT_TOKEN="123456:AAF-..."
TELEGRAM_CHANNEL_ID="123456789"        # أو -100123456789 للخاصة
BOT_POLLING="false"                    # false = Webhook على Vercel | true = Polling محلي
BOT_WEBHOOK_URL="https://api-hunter-ai.vercel.app"
BOT_WEBHOOK_SECRET="سلسلة-عشوائية"
CRON_SECRET="سلسلة-عشوائية"
BOT_CHANNEL_POLL_SECONDS="300"
```

4. شغّل البوت:

**محلياً (Polling):**
```bash
npm run webhook:delete   # تأكد أنه لا يوجد ويب هوك مفعّل (وإلا ظهر 409 Conflict)
npm run bot
```

**سحابياً على Vercel (Webhook — مثالي للمجاني 24/7 بدون جهاز):**
```bash
vercel --prod --yes          # انشر الموقع (فيه مسار /api/bot)
npm run webhook:set -- --wait # اربط تليجرام بالمسار
npm run webhook:info          # تحقق: URL + «لا أخطاء مسجّلة»
```

الآن:
- 📣 أي خدمة جديدة يكتشفها الوكيل **تُنشر تلقائياً للقناة** خلال دقائق.
- 💬 في المحادثة الخاصة جرّب: `/latest`، `/search gemini`، `/categories`، أو اكتب بحرية:
  - «أريد مفتاح API مجاني للبحث في شبكة الإنترنت»
  - «أعطني أفضل مفتاح لنموذج Gemini»

---

## 🔄 سير العمل الكامل (كيف يعمل النظام)

```mermaid
flowchart LR
    S[المصادر: GitHub / Reddit / HN / مدونات / ProductHunt] --> C[كشط Playwright + fetch]
    C --> A[التحليل الذكي AI / Heuristic]
    A --> V[الفلترة + التحقق من الروابط]
    V --> D[(Supabase / PostgreSQL)]
    D --> W[الموقع: بحث وتصفية]
    D --> B[بوت تليجرام: نشر القناة + ردود NLU]
```

---

## 🗺️ أوامر البوت

| الأمر | الوظيفة |
|---|---|
| `/start` | رسالة ترحيب + لوحة تصنيفات |
| `/latest` | آخر 3 خدمات مكتشفة |
| `/search <كلمة>` | بحث مباشر بالاسم/الشركة |
| `/categories` | تصفح حسب التصنيف بأزرار |
| رسالة حرة | فهم لغة طبيعية (عربي/إنجليزي) → أفضل 3 نتائج |

---

## ⚠️ ملاحظات قانونية وأخلاقية

- هذه الأداة **تجمع روابط وخطط مجانية معلنة رسمياً** من مواقع المزودين؛ لا تتجاوز أي نظام مصادقة.
- تفاصيل الخطط المجانية **تتغير باستمرار** – الوكيل يعيد الفحص دورياً، لكن تحقق دائماً من صفحة الأسعار الرسمية.
- استخدم المفاتيح ضمن حدود شروط خدمة كل مزود.
- البيانات التجريبية في `packages/db/src/seed-data.ts` للإيضاح فقط.

---

## 📄 أوامر سريعة في جذر المشروع

```bash
npm run dev:web      # تشغيل الموقع
npm run hunt:once    # جولة اصطياد واحدة
npm run hunt         # محرك مجدول
npm run bot          # بوت تليجرام
npm run db:generate  # توليد Prisma Client
npm run db:push      # مزامنة الجداول
npm run db:seed      # إدخال البيانات التجريبية
npm run draw:seed    # db:push + db:seed معاً
npm run db:link -- "postgresql://user:pass@host:5432/db"   # ربط قاعدة البيانات بأمر واحد (.env + Vercel + GitHub + seed)
npm run env:check    # فحص المتغيرات + اتصال قاعدة البيانات + مفتاح Gemini
npm run bootstrap    # ترقية المدير + رسالة ترحيب في القناة
npm run webhook:set  # ربط Webhook تليجرام برابط Vercel
npm run webhook:info # حالة الويب هوك
npm run webhook:delete # إلغاء الربط (للعودة إلى Polling)
```

---

## ☁️ النشر المجاني (Vercel + Supabase + GitHub Actions)

| الطبقة | المنصة | ملاحظات |
|---|---|---|
| الموقع | **Vercel** | `vercel.json` يضبط البناء والمخرجات |
| البوت | **Vercel** | مسار `POST /api/bot` لاستقبال تحديثات تليجرام |
| قاعدة البيانات | **Supabase** | PostgreSQL مجاني |
| الاصطياد الدوري | **GitHub Actions** | `.github/workflows/hunt.yml` كل 6 ساعات |
| ربط الويب هوك | **GitHub Actions** | `.github/workflows/webhook.yml` بعد كل نشر |

📘 الدليل الكامل خطوة بخطوة (مع حل المشاكل الشائعة): **[DEPLOYMENT_STEPS.md](./DEPLOYMENT_STEPS.md)**