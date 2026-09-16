import type { ServiceRecord } from "@apihunter/db";
import { Markup } from "telegraf";

/**
 * تنسيق الرسائل الجذابة للقناة والمحادثات الخاصة (باتباع HTML parse mode).
 */

export const CATEGORY_LABEL: Record<string, string> = {
  AI_MODELS: "🤖 نماذج ذكاء اصطناعي",
  SEARCH_TOOLS: "🔎 أدوات البحث في الإنترنت",
  AUDIO_IMAGE: "🎙️ صوت وصورة",
  DATABASES: "🗄️ قواعد بيانات",
  DEV_TOOLS: "🛠️ أدوات تطوير",
  OTHER: "📦 أخرى",
};

export const STATUS_LABEL: Record<string, string> = {
  FREE_TIER: "✅ مجاني بالكامل",
  FREE_CREDIT: "💠 رصيد مجاني",
  TRIAL: "⏳ تجربة مؤقتة",
  PENDING: "⏳ قيد التحقق",
  VERIFIED: "🛡️ موثّق",
  FAILED: "❌ فشل التحقق",
};

// توضيح علامات HTML داخل str: & < > "
export function esc(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function freeTierText(s: ServiceRecord): string {
  const f = s.freeTier;
  const lines: string[] = [];
  if (f.freeCredits) lines.push(`💎 ${esc(f.freeCredits)}`);
  if (f.monthlyRequests) lines.push(`📈 ~${f.monthlyRequests.toLocaleString("en")} طلب/شهر`);
  if (f.dailyRequests) lines.push(`📊 ${f.dailyRequests.toLocaleString("en")} طلب/يوم`);
  if (f.rateLimit) lines.push(`⚡ الحد: ${esc(f.rateLimit)}`);
  if (f.requiresCard === false) lines.push("💳 بدون بطاقة ائتمان");
  if (f.requiresCard === true) lines.push("💳 يتطلب بطاقة ائتمان");
  if (f.models?.length) lines.push(`🧪 النماذج: ${esc(f.models.slice(0, 3).join(", "))}`);
  if (f.notes) lines.push(`📝 ${esc(f.notes)}`);
  return lines.length ? lines.map((l) => "▪️ " + l).join("\n") : "▪️ تفاصيل محدودة";
}

/** ملخص قصير (لقوائم البحث / التصنيفات) */
export function formatServiceCompact(s: ServiceRecord): string {
  return (
    `🏷️ <b>${esc(s.name)}</b>\n` +
    `   ${CATEGORY_LABEL[s.category] ?? s.category} · ${STATUS_LABEL[s.status] ?? s.status}\n` +
    `   ${esc(s.description.slice(0, 120))}\n` +
    `   🔗 ${esc(s.activationLink)}`
  );
}

/** رسالة كاملة (للقناة ولمنشورات /latest) */
export function formatServiceFull(s: ServiceRecord, footer = ""): string {
  return [
    `🦴 <b>${esc(s.name)}</b>`,
    `📊 ${CATEGORY_LABEL[s.category] ?? s.category}`,
    ``,
    `📝 ${esc(s.description)}`,
    ``,
    `🎯 <b>الخطة المجانية:</b>`,
    freeTierText(s),
    ``,
    `📖 <b>التوثيق:</b> ${esc(s.documentationLink)}`,
    ``,
    s.sourceUrl ? `🩻 المصدر: ${esc(s.sourceUrl)}` : "",
    footer,
  ]
    .filter(Boolean)
    .join("\n");
}

/** أزرار منشور القناة (أزرار URL فقط لأن الكولباك لا يعمل في القنوات) */
export function channelKeyboard(s: ServiceRecord) {
  return Markup.inlineKeyboard([
    Markup.button.url("🚀 تفعيل الآن", s.activationLink),
    Markup.button.url("📖 التوثيق", s.documentationLink),
  ]).reply_markup;
}

/** أزرار المحادثة الخاصة (URL + زر كود تفاعلي) */
export function privateKeyboard(s: ServiceRecord) {
  const rows: ReturnType<typeof Markup.button.url | typeof Markup.button.callback>[][] = [
    [
      Markup.button.url("🚀 تفعيل الآن", s.activationLink),
      Markup.button.url("📖 التوثيق", s.documentationLink),
    ],
  ];
  if (s.codeExample) {
    rows.push([Markup.button.callback("💻 عرض الكود", `code:${s.slug}`)]);
  }
  return Markup.inlineKeyboard(rows).reply_markup;
}

/** لوحة تصنيفات للمحادثة الخاصة */
export function categoriesKeyboard() {
  const names: { id: string; label: string }[] = [
    { id: "AI_MODELS", label: "🤖 نماذج ذكاء" },
    { id: "SEARCH_TOOLS", label: "🔎 أدوات البحث" },
    { id: "AUDIO_IMAGE", label: "🎙️ صوت وصورة" },
    { id: "DATABASES", label: "🗄️ قواعد بيانات" },
    { id: "DEV_TOOLS", label: "🛠️ أدوات تطوير" },
  ];
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < names.length; i += 2) {
    rows.push(names.slice(i, i + 2).map((n) => Markup.button.callback(n.label, `cat:${n.id}`)));
  }
  return Markup.inlineKeyboard(rows).reply_markup;
}

const BANNER = `🪤 <b>آخر النتائج من ميدان الاصطياد:</b>`;

