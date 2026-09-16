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
}

// ----------------------------------------------------------
// فحوصات اتصال حقيقية (قاعدة البيانات + مزود الذكاء الاصطناعي)
// ----------------------------------------------------------
async function checkDatabase() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;
  if (/@(localhost|127\.0\.0\.1)/i.test(url)) {
    console.log(
      "   ℹ️ DATABASE_URL يشير إلى localhost — شغّل قاعدة محلية (docker compose up -d) أو ضع رابط Supabase."
    );
  }
  try {
    const db = await import("@apihunter/db");
    await db.prisma.$queryRaw`SELECT 1`;
    console.log("   ✅ الاتصال بقاعدة البيانات ناجح (PostgreSQL).");
    try {
      const total = await db.prisma.apiService.count();
      console.log(`   📦 عدد الخدمات المخزنة حالياً: ${total}`);
      if (total === 0) console.log("   ℹ️ الجداول فارغة — نفّذ:  npm run draw:seed");
    } catch {
      console.log("   ⚠️ الجداول غير موجودة بعد — نفّذ:  npm run draw:seed");
    }
  } catch (err) {
    const msg = (err as Error).message.split("\n").filter(Boolean).slice(-1)[0] ?? "";
    console.log(`   ❌ تعذّر الاتصال بقاعدة البيانات: ${msg}`);
  }
}

async function checkAiProvider() {
  const gemini = process.env.GEMINI_API_KEY?.trim();
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (!gemini && !openai) return;

  if (gemini) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(gemini)}`
      );
      if (res.ok) {
        const data = (await res.json()) as { models?: unknown[] };
        console.log(
          `   ✅ مفتاح Gemini صالح (${data.models?.length ?? 0} نموذج متاح) — وضع التحليل: AI`
        );
      } else {
        console.log(`   ❌ مفتاح Gemini مرفوض (HTTP ${res.status}) — راجع GEMINI_API_KEY.`);
      }
    } catch (err) {
      console.log(`   ⚠️ تعذّر التحقق من مفتاح Gemini: ${(err as Error).message}`);
    }
  } else {
    console.log("   ℹ️ OPENAI_API_KEY مُعيَّن — سيُستخدم مزود OpenAI المتوافق للتحليل الذكي.");
  }

  // فحص المزوّدين المتعددين (طبقة الذكاء الاصطناعي الجديدة)
  const bc = await (async () => {
    try {
      return await import("@apihunter/bot-core");
    } catch {
      return null;
    }
  })();
  if (bc) {
    try {
      const providers = await bc.probeAiProviders();
      if (providers.length) {
        console.log("   ⚙️  المزوّدون المتعددون (طلب/صلاحية):");
        for (const p of providers) {
          console.log(
            `      ${p.ok ? "✅" : "⚠️"} ${p.provider.padEnd(12)} ${p.detail}${p.ok ? "" : " — سيُتخطَّى تلقائياً"}`)
          ;
        }
      }
    } catch (err) {
      console.log(`   ⚠️ تعذّر فحص المزوّدين المتعددين: ${(err as Error).message}`);
    }
  }
}

async function main() {
  await checkDatabase();
  await checkAiProvider();

  if (missing) process.exit(1);

  console.log("\n✔ جميع المتغيرات الأساسية موجودة. يمكنك مواصلة التجهيز.");
}

main().catch((err) => {
  console.error("❌ فشل الفحص:", err);
  process.exit(1);
});