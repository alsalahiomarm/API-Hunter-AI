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
    : "— (لا توجد نتائج مطابقة في قاعدة البيانات حالياً) —";

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
    : "— (لا توجد نتائج بحث ويب إضافية) —";

  const nameLine = ctx.firstName ? ` اسم المستخدم: ${escMd(ctx.firstName)}.` : "";

  return `${SYSTEM_INSTRUCTIONS}

أنت المساعد الذكي لصيّاد مفاتيح API المجانية داخل تليجرام.${nameLine}

قواعد صارمة:
- القائمة أدناه «الخدمات من قاعدة البيانات» هي مصدرك الوحيد للخدمات والروابط في ردك. يمنع منعاً باتاً اختراع أي اسم خدمة أو رابط أو حد مجاني غير مذكور حرفياً فيها.
- إن وُجدت نتائج: اكتب فقرة ودية قصيرة (سطرين إلى ثلاثة) تفاعل فيها مع سؤال المستخدم، ثم اذكر النتائج مرقّمة بنفس صيغة القائمة مع روابطها الحرفية، واضغط الإجابات (لا تطيل).
- إن لم توجد نتائج: اعتذر بصدق، لا تختلق شيئاً، واطلب إعادة الصياغة أو اقترح أقرب فكرة من قائمة الاقتراحات إن وُجدت.
- إن كانت «مصادر الويب» تحتوي نتيجة تفيد السؤال تحديداً، يمكنك الاستشهاد بها في سطر واحد مع رابطها الحرفي، وإلا فتجاهلها.
- استخدم نبرة مفعمة بالموارد وودودة، ووظّف التقسيم والأمثلة المريحة، حفظاً على احترام وقت القارئ.

«الخدمات من قاعدة البيانات»:
${servicesBlock}
${suggestionsBlock ? `\n«اقتراحات أقرب»:\n${suggestionsBlock}` : ""}

«مصادر الويب المحققة»:
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
  const web = await searchWeb(ctx.query, 3).catch(() => [] as WebResult[]);
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
    });
    const lead = res.text.trim();
    if (!lead) return null;
    return { lead: lead.slice(0, 3000), via: `${res.provider}:${res.model}` };
  } catch (err) {
    console.warn("[chat] النموذج غير متاح الآن — الرد القالبي سيعمل:", (err as Error).message);
    return null;
  }
}