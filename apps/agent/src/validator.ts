import type { HuntResult, RawEntry } from "./types";

/**
 * التحقق والفلترة:
 * - منع التكرار عبر slug موحّد.
 * - التأكد من صلاحية الروابط قبل التخزين.
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** فحص أن الرابط يرد بحالة سليمة (2xx / 3xx) */
export async function isLinkHealthy(url: string, timeoutMs = 9000): Promise<boolean> {
  if (!/^https?:\/\//i.test(url)) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) APIHunterBot/1.0",
        Accept: "*/*",
      },
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    // بعض الخوادم ترفض HEAD - جرب GET
    try {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), timeoutMs);
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: c2.signal,
        headers: { "User-Agent": "Mozilla/5.0 APIHunterBot/1.0", Accept: "text/html" },
      });
      clearTimeout(t2);
      return res.status >= 200 && res.status < 400;
    } catch {
      return false;
    }
  } finally {
    clearTimeout(timer);
  }
}

/** فلترة أولية: هل المدخل مرشّح للتحليل؟ */
export function isCandidate(e: RawEntry): boolean {
  const blob = `${e.title} ${e.text}`.slice(0, 1200);
  if (!e.title || !e.url) return false;
  if (!/^https?:\/\//i.test(e.url)) return false;
  return (
    /free|trial|credit|api\s?key|llm|model|ai api|مجاني|تجربة|رصيد/i.test(blob) ||
    /\.md$|awesome|list of|directory of/i.test(e.title + e.url)
  );
}

/** اختبار تشفير للتكرار قبل البث إلى قاعدة البيانات */
export function dedupeKey(result: HuntResult): string {
  return slugify(result.name || result.provider || `${result.activationLink}`);
}