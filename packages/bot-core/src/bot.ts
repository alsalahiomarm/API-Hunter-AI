import { Telegraf } from "telegraf";
import { registerCommands } from "./commands";

/**
 * مصنع البوت المشترك بين الوضعين:
 *  - محلي:  apps/bot (Polling أو Webhook عبر telegraf.launch)
 *  - سحابي: apps/web/src/app/api/bot (Webhook على Vercel عبر handleUpdate)
 */

let cached: Telegraf | null = null;

/** إنشاء نسخة جديدة من البوت مع تسجيل كل الأوامر والمعالجات */
export function createBot(token?: string): Telegraf {
  const t = (token ?? process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!t) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN غير محدد — أنشئ البوت عبر @BotFather وضع التوكن في متغيرات البيئة."
    );
  }

  const bot = new Telegraf(t);

  // الأوامر والرسائل الحرة
  registerCommands(bot);

  // رسالة احتياطية للمحتوى غير النصي
  bot.on("message", async (ctx) => {
    if (ctx.message && "text" in ctx.message) return;
    await ctx.reply(
      "أعتذر، أدعم النصوص فقط . جرّب: /latest أو اكتب «مفتاح للبحث في الإنترنت»"
    );
  });

  return bot;
}

/**
 * نسخة مُخزَّنة مؤقتاً (Cache) للاستخدام في بيئة بلا حالة (Serverless)،
 * لتجنب إعادة تهيئة البوت مع كل طلب وارد من تليجرام.
 */
export async function getBot(): Promise<Telegraf> {
  if (!cached) cached = createBot();
  return cached;
}