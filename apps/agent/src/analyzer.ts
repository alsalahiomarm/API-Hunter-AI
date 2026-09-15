import type { Category, FreeTierDetails } from "@apihunter/db";
import type { HuntResult, RawEntry } from "./types";
import { stripMarkdownLinks } from "./crawler";

/**
 * وحدة التحليل الذكي:
 * 1) وضع AI: استدعاء نموذج OpenAI/Gemini عبر SDK متوافق.
 * 2) وضع Heuristic: استخراج قواعدي (regex) عند غياب المفاتيح.
 */

/**
 * تُقيَّم وقت التنفيذ (lazy) وليس وقت الاستيراد:
 * ملف .env يُحمَّل في index.ts بعد الاستيراد، لذا أي حساب في نطاق الوحدة
 * سيعطي نتيجة خاطئة (false) دائماً.
 */
export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
}

const CATEGORY_KEYWORDS: Record<Category, RegExp> = {
  AI_MODELS: /llm|gpt|chat|completion|language model|generative|inference|gemini|claude|llama|mistral|transformer/i,
  SEARCH_TOOLS: /search|serper|tavily|brave|exa|scrap|crawl|index|news api|google search/i,
  AUDIO_IMAGE: /tts|voice|speech|audio|image generation|vision|transcri|sound|photo|text-to-speech|stability|elevenlabs/i,
  DATABASES: /database|postgres|redis|sql|storage|nosql|kv|vector/i,
  DEV_TOOLS: /sdk|developer|auth|deploy|hosting|serverless|webhook|monitor|logging|cron|email|sms/i,
  OTHER: /.*/,
};

function guessCategory(text: string): Category {
  const t = `${text} `;
  const order: Category[] = ["AI_MODELS", "SEARCH_TOOLS", "AUDIO_IMAGE", "DATABASES", "DEV_TOOLS", "OTHER"];
  for (const c of order) {
    if (c !== "OTHER" && CATEGORY_KEYWORDS[c].test(t)) return c;
  }
  return "OTHER";
}

function guessStatus(t: string): "FREE_TIER" | "FREE_CREDIT" | "TRIAL" {
  if (/completely free|100% free|free forever|مجاني بالكامل|free tier|no credit card/i.test(t)) return "FREE_TIER";
  if (/trial|14 day|7 day|30 day|تجربة/i.test(t)) return "TRIAL";
  return "FREE_CREDIT";
}

// ---------------- التحليل القواعدي (Heuristic) ----------------
export function analyzeHeuristic(entry: RawEntry): HuntResult | null {
  const blob = `${entry.title}\n${entry.text}`;
  if (!blob) return null;

  const firstUrl = blob.match(/https?:\/\/[^\s)\]]+/i)?.[0] ?? entry.url;
  // تنظيف العنوان: إزالة روابط الماركداون ثم قطع اللاحقة عند فاصل محاط بمسافات فقط
  // (لا نقطع عند ":" داخل الروابط مثل https://)
  const cleanTitle = stripMarkdownLinks(entry.title);
  const name = cleanTitle
    .replace(/\s+[|,]\s+.*$/i, "")
    .replace(/\s+[-–—:]\s+.*$/i, "")
    .slice(0, 80)
    .trim();

  if (name.length < 3 || blob.length < 15) return null;
  if (/\b(pricing|billing|payment|login)\b/i.test(blob) && !/free/i.test(blob)) return null;
  if (!/free|trial|credit|api\s?key|مجاني|تجربة/i.test(blob)) return null;

  const docLink =
    blob.match(/docs?:\s*(https?:\/\/[^\s)\]]+)/i)?.[1] ??
    blob.match(/documentation:\s*(https?:\/\/[^\s)\]]+)/i)?.[1] ??
    "";

  const credits =
    blob.match(/(\$\d+(?:\.\d+)?[^.\n]{0,40}?(?:free|credit|رصيد|مجاني))/i)?.[0] ??
    blob.match(/(?:\d+\s?(?:k|k?))?\s?free credits?/i)?.[0] ??
    "";
  const monthly =
    blob.match(/(\d{2,6})\s?(?:requests?|calls?|queries?)\s?(?:per|a)\s?(?:month|mo)/i)?.[1] ??
    blob.match(/(\d{2,6})\s?req\/mo/i)?.[1];
  const daily =
    blob.match(/(\d{2,6})\s?(?:requests?|calls?|queries?)\s?(?:per|a)\s?(?:day|daily)/i)?.[1] ??
    blob.match(/(\d{2,6})\s?req\/day/i)?.[1];

  const category = guessCategory(blob);
  const status = guessStatus(blob);
  const needsCard = /credit card required|credit card needed|بطاقة ائتمان مطلوبة/i.test(blob);

  const description = entry.text.slice(0, 280).trim();
  const provider =
    blob.match(/by\s+([A-Z][\w .\-]{2,40}?)(?:\s|$|,)/i)?.[1] ??
    (() => {
      try {
        return new URL(firstUrl).hostname.replace(/^www\./, "").split(".")[0];
      } catch {
        return entry.title.slice(0, 30);
      }
    })();

  const freeTier: FreeTierDetails = {
    monthlyRequests: monthly ? Number(monthly) : null,
    dailyRequests: daily ? Number(daily) : null,
    freeCredits: credits || null,
    rateLimit: null,
    models: [],
    notes: entry.source ? `مصدر الاكتشاف: ${entry.source}` : null,
    requiresCard: needsCard,
  };

  return {
    name,
    provider: String(provider).slice(0, 60),
    category,
    description,
    freeTier,
    activationLink: firstUrl,
    documentationLink: docLink,
    codeExample: null,
    sourceUrl: entry.url,
    confidence: 0.45,
  };
}

