import type { Source } from "./sources";
import { DEFAULT_HEADERS } from "./sources";
import type { RawEntry } from "./types";

/**
 * وحدة الكشط والاسترجاع
 * تدعم: fetch عادي لملفات README / JSON / RSS / HTML، وPlaywright للصفحات الديناميكية.
 */

export async function fetchText(url: string, headers: Record<string, string> = DEFAULT_HEADERS): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------- تحويل HTML إلى نص بسيط ----------------
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ---------------- استخراج الروابط عامة ----------------
export function extractLinks(html: string, baseUrl: string): { title: string; url: string }[] {
  const links: { title: string; url: string }[] = [];
  const regex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html))) {
    let href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    try {
      href = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    const title = stripHtml(m[2]).slice(0, 200);
    if (title) links.push({ title, url: href });
  }
  return links;
}

function cap(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

// ---------------- الكشط عبر Playwright ----------------
let browserPromise: Promise<import("playwright").Browser> | null = null;

async function getBrowser() {
  if (!browserPromise) {
    const { chromium } = await import("playwright");
    browserPromise = chromium.launch({ headless: true }).catch((e) => {
      browserPromise = null;
      throw e;
    });
  }
  return browserPromise;
}

async function crawlWithPlaywright(src: Source): Promise<RawEntry[]> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(src.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3500); // انتظار التحميل الديناميكي
    const text = cap(await page.evaluate(() => document.body?.innerText ?? ""));
    const html = await page.content();
    const links = extractLinks(html, src.url);
    const title = await page.title();
    return [
      { title: title || src.label, url: src.url, source: src.label, text },
      ...links.slice(0, 25).map((l) => ({
        title: l.title,
        url: l.url,
        source: src.label,
        text: "",
      })),
    ];
  } finally {
    await page.close();
  }
}

// ---------------- المحللات (Parsers) ----------------
/** إزالة صيغة روابط الماركداون: [الاسم](الرابط) -> الاسم */
export function stripMarkdownLinks(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parsePublicApis(md: string, src: Source): RawEntry[] {
  const entries: RawEntry[] = [];
  // سطور الجدول: | Name | Description | Auth | HTTPS | CORS |
  for (const line of md.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cols = line.split("|").map((c) => c.trim().slice(0, 220));
    if (cols.length < 6) continue;
    const [, rawName, desc, auth] = cols;
    if (!rawName || !desc || !auth) continue;
    const isKey = /api[Kk]ey|OAuth|api_k/i.test(auth);
    const freeHint = /free|trial|credit|no[- ]?plan|community/i.test(line);
    if (!isKey && !freeHint) continue;
    // الرابط: أولوية لرابط عمود الاسم ثم أي رابط في السطر
    const nameLink = rawName.match(/\]\((https?:\/\/[^)]+)\)/)?.[1];
    const lineLink = line.match(/\]\((https?:\/\/[^)]+)\)/)?.[1];
    const name = stripMarkdownLinks(rawName).slice(0, 90);
    const url = nameLink ?? lineLink ?? `https://github.com/public-apis/public-apis#${name}`;
    entries.push({ title: name, url, source: src.label, text: desc });
  }
  return entries;
}

function parseHackerNews(json: string, src: Source): RawEntry[] {
  try {
    const data = JSON.parse(json);
    return (data.hits ?? [])
      .map((h: any) => ({
        title: h.title ?? h.story_title ?? "",
        url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: src.label,
        text: h.story_text ?? h.comment_text ?? h.title ?? "",
        publishedAt: h.created_at,
      }))
      .filter((e: RawEntry) => e.title && e.url);
  } catch {
    return [];
  }
}

function parseReddit(json: string, src: Source): RawEntry[] {
  try {
    const data = JSON.parse(json);
    const children = data?.data?.children ?? [];
    return children
      .map((c: any) => {
        const p = c?.data ?? {};
        return {
          title: p.title ?? "",
          url: p.url ?? "",
          source: src.label,
          text: p.selftext ?? p.title ?? "",
          publishedAt: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : undefined,
        };
      })
      .filter((e: RawEntry) => e.title && e.url);
  } catch {
    return [];
  }
}

function parseRss(xml: string, src: Source): RawEntry[] {
  const entries: RawEntry[] = [];
  const itemRegex = /<(item|entry)[\s\S]*?<\/(item|entry)>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml))) {
    const block = m[0];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i);
    const link =
      linkMatch?.[1] ?? block.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1] ?? "";
    const content =
      block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1] ??
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ??
      "";
    const pub = block.match(/<(pubDate|published)[^>]*>([^<]+)<\//i)?.[2];
    if (title && link) {
      entries.push({
        title: cap(stripHtml(title), 200),
        url: link,
        source: src.label,
        text: cap(stripHtml(content), 1500),
        publishedAt: pub ? new Date(pub).toISOString() : undefined,
      });
    }
  }
  return entries;
}

function parseGenericLinks(html: string, src: Source): RawEntry[] {
  const text = stripHtml(html);
  const links = extractLinks(html, src.url);
  const filtered = [
    { title: src.label, url: src.url, source: src.label, text: cap(text, 2000) },
    ...links
      .filter(
        (l) =>
          /api|key|free|credit|trial|ai|model/i.test(l.title) &&
          /^(https?:)/.test(l.url)
      )
      .slice(0, 40)
      .map((l) => ({ title: l.title, url: l.url, source: src.label, text: cap(text, 800) })),
  ];
  return filtered;
}

// ---------------- الواجهة الرئيسية ----------------
export async function crawlSource(src: Source): Promise<RawEntry[]> {
  try {
    if (src.type === "playwright") return await crawlWithPlaywright(src);

    const url = src.type === "json-api" && src.query ? `${src.url}?${src.query}` : src.url;
    const raw = await fetchText(url);

    switch (src.parser) {
      case "public-apis":
        return parsePublicApis(raw, src);
      case "hackernews":
        return parseHackerNews(raw, src);
      case "reddit":
        return parseReddit(raw, src);
      case "rss":
        return parseRss(raw, src);
      case "generic-links":
        return parseGenericLinks(raw, src);
      default:
        return [
          {
            title: src.label,
            url: src.url,
            source: src.label,
            text: cap(stripHtml(raw), 1500),
          },
        ];
    }
  } catch (err) {
    console.warn(`⚠️  [crawler] فشل الكشط من "${src.label}":`, (err as Error).message);
    return [];
  }
}