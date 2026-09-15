import type { Context, Telegraf } from "telegraf";
import { fetchLatest, fetchServices, logUserQuery, isDatabaseReachableCached } from "./db";
import { classifyQuery, rankServices } from "./nlu";
import {
  categoriesKeyboard,
  dataModeNote,
  formatCategoryList,
  formatGreeting,
  formatLatestList,
  formatNoResults,
  formatSearchResultsReply,
  formatServiceFull,
  searchKeyboard,
} from "./formatter";

const HELP_MSG = [
  "<b>🪤 صيّاد المفاتيح - الأوامر المتاحة:</b>",
  "",
  "▪️ /start - رسالة البداية",
  "▪️ /latest - آخر 3 خدمات مكتشفة",
  "▪️ /search &lt;كلمة&gt; - بحث مباشر",
  "▪️ /categories - تصفح حسب التصنيف",
  "",
  "أو فقط<b> اكتب طلبك بلغتك الطبيعية</b>، مثال:",
  "   «أريد مفتاح API مجاني للبحث في شبكة الإنترنت»",
  "   «أعطني أفضل مفتاح لنموذج Gemini»",
].join("\n");

export function registerCommands(bot: Telegraf) {
  bot.start(async (ctx) => {
    await ctx.replyWithHTML(
      [
        `👋 أهلاً ${ctx.from?.first_name ? `<b>${ctx.from.first_name}</b>` : "بك"}!`,
        "",
        "أنا <b>صيّاد مفاتيح الـ API المجانية</b> 🪤",
        "أجلب لك باحثة عن: نماذج AI، أدوات بحث، صوت وصورة، قواعد بيانات، وأكثر.",
        "",
        HELP_MSG,
      ].join("\n"),
      { reply_markup: categoriesKeyboard() }
    );
  });

  bot.help(async (ctx) => ctx.replyWithHTML(HELP_MSG));

  bot.command("latest", async (ctx) => {
    const latest = await fetchLatest(3);
    await ctx.replyWithHTML(formatLatestList(latest));
  });

  bot.command("categories", async (ctx) => {
    await ctx.replyWithHTML("<b>اختر تصنيفاً للتصفح:</b>", {
      reply_markup: categoriesKeyboard(),
    });
  });

  bot.command("search", async (ctx) => {
    const query = (ctx.message as any)?.text?.replace(/^\/search\s*/i, "") ?? "";
    await runSmartSearch(ctx, query);
  });

  // ---- الرد على أي رسالة نصية (فهم اللغة الطبيعية) ----
  bot.on("text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) return; // أوامر أخرى
    await runSmartSearch(ctx, text);
  });

  // ---- أزرار الكولباك ----
  bot.action(/cat:(.+)/, async (ctx) => {
    const category = ctx.match?.[1] ?? "";
    const services = await fetchServices({ category: category as any });
    // الأفضل 3 نتائج
    const top = services.slice(0, 3);
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageText(formatCategoryList(category, top), { parse_mode: "HTML" });
    } catch {
      await ctx.replyWithHTML(formatCategoryList(category, top));
    }
  });

  bot.action(/code:(.+)/, async (ctx) => {
    const slug = ctx.match?.[1] ?? "";
    await ctx.answerCbQuery();
    const all = await fetchServices();
    const svc = all.find((s) => s.slug === slug);
    if (!svc) return ctx.reply("⚠️ الخدمة غير موجودة.");
    if (svc.codeExample) {
      await ctx.replyWithHTML(
        `<b>💻 كود استخدام ${svc.name}:</b>\n\n<pre>${svc.codeExample.replace(/</g, "&lt;").replace(/&/g, "&amp;")}</pre>`
      );
    } else {
      await ctx.reply("⚠️ لا يوجد مثال كود مسجّل لهذه الخدمة بعد.");
    }
  });
}

/** بحث ذكي مشترك بين /search والرسائل الحرة - يرد برسالة واحدة مجمّعة */
async function runSmartSearch(ctx: Context, rawQuery: string) {
  const q = rawQuery.trim();
  if (!q) {
    return ctx.reply(
      "اكتب ما تبحث عنه، مثال: /search gemini أو أرسل رسالة طبيعية مثل: «أريد مفتاح للبحث في الإنترنت»"
    );
  }

  const nlu = classifyQuery(q);
  const live = await isDatabaseReachableCached();
  const withNote = (text: string) => (live ? text : `${text}\n\n${dataModeNote(live)}`);

  // 1) تحية فقط -> ترحيب بلوحة التصنيفات (بدل عرض خدمات عشوائية)
  if (nlu.intent === "greeting") {
    return ctx.replyWithHTML(formatGreeting(ctx.from?.first_name), {
      reply_markup: categoriesKeyboard(),
    });
  }

  // 2) بحث فعلي
  const services = await fetchServices({ category: nlu.category });
  const ranked = rankServices(services, nlu);

  // لا نتائج دقيقة؟ نعرض الأحدث (أو نتائج التصنيف) بدل الرد الفارغ
  const list = ranked.length
    ? ranked
    : nlu.category || !nlu.query
      ? services.slice(0, 3)
      : [];

  // تسجيل الاستعلام (لا يُفشل الرد إن فشل)
  await logUserQuery({
    telegramId: String(ctx.from?.id ?? "?"),
    firstName: ctx.from?.first_name ?? null,
    username: ctx.from?.username ?? null,
    query: q,
    intent: nlu.intent + (nlu.category ? `:${nlu.category}` : ""),
    matched: list.map((s) => s.name),
  }).catch(() => {});

  if (list.length === 0) {
    return ctx.replyWithHTML(withNote(formatNoResults(q, services.slice(0, 2))), {
      reply_markup: categoriesKeyboard(),
    });
  }

  const text = formatSearchResultsReply(nlu.query || q, list);
  const keyboard = searchKeyboard(list);
  if (keyboard) {
    return ctx.replyWithHTML(withNote(text), { reply_markup: keyboard });
  }
  return ctx.replyWithHTML(withNote(text));
}

export { HELP_MSG, formatServiceFull };