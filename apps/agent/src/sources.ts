/**
 * مصادر البحث الدورية - أهداف الكشط المجدول
 * الوكيل يمسح هذه المصادر في كل دورة ويحلل ما يجد.
 */
export type SourceType =
  | "github-readme" // ملفات README لأدلة GitHub
  | "json-api" // واجهات JSON مثل HackerNews / Reddit
  | "rss" // خلاصات مدونات المطورين
  | "html" // صفحات عبر fetch عادي
  | "playwright"; // صفحات تتطلب متصفحاً حقيقياً

export type ParserKind =
  | "public-apis" // جدول public-apis GitHub
  | "hackernews" // Algolia API
  | "reddit" // Reddit JSON
  | "rss" // XML خلاصات
  | "generic-links" // استخراج الروابط من HTML
  | "playwright-generic"; // كشط body عبر متصفح

export interface Source {
  id: string;
  label: string;
  type: SourceType;
  parser: ParserKind;
  url: string;
  /** استعلامات إضافية للواجهات JSON */
  query?: string;
}

export const SOURCES: Source[] = [
  // ---------- أدلة GitHub المفتوحة ----------
  {
    id: "github-public-apis",
    label: "public-apis (GitHub)",
    type: "github-readme",
    parser: "public-apis",
    url: "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md",
  },
  {
    id: "github-awesome-ai-apis",
    label: "Awesome-LLM (GitHub)",
    type: "github-readme",
    parser: "generic-links",
    url: "https://raw.githubusercontent.com/Hannibal046/Awesome-LLM/master/README.md",
  },
  {
    id: "github-free-chatgpt",
    label: "Free LLM API keys (GitHub)",
    type: "github-readme",
    parser: "generic-links",
    url: "https://raw.githubusercontent.com/ZhangYiJiang/awesome-free-llm/main/README.md",
  },

  // ---------- المنتديات البرمجية ----------
  {
    id: "hn-free-api",
    label: "HackerNews: free api",
    type: "json-api",
    parser: "hackernews",
    url: "https://hn.algolia.com/api/v1/search",
    query: "query=free%20api&tags=story&hitsPerPage=30",
  },
  {
    id: "hn-free-api-key",
    label: "HackerNews: free api key",
    type: "json-api",
    parser: "hackernews",
    url: "https://hn.algolia.com/api/v1/search",
    query: "query=free%20api%20key&tags=story&hitsPerPage=20",
  },
  {
    id: "reddit-freeapis",
    label: "Reddit r/freeapis",
    type: "json-api",
    parser: "reddit",
    url: "https://www.reddit.com/r/freeapis/new.json?limit=25",
  },
  {
    id: "reddit-llmdevs",
    label: "Reddit r/LLMDevs",
    type: "json-api",
    parser: "reddit",
    url: "https://www.reddit.com/r/LLMDevs/new.json?limit=25",
  },
  {
    id: "reddit-sdk",
    label: "Reddit r/webdev (API keys)",
    type: "json-api",
    parser: "reddit",
    url: "https://www.reddit.com/r/webdev/search.json?q=free%20api%20key&sort=new&limit=20&restrict_sr=1",
  },

  // ---------- مدونات ومواقع المطورين ----------
  {
    id: "devto-api",
    label: "DEV Community (tag: api)",
    type: "rss",
    parser: "rss",
    url: "https://dev.to/feed/tag/api",
  },
  {
    id: "medium-api",
    label: "Medium (tag: API)",
    type: "rss",
    parser: "rss",
    url: "https://medium.com/feed/tag/api",
  },
  {
    id: "hashnode-ai",
    label: "Hashnode (tag: ai)",
    type: "rss",
    parser: "rss",
    url: "https://hashnode.com/rss/tag/ai",
  },

  // ---------- صفحات تتطلب متصفحاً (Playwright) ----------
  {
    id: "producthunt-ai",
    label: "Product Hunt (trending AI)",
    type: "playwright",
    parser: "playwright-generic",
    url: "https://www.producthunt.com/topics/artificial-intelligence",
  },
];

/** خلافات HTTP نموذجية يمكن استخدامها عند تعذر fetch */
export const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 APIHunterBot/1.0",
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
};