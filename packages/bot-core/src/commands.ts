import type { Context, Telegraf } from "telegraf";
import type { ServiceRecord } from "@apihunter/db";
import { clearChatHistory, fetchLatest, fetchServices, logUserQuery, isDatabaseReachableCached, saveChatMessage } from "./db";
import { classifyQuery, rankServices } from "./nlu";
import {
  blockedNote,
  categoriesKeyboard,
  dataModeNote,
  esc,
  formatCategoryList,
  formatGreeting,
  formatLatestList,
  formatNoResults,
  formatSearchResultsReply,
  formatServiceFull,
  formatServicesBody,
  searchKeyboard,
} from "./formatter";
import { generateConversationalLead } from "./chat";

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

  // مسح ذاكرة المحادثة لهذا المستخدم
  bot.command("reset", async (ctx) => {
    clearChatHistory(String(ctx.from?.id ?? "")).catch(() => {});
    await ctx.reply("🧹 مسحت ذاكرة المحادثة الحالية. من أين نبدأ؟ 👋");
  });

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

/** بناء الرد الحواري: تمهيدة من النموذج + قائمة الخدمات الحقيقية */ 
function buildConversationalBlock(
  leadText: string,
  list: ServiceRecord[],
  blockedSignal: boolean,
  live: boolean
): string {
  const note = blockedSignal ? blockedNote() : "";
  const parts = [esc(leadText)];
  if (list.length) parts.push("", formatServicesBody(list));
  if (note) parts.push("", note);
  parts.push("", "👇 اضغط زراً للانتقال مباشرة، أو اكتب طلباً آخر بصيغة مختلفة.");
  const text = parts.filter(Boolean).join("\n");
  return live ? text : `${text}\n\n${dataModeNote(live)}`;
}

/** بحث ذكي مشترك بين /search والرسائل الحرة - يرد برسالة حوارية واحدة مجمّعة */ 
async function runSmartSearch(ctx: Context, rawQuery: string) {
  const q = rawQuery.trim();
  if (!q) {
    return ctx.reply(
      "اكتب ما تبحث عنه، مثال: /search gemini أو أرسل رسالة طبيعية مثل: «أريد مفتاح للبحث في الإنترنت»"
    );
  }

  const telegramId = String(ctx.from?.id ?? "?");
  const live = await isDatabaseReachableCached();
  const withNote = (text: string) => (live ? text : `${text}\n\n${dataModeNote(live)}`);
  const nlu = classifyQuery(q);

  // 1) تحية فقط -> ترحيب بلوحة التصنيفات (بدل عرض خدمات عشوائية) مع حفظ الذاكرة
  if (nlu.intent === "greeting") {
    await saveChatMessage(telegramId, "user", q);
    const greeting = formatGreeting(ctx.from?.first_name);
    await ctx.replyWithHTML(greeting, { reply_markup: categoriesKeyboard() });
    await saveChatMessage(telegramId, "assistant", greeting.replace(/<[^>]+>/g, ""));
    return;
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

  // إشارة إلى حجب الخدمات في بلد المستخدم -> نرفق بدائل تعمل عالمياً
  const blockedSignal = /محجوب|محجوبه|محظور|لا تعمل|لايعمل|غير متاح|blocked|block/i.test(q);

  // 3) الرد الحواري الذكي (مع سجل المحادثة المحفوظ)
  const lead = await generateConversationalLead({
    telegramId,
    query: q,
    firstName: ctx.from?.first_name,
    services: list,
    suggestions: list.length ? [] : services.slice(0, 2),
    blockedSignal,
    live,
  });

  // 4) تسجيل الاستعلام + الذاكرة (لا يُفشل الرد إن فشلا)
  await logUserQuery({
    telegramId,
    firstName: ctx.from?.first_name ?? null,
    username: ctx.from?.username ?? null,
    query: q,
    intent: nlu.intent + (nlu.category ? `:${nlu.category}` : ""),
    matched: list.map((s) => s.name),
  }).catch(() => {});
  await saveChatMessage(telegramId, "user", q).catch(() => {});
  const leadText = lead?.lead ?? "";
  if (leadText) {
    await saveChatMessage(telegramId, "assistant", stripHtml(leadText)).catch(() => {});
  }

  // 5) إرسال الرد
  const keyboard = searchKeyboard(list);
  if (list.length) {
    const text = leadText
      ? buildConversationalBlock(leadText, list, blockedSignal, live)
      : withNote(formatSearchResultsReply(nlu.query || q, list, blockedSignal ? blockedNote() : ""));
    return keyboard
      ? ctx.replyWithHTML(text, { reply_markup: keyboard })
      : ctx.replyWithHTML(text);
  }

  // لا نتائج إطلاقاً
  if (leadText) {
    const text = buildConversationalBlock(leadText, [], blockedSignal, live);
    return ctx.replyWithHTML(text, { reply_markup: categoriesKeyboard() });
  }
  return ctx.replyWithHTML(withNote(formatNoResults(q, services.slice(0, 2))), {
    reply_markup: categoriesKeyboard(),
  });
}

/** إزالة وسوم HTML من رد النموذج قبل حفظه في الذاكرة */
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^[-•\s]+/gm, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export { HELP_MSG, formatServiceFull };