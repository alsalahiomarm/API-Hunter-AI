/**
 * بوّابة جودة نتائج البحث في الإنترنت (مصدر حقيقة واحد).
 *
 * الهدف: منع تحويل مقالات/فيديوهات/منشورات شبكات التواصل إلى "بطاقة خدمة API".
 * تُستخدم من ثلاث جهات:
 *   1) `commands.ts` قبل تخزين أي نتيجة بحث حيّة.
 *   2) `chat.ts` قبل تمرير مصادر الويب إلى النموذج.
 *   3) `scripts/purge-junk-services.ts` و`apps/agent/src/store.ts` للتنقية والمنع.
 *
 * ملاحظة: نستورد البذرة من المسار الفرعي `@apihunter/db/seed-data` (بيانات ثابتة)
 * حتى لا نسحب عميل Prisma إلى هذه الوحدة.
 */

import { seedServices } from "@apihunter/db/seed-data";

export interface WebLike {
  title?: string;
  snippet?: string;
  url?: string;
}

/**
 * نطاقات منصّات المحتوى والمناقشات — نتائجها مقالات/فيديوهات/منشورات،
 * لا صفحات تسجيل مفتاح API، لذا تُستبعد من بطاقات الخدمات.
 */
export const NON_SERVICE_HOSTS: readonly string[] = [
  // فيديو ومنصّات اجتماعية
  "youtube.com", "youtu.be", "facebook.com", "fb.watch", "instagram.com",
  "tiktok.com", "twitter.com", "x.com", "linkedin.com", "pinterest.com",
  "vk.com", "snapchat.com", "threads.net", "tumblr.com", "t.me", "telegram.me",
  // مناقشات ومقالات
  "reddit.com", "quora.com", "medium.com", "substack.com", "blogspot.com",
  "wordpress.com", "stackoverflow.com", "stackexchange.com",
  "news.ycombinator.com", "dev.to", "hashnode.dev", "hashnode.com",
  // مواقع أخبار تقنية (مقالات لا صفحات تسجيل مفاتيح)
  "theverge.com", "techcrunch.com", "venturebeat.com", "wired.com",
  "arstechnica.com", "zdnet.com", "cnet.com", "forbes.com",
  "businessinsider.com", "infoworld.com", "theregister.com", "hackernoon.com",
  "alarabiya.net", "bbc.com", "cnn.com", "reuters.com",
  // مراجع ومستندات لا تقدّم مفاتيح
  "wikipedia.org", "fandom.com", "slideshare.net", "scribd.com",
];

