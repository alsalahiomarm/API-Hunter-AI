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
    `   🔗 ${s.activationLink}`
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
    `📖 <b>التوثيق:</b> ${s.documentationLink}`,
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