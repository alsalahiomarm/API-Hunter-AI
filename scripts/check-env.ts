/**
 * فحص سريع لمتغيرات البيئة الأساسية في جذر المشروع.
 * التشغيل: npm run env:check
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// تحميل .env من جذر المشروع (أو من مجلد العمل الحالي)
const rootEnv = resolve(process.cwd(), ".env");
if (existsSync(rootEnv)) loadEnv({ path: rootEnv, quiet: true });
const cwdEnv = resolve(process.cwd(), ".env");
loadEnv({ path: cwdEnv, quiet: true });

const KEY_HINTS: Record<string, string> = {
  DATABASE_URL:
    "رابط Supabase من Project Settings -> Database -> Connection string (أضف ?schema=public)",
  GEMINI_API_KEY: "مفتاح مجاني من https://aistudio.google.com/apikey",
  TELEGRAM_BOT_TOKEN: "أنشئ البوت عبر @BotFather وضع التوكن في .env",
  TELEGRAM_CHANNEL_ID:
    "معرف القناة الرقمي: من @userinfobot أو بصيغة -100xxxxxxxxxx",
  TELEGRAM_ADMIN_IDS: "معرف (uid) المالك/المدير للبوت والقناة",
};

console.log("🔎 فحص متغيرات البيئة (.env):");
let missing = 0;

for (const [key, hint] of Object.entries(KEY_HINTS)) {
  const v = process.env[key]?.trim();
  if (v) {
    const safe =
      /TOKEN|KEY|SECRET|URL/i.test(key) ? "…مُعيّن…" : v.slice(0, 24);
    console.log(`   ✅ ${key} = ${safe}`);
  } else {
    console.log(`   ❌ ${key} — غير محدد. ${hint}`);
    missing++;
  }
}

if (missing) {
  console.log(`\n⚠️ يوجد ${missing} متغير ناقص. أكمل ملف .env ثم أعد التشغيل.`);
  console.log("   انسخ القالب:  copy .env.example .env");
  process.exit(1);
}

console.log("\n✔ جميع المتغيرات الأساسية موجودة. يمكنك مواصلة التجهيز.");