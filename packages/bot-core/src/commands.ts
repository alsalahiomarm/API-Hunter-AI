import type { Context, Telegraf } from "telegraf";
import type { Category, ServiceRecord } from "@apihunter/db";
import { clearChatHistory, fetchLatest, fetchServices, fetchRecentMatches, forgetShown, logUserQuery, isDatabaseReachableCached, rememberShown, saveChatMessage, saveDiscoveredService } from "./db";
import { classifyQuery, rankServices, isApiToolRequest } from "./nlu";
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
  formatWebSourcesReply,
  formatWebSourcesSection,
  searchKeyboard,
} from "./formatter";
import type { WebSourceLink } from "./formatter";
import { generateConversationalLead } from "./chat";
import { auditSnippet, isLinkHealthy } from "./security";
import { looksLikeApiService } from "./quality";
import { searchWeb as webSearch, type WebResult } from "./web";

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

  // مسح ذاكرة المحادثة + ذاكرة العرض (تنويع النتائج) لهذا المستخدم
  bot.command("reset", async (ctx) => {
    const id = String(ctx.from?.id ?? "");
    clearChatHistory(id).catch(() => {});
    forgetShown(id);
    await ctx.reply("🧹 مسحت ذاكرة المحادثة الحالية وسجل النتائج المعروضة. من أين نبدأ؟");
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

/**
 * دمج نتائج البحث في الإنترنت مع قاعدة البيانات.
 * - نتائج قاعدة البيانات تُستخدم فقط إذا كانت مطابقة فعلاً (لا نتائج عشوائية).
 * - البحث الحي يُنفَّذ إلزاماً إذا طلبه المستخدم صراحةً، ويُستبعد ما عُرض سابقاً.
 * - لا تُخزَّن أي نتيجة ويب إلا بعد: تدقيق أمني + فحص فعلي لسلامة الرابط.
 */
async function mergeWithWebSearch(
  query: string,
  dbServices: ServiceRecord[],
  requestedCount: number,
  opts: { forceLive: boolean; category?: Category; excludeNames: string[]; webOffset?: number }
): Promise<{
  services: ServiceRecord[];
  webResults: WebResult[];
  usedWeb: boolean;
  dbCount: number;
  blocked: number;
  lowQuality: number;
}> {
  const nlu = classifyQuery(query);
  const isExcluded = (name: string) => opts.excludeNames.includes(name);
  const webOffset = Math.max(0, opts.webOffset ?? 0);

  // 1) المطابق فعلاً من قاعدة البيانات (rankServices يستبعد غير المطابق بالمرة)
  const relevant = rankServices(dbServices, nlu, requestedCount + webOffset).filter(
    (s) => !isExcluded(s.name)
  );

  // تكفي قاعدة البيانات وحدها — إلا إذا طلب المستخدم بحثاً حياً أو استُهلكت النتائج السابقة
  if (!opts.forceLive && relevant.length >= requestedCount) {
    return {
      services: relevant.slice(0, requestedCount),
      webResults: [],
      usedWeb: false,
      dbCount: relevant.length,
      blocked: 0,
      lowQuality: 0,
    };
  }

  // 2) البحث الحي في الإنترنت (مع تدوير النتائج كي لا تتكرر الإجابة)
  const webResults = await webSearch(query, requestedCount, { offset: webOffset });

  const seenLinks = new Set(dbServices.map((s) => s.activationLink));
  const seenNames = new Set(dbServices.map((s) => s.name.trim().toLowerCase()));
  let blocked = 0;
  let lowQuality = 0;

  // المرحلة 1: ترشيح سريع (بوّابة جودة + تدقيق أمني + إزالة تكرار) — بلا انتظار شبكة
  const screened = webResults
    .filter((w) => {
      if (!w.url || seenLinks.has(w.url)) return false;
      if (w.title && isExcluded(w.title)) return false;
      // بوّابة الجودة: مقالات/فيديوهات/منشورات منصات المحتوى ليست بطاقات خدمة API
      if (!looksLikeApiService(w)) {
        console.warn(`[جودة] ليست خدمة API — رُفضت: ${w.url}`);
        lowQuality++;
        return false;
      }
      // التدقيق الأمني السيبراني (رابط خبيث/منتحل/يسرّب مفاتيح)
      const audit = auditSnippet({ url: w.url, text: w.snippet });
      if (!audit.safe) {
        console.warn(
          `[أمان] رُفض رابط (خطورة ${audit.score}): ${w.url} — ${audit.findings.map((f) => f.code).join(", ")}`
        );
        blocked++;
        return false;
      }
      const name = (w.title || w.url).trim().slice(0, 90);
      if (!name || seenNames.has(name.toLowerCase())) return false;
      seenLinks.add(w.url);
      seenNames.add(name.toLowerCase());
      return true;
    })
    .slice(0, requestedCount);

  // المرحلة 2: التحقق البرمجي الفعلي — على التوازي وبمهلة قصيرة كي لا يتجاوز الرد حد الوظيفة السحابية
  const healthy = await Promise.all(
    screened.map((w) => isLinkHealthy(w.url, 5000).catch(() => false))
  );

  const webServices: ServiceRecord[] = [];
  for (let i = 0; i < screened.length; i++) {
    if (!healthy[i]) {
      console.warn(`[تحقق] رابط لا يستجيب — رُفض: ${screened[i].url}`);
      blocked++;
      continue;
    }
    const w = screened[i];
    const name = (w.title || w.url).trim().slice(0, 90);
    const saved = await saveDiscoveredService({
      name,
      slug: `web-${slugifyUrl(w.url)}`,
      provider: w.source.charAt(0).toUpperCase() + w.source.slice(1),
      category: opts.category ?? "OTHER",
      description: (w.snippet || w.title || "").slice(0, 300),
      freeTier: {},
      activationLink: w.url,
      documentationLink: w.url,
      codeExample: "",
      status: "VERIFIED" as const,
    }).catch(() => null);
    if (saved) webServices.push(saved);
  }

  const combined = [...relevant, ...webServices].slice(0, requestedCount);
  return {
    services: combined,
    webResults,
    usedWeb: webServices.length > 0,
    dbCount: relevant.length,
    blocked,
    lowQuality,
  };
}

/** تحويل رابط إلى شريحة slug صالحة للتخزين */
function slugifyUrl(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

/**
 * تجميع "مصادر ويب" حقيقية للعرض (مقالات/أخبار/توثيق) — لا تُخزَّن كخدمات.
 * تُستعمل في الاستفسارات العامة (أخبار/معلومات) كي لا يُجاب المستخدم بـ"لا نتائج"
 * رغم أن البحث الحي أعاد نتائج فعلية. كل مصدر يُفحَص أمنياً ويُتحقق من أنه يستجيب.
 */
async function collectWebSources(
  webResults: WebResult[],
  services: ServiceRecord[],
  max = 3
): Promise<WebSourceLink[]> {
  const usedLinks = new Set(services.map((s) => s.activationLink));
  const picked: WebResult[] = [];
  const seen = new Set<string>();
  for (const w of webResults) {
    if (!w.url || usedLinks.has(w.url) || seen.has(w.url)) continue;
    seen.add(w.url);
    if (!auditSnippet({ url: w.url, text: w.snippet }).safe) continue;
    picked.push(w);
    if (picked.length >= max) break;
  }
  const healthy = await Promise.all(
    picked.map((w) => isLinkHealthy(w.url, 5000).catch(() => false))
  );
  return picked
    .filter((_, i) => healthy[i])
    .map((w) => ({ title: w.title || w.url, url: w.url, snippet: w.snippet, source: w.source }));
}

/**
 * قلب البحث الذكي — مُصدَّر ليكون قابلاً للاختبار ولإعادة الاستخدام.
 * ينفّذ: فهم الطلب (NLU) → جلب قاعدة البيانات → البحث الحي في الإنترنت
 * → فحص أمني + تحقق من الروابط → تنويع (استبعاد ما عُرض سابقاً).
 */
export interface SearchOutcome {
  nlu: ReturnType<typeof classifyQuery>;
  requestedCount: number;
  wantsLive: boolean;
  usedWeb: boolean;
  blocked: number;
  lowQuality: number;
  services: ServiceRecord[];
  webResults: WebResult[];
  excluded: string[];
  /** تم تدوير مجموعة البحث لتقديم خيارات جديدة (طلب متكرر / طلب المزيد) */
  rotated: boolean;
  /** ملاحظة تُعرض للمستخدم عند إعادة تدوير القائمة كاملة (منع الطريق المسدود) */
  fallbackNote: string;
}

export async function performSmartSearch(
  rawQuery: string,
  telegramId = "?",
  opts: { forceLive?: boolean; excludeDb?: boolean } = {}
): Promise<SearchOutcome> {
  const q = rawQuery.trim();
  const nlu = classifyQuery(q);
  const requestedCount = extractCount(q);
  const wantsLive =
    opts.forceLive ||
    wantsLiveSearch(q) ||
    (!nlu.category && isGeneralQuery(q));

  const dbServices = await fetchServices({ category: nlu.category });

  // تنويع النتائج: استبعاد ما عُرض لهذا المستخدم سابقاً (الركيزة الثالثة)
  const recentlyShown = await fetchRecentMatches(telegramId, 4).catch((e) => {
    console.error("[bot] تعذّر جلب نتائج مطابقة سابقة:", (e as Error).message);
    return [] as string[];
  });
  const askedForMore =
    requestedCount > 3 || /أخرى|اخرى|أكثر|المزيد|غيرها|more|another|different|other/i.test(q);

  let services: ServiceRecord[];
  let webResults: WebResult[] = [];
  let usedWeb = false;
  let blocked = 0;
  let lowQuality = 0;
  let rotated = false;
  let fallbackNote = "";

  if (wantsLive || askedForMore || dbServices.length === 0 || (nlu.intent === "search" && !nlu.category)) {
    const merged = await mergeWithWebSearch(q, dbServices, requestedCount, {
      forceLive: wantsLive,
      category: nlu.category,
      excludeNames: recentlyShown,
    });
    services = merged.services;
    webResults = merged.webResults;
    usedWeb = merged.usedWeb;
    blocked = merged.blocked;
    lowQuality = merged.lowQuality;

    // تدوير النتائج (الركيزة الثالثة): استُهلكت نتائج الاستعلام نفسه -> نتقدّم في مجموعة
    // البحث لنقدّم خيارات جديدة تماماً بدل الرد الفارغ.
    if (services.length < requestedCount) {
      const second = await mergeWithWebSearch(q, dbServices, requestedCount, {
        forceLive: true,
        category: nlu.category,
        excludeNames: [...recentlyShown, ...services.map((s) => s.name)],
        webOffset: requestedCount,
      }).catch((e) => {
        console.warn("[bot] تعذّر تدوير نتائج البحث:", (e as Error).message);
        return null;
      });
      if (second) {
        rotated = true;
        if (second.services.length > services.length) {
          services = second.services;
          usedWeb = usedWeb || second.usedWeb;
        }
        webResults = [...webResults, ...second.webResults];
        blocked += second.blocked;
        lowQuality += second.lowQuality;
      }
    }

    // لا طريق مسدود أبداً: إن لم يتبقَّ جديد بعد التدوير، نُعيد أفضل ما لدينا
    // (مطابق فعلاً) مع توضيح أننا أدرنا القائمة كاملة — أوضح من رد فارغ.
    if (!services.length && recentlyShown.length) {
      const cycle = rankServices(dbServices, nlu, requestedCount);
      const restored = (cycle.length ? cycle : dbServices).slice(0, requestedCount);
      if (restored.length) {
        services = restored;
        fallbackNote =
          "🔄 <i>أدرنا قائمة النتائج كاملةً في هذه الجلسة — هذه هي الخيارات الأقوى مجدداً. اطلب مجالاً أضيق أو صيغة مختلفة للحصول على مجموعة جديدة.</i>";
      }
    }
  } else {
    const ranked = rankServices(dbServices, nlu, requestedCount);
    services = ranked.length
      ? ranked.slice(0, requestedCount)
      : nlu.category || !nlu.query
        ? dbServices.slice(0, requestedCount)
        : [];
  }

  // استبعاد خدمات قاعدة البيانات إن طُلب صراحةً (الردود العامة لا تُلحق بها)
  if (opts.excludeDb) {
    services = services.filter((s) => s.slug.startsWith("web-"));
  }

  return {
    nlu,
    requestedCount,
    wantsLive,
    usedWeb,
    blocked,
    lowQuality,
    services,
    webResults,
    excluded: recentlyShown,
    rotated,
    fallbackNote,
  };
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

  // 2) تنفيذ البحث (قاعدة بيانات + بحث حي + فحص أمني + تنويع)
  const isApiRequest = isApiToolRequest(q);
  const outcome = await performSmartSearch(q, telegramId, {
    forceLive: isApiRequest,
    excludeDb: !isApiRequest,
  });
  const { requestedCount, usedWeb, blocked, lowQuality, webResults, fallbackNote } = outcome;
  const finalServices = outcome.services;

  // إشارة إلى حجب الخدمات في بلد المستخدم -> نرفق بدائل تعمل عالمياً
  const blockedSignal = /محجوب|محجوبه|محظور|لا تعمل|لايعمل|غير متاح|blocked|block/i.test(q);

  // 3) الرد الحواري الذكي (مع سجل المحادثة المحفوظ + نتائج البحث الحي)
  const lead = await generateConversationalLead({
    telegramId,
    query: q,
    firstName: ctx.from?.first_name,
    services: finalServices,
    suggestions: finalServices.length ? [] : await fetchServices().then((all) => all.slice(0, 2)).catch((e) => {
      console.error("[bot] تعذّر جلب اقتراحات:", (e as Error).message);
      return [];
    }),
    blockedSignal,
    live,
    webResults,
    requestedCount,
  });

  // 4) تسجيل الاستعلام + الذاكرة (لا يُفشل الرد إن فشلا)
  //    rememberShown: يضمن استبعاد هذه النتائج في الطلب التالي حتى لو تعذّر حفظ السجل
  if (finalServices.length) rememberShown(telegramId, finalServices.map((s) => s.name));
  await logUserQuery({
    telegramId,
    firstName: ctx.from?.first_name ?? null,
    username: ctx.from?.username ?? null,
    query: q,
    intent: nlu.intent + (nlu.category ? `:${nlu.category}` : ""),
    matched: finalServices.map((s) => s.name),
  }).catch((e) => {
    console.error("[bot] تعذّر تسجيل الاستعلام:", (e as Error).message);
  });
  await saveChatMessage(telegramId, "user", q).catch((e) => {
    console.error("[bot] تعذّر حفظ رسالة المستخدم:", (e as Error).message);
  });
  const leadText = lead?.lead ?? "";
  if (leadText) {
    await saveChatMessage(telegramId, "assistant", stripHtml(leadText)).catch((e) => {
      console.error("[bot] تعذّر حفظ رد النموذج:", (e as Error).message);
    });
  }

  // 5) إرسال الرد
  const keyboard = searchKeyboard(finalServices);
  const webNote = usedWeb
    ? `\n\n🔍 <i>شملت نتائج من البحث اللحظي في الإنترنت${
        blocked + lowQuality > 0
          ? ` بعد استبعاد ${blocked + lowQuality} نتيجة (فحص أمني/تحقق من الرابط/جودة)`
          : ""
      }.</i>`
    : "";
  // ملاحظة التدوير/منع الطريق المسدود (تُلحق بأي رد يعرض خدمات)
  const cycleNote = fallbackNote ? `\n\n${fallbackNote}` : "";

  // مصادر ويب حقيقية (مقالات/أخبار/توثيق): تُعرض وحدها إن لم توجد خدمات،
  // وإلا تُلحق برد الخدمات كمراجع إضافية تُثري نتيجة البحث.
  const webSources = webResults.length
    ? await collectWebSources(webResults, finalServices, finalServices.length ? 2 : 3).catch((e) => {
        console.error("[bot] تعذّر جمع مصادر الويب:", (e as Error).message);
        return [] as WebSourceLink[];
      })
    : [];

  if (finalServices.length) {
    // حماية: إن أنكر النموذج قدرته على البحث رغم توفر نتائج حقيقية، نتجاهل تمهيدته
    let safeLead = leadText;
    if (safeLead && /لا أستطيع (البحث|الوصول|التصفح)|لا يمكنني (البحث|الوصول|التصفح)|cannot (search|browse)|can'?t (search|browse)|لا أملك صلاحية/i.test(safeLead)) {
      console.warn("[bot] تجاهل تمهيدة تنكر البحث الحي — استُخدم الرد القالبي.");
      safeLead = "";
    }

    const extraSources = formatWebSourcesSection(webSources);
    let text: string;
    if (safeLead) {
      text = withNote(
        buildConversationalBlock(safeLead, finalServices, blockedSignal, live) + extraSources + webNote
      );
    } else {
      text = withNote(
        formatSearchResultsReply(nlu.query || q, finalServices, blockedSignal ? blockedNote() : "") +
          extraSources +
          webNote
      );
    }
    return keyboard
      ? ctx.replyWithHTML(text, { reply_markup: keyboard })
      : ctx.replyWithHTML(text);
  }

  // لا نتائج خدمات — لكن قد تكون هناك نتائج بحث حيّة حقيقية (أخبار/مقالات/توثيق)
  if (webSources.length) {
    return ctx.replyWithHTML(
      withNote(formatWebSourcesReply(q, webSources, leadText, blockedSignal ? blockedNote() : ""))
    );
  }

  // لا نتائج إطلاقاً
  if (leadText) {
    const text = buildConversationalBlock(leadText, [], blockedSignal, live);
    return ctx.replyWithHTML(text, { reply_markup: categoriesKeyboard() });
  }
  const suggestions = await fetchServices().then((all) => all.slice(0, 2)).catch(() => []);
  return ctx.replyWithHTML(withNote(formatNoResults(q, suggestions)), {
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
