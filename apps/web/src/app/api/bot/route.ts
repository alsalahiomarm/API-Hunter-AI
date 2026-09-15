import { NextRequest, NextResponse } from "next/server";
import { getBot } from "@apihunter/bot-core";

/**
 * نقطة استقبال تحديثات تليجرام (Webhook) — تعمل على Vercel مجاناً.
 * تُربط بالأمر:  npm run webhook:set
 *
 * الحماية: تليجرام يرسل هيدر x-telegram-bot-api-secret-token المطابق لـ BOT_WEBHOOK_SECRET.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1) التحقق من السر (إن كان معرّفاً)
  const expected = process.env.BOT_WEBHOOK_SECRET?.trim();
  if (expected) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expected) {
      console.warn("[api/bot] طلب مرفوض: سرّ الويب هوك غير مطابق.");
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  // 2) التأكد من وجود توكن البوت
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN غير محدد في متغيرات Vercel" },
      { status: 500 }
    );
  }

  try {
    const update = await req.json();
    const bot = await getBot();
    // Telegraf يجلب botInfo تلقائياً عند أول تحديث (مصمّم للبيئات بلا حالة)
    await bot.handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/bot] فشل تنفيذ التحديث:", (err as Error).message);
    // نُعيد 200 لتفادي إعادة إرسال لانهائية من تليجرام عند خطأ منطقي داخلي
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}

/** فحص سريع للصحة: هل المسار مربوط والعمل جاهز؟ */
export async function GET() {
  const botUser = process.env.TELEGRAM_BOT_TOKEN?.trim() ? "configured" : "missing";
  return NextResponse.json({
    ok: true,
    endpoint: "/api/bot",
    mode: "webhook",
    botToken: botUser,
    secretProtected: Boolean(process.env.BOT_WEBHOOK_SECRET?.trim()),
    channel: process.env.TELEGRAM_CHANNEL_ID?.trim() ? "configured" : "missing",
    database: process.env.DATABASE_URL?.trim() ? "configured" : "missing",
  });
}