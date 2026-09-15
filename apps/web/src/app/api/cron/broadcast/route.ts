import { NextRequest, NextResponse } from "next/server";
import {
  getBot,
  publishPendingToChannel,
  listPendingServices,
  isDatabaseReachable,
} from "@apihunter/bot-core";

/**
 * مذياع القناة: ينشر أي خدمات جديدة (لم تُنشر سابقاً) إلى قناة تليجرام.
 * يُستدعى من:
 *   - Vercel Cron يومياً (vercel.json → crons)
 *   - GitHub Actions بعد كل جولة اصطياد (كل 6 ساعات)
 *
 * الحماية: هيدر Authorization: Bearer <CRON_SECRET> (هو ما يرسله Vercel Cron تلقائياً)
 * أو الهيدر x-cron-secret، أو ?secret=... للاختبار اليدوي.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true; // بدون سرّ: مفتوح (للتجربة الأولى فقط)
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = req.headers.get("x-cron-secret") ?? "";
  const querySecret = req.nextUrl.searchParams.get("secret") ?? "";
  return [bearer, headerSecret, querySecret].some((v) => v === secret);
}

async function run(req: NextRequest) {
  const channelId = process.env.TELEGRAM_CHANNEL_ID?.trim();
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN غير محدد" },
      { status: 500 }
    );
  }
  if (!channelId) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_CHANNEL_ID غير محدد" },
      { status: 500 }
    );
  }

  const dry = ["1", "true", "yes"].includes(
    (req.nextUrl.searchParams.get("dry") ?? "").toLowerCase()
  );
  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? 0);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;

  try {
    const bot = await getBot();

    // معاينة فقط: عرض ما سيُنشر بدون إرسال أي رسالة
    if (dry) {
      const pending = await listPendingServices();
      return NextResponse.json({
        ok: true,
        dryRun: true,
        databaseReachable: await isDatabaseReachable(),
        pendingCount: pending.length,
        pending: pending.slice(0, 20).map((s) => s.name),
      });
    }

    // حماية من إغراق القناة: لا نشر بدون قاعدة بيانات (لأن منع التكرار يعتمد عليها)
    if (!(await isDatabaseReachable())) {
      return NextResponse.json(
        {
          ok: false,
          error: "قاعدة البيانات غير متاحة — تم إيقاف النشر لمنع تكرار المنشورات.",
          hint: "اضبط DATABASE_URL في متغيرات Vercel (خطوة 1️⃣ في DEPLOYMENT_STEPS.md).",
        },
        { status: 503 }
      );
    }

    const published = await publishPendingToChannel(bot, channelId, limit);
    return NextResponse.json({ ok: true, published, limit: limit ?? null, channelId });
  } catch (err) {
    console.error("[api/cron/broadcast] فشل النشر:", (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return run(req);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return run(req);
}