/** استخراج المضيف (بدون www) — "" إن كان الرابط غير صالح */
export function hostOf(url: unknown): string {
  try {
    return new URL(String(url ?? "")).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** النطاق الأساسي (example.com من api.example.com) */
function registrableOf(host: string): string {
  return host.split(".").slice(-2).join(".");
}

/** هل الرابط على منصّة محتوى/تواصل (لا تصلح كصفحة خدمة API)؟ */
export function isNonServiceHost(url: unknown): boolean {
  const host = hostOf(url);
  if (!host) return true; // رابط غير صالح = غير خدمة
  const registrable = registrableOf(host);
  return NON_SERVICE_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`) || registrable === h
  );
}

/** مسار صفحة محتوى/مقال (لا صفحة تسجيل مفتاح) */
const ARTICLE_PATH =
  /\/(blog|posts?|articles?|news|read|story|stories|watch|video|videos|gallery|thread|comments?|questions?|answers?|wiki|forum|topics?|tag|category)\b/i;

/** عنوان بأسلوب مقال/قائمة (وليس اسم خدمة) */
const ARTICLE_TITLE =
  /أفضل|افضل|أحسن|احسن|قائمة|مقال|مراجعة|شرح|كيف\s|دليل|best\s+\d|top\s+\d|\d+\s+(best|free|top|أفضل)\b|how\s+to|guide\s+to|tutorial|introduction\s+to|review|vs\.?\s|أخبار|\bnews\b/i;

/** مسار الموقع (pathname) — "" إن كان الرابط غير صالح */
function pathOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * هل الرابط صفحة محتوى/مقال (لا صفحة خدمة API)؟
 * يعتمد على الرابط وحده (بلا عنوان) لذا يصلح لتنظيف صفوف قديمة تخزّنت سابقاً.
 */
export function isContentPage(url: unknown): boolean {
  const link = String(url ?? "").toLowerCase();
  if (!/^https?:\/\//.test(link)) return true;
  if (isNonServiceHost(link)) return true;
  if (ARTICLE_PATH.test(link)) return true;

  const path = pathOf(link);
  const lastSeg = path.split("/").filter(Boolean).pop() ?? "";
  if (lastSeg.length > 60 && (lastSeg.match(/-/g)?.length ?? 0) >= 5) return true;

  return false;
}

/**
 * هل النتيجة تشبه مزوّد API/توثيق فعلاً؟
 *
 * ترتيب القرار (يمنع الإيجابيات الكاذبة بلا إفراط في الرفض):
 *   1) نطاق محتوى/تواصل → رفض قاطع.
 *   2) مسار مقالي أو شريحة طويلة بشرطات → رفض.
 *   3) إشارة نصية قوية (api/developer/docs/console/sdk...) أو مسار تقني → قبول.
 *   4) جذر نطاق بلا إشارات مقالية (صفحة هبوط خدمة) → قبول.
 */
export function looksLikeApiService(w: WebLike): boolean {
  const url = String(w.url ?? "").toLowerCase();
  if (!/^https?:\/\//.test(url)) return false;
  if (isNonServiceHost(url)) return false;

  const path = pathOf(url);
  if (ARTICLE_PATH.test(url)) return false;

  // شريحة أخيرة طويلة بكثافة شرطات = عنوان مقال مختوم داخل الرابط
  const lastSeg = path.split("/").filter(Boolean).pop() ?? "";
  if (lastSeg.length > 60 && (lastSeg.match(/-/g)?.length ?? 0) >= 5) return false;

  const title = String(w.title ?? "");
  const blob = `${title} ${w.snippet ?? ""} ${url}`.toLowerCase();

  const textHint =
    /\bapi\b|developer|docs|documentation|endpoint|sdk|console|dashboard|api[-\s]?key|free\s+(tier|credit|keys?)/.test(
      blob
    );
  if (textHint) return !ARTICLE_TITLE.test(title);
  if (/\/(docs|documentation|api|developers?|reference|swagger|openapi)\b/.test(url)) return true;

  // صفحة هبوط على نطاق خدمة (جذر الموقع) — مقبولة ما لم يكن العنوان مقالياً
  const bare = path === "/" || path === "";
  if (bare && !ARTICLE_TITLE.test(title)) return true;

  return false;
}

/**
 * هل هذا صفٌّ سُجِّل آلياً (وليس خدمة منسّقة يدوياً)؟
 *
 * العلامة الحاسمة هي «ليس ضمن القائمة المنسّقة» — وليست البادئة `web-` وحدها:
 * المحرك الحي يضع بادئة `web-` في الـ slug، لكن وكيل الاصطياد (apps/agent) يخزّن
 * صفوفاً بلا بادئة أيضاً (slug مشتق من الاسم/الرابط)، فكانت تلك الصفوف تفلت من
 * بوّابة المحتوى وتُعرض كمقال/منشور كأنه خدمة API.
 *
 * الخدمات المنسّقة (seed-data) محميّة دائماً لأن `isCuratedSlug` تسبق هذا الفحص.
 */
export function isAutoDiscoveredRow(slug: unknown): boolean {
  return !isCuratedSlug(slug);
}

// ---------------------------------------------------------------
// القائمة المنسّقة (مصدر الحقيقة: بيانات البذرة seed-data)
// ---------------------------------------------------------------

/**
 * شرائح الخدمات المنسّقة يدوياً (من بيانات البذرة) — محمّلة مرة واحدة.
 */
const CURATED_SLUGS: ReadonlySet<string> = new Set(
  (seedServices as Array<{ slug?: string }>)
    .map((s) => String(s.slug ?? "").trim())
    .filter(Boolean)
);

/** هل الـ slug لخدمة منسّقة يدوياً (محميّة من التنقية)؟ */
export function isCuratedSlug(slug: unknown): boolean {
  return CURATED_SLUGS.has(String(slug ?? "").trim());
}

// ---------------------------------------------------------------
// أسماء لا تصلح كاسم خدمة (عناوين مقالات/منشورات/جمل خبرية)
// ---------------------------------------------------------------

/** بادئات منشورات المناقشات */
const HN_PREFIX = /^(show|ask|tell)\s+hn\b|^show\s+hn:/i;

/** جملة خبرية/تسويقية لا تصلح اسماً لخدمة */
const SENTENCE_NAME =
  /\b(has an?|had an?|is discontinuing|are discontinuing|is shutting|we'?re announcing|announcing|introducing|releasing|launches|launched|whose|that outperforms|you need to know|is now|are now|now offers?|no longer|deprecat)\b/i;

/** عنوان دليل/شرح أو سؤال */
const HOWTO_NAME = /^(how|why|what|when|where|which)\b|\b(guide|tutorial|explained|walkthrough)\b/i;

/**
 * هل الاسم عنوان مقال/منشور أو جملة خبرية (لا اسم خدمة)؟
 * يُطبَّق على الصفوف غير المنسّقة فقط، فمنسّق البذرة قد يختار أي اسم بحرية.
 */
export function looksLikeContentName(name: unknown): boolean {
  const n = String(name ?? "").trim();
  if (!n) return true;
  if (n.length > 80) return true;
  if (HN_PREFIX.test(n)) return true;
  if (SENTENCE_NAME.test(n)) return true;
  if (HOWTO_NAME.test(n)) return true;
  // تسعة كلمات فأكثر = جملة لا اسم منتج
  if (n.split(/\s+/).filter(Boolean).length >= 9) return true;
  return false;
}

/**
 * صفٌّ مكتشَف آلياً ورابطه صفحة محتوى (فيديو/منشور/مقال/وسم أخبار) = ليس خدمة API.
 *
 * مهم: نستهدف الصفوف الآلية وحدها. الخدمات المنسّقة يدوياً قد يكون رابط تفعيلها على
 * نطاق يقع في قائمة منصّات المحتوى (مثل `t.me/BotFather` لـ Telegram Bot API) وهي صحيحة
 * تماماً — لذلك لا تلمسها هذه الدالة.
 */
export function isJunkAutoRow(row: { slug?: string; activationLink?: string }): boolean {
  if (!isAutoDiscoveredRow(row.slug)) return false;
  return isContentPage(row.activationLink);
}

/**
 * الفحص الموحّد لأي صفّ خدمة (آلياً اكتُشف أو منسّق يدوياً):
 *  - الخدمات المنسّقة (seed-data) محميّة دائماً.
 *  - غير المنسّقة: يُرفض الرابط إن كان صفحة محتوى، ويُرفض الاسم إن كان عنوان مقال.
 *
 * تُستخدم في: `fetchServices` (إصلاح ذاتي عند العرض)، سكربت التنقية، ومسار تخزين الوكيل.
 */
export function isJunkServiceRow(row: {
  slug?: string;
  name?: string;
  activationLink?: string;
}): boolean {
  if (isCuratedSlug(row.slug)) return false;
  if (isContentPage(row.activationLink)) return true;
  if (!looksLikeContentName(row.name)) return false;
  // عنوان مقالي: إن أمكن استعادة اسم من رابط خدمة حقيقي نُبقي الصفّ ونعرضه بالاسم المستعاد،
  // وإلا فهو محتوى فعلاً (مقال/منشور) -> يُستبعد.
  return salvageAutoRowName(row) === null;
}

/** الاسم المعروض للصفّ (يستعيد اسماً من الرابط حين يكون العنوان مقالياً) */
export function displayServiceName(row: {
  slug?: string;
  name?: string;
  activationLink?: string;
}): string {
  const original = String(row.name ?? "").trim();
  if (isCuratedSlug(row.slug) || !looksLikeContentName(original)) return original;
  return salvageAutoRowName(row) ?? original;
}

/** هل عُرض الصفّ باسم مستعاد من رابطه (تشخيصي)؟ */
export function isSalvagedRow(row: {
  slug?: string;
  name?: string;
  activationLink?: string;
}): boolean {
  if (isCuratedSlug(row.slug)) return false;
  return looksLikeContentName(row.name) && salvageAutoRowName(row) !== null;
}

// ---------------------------------------------------------------
// استرجاع الاسم: صفّ آلي بعنوان مقالي لكن رابط خدمة حقيقي
// ---------------------------------------------------------------

/** تسميات نطاق عامة لا تصلح اسماً لخدمة (api.example.com → example) */
const GENERIC_HOST_LABELS: ReadonlySet<string> = new Set([
  "www", "api", "app", "apps", "dev", "developer", "developers", "docs", "documentation",
  "console", "dashboard", "portal", "admin", "business", "research", "blog", "news",
  "support", "help", "status", "login", "account", "cloud", "platform",
  "service", "services", "web", "mobile", "data", "open", "try", "get", "my",
  "beta", "alpha", "staging", "tools", "tool",
]);

/** نطاقات تجريبية/عرضية — لا تُعرض كخدمة */
const LOW_QUALITY_HOST = /(^|[.-])(example|demo|sample|tutorial|dummy|placeholder)([.-]|$)/i;

/** إشارة مسار تدل على واجهة برمجية أو توثيقها */
const API_PATH = /\/(docs|documentation|api|apis|developer|developers|reference|swagger|openapi|console)\b/;

/** أول حرف من كل كلمة كبيراً (لأسماء مستخرجة من النطاق) */
function titleCase(s: string): string {
  return s.replace(/(^|[\s.\-_+])([a-z0-9])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** استخراج تسمية معبّرة من المضيف (رافضاً التسميات العامة) */
function hostLabel(host: string): string {
  const parts = host.split(".").filter(Boolean);
  const first = parts[0] ?? "";
  const chosen =
    first && !GENERIC_HOST_LABELS.has(first)
      ? first
      : parts.length >= 2
        ? parts[parts.length - 2]
        : first;
  return chosen.replace(/[^a-z0-9._+-]/gi, "");
}

/** اسم مستودع GitHub من المسار: /owner/repo ⟶ repo */
function githubRepoLabel(path: string): string {
  return path.split("/").filter(Boolean)[1] ?? "";
}

/**
 * استرجاع اسم خدمة مقبول لصفّ آلي عنوانه مقالي لكن رابطه صفحة خدمة حقيقية.
 *
 * لماذا؟ لأن وكيل الاصطياد يخزّن أحياناً خدمة مشروعة (‏`kanye.rest`,
 * `exchangerate.host`, `github.com/owner/repo`) بعنوان منشور HackerNews،
 * فكانت تُخفى بالكامل. الآن تُعرض باسم مشتق من رابطها بدل إخفائها.
 *
 * شرط الاسترجاع (صارم لتجنّب أي اسم ملفّق):
 *   1) صفّ آلي غير منسّق، ورابطه ليس صفحة محتوى، ونطاقه ليس تجريبياً.
 *   2) الرابط جذر نطاق (صفحة هبوط خدمة) أو مستودع GitHub أو مسار api/docs.
 *
 * @returns اسماً مقبولاً، أو `null` إن تعذّر الاسترجاع (فالصفّ يُستبعد).
 */
export function salvageAutoRowName(row: {
  slug?: string;
  name?: string;
  activationLink?: string;
}): string | null {
  if (isCuratedSlug(row.slug)) return null;
  const link = String(row.activationLink ?? "");
  if (isContentPage(link)) return null;

  const host = hostOf(link);
  if (!host) return null;
  if (LOW_QUALITY_HOST.test(host)) return null;

  const path = pathOf(link);
  const bare = path === "/" || path === "";
  const isGithubRepo = /(^|\.)github\.com$/.test(host) && Boolean(githubRepoLabel(path));
  if (!bare && !isGithubRepo && !API_PATH.test(path) && !/api/i.test(path)) return null;

  const label = isGithubRepo ? githubRepoLabel(path) : hostLabel(host);
  const name = titleCase(label.replace(/[^a-z0-9._+-]/gi, "")).trim();
  if (name.length < 3 || name.length > 40) return null;
  return name;
}