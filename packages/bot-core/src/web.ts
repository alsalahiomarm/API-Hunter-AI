/**
 * طبقة البحث في الإنترنت للبوت:
 * تُستخدم لتزويد النموذج بمصادر حقيقية موثّقة (Grounding) قبل صياغة الرد.
 * الترتيب: Serper (جوجل) ← Firecrawl ← DuckDuckGo HTML (بدون مفتاح).
 */

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

function env(n: string): string {
  return process.env[n]?.trim() ?? "";
}

function clean(s: unknown): string {
  return String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

async function trySerper(query: string, limit: number): Promise<WebResult[]> {
  const key = env("SERPER_API_KEY");
  if (!key) return [];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "content-type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ q: query, num: Math.min(limit + 2, 10), gl: "us", hl: "ar" }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.organic ?? []).slice(0, limit).map((it: any) => ({
      title: clean(it.title),
      url: String(it.link ?? "").trim(),
      snippet: clean(it.snippet),
      source: "google",
    }));
  } catch (e) {
    console.error("[web][serper] تعذّر البحث:", (e as Error).message);
    return [];
  }
}

async function tryFirecrawl(query: string, limit: number): Promise<WebResult[]> {
  const key = env("FIRECRAWL_API_KEY");
  if (!key) return [];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, limit: Math.min(limit + 2, 10) }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.data ?? []).slice(0, limit).map((it: any) => ({
      title: clean(it.title),
      url: String(it.url ?? "").trim(),
      snippet: clean(it.description),
      source: "firecrawl",
    }));
  } catch (e) {
    console.error("[web][firecrawl] تعذّر البحث:", (e as Error).message);
    return [];
  }
}

/** DuckDuckGo HTML (محرك بحث لا يتطلب مفتاحاً) — تحليل خفيف لبنية HTML */
async function tryDuckDuckGo(query: string, limit: number): Promise<WebResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      method: "GET",
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) APIHunterBot/1.0" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const html = await res.text();
    const out: WebResult[] = [];
    const anchor =
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippets: string[] = [];
    const snip =
      /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = snip.exec(html)) !== null) {
      snippets.push(clean(m[1]));
    }
    let i = 0;
    while ((m = anchor.exec(html)) !== null && out.length < limit) {
      const raw = m[1];
      const real = raw.includes("uddg=")
        ? decodeURIComponent(raw.split("uddg=")[1].split("&")[0])
        : raw;
      if (!/^https?:\/\//i.test(real)) continue;
      out.push({
        title: clean(m[2]),
        url: real,
        snippet: snippets[i++] ?? "",
        source: "duckduckgo",
      });
    }
    return out;
  } catch (e) {
    console.error("[web][duckduckgo] تعذّر البحث:", (e as Error).message);
    return [];
  }
}

/** Jina Reader Search (s.jina.ai) — بحث يعمل من الخوادم بمفتاح مجاني ويقاوم الحجب */
async function tryJina(query: string, limit: number): Promise<WebResult[]> {
  const key = env("JINA_API_KEY");
  if (!key) return [];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`https://s.jina.ai/?q=${encodeURIComponent(query)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${key}`,
        "X-Respond-With": "no-content",
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data: any = await res.json();
    const rows: any[] = Array.isArray(data?.data) ? data.data : [];
    return rows.slice(0, limit).map((it: any) => ({
      title: clean(it.title),
      url: String(it.url ?? "").trim(),
      snippet: clean(it.description ?? it.content),
      source: "jina",
    }));
  } catch (e) {
    console.error("[web][jina] تعذّر البحث:", (e as Error).message);
    return [];
  }
}

/**
 * بحث ويب متعدد المصادر مع تحويل تلقائي.
 * لا ترمي أخطاء أبداً — تُرجع [] عند فشل الجميع.
 *
 * `offset` يتيح **تدوير النتائج**: عند تكرار السؤال أو طلب المزيد، نطلب مجموعة أوسع
 * من المحرك ثم نقتطع من موضع متقدّم، فتظهر نتائج جديدة حقيقية بدل تكرار نفس القائمة
 * (الركيزة الثالثة: تنويع النتائج وتجنب التكرار).
 */
export interface WebSearchOptions {
  /** موضع البداية داخل مجموعة النتائج (0 = الأوائل) */
  offset?: number;
}

export async function searchWeb(
  query: string,
  limit = 5,
  opts: WebSearchOptions = {}
): Promise<WebResult[]> {
  const q = query.trim().slice(0, 200);
  if (!q) return [];
  const need = Math.max(1, Math.min(limit, 8));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));
  // مجموعة أوسع من المطلوب كي تكون الإزاحة قادرة على تقديم نتائج لم تُعرض بعد
  const pool = Math.min(need + offset, 10);

  const [a, b, c, d] = await Promise.all([
    trySerper(q, pool),
    tryFirecrawl(q, pool),
    tryJina(q, pool),
    tryDuckDuckGo(q, pool),
  ]);

  const seen = new Set<string>();
  const merged = [...a, ...b, ...d, ...c].filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  return merged.slice(offset, offset + need);
}