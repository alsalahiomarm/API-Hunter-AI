/**
 * التدقيق الأمني السيبراني (Cyber Security Audit) للروابط والمقتطفات المكتشفة.
 *
 * يُستخدم قبل تخزين أي نتيجة قادمة من البحث الحي في الإنترنت أو من الوكيل:
 *  1) auditLink  — فحص بنية الرابط: البروتوكول، تسريب الأسرار في الرابط،
 *                  قوائم النطاقات القصيرة الخدّاعة، النطاقات عالية الخطورة،
 *                  ملفات التنفيذ، عنوان IP مباشر، ترميز Punycode…
 *  2) auditCode  — فحص أكواد/مقتطفات ضد الأنماط الخطرة الشائعة
 *                  (eval، تنفيذ أوامر النظام، curl|bash، أسرار مكشوفة…).
 *  3) auditSnippet — دمج الفحصين لتقرير واحد.
 *
 * ملاحظة صدق: هذا تدقيق استباقي قائم على القواعد (heuristic)، وليس اختبار اختراق
 * كامل؛ هدفه إسقاط الروابط الخبيثة/المنتحلة وتسريب المفاتيح قبل وصولها للمستخدم.
 */

export type SecurityLevel = "high" | "medium" | "low";

export interface SecurityFinding {
  /** معرّف ثابت للملاحظة (للاختبارات والتشخيص) */
  code: string;
  level: SecurityLevel;
  detail: string;
}

export interface SecurityAudit {
  /** آمن للنشر للمستخدم */
  safe: boolean;
  /** درجة الخطورة 0..100 (أعلى = أخطر) */
  score: number;
  findings: SecurityFinding[];
}

const WEIGHT: Record<SecurityLevel, number> = { high: 60, medium: 22, low: 8 };

/** خدمات تقصير الروابط — تخفي الوجهة الحقيقية */
const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "adf.ly", "shorte.st", "cutt.ly", "rb.gy", "rebrand.ly", "shorturl.at",
  "t.ly", "lnkd.in", "s.id", "clck.ru", "v.gd", "soo.gd", "urlz.fr",
]);

/** نطاقات ترتفع فيها نسبة الإساءة كثيراً */
const RISKY_TLDS = new Set([
  "tk", "ml", "ga", "cf", "gq", "zip", "mov", "top", "click", "work",
  "rest", "country", "stream", "download", "loan", "review", "kim", "men",
]);

/** امتدادات تنفيذية/تثبيتية — لا ينبغي أن تكون رابط "تفعيل API" */
const EXECUTABLE_EXT = new Set([
  "exe", "msi", "apk", "dmg", "bat", "cmd", "scr", "com", "pif", "jar",
  "vbs", "ps1", "run", "deb", "rpm", "appimage",
]);

/** مؤشرات مواقع "مفاتيح مسروقة/مقرصنة" — شائعة جداً في هذا المجال */
const SHADY_PATTERNS: Array<{ re: RegExp; code: string; detail: string }> = [
  { re: /(^|[.\-/])(crack|keygen|nulled|warez|torrent|pirat)/i, code: "pirated_content", detail: "مؤشر محتوى مقرصن/مفاتيح مسروقة" },
  { re: /free[-_.]?(api[-_.]?)?keys?[-_.]?(generator|list|dump|leak)/i, code: "key_leak_site", detail: "موقع يوزّع مفاتيح مسربة" },
  { re: /(hack|phish|malware|stealer|logger)/i, code: "malicious_intent", detail: "مؤشر نية خبيثة في اسم النطاق" },
];

