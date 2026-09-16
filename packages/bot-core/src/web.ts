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
  } catch {
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
  } catch {
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
  } catch {
    return [];
  }
}

/**
 * بحث ويب متعدد المصادر مع تحويل تلقائي.
 * لا ترمي أخطاء أبداً — تُرجع [] عند فشل الجميع.
 */
export async function searchWeb(query: string, limit = 5): Promise<WebResult[]> {
  const q = query.trim().slice(0, 200);
  if (!q) return [];
  const need = Math.max(1, Math.min(limit, 8));

  const [a, b, c] = await Promise.all([
    trySerper(q, need),
    tryFirecrawl(q, need),
    tryDuckDuckGo(q, need),
  ]);

  const seen = new Set<string>();
  const merged = [...a, ...b, ...c].filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  return merged.slice(0, need);
}