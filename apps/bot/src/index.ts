import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";
import { Telegraf } from "telegraf";
import { registerCommands } from "./commands";
import { publishPendingToChannel } from "./broadcaster";

// ----------------------------------------------------------
// تحميل البيئة من apps/bot ثم من جذر المشروع
// ----------------------------------------------------------
const cwdEnv = resolve(process.cwd(), ".env");
const rootEnv = resolve(process.cwd(), "../../.env");
loadEnv({ path: cwdEnv, quiet: true });
if (existsSync(rootEnv)) loadEnv({ path: rootEnv, quiet: true });

// ----------------------------------------------------------
// فحص توفر المفاتيح الأساسية (رسائل إرشادية في الـ Console)
// ----------------------------------------------------------
function printEnvStatus() {
  const checks: Array<{ key: string; ok: boolean; hint: string }> = [
    {
      key: "TELEGRAM_BOT_TOKEN",
      ok: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
      hint: "أنشئ البوت عبر @BotFather وضع التوكن في .env",
    },
    {
      key: "TELEGRAM_CHANNEL_ID",
      ok: Boolean(process.env.TELEGRAM_CHANNEL_ID?.trim()),
      hint: "معرف القناة الرقمي: من @userinfobot أو بصيغة -100xxxxxxxxxx",
    },
    {
      key: "DATABASE_URL",
      ok: Boolean(process.env.DATABASE_URL?.trim()),
      hint: "رابط Supabase: Project Settings -> Connection string (مع ?schema=public)",
    },
    {
      key: "GEMINI_API_KEY",
      ok: Boolean(process.env.GEMINI_API_KEY?.trim()),
      hint: "مفتاح مجاني من https://aistudio.google.com/apikey",
    },
  ];
  console.log("");
  console.log("🔎 فحص مفاتيح البيئة (env):");
  for (const c of checks) {
    if (c.ok) console.log(`   ✅ ${c.key}`);
    else console.log(`   ❌ ${c.key} — غير محدد. ${c.hint}`);
  }
  console.log("");
}

function envOrThrow(name: string): string {
  const v = process.env[name]?.trim();
  if (v) return v;
  console.error(`❌ المتغير ${name} غير محدد. انسخ .env.example إلى .env`);
  process.exit(1);
}

const BOT_TOKEN = envOrThrow("TELEGRAM_BOT_TOKEN");
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID?.trim() ?? "";
const POLL_SECONDS = Math.max(Number(process.env.BOT_CHANNEL_POLL_SECONDS ?? 300), 20);

async function main() {
  printEnvStatus();
  const bot = new Telegraf(BOT_TOKEN);

  // الأوامر والرسائل الحرة
  registerCommands(bot);

  // رسالة احتياطية للمحتوى غير النصي
  bot.on("message", async (ctx) => {
    if (ctx.message && "text" in ctx.message) return;
    await ctx.reply(
      "أعتذر، أدعم النصوص فقط 📝. جرّب: /latest أو اكتب «مفتاح للبحث في الإنترنت»"
    );
  });

  // بدء الحلقية
  const usePolling = process.env.BOT_POLLING !== "false";
  try {
    await bot.telegram.getMe();
  } catch (err) {
    console.error(
      "❌ تعذّر الاتصال بتليجرام - تحقق من التوكن:",
      (err as Error).message
    );
    process.exit(1);
  }

  if (usePolling) {
    await bot.launch();
    console.log("✅ البوت يعمل بوضع Polling");
  } else {
    const secret = process.env.BOT_WEBHOOK_SECRET ?? "apihunter-secret";
    await bot.launch({
      webhook: {
        domain: process.env.BOT_WEBHOOK_URL ?? "",
        secretToken: secret,
      },
    });
    console.log("✅ البوت يعمل بوضع Webhook");
  }

  // نشر القناة الدوري: فحص كل POLL_SECONDS للخدمات الجديدة
  if (CHANNEL_ID) {
    console.log(`📣 مذياع القناة مفعّل: فحص كل ${POLL_SECONDS} ثانية.`);
    const tick = async () => {
      const n = await publishPendingToChannel(bot, CHANNEL_ID);
      if (n > 0) console.log(`📨 المنشورات الجديدة المرسلة: ${n}`);
    };
    await tick();
    setInterval(tick, POLL_SECONDS * 1000);
  } else {
    console.warn("⚠️ TELEGRAM_CHANNEL_ID غير محدد - النشر للقناة متوقف.");
  }

  // إيقاف لطيف
  const shutdown = () => {
    console.log("\n👋 إيقاف البوت...");
    bot.stop();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("❌ خطأ عام:", err);
  process.exit(1);
});