// ---------------- التحليل بالذكاء الاصطناعي ----------------
const SYSTEM_PROMPT = `أنت محلل خدمات API في مشروع (API Hunter AI).
مهمتك: من النص المقدم عن خدمة API، استخرج بنية JSON بالضبط (بدون أي نص إضافي):

{
  "name": "اسم الخدمة",
  "provider": "اسم الشركة",
  "description": "وصف مختصر بالعربية",
  "category": "AI_MODELS|SEARCH_TOOLS|AUDIO_IMAGE|DATABASES|DEV_TOOLS|OTHER",
  "freeTierDetails": {
    "monthlyRequests": null أو عدد,
    "dailyRequests": null أو عدد,
    "freeCredits": "نص الرصيد المجاني مثلا 1000 رصيد/شهر أو null",
    "rateLimit": null أو نص,
    "models": ["أسماء النماذج"],
    "notes": null,
    "requiresCard": true/false
  },
  "activationLink": "https://... رابط التسجيل المباشر والحصول على المفتاح",
  "documentationLink": "https://... رابط التوثيق أو empty",
  "status": "FREE_TIER|FREE_CREDIT|TRIAL",
  "free": true/false
}

قواعد صارمة:
- لا تُعِد شيئاً إطلاقاً لو كانت الخدمة مدفوعة تماما (free=false).
- activationLink أولوية لصفحة تسجيل/مفتاح API (تجنب pages/pricing).
- إن لم تتأكد من رقم محدد ضعه null بدلاً من التخمين.`;

function cleanJson(text: string): string {
  const t = text.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  return start >= 0 && end > start ? t.slice(start, end + 1) : t;
}

export async function analyzeWithAI(entry: RawEntry): Promise<HuntResult | null> {
  if (!isAIConfigured()) return null;

  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "";
  const baseUrl =
    process.env.OPENAI_BASE_URL ||
    (process.env.GEMINI_API_KEY
      ? "https://generativelanguage.googleapis.com/v1beta/openai/"
      : undefined);
  const model =
    process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || "gpt-4o-mini";

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey, baseURL: baseUrl });
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `العنوان: ${entry.title}\nالرابط: ${entry.url}\nالمصدر: ${entry.source}\n\nالنص:\n${entry.text.slice(0, 3000)}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    if (!raw) return null;
    const parsed = JSON.parse(cleanJson(raw)) as Record<string, any>;

    if (parsed.free === false) return null;

    const validCats: Category[] = ["AI_MODELS", "SEARCH_TOOLS", "AUDIO_IMAGE", "DATABASES", "DEV_TOOLS", "OTHER"];
    const category: Category = validCats.includes(parsed.category) ? parsed.category : "OTHER";

    const ftd = (parsed.freeTierDetails ?? {}) as FreeTierDetails;
    const freeHint = /free|trial|credit/i.test(JSON.stringify(ftd) + parsed.description);
    if (!freeHint && parsed.free !== true) return null;

    return {
      name: String(parsed.name ?? entry.title).slice(0, 90),
      provider: String(parsed.provider ?? "").slice(0, 60),
      category,
      description: String(parsed.description ?? "").slice(0, 400),
      freeTier: {
        monthlyRequests: ftd.monthlyRequests ?? null,
        dailyRequests: ftd.dailyRequests ?? null,
        freeCredits: ftd.freeCredits ?? null,
        rateLimit: ftd.rateLimit ?? null,
        models: Array.isArray(ftd.models) ? ftd.models.slice(0, 10) : [],
        notes: ftd.notes ?? null,
        requiresCard: Boolean(ftd.requiresCard),
      },
      activationLink: String(parsed.activationLink ?? entry.url).trim() || entry.url,
      documentationLink: String(parsed.documentationLink ?? "").trim(),
      codeExample: null,
      sourceUrl: entry.url,
      confidence: 0.85,
    };
  } catch (err) {
    console.warn("⚠️ [analyzer] فشل التحليل الذكي:", (err as Error).message);
    return null;
  }
}

export async function analyzeEntry(entry: RawEntry): Promise<HuntResult | null> {
  if (isAIConfigured()) {
    const ai = await analyzeWithAI(entry);
    if (ai) return ai;
  }
  return analyzeHeuristic(entry);
}