export function formatLatestList(services: ServiceRecord[]): string {
  if (!services.length) return "😔 لا خدمات في الوقت الحالي، حاول لاحقاً!";
  return [BANNER, "", ...services.map(formatServiceCompact)].join("\n\n");
}

export function formatCategoryList(category: string, services: ServiceRecord[]): string {
  const label = CATEGORY_LABEL[category] ?? category;
  if (!services.length) return `لا نتائج في ${label} حالياً.`;
  return [`📂 <b>${label}</b>` + " - أفضل النتائج:", "", ...services.map(formatServiceCompact)].join("\n\n");
}

// ----------------------------------------------------------
// تنسيقات الردود المجمّعة (رسالة واحدة لكل طلب = تجربة أفضل وأقل إزعاجاً)
// ----------------------------------------------------------

/** تنبيه يوضّح مصدر البيانات عندما تكون قاعدة البيانات غير مربوطة بعد */
export function dataModeNote(live: boolean): string {
  return live
    ? ""
    : "⚠️ <i>قاعدة البيانات قيد الربط حالياً — هذه نتائج من البيانات التجريبية.</i>";
}

/** ملخص الخطة المجانية في سطر واحد */
function freeTierLine(s: ServiceRecord): string {
  const f = s.freeTier;
  const bits: string[] = [];
  if (f.freeCredits) bits.push(esc(f.freeCredits));
  if (f.monthlyRequests) bits.push(`~${f.monthlyRequests.toLocaleString("en")} طلب/شهر`);
  if (f.dailyRequests) bits.push(`${f.dailyRequests.toLocaleString("en")} طلب/يوم`);
  if (f.models?.length) bits.push(esc(f.models.slice(0, 2).join(", ")));
  return bits.length ? bits.join(" · ") : "خطة مجانية";
}

/** تلميح لمن يواجه حجب بعض خدمات البحث في بلده */
export function blockedNote(): string {
  return [
    "💡 <i>بعض خدمات البحث محجوبة في بعض البلدان — هذه بدائل تعمل من خوادمها:</i>",
    "   • <b>DuckDuckGo Instant Answer</b> — بدون مفتاح إطلاقاً",
    "   • <b>Google Programmable Search</b> — 100 استعلام/يوم",
    "   • <b>Firecrawl Search</b> — بحث وزحف من خوادمهم",
    "   • <b>Wikimedia · Openverse · Internet Archive</b> — بيانات ووسائط بدون مفتاح",
  ].join("\n");
}

/** فقرات الخدمات المرقّمة (بدون ترويسة/تذييل) — تُستخدم في الرد الحواري */
export function formatServicesBody(services: ServiceRecord[]): string {
  return services
    .map((s, i) => {
      const parts = [
        `${i + 1}. <b>${esc(s.name)}</b>`,
        `   ${CATEGORY_LABEL[s.category] ?? s.category} · ${STATUS_LABEL[s.status] ?? s.status}`,
        `   💎 ${freeTierLine(s)}`,
        `   📝 ${esc(s.description.slice(0, 110))}`,
        `   🔗 ${esc(s.activationLink)}`,
      ];
      if (s.documentationLink) parts.push(`    ${esc(s.documentationLink)}`);
      return parts.join("\n");
    })
    .join("\n");
}

/** رسالة واحدة مجمّعة لنتائج البحث */
export function formatSearchResultsReply(
  query: string,
  services: ServiceRecord[],
  note = ""
): string {
  const head = query
    ? `🔎 <b>نتائج البحث عن:</b> ${esc(query)}`
    : `🔎 <b>أحدث ما اصطاده الصيّاد:</b>`;
  const body = formatServicesBody(services);
  return [
    head,
    "",
    body,
    "",
    note,
    "👇 اضغط زراً للانتقال مباشرة، أو اكتب طلباً آخر بصيغة مختلفة.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** أزرار النتائج: زر لكل خدمة ينقل لصفحة التفعيل */
export function searchKeyboard(services: ServiceRecord[]) {
  const rows = services.slice(0, 3).map((s) => [
    Markup.button.url(`🚀 ${s.name.slice(0, 26)}`, s.activationLink),
  ]);
  return rows.length ? Markup.inlineKeyboard(rows).reply_markup : undefined;
}

/** رسالة عدم وجود نتائج + اقتراحات بديلة */
export function formatNoResults(query: string, suggestions: ServiceRecord[]): string {
  const lines = [
    `😔 لم أجد نتائج مطابقة لـ «${esc(query)}».`,
    "",
    " جرّب صياغة أخرى، مثال: «مفتاح بحث في الإنترنت» أو «نموذج ذكاء اصطناعي» أو «قاعدة بيانات».",
  ];
  if (suggestions.length) {
    lines.push("", " وقد تفيدك هذه الخدمات:", ...suggestions.map(formatServiceCompact));
  }
  return lines.join("\n");
}

/** لوحة التصنيفات مع دعوة واضحة */
export function formatGreeting(firstName?: string): string {
  return [
    firstName ? `👋 أهلاً <b>${esc(firstName)}</b>!` : " أهلاً بك!",
    "",
    "أنا <b>صيّاد مفاتيح الـ API المجانية</b> 🪤",
    "اكتب لي ما تحتاجه بالعربية أو الإنجليزية مثل:",
    "   «مفتاح بحث في الإنترنت» · «نموذج ذكاء اصطناعي» · «توليد صور» · «قاعدة بيانات»",
    "",
    "أو اختر تصنيفاً من الأزرار 👇",
  ].join("\n");
}