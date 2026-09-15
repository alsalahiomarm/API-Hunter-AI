/**
 * إدارة Webhook بوت تليجرام (بديل مجاني كامل عن Polling على Render/VPS)
 *
 * الاستخدام:
 *   npm run webhook:set                 # ربط الويب هوك برابط Vercel
 *   npm run webhook:set -- --wait       # انتظار جاهزية النشر ثم الربط
 *   npm run webhook:set -- --url=https://my-app.vercel.app
 *   npm run webhook:info                # عرض حالة الويب هوك
 *   npm run webhook:delete              # إلغاء الربط (للعودة لوضع Polling المحلي)
 *
 * المتغيرات المطلوبة:
 *   TELEGRAM_BOT_TOKEN   (إلزامي)
 *   BOT_WEBHOOK_SECRET   (مُستحسن لقوة الأمان)
 *   BOT_WEBHOOK_URL      (أو NEXT_PUBLIC_APP_URL) رابط النشر
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

const rootEnv = resolve(process.cwd(), ".env");
if (existsSync(rootEnv)) loadEnv({ path: rootEnv, quiet: true });

const DEFAULT_BASE_URL = "https://api-hunter-ai.vercel.app";
const WEBHOOK_PATH = "/api/bot";

const args = process.argv.slice(2);
const command = (args.find((a) => !a.startsWith("--")) ?? "set").toLowerCase();
const hasFlag = (name: string) => args.includes(`--${name}`);
const flagValue = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function requireToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.error(
      "❌ TELEGRAM_BOT_TOKEN غير محدد. أضفه إلى ملف .env أو إلى متغيرات البيئة."
    );
    process.exit(1);
  }
  return token;
}

function resolveBaseUrl(): string {
  const raw =
    flagValue("url") ??
    process.env.BOT_WEBHOOK_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

async function callTelegram<T>(token: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : "{}",
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram ${method} فشل: ${data.description ?? res.status}`);
  }
  return data.result as T;
}

/** انتظار أن يكون مسار /api/bot منشوراً فعلاً قبل الربط */
async function waitForDeployment(baseUrl: string, attempts = 20, delayMs = 15000) {
  console.log(`⏳ انتظار جاهزية النشر على ${baseUrl}${WEBHOOK_PATH} ...`);
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(`${baseUrl}${WEBHOOK_PATH}`, {
        headers: { "cache-control": "no-cache" },
      });
      if (res.ok) {
        const data = (await res.json()) as { ok?: boolean };
        if (data?.ok) {
          console.log(`   ✅ النشر جاهز (المحاولة ${i}).`);
          return true;
        }
      }
      console.log(`   … المحاولة ${i}: الرد ${res.status} — إعادة بعد ${delayMs / 1000}ث`);
    } catch (err) {
      console.log(`   … المحاولة ${i}: ${(err as Error).message}`);
    }
    await sleep(delayMs);
  }
  console.warn("   ⚠️ انتهت المحاولات دون تأكيد الجاهزية — سيتم الربط على أي حال.");
  return false;
}

async function setWebhook() {
  const token = requireToken();
  const baseUrl = resolveBaseUrl();
  const secret = process.env.BOT_WEBHOOK_SECRET?.trim() ?? "";
  const url = `${baseUrl}${WEBHOOK_PATH}`;

  if (hasFlag("wait")) await waitForDeployment(baseUrl);

  console.log(`🔗 ربط الويب هوك بـ: ${url}`);
  await callTelegram(token, "setWebhook", {
    url,
    secret_token: secret || undefined,
    allowed_updates: ["message", "edited_message", "callback_query", "channel_post"],
    drop_pending_updates: hasFlag("drop-pending"),
  });
  console.log("   ✅ تم الربط.");

  // قائمة الأوامر داخل تليجرام (تجربة استخدام أفضل)
  await callTelegram(token, "setMyCommands", {
    commands: [
      { command: "start", description: "رسالة البداية" },
      { command: "latest", description: "آخر 3 خدمات مكتشفة" },
      { command: "search", description: "بحث مباشر عن خدمة" },
      { command: "categories", description: "تصفح حسب التصنيف" },
      { command: "help", description: "المساعدة" },
    ],
  }).catch((err) => console.warn("   ⚠️ تعذّر ضبط قائمة الأوامر:", (err as Error).message));
  console.log("   ✅ تم ضبط قائمة أوامر البوت.");

  await showInfo(token);
}

type WebhookInfo = {
  url?: string;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  ip_address?: string;
};

async function showInfo(token: string) {
  const info = await callTelegram<WebhookInfo>(token, "getWebhookInfo");
  console.log("");
  console.log("📋 حالة الويب هوك:");
  console.log(`   URL               : ${info.url || "(غير مربوط)"}`);
  console.log(`   تحديثات معلّقة    : ${info.pending_update_count ?? 0}`);
  if (info.ip_address) console.log(`   IP                : ${info.ip_address}`);
  if (info.last_error_message) {
    console.log(
      `   ⚠️ آخر خطأ        : ${info.last_error_message} (${
        info.last_error_date ? new Date(info.last_error_date * 1000).toLocaleString("ar-EG") : "-"
      })`
    );
  } else {
    console.log("   ✅ لا أخطاء مسجّلة.");
  }
}

async function main() {
  if (command === "info") {
    const token = requireToken();
    await showInfo(token);
    return;
  }

  if (command === "delete") {
    const token = requireToken();
    await callTelegram(token, "deleteWebhook", { drop_pending_updates: hasFlag("drop-pending") });
    console.log("🗑️ تم إلغاء ربط الويب هوك — البوت جاهز للعمل بوضع Polling محلي (npm run bot).");
    await showInfo(token);
    return;
  }

  if (command !== "set") {
    console.error(`❌ أمر غير معروف: ${command}. استخدم: set | info | delete`);
    process.exit(1);
  }

  await setWebhook();
}

main().catch((err) => {
  console.error("❌ فشل تنفيذ الأمر:", (err as Error).message);
  process.exit(1);
});