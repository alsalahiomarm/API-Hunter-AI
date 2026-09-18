/**
 * طبقة المحادثة الذكية للبوت:
 * - تبني سياقاً كاملاً (تعليمات النظام + الخدمات الحقيقية + نتائج بحث ويب + السجل السابق).
 * - تستدعي النموذج عبر callLlm (مع Google Grounding إن توفر Gemini).
 * - الإفلات عند فشل النموذج يترك المعالج الأصلي يتكفل بالرد القالب.
 */

import { callLlm, SYSTEM_INSTRUCTIONS, type LlmMessage } from "./ai";
import { searchWeb, type WebResult } from "./web";
import { getChatHistory } from "./db";
import type { ServiceRecord } from "@apihunter/db";
import { CATEGORY_LABEL } from "./formatter";

export interface ChatContext {
  telegramId: string;
  query: string;
  firstName?: string;
  /** النتائج المطابقة المرتبة (قد تكون فارغة) */
  services: ServiceRecord[];
  /** اقتراحات تظهر عند غياب النتائج */
  suggestions: ServiceRecord[];
  blockedSignal: boolean;
  live: boolean;
  /** نتائج البحث الحي في الإنترنت (مُنفَّذ مسبقاً في runSmartSearch — لا نكرره) */
  webResults?: WebResult[];
  /** عدد النتائج التي طلبها المستخدم صراحةً */
  requestedCount?: number;
}

export interface ChatLead {
  lead: string;
  /** وسم المزوّد الذي أجاب (تشخيصي) */
  via: string;
}

function escMd(s: string): string {
  return s.replace(/[_\*`\[]/g, (c) => `\\${c}`).slice(0, 500);
}

/** بناء تعليمات النظام الثابتة + سياق الدعوة الحالي */
function buildSystemPrompt(ctx: ChatContext, web: WebResult[]): string {
  const servicesBlock = ctx.services.length
    ? ctx.services
        .map(
          (s, i) =>
            `${i + 1}) ${escMd(s.name)} (${CATEGORY_LABEL[s.category] ?? s.category}) — ${escMd(s.description.slice(0, 140))}\n   الرابط: ${s.activationLink}`
        )
        .join("\n")
    : "— (لا توجد خدمات API مطابقة) —";

  const suggestionsBlock =
    ctx.suggestions.length > 0
      ? ctx.suggestions
          .map((s) => `• ${escMd(s.name)} — ${escMd(s.description.slice(0, 90))} — ${s.activationLink}`)
          .join("\n")
      : "";

  const webBlock = web.length
    ? web
        .map((w, i) => `${i + 1}. ${escMd(w.title)} — ${w.url}`)
        .join("\n")
    : "— (لا توجد نتائج بحث ويب) —";

  const nameLine = ctx.firstName ? ` اسم المستخدم: ${escMd(ctx.firstName)}.` : "";
  const want = ctx.requestedCount && ctx.requestedCount > 1 ? ctx.requestedCount : 3;

  return `${SYSTEM_INSTRUCTIONS}

أنت المساعد الذكي لصيّاد مفاتيح API المجانية داخل تليجرام.${nameLine}

⚠️ **تعليمات حاسمة — اقرأها بعناية:**
- البحث في الإنترنت **قَدْ نُفِّذَ فعلاً** لهذا الطلب قبل توليد ردك. النتائج الحقيقية أمامك في قسم «مصادر الويب المحققة» أدناه.
- **ممنوع منعاً باتاً** أن تقول: "لا أستطيع البحث"، "لا أملك صلاحية البحث"، "لا يمكنني الوصول للإنترنت"، "أدوات البحث غير متاحة"، أو أي عبارة مشابهة. البحث تم تنفيذه، البيانات أمامك.
- **مصادرك الوحيدة** للخدمات والروابط هي: «النتائج المؤكدة» و«مصادر الويب المحققة» أدناه. **ممنوع اختراع** أي اسم خدمة، رابط، حد مجاني، أو معلومة غير مذكورة حرفياً في هذه التعليمات.
- إن لم تكفِ النتائج، قل ذلك بصراحة: "لم أجد نتائج كافية لـ X، جرّب صياغة أخرى" — ولا تُختلق شيئاً.
- المستخدم طلب ${want} نتيجة؛ إن كانت المتاحة أقل فبيّن العدد الحقيقي بلطف ولا تدّعِ وجود المزيد.
- استخدم نبرة مفعمة بالموارد وودودة، ووظّف التقسيم المريح، حفظاً على احترام وقت القارئ.
- **النتائج أدناه مصدرها البحث الحي في الإنترنت (بعد تحقق أمني وصحي) + قاعدة البيانات** — ليست "مخزنة" بل مكتشفة حديثاً.

«النتائج المؤكدة (قاعدة البيانات + البحث الحي بعد التحقق الأمني)»:
${servicesBlock}
${suggestionsBlock ? `\n«اقتراحات أقرب»:\n${suggestionsBlock}` : ""}

«مصادر الويب المحققة (نتائج البحث اللحظي في الإنترنت)»:
${webBlock}`;
}

/**
 * توليد تمهيدة حوارية ذكية لطلب المستخدم.
 * تُرجع null عند غياب المفاتيح أو فشل كل المزوّدين (يتكفل المعالج بالقالب).
 */
export async function generateConversationalLead(
  ctx: ChatContext
): Promise<ChatLead | null> {
  const history = await getChatHistory(ctx.telegramId, 12);
  // نتائج البحث الحي تُنفَّذ في commands.ts (مع الفحص الأمني والتحقق) ونعيد استخدامها هنا
  // دائماً: إن لم تُمرَّر نتائج جاهزة، نُنفّذ بحثاً لحظياً إلزامياً قبل أي نص رد.
  let web: WebResult[];
  if (ctx.webResults && ctx.webResults.length) {
    web = ctx.webResults.slice(0, 5);
  } else {
    web = await searchWeb(ctx.query, 5).catch((e) => {
      console.error("[chat] تعذّر البحث اللحظي:", (e as Error).message);
      return [] as WebResult[];
    });
  }
  const system = buildSystemPrompt(ctx, web);

  const messages: LlmMessage[] = [
    ...history,
    { role: "user", content: ctx.query },
  ];

  try {
    const res = await callLlm({
      task: "chat",
      messages,
      system,
      grounding: true,
      // مهلة مضبوطة: الرد يجب أن يعود داخل زمن استجابة وظيفة Vercel (وإلا يفشل الرد بالكامل)
      timeoutMs: 30000,
    });
    const lead = res.text.trim();
    if (!lead) return null;
    return { lead: lead.slice(0, 3000), via: `${res.provider}:${res.model}` };
  } catch (err) {
    console.warn("[chat] النموذج غير متاح الآن — الرد القالبي سيعمل:", (err as Error).message);
    return null;
  }
}