/** مفاتيح أسرار شائعة الشكل (تسريب اعتماد في رابط عام) */
const SECRET_VALUE_RE =
  /^(sk-[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{12,}|Bearer\s+\S{10,})$/;

const SECRET_PARAM_RE =
  /^(api[-_]?key|apikey|key|token|access[-_]?token|refresh[-_]?token|auth|authorization|secret|client[-_]?secret|password|passwd|pwd|sig|signature|bearer|jwt)$/i;

/** أنماط أكواد خطرة (شائعة في المقتطفات المسروقة) */
const DANGEROUS_CODE: Array<{ re: RegExp; code: string; level: SecurityLevel; detail: string }> = [
  { re: /\beval\s*\(/, code: "code_eval", level: "high", detail: "استخدام eval لتنفيذ نص ككود" },
  { re: /new\s+Function\s*\(/, code: "code_dynamic_fn", level: "high", detail: "بناء دالة من نص (تنفيذ ديناميكي)" },
  { re: /\b(curl|wget)\b[^\n|]{0,120}\|\s*(sudo\s+)?(ba|z|k)?sh\b/i, code: "code_pipe_shell", level: "high", detail: "تنزيل نص من الإنترنت وتنفيذه مباشرة (curl | bash)" },
  { re: /base64\s+(-d|--decode)[^\n|]{0,80}\|\s*(ba|z)?sh/i, code: "code_obfuscated_exec", level: "high", detail: "فك ترميز base64 وتنفيذه فوراً" },
  { re: /child_process|from\s+subprocess\s+import|os\.system\s*\(|execSync\s*\(|spawnSync\s*\(/i, code: "code_shell_exec", level: "medium", detail: "تنفيذ أوامر على نظام التشغيل" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, code: "code_private_key", level: "high", detail: "مفتاح خاص مضمّن في النص" },
  { re: /(sk-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{25,}|gh[pousr]_[A-Za-z0-9]{25,})/, code: "code_leaked_secret", level: "high", detail: "مفتاح API مكشوف داخل الكود" },
  { re: /(mysql|pg|mongoose|sqlite)\w*\.(query|execute)\s*\(\s*[`"'][^`"']*[`"']\s*\+/i, code: "code_sql_concat", level: "medium", detail: "بناء استعلام SQL بدمج نصوص (خطر حقن)" },
  { re: /rejectUnauthorized\s*:\s*false|verify\s*=\s*False/i, code: "code_tls_disabled", level: "medium", detail: "تعطيل التحقق من شهادة TLS" },
  { re: /chmod\s+777/i, code: "code_weak_perms", level: "medium", detail: "صلاحيات ملفات مفتوحة للجميع (777)" },
];

function scoreOf(findings: SecurityFinding[]): number {
  return Math.min(100, findings.reduce((sum, f) => sum + WEIGHT[f.level], 0));
}

function verdict(findings: SecurityFinding[]): SecurityAudit {
  const score = scoreOf(findings);
  return {
    safe: !findings.some((f) => f.level === "high") && score <= 40,
    score,
    findings,
  };
}

/** فحص أمني لرابط واحد */
export function auditLink(rawUrl: string): SecurityAudit {
  const findings: SecurityFinding[] = [];
  const add = (code: string, level: SecurityLevel, detail: string) =>
    findings.push({ code, level, detail });

  const raw = String(rawUrl ?? "").trim();
  if (!raw) return verdict([{ code: "empty_url", level: "high", detail: "رابط فارغ" }]);

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return verdict([{ code: "invalid_url", level: "high", detail: "بنية الرابط غير صالحة" }]);
  }

  if (u.protocol !== "https:" && u.protocol !== "http:") {
    add("bad_scheme", "high", `بروتوكول غير مدعوم: ${u.protocol}`);
  } else if (u.protocol === "http:") {
    add("no_tls", "low", "اتصال غير مشفّر (http)");
  }

  if (u.username || u.password) add("url_credentials", "high", "بيانات دخول مضمّنة داخل الرابط");

  const host = u.hostname.toLowerCase();

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
    add("ip_literal_host", "medium", "الوجهة عنوان IP مباشر بدل نطاق");
  }
  if (host.startsWith("xn--") || host.includes(".xn--")) {
    add("punycode_host", "medium", "نطاق بترميز Punycode (احتمال انتحال)");
  }
  if (u.port && !["80", "443", ""].includes(u.port)) {
    add("nonstandard_port", "low", `منفذ غير قياسي: ${u.port}`);
  }
  if (host.split(".").length > 5) add("deep_subdomain", "low", "عدد كبير من النطاقات الفرعية");

  const base = host.replace(/^www\./, "");
  if (SHORTENERS.has(base)) add("url_shortener", "medium", "رابط مختصر يخفي الوجهة الحقيقية");

  const tld = base.split(".").pop() ?? "";
  if (RISKY_TLDS.has(tld)) add("risky_tld", "medium", `امتداد نطاق عالي الخطورة (.${tld})`);

  const lastSeg = u.pathname.split("/").filter(Boolean).pop() ?? "";
  const ext = lastSeg.includes(".") ? lastSeg.split(".").pop()!.toLowerCase() : "";
  if (ext && EXECUTABLE_EXT.has(ext)) {
    add("executable_download", "high", `رابط تنزيل ملف تنفيذي (.${ext})`);
  }

  for (const { re, code, detail } of SHADY_PATTERNS) {
    if (re.test(`${base}${u.pathname}`)) add(code, "medium", detail);
  }

  // تسريب اعتماد داخل الرابط (قيمة المفتاح نفسه أو اسم باراميتر سرّي)
  for (const [k, v] of u.searchParams) {
    if (SECRET_VALUE_RE.test(v.trim())) {
      add("secret_in_url", "high", `مفتاح سري مكشوف في الرابط (${k})`);
      break;
    }
    if (SECRET_PARAM_RE.test(k) && v.trim().length >= 16) {
      add("secret_param_in_url", "high", `باراميتر يحمل سرّاً في رابط عام (${k})`);
      break;
    }
  }
  if (u.hash && SECRET_VALUE_RE.test(u.hash.replace(/^#/, "").trim())) {
    add("secret_in_fragment", "high", "مفتاح سري مكشوف في جزء الرابط (#)");
  }

  return verdict(findings);
}

/** فحص أمني لنص/مقتطف كود */
export function auditCode(text: string): SecurityAudit {
  const blob = String(text ?? "").slice(0, 6000);
  if (!blob.trim()) return verdict([]);
  const findings: SecurityFinding[] = [];
  for (const { re, code, level, detail } of DANGEROUS_CODE) {
    if (re.test(blob)) findings.push({ code, level, detail });
  }
  return verdict(findings);
}

/** الفحص المجمّع: الرابط + المقتطف (يُستدعى قبل تخزين أي نتيجة جديدة) */
export function auditSnippet(input: { url: string; text?: string }): SecurityAudit {
  const a = auditLink(input.url);
  const b = auditCode(input.text ?? "");
  const merged = verdict([...a.findings, ...b.findings]);
  return { ...merged, score: Math.max(a.score, b.score, merged.score) };
}

/**
 * فحص فعلي لسلامة الرابط (2xx/3xx) — يمنع نشر روابط ميتة أو ملفّقة.
 * يجرب HEAD أولاً، وإن رفضه الخادم يعيد المحاولة بـ GET.
 */
export async function isLinkHealthy(url: string, timeoutMs = 9000): Promise<boolean> {
  if (!/^https?:\/\//i.test(url)) return false;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) APIHunterBot/1.0",
    Accept: "*/*",
  };
  for (const method of ["HEAD", "GET"] as const) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, redirect: "follow", signal: ctrl.signal, headers });
      if (res.status >= 200 && res.status < 400) return true;
    } catch {
      /* نجرّب الطريقة التالية */
    } finally {
      clearTimeout(timer);
    }
  }
  return false;
}