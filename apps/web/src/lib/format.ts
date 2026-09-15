import type { ServiceRecord } from "@apihunter/db";

/** تحويل تفاصيل الخطة المجانية إلى أسطر نصية مختصرة للعرض */
export function freeTierSummary(s: ServiceRecord): string[] {
  const lines: string[] = [];
  const f = s.freeTier;

  if (f.monthlyRequests) lines.push(`~${f.monthlyRequests.toLocaleString("en")} طلب/شهر`);
  if (f.dailyRequests) lines.push(`${f.dailyRequests.toLocaleString("en")} طلب/يوم`);
  if (f.freeCredits) lines.push(f.freeCredits);
  if (f.rateLimit) lines.push(`حد الاستخدام: ${f.rateLimit}`);

  if (f.requiresCard === false) lines.push("بدون بطاقة ائتمان ✅");
  if (f.requiresCard === true) lines.push("يتطلب بطاقة ائتمان ⚠️");

  if (f.models && f.models.length > 0) {
    lines.push(`النماذج: ${f.models.slice(0, 3).join("، ")}`);
  }
  if (f.notes) lines.push(f.notes);

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