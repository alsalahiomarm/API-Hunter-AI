import type { ServiceRecord } from "@apihunter/db";
import type { Language } from "@/lib/i18n";
import { serviceText } from "@/lib/service-i18n";

/** تحويل تفاصيل الخطة المجانية إلى أسطر نصية مختصرة للعرض (حسب اللغة) */
export function freeTierSummary(s: ServiceRecord, lang: Language = "ar"): string[] {
  const lines: string[] = [];
  const f = s.freeTier;

  if (f.monthlyRequests) {
    lines.push(
      lang === "en"
        ? `~${f.monthlyRequests.toLocaleString("en")} requests/month`
        : `~${f.monthlyRequests.toLocaleString("en")} طلب/شهر`
    );
  }
  if (f.dailyRequests) {
    lines.push(
      lang === "en"
        ? `${f.dailyRequests.toLocaleString("en")} requests/day`
        : `${f.dailyRequests.toLocaleString("en")} طلب/يوم`
    );
  }

  const freeCredits = serviceText(s.slug, "freeCredits", lang, f.freeCredits);
  if (freeCredits) lines.push(freeCredits);

  const rateLimit = serviceText(s.slug, "rateLimit", lang, f.rateLimit);
  if (rateLimit) {
    lines.push(lang === "en" ? `Rate limit: ${rateLimit}` : `حد الاستخدام: ${rateLimit}`);
  }

  if (f.requiresCard === false) {
    lines.push(lang === "en" ? "No credit card required ✅" : "بدون بطاقة ائتمان ✅");
  }
  if (f.requiresCard === true) {
    lines.push(lang === "en" ? "Credit card required ⚠️" : "يتطلب بطاقة ائتمان ⚠️");
  }

  if (f.models && f.models.length > 0) {
    lines.push(
      lang === "en"
        ? `Models: ${f.models.slice(0, 3).join(", ")}`
        : `النماذج: ${f.models.slice(0, 3).join("، ")}`
    );
  }

  const notes = serviceText(s.slug, "notes", lang, f.notes);
  if (notes) lines.push(notes);

  return lines;
}

/** تخمين لغة نموذج الكود لعرض ترويسة التوثيق */
export function detectLanguage(code: string): "python" | "javascript" | "bash" | "text" {
  if (!code) return "text";
  if (/import\s|def \w+|print\(|requests\.get|genai\./i.test(code)) return "python";
  if (/fetch\(|await|const |import \{|@ai-sdk/i.test(code)) return "javascript";
  if (/curl\s/.test(code)) return "bash";
  return "text";
}

/** نص الحالة المختصر للإرسال للبوت/القناة */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}