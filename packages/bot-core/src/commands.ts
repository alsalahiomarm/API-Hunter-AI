import type { Context, Telegraf } from "telegraf";
import type { ServiceRecord } from "@apihunter/db";
import { clearChatHistory, fetchLatest, fetchServices, logUserQuery, isDatabaseReachableCached, saveChatMessage, saveDiscoveredService } from "./db";
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
import { searchWeb as webSearch, type WebResult } from "@apihunter/bot-core";

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

/** استخراج عدد النتائج المطلوبة من نص الطلب (مثال: "10 أدوات" -> 10) */
function extractCount(text: string): number {
  const match = text.match(/(\d{1,3})\s*(?:أدوات|مفتاح|مفاتيح|نتائج|خدمات|tools|keys|results|services)/i);
  if (match) {
    const n = parseInt(match[1], 10);
    return Math.min(Math.max(n, 1), 20);
  }
  return 3;
}

/** هل الطلب يطلب بحثاً حياً في الإنترنت؟ */
function wantsLiveSearch(text: string): boolean {
  return /بحث.*انترنت|بحث.*ويب|search.*web|بحث.*حَيّ|بحث.*لحظي|ابحث.*الإنترنت|ابحث.*الويب|live search|web search|بحث مباشر|ابحث في الانترنت|ابحث في الويب/i.test(text);
}

/** هل الطلب عن أخبار أو معلومات عامة خارج نطاق مفاتيح API؟ */
function isGeneralQuery(text: string): boolean {
  return /خبر|أخبار|news|information|معلومات عامة|inform|latest|حدث|يوم|تطبيق|برنامج|software|tool|أداة برمجة|programming|code|تعلم|تعلم برمجة|tutorial/i.test(text);
}

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

/** دمج نتائج البحث في الإنترنت مع قاعدة البيانات */
async function mergeWithWebSearch(
  query: string,
  dbServices: ServiceRecord[],
  requestedCount: number
): Promise<{ services: ServiceRecord[]; webResults: WebResult[]; usedWeb: boolean }> {
  // جلب نتائج قاعدة البيانات أولاً
  const dbRanked = rankServices(dbServices, classifyQuery(query));
  const dbList = dbRanked.length ? dbRanked : dbServices.slice(0, requestedCount);

  // إذا كانت نتائج قاعدة البيانات كافية، نستخدمها فقط
  if (dbList.length >= requestedCount) {
    return { services: dbList.slice(0, requestedCount), webResults: [], usedWeb: false };
  }

  // البحث في الإنترنت لتكملة النتائج
  const webResults = await webSearch(query, requestedCount);

  if (webResults.length === 0) {
    return { services: dbList.slice(0, requestedCount), webResults: [], usedWeb: false };
  }

  // تحويل نتائج الويب إلى ServiceRecord وحفظها في قاعدة البيانات
  const webServices: ServiceRecord[] = [];
  for (const w of webResults) {
    const saved = await saveDiscoveredService({
      name: w.title,
      slug: `web-${w.url.replace(/[^a-z0-9]/gi, "-").slice(0, 40)}`,
      provider: w.source.charAt(0).toUpperCase() + w.source.slice(1),
      category: "OTHER" as const,
      description: w.snippet || w.title,
      freeTier: {},
      activationLink: w.url,
      documentationLink: w.url,
      codeExample: "",
      status: "VERIFIED" as const,
    }).catch(() => null);
    if (saved) webServices.push(saved);
  }

  const combined = [...dbList, ...webServices].slice(0, requestedCount);
  return { services: combined, webResults, usedWeb: true };
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

  // تحديد عدد النتائج المطلوبة
  const requestedCount = extractCount(q);
  const wantsLive = wantsLiveSearch(q) || (!nlu.category && isGeneralQuery(q));

  // 2) جلب خدمات قاعدة البيانات
  const dbServices = await fetchServices({ category: nlu.category });

  // 3) دمج مع البحث في الإنترنت عند الحاجة
  let finalServices: ServiceRecord[];
  let webResults: WebResult[] = [];
  let usedWeb = false;

  if (wantsLive || dbServices.length === 0 || (nlu.intent === "search" && !nlu.category)) {
    const merged = await mergeWithWebSearch(q, dbServices, requestedCount);
    finalServices = merged.services;
    webResults = merged.webResults;
    usedWeb = merged.usedWeb;
  } else {
    const ranked = rankServices(dbServices, nlu);
    finalServices = ranked.length
      ? ranked.slice(0, requestedCount)
      : nlu.category || !nlu.query
        ? dbServices.slice(0, requestedCount)
        : [];
  }

  // إشارة إلى حجب الخدمات في بلد المستخدم -> نرفق بدائل تعمل عالمياً
  const blockedSignal = /محجوب|محجوبه|محظور|لا تعمل|لايعمل|غير متاح|blocked|block/i.test(q);

  // 3) الرد الحواري الذكي (مع سجل المحادثة المحفوظ)
  const lead = await generateConversationalLead({
    telegramId,
    query: q,
    firstName: ctx.from?.first_name,
    services: finalServices,
    suggestions: finalServices.length ? [] : dbServices.slice(0, 2),
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
    matched: finalServices.map((s) => s.name),
  }).catch(() => {});
  await saveChatMessage(telegramId, "user", q).catch(() => {});
  const leadText = lead?.lead ?? "";
  if (leadText) {
    await saveChatMessage(telegramId, "assistant", stripHtml(leadText)).catch(() => {});
  }

  // 5) إرسال الرد
  const keyboard = searchKeyboard(finalServices);
  if (finalServices.length) {
    let text: string;
    if (leadText) {
      text = buildConversationalBlock(leadText, finalServices, blockedSignal, live);
    } else {
      const note = usedWeb
        ? "\n\n🔍 <i>شملت نتائج من البحث اللحظي في الإنترنت.</i>"
        : "";
      text = withNote(formatSearchResultsReply(nlu.query || q, finalServices, blockedSignal ? blockedNote() : "") + note);
    }
    return keyboard
      ? ctx.replyWithHTML(text, { reply_markup: keyboard })
      : ctx.replyWithHTML(text);
  }

  // لا نتائج إطلاقاً
  if (leadText) {
    const text = buildConversationalBlock(leadText, [], blockedSignal, live);
    return ctx.replyWithHTML(text, { reply_markup: categoriesKeyboard() });
  }
  return ctx.replyWithHTML(withNote(formatNoResults(q, dbServices.slice(0, 2))), {
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
