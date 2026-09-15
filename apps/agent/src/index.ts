import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";
import { runHunt } from "./hunter";
import { startScheduler } from "./scheduler";
import { isAIConfigured } from "./analyzer";

// ----------------------------------------------------------
// تحميل متغيرات البيئة من apps/agent ثم من جذر المشروع
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
      key: "DATABASE_URL",
      ok: Boolean(process.env.DATABASE_URL?.trim()),
      hint: "رابط Supabase: Project Settings -> Connection string (مع ?schema=public)",
    },
    {
      key: "GEMINI_API_KEY",
      ok: Boolean(process.env.GEMINI_API_KEY?.trim()),
      hint: "مفتاح مجاني من https://aistudio.google.com/apikey أو OPENAI_API_KEY لبديل آخر",
    },
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
  ];
  console.log("");
  console.log("🔎 فحص مفاتيح البيئة (env):");
  for (const c of checks) {
    if (c.ok) console.log(`   ✅ ${c.key}`);
    else console.log(`   ❌ ${c.key} — غير محدد. ${c.hint}`);
  }
  console.log("");
}

// ----------------------------------------------------------
// قراءة وسائط سطر الأوامر
// ----------------------------------------------------------
function parseFlags() {
  const args = process.argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [k, v] = arg.slice(2).split("=");
      flags[k] = v === undefined ? true : v;
    }
  }
  return flags;
}

async function main() {
  printEnvStatus();
  const flags = parseFlags();
  const sources = flags.sources ? String(flags.sources).split(",") : undefined;
  const maxEntries = flags.limit ? Number(flags.limit) : undefined;

  const cfg = {
    sources,
    maxEntries,
    skipLinkCheck: flags["skip-link-check"] === true,
    concurrency: Number(flags.concurrency ?? process.env.AGENT_CONCURRENCY ?? 4) || 4,
  };

  console.log("");
  console.log("   █████╗ ██████╗ ██╗    ██╗   ██╗███╗   ██╗████████╗███████╗██████╗");
  console.log("  ██╔══██╗██╔══██╗██║    ██║   ██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗");
  console.log("  ███████║██████╔╝██║ █╗ ██║   ██║██╔██╗ ██║   ██║   █████╗  ██████╔╝");
  console.log("  ██╔══██║██╔═══╝ ██║███╗██║   ██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗");
  console.log("  ██║  ██║██║     ╚███╔███╔╝██╗██║ ╚████║   ██║   ███████╗██║  ██║");
  console.log("  ╚═╝  ╚═╝╚═╝      ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝");
  console.log("   API Hunter AI - محرك الاصطياد الذكي v1.0");
  console.log("");

  const aiOn = isAIConfigured();
  console.log(`🧠 وضع التحليل: ${aiOn ? `الذكاء الاصطناعي (${process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || "gpt-4o-mini"})` : "قواعدي (Heuristic)"}`);
  console.log(`🗄️  قاعدة البيانات: ${process.env.DATABASE_URL ? "متاحة (Prisma/PostgreSQL)" : "غير محددة - تخزين ملف محلي"}`);
  console.log("");

  if (flags["schedule"] === true || flags.schedule) {
    const hours = flags.hours ? Number(flags.hours) : Number(process.env.AGENT_SCHEDULE_HOURS ?? 6);
    startScheduler(hours, cfg);
    return; // المجدول يبقي العملية حية
  }

  // وضع التشغيل لمرة واحدة
  await runHunt(cfg);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ خطأ عام:", e);
  process.exit(1